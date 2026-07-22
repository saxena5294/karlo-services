# REST API Design

## 1. Conventions

Production base path: `/api/v1`. Keep current `/api/...` routes as temporary compatibility aliases while the frontend migrates; announce and measure deprecation before removal.

- HTTPS only outside local development.
- JSON for normal requests; `multipart/form-data` only for uploads; raw body only on payment/Clerk webhooks.
- Bearer Clerk token on protected endpoints.
- `Idempotency-Key` required for application submission, payment creation, refunds, lead acceptance, and other retry-sensitive commands.
- IDs are opaque. Application number is a display/business identifier, not proof of access.
- Timestamps are ISO-8601 UTC; currency uses ISO code and integer minor units.
- Filtering is allowlisted; sort values are named (for example `newest`, `oldest`) rather than arbitrary database fields.

Success:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "meta": { "requestId": "req_..." }
}
```

Error:

```json
{
  "success": false,
  "message": "Readable error message",
  "code": "VALIDATION_FAILED",
  "errors": [{ "path": "mobileNumber", "message": "Enter a valid number" }],
  "requestId": "req_..."
}
```

Stable codes include `AUTHENTICATION_REQUIRED`, `TOKEN_INVALID`, `PROFILE_SETUP_REQUIRED`, `ACCOUNT_SUSPENDED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `VALIDATION_FAILED`, `INVALID_STATE_TRANSITION`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `UPLOAD_REJECTED`, `OTP_EXPIRED`, `OTP_CONSUMED`, `PAYMENT_NOT_VERIFIED`, `PROVIDER_UNAVAILABLE`, and `INTERNAL_ERROR`.

## 2. Common query contract

- Offset: `page` (default 1), `limit` (default 20, max 100).
- Cursor for high-volume feeds: `cursor`, `limit`; response provides `nextCursor`.
- Filters are endpoint-specific: status, category, serviceId, assignee, dateFrom/dateTo, read state.
- Search is trimmed, length-limited, escaped, and executed only on indexed/approved fields.
- Invalid filters return 400 rather than being ignored.

## 3. Endpoint catalogue

`Public` means no session, but still receives abuse controls. `Owner` and `Assigned` are resource policies in addition to role checks.

### Identity and users

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET /auth/me` | Any authenticated | Return internal user, role/status/profile readiness; no secrets |
| `POST /auth/sync` | Authenticated, controlled | Idempotently create/repair internal mapping after verified Clerk identity |
| `POST /webhooks/clerk` | Clerk signature | Deduplicate event; synchronize identity/status, never trust an unsigned body |
| `GET /users/me` | Authenticated active | Own business profile summary |
| `PATCH /users/me` | Authenticated active | Allowlisted self-edit fields only |

Role assignment/status management belongs under admin endpoints and is audited. Never expose a public role-selection endpoint.

### Services and form definitions

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET /services` | Public | Active public projection; category/search/popular/featured/availability; pagination |
| `GET /services/:slug` | Public | Parent details and active variants; canonical legacy redirect metadata |
| `GET /services/:slug/form?variant=` | Public | Effective published applicant-safe schema and schema hash |
| `GET /admin/services` | Admin | Full catalogue with filters/pagination |
| `POST /admin/services` | Admin | Validated create; unique slug; audit |
| `GET/PATCH /admin/services/:id` | Admin | Detail/update with optimistic revision |
| `PATCH /admin/services/:id/status` | Admin | Explicit availability/activity command |
| `GET /admin/services/:id/forms` | Admin | Versions/base/variant forms |
| `POST /admin/services/:id/forms` | Admin | Create draft version |
| `PATCH /admin/service-forms/:id` | Admin | Edit draft only |
| `POST /admin/service-forms/:id/publish` | Admin | Validate and atomically publish/retire prior version |

Current `/admin/services/:id/form` can remain a compatibility facade while versioning is introduced.

### Applications

| Method/path | Access | Purpose / checks |
|---|---|---|
| `POST /applications` | Customer | Multipart submission; service/variant IDs in body; idempotency, CAPTCHA, OTP, server form/file validation |
| `GET /applications` | Customer | Own list only; status/service/date/search filters |
| `GET /applications/:id` | Customer owner | Safe detail and customer-visible timeline |
| `POST /applications/:id/cancel` | Customer owner | Allowed state/cutoff/refund policy only |
| `GET /applications/track/:number` | Public + proof | Strict DTO after signed token or number plus verified phone suffix/OTP |
| `GET /expert/applications` | Expert | Current assigned-only list |
| `GET /expert/applications/:id` | Expert assigned | Assigned detail, private fields only as needed |
| `POST /expert/applications/:id/transitions` | Expert assigned | Allowed transition and prerequisites |
| `POST /expert/applications/:id/updates` | Expert assigned | Customer-visible update or internal note as explicit type |
| `GET /partner/applications...` | Partner | Current assigned-only list/detail |
| `POST /partner/applications/:id/transitions` | Partner assigned | Allowed transition; completion document rule |
| `GET /admin/applications...` | Admin | Filtered/paginated management projection |
| `GET /admin/applications/:id` | Admin | Full authorized management detail |
| `POST /admin/applications/:id/transitions` | Admin | State machine command; prerequisites, audit |

Prefer a transition command over a generic status patch. This makes actor, expected current state, reason, and prerequisites explicit:

```json
{
  "transition": "start_processing",
  "expectedStatus": "Assigned",
  "remarks": "Verification started"
}
```

### Assignments and partner leads

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET /admin/assignments` | Admin | Filtered assignment history/current view |
| `POST /admin/applications/:id/assignments` | Admin | Assign/reassign valid active assignee atomically |
| `POST /admin/applications/:id/leads` | Admin | Publish privacy-safe eligible lead |
| `GET /partner/leads` | Approved/available partner | Eligible open projections only |
| `GET /partner/leads/:id` | Eligible or accepting partner | Safe detail; private application fields only after acceptance |
| `POST /partner/leads/:id/accept` | Approved partner | Atomic compare-and-set acceptance; idempotency/race handling |
| `GET /partner/leads/accepted` | Partner | Own accepted/completed leads only |
| `GET/PATCH /admin/leads...` | Admin | Lifecycle management with state validation |

### Documents

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET /applications/:applicationId/documents` | Owner/assigned/admin | Safe metadata and per-action permissions |
| `GET /applications/:applicationId/documents/:documentId/view` | Owner/assigned/admin | Reauthorize, audit, short-lived preview URL |
| `GET .../:documentId/download` | Owner/assigned/admin | Reauthorize, audit, attachment URL |
| `POST .../:documentId/replacements` | Owner/authorized assigned | Only when replacement requested; multipart validation |
| `POST .../:documentId/reviews` | Admin; assigned expert only if approved policy | Verify/reject/request re-upload with required reason |
| `POST /partner/applications/:id/completion-documents` | Assigned partner | Multipart, non-terminal, count/type/signature policies |

The recommended `/view` endpoint can alias current `/preview`. Storage identifiers and permanent URLs never appear in responses.

### Applicant OTP

| Method/path | Access | Purpose / checks |
|---|---|---|
| `POST /otp/send` | Customer | `{ phone, purpose: "application" }`; Clerk-phone bypass or SMS; CAPTCHA and user/phone/IP/device limits |
| `POST /otp/verify` | Customer | challenge + OTP; atomic attempt limit; return one-use signed token |

Current `/mobile-verification/send|verify` can remain an alias. Generic responses should not disclose whether a phone belongs to another account. Submission consumes the token atomically and binds it to internal user, normalized phone, purpose, and optionally schema/application intent.

### Notifications

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET /notifications` | Authenticated | Own role/user inbox; cursor/read/type filters |
| `GET /notifications/unread-count` | Authenticated | Own count |
| `PATCH /notifications/:id/read` | Notification owner | Idempotent read |
| `PATCH /notifications/read-all` | Authenticated | Own inbox only |
| `GET/PATCH /notification-preferences` | Authenticated | Own allowed channel/event preferences |

### Payments and receipts

| Method/path | Access | Purpose / checks |
|---|---|---|
| `POST /applications/:id/payments` | Customer owner | Server-calculated order; idempotency; payable state |
| `GET /payments` | Authenticated | Own filtered payment history |
| `GET /payments/:id` | Payment owner/admin | Verified status/detail |
| `POST /webhooks/payments/:provider` | Provider signature | Raw-body signature, event uniqueness, reconciliation |
| `GET /payments/:id/receipt` | Owner/admin | Short-lived PDF access or generated download |
| `POST /admin/payments/:id/refunds` | Admin with permission | Amount/reason validation, idempotent provider command, audit |
| `GET /admin/payments` | Admin | Reconciliation filters/export job |

### Support and dashboard resources

| Method/path | Access | Purpose / checks |
|---|---|---|
| `GET/POST /support/tickets` | Customer/partner; expert when enabled | Own list/create |
| `GET /support/tickets/:id` | Owner/admin | Owner filter; safe replies |
| `POST /support/tickets/:id/replies` | Owner/admin | Open-state and author policy |
| `POST /support/tickets/:id/close` | Owner/admin | Valid transition |
| `GET /dashboard/software` | Customer/partner | Active HTTPS resources |
| `GET /dashboard/declaration-forms` | Customer/partner | Active resources |
| `GET /rewards`, `/referrals`, `/partner/renewals` | Applicable owner role | Always user + role scoped |

### CMS

- Public: `GET /cms/homepage`, `/cms/faqs`, and safe site/dashboard content projections.
- Admin: CRUD/publish/order/status endpoints for homepage, settings, banners, FAQs, testimonials, policies, and approved content blocks.
- Validate safe internal/HTTPS links, image MIME/signatures, publication schedule, unique section order, and service references. Deletion is soft and audited.

### Admin summary/report APIs

| Method/path | Purpose |
|---|---|
| `GET /admin/dashboard/summary?from=&to=` | Counts and recent activity only; no full datasets |
| `GET /admin/reports/summary` | Bounded aggregates |
| `POST /admin/exports` | Create asynchronous CSV/PDF export job with filters |
| `GET /admin/exports/:id` | Job status/private result link |
| `GET /admin/audit-logs` | Filtered cursor/page results with redacted snapshots |
| `GET/PUT /admin/settings/:key` | Allowlisted non-secret settings only |

Admin dashboard response groups `applicationsByStatus`, `usersByRole`, `topServices`, `payments`, and `recentActivity`. Cache briefly if measured load warrants it; invalidate safely or accept a clearly stated freshness window.

## 4. Validation and mass-assignment policy

Every command has a Zod (or equivalent) schema at the route boundary. Use separate create/update/public/admin DTOs. Unknown keys are rejected for sensitive commands. Services still enforce cross-record invariants; Mongoose remains the final persistence constraint.

Examples:

- Partner self-update allowlist cannot contain verification status, wallet, rating, counters, role, or user ID.
- Service total price is derived server-side from fee components.
- Assignment actor and assignee types are loaded from internal users/profiles.
- Application owner, status, snapshots, and payment status are never taken directly from client input.
- CMS image URLs are created by the backend upload flow; public IDs are not accepted from arbitrary clients.

## 5. Ownership query patterns

Authorize in the database query, not by fetching globally and comparing afterward:

```js
Application.findOne({
  _id: applicationId,
  customerUserId: req.auth.userId,
});
```

Partner/expert filters also require the canonical assignment type/current assignee. Admin bypass is a separate policy branch, not `$or: [{ role: 'admin' }]` sourced from input. Use 404 for inaccessible resources unless the endpoint semantics require an explicit 403.

## 6. Concurrency and idempotency

- Store idempotency key, actor, operation, request hash, result reference, and expiry for generalized commands. Same key plus different request hash returns 409.
- Use atomic filters (`status: expected`, `acceptedBy: null`) for lead acceptance and transitions.
- Use MongoDB transactions for multi-document invariants. Retry only transient transaction labels with bounded attempts.
- Webhook handlers insert the unique event before applying effects. Duplicate delivery returns 2xx after confirming prior processing.
- Client Axios must not blindly retry non-idempotent requests. Network retries require the same idempotency key.

## 7. Upload contract

- Global hard ceiling: retain 10 MB/file and 30 files/request initially; per-schema limits may only be lower/equal.
- Validate declared MIME, extension, magic bytes, count, field allowlist, total byte limit, and optional malware scanning.
- Sanitize display filename and never use it as an authorization/storage key.
- Upload to private/authenticated Cloudinary folders selected by backend.
- On database failure, cleanup immediately and enqueue cleanup retry if provider deletion fails.
- Response contains safe metadata, not `publicId`, `secureUrl`, filesystem paths, or provider secrets.

## 8. Caching and HTTP behavior

- Public services/CMS: `ETag` or short `Cache-Control` with explicit purge/version keys.
- Personalized/admin/document/payment/OTP responses: `Cache-Control: no-store, private`.
- Signed document redirects/URLs expire in about five minutes.
- Use 201 for creates, 200 for commands returning a representation, 202 for queued exports/refunds when asynchronous, 204 only where clients need no body.
- Return 429 with `Retry-After` for rate limits/cooldowns.

## 9. OpenAPI and compatibility

Maintain an OpenAPI 3.1 document from validated schemas, including auth, multipart fields, enums, standard errors, and examples. CI validates examples and breaking changes. Mobile clients depend on `/v1`; additive optional response fields are safe, while removals/semantic changes require a new version or a measured deprecation window.
