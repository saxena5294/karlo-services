# Production Security Checklist

This is a release gate, not a one-time document. Record owner, evidence, date, and exceptions for each control.

## 1. Identity and sessions

- [ ] Verify Clerk JWT signature with cached official JWKS and validate issuer, audience, expiry/not-before, and authorized party as configured.
- [ ] Obtain current tokens through Clerk SDK; do not persist bearer tokens in localStorage.
- [ ] Resolve each Clerk subject to one internal `users` record; MongoDB is authoritative for role/status/profile.
- [ ] Reject missing, pending, suspended, deactivated, and deleted mappings consistently.
- [ ] Verify and deduplicate Clerk webhooks before synchronizing identity fields.
- [ ] Require verified email/phone and MFA/step-up for privileged admin actions according to policy.
- [ ] Prevent public creation/promotion of partner, expert, or admin roles.
- [ ] Revoke sessions or force reauthentication after high-risk role/status/security changes.
- [ ] Prove in automated tests that development auth cannot run when `NODE_ENV=production`.

## 2. Authorization and IDOR prevention

- [ ] Apply route-level role guard and database-level owner/current-assignment filter to every protected resource.
- [ ] Treat reassignment as immediate revocation for the previous assignee.
- [ ] Use 404 for inaccessible specific resources where appropriate; do not leak owner/assignee details.
- [ ] Separate read, update, review, replacement, assignment, refund, export, and settings permissions.
- [ ] Never accept role, owner, actor, assignment, verification, payment status, counters, wallet, or audit fields from ordinary client DTOs.
- [ ] Use explicit allowlists for self-service profile edits and admin edits.
- [ ] Add table-driven negative tests for all role/resource combinations in `AUTHORIZATION_MATRIX.md`.
- [ ] Audit privileged reads (documents/exports) and all state-changing admin operations.

## 3. Input validation and API edge

- [ ] Validate params/query/body with Zod or equivalent before controller execution; reject unknown sensitive fields.
- [ ] Retain service-level cross-record validation and Mongoose constraints.
- [ ] Cap URL/query/header/body/multipart sizes and field counts; set request/provider timeouts.
- [ ] Escape/limit regex search or use indexed search; disallow arbitrary sort/database operator input.
- [ ] Validate ObjectIds without exposing cast errors.
- [ ] Sanitize only for the intended output context; React escaping does not make unsafe URLs valid.
- [ ] Allow only HTTPS or safe relative CMS links; reject `javascript:`, `data:`, malformed protocols, and unsafe redirects.
- [ ] Configure Helmet/CSP intentionally and remove `X-Powered-By`.
- [ ] Configure exact HTTPS CORS allowlist; never wildcard credentials.
- [ ] Configure trusted proxies narrowly so client IP and secure protocol cannot be spoofed.

## 4. Rate limits and abuse controls

- [ ] Global per-IP burst and sustained limits.
- [ ] Stricter authentication/profile-sync, OTP, tracking, upload, support, export, payment, and webhook-specific limits.
- [ ] OTP limits by normalized phone, internal user, IP, device/session, and time window; resend cooldown and attempt lockout.
- [ ] CAPTCHA on anonymous/high-abuse surfaces and application submission as configured; validate server-side.
- [ ] Upload quota by user/application/day in addition to per-request ceilings.
- [ ] Return 429 with safe message and `Retry-After`; do not reveal account/phone existence.
- [ ] Use Redis-backed distributed limiting once the API has multiple replicas; fail safely for high-risk endpoints.

## 5. File and document security

- [ ] Accept only allowlisted MIME types, matching extension, valid magic bytes, permitted field, count, per-file and total size.
- [ ] Consider malware scanning/quarantine before reviewers download user files.
- [ ] Sanitize display filename; generate storage names/folders server-side.
- [ ] Use Multer memory storage only with strict concurrency/memory/request ceilings; monitor process memory.
- [ ] Upload through backend. Never accept frontend-provided Cloudinary URL/public ID as proof of upload.
- [ ] Use private/authenticated Cloudinary delivery and short-lived server-authorized URLs.
- [ ] Safe API metadata must exclude permanent URL, public ID, provider signature, and secrets.
- [ ] Set `Cache-Control: no-store, private` on metadata/access endpoints.
- [ ] Reauthorize each preview/download; audit actor/action/resource/request ID.
- [ ] Replacement requires explicit request, preserves old metadata as non-current, and cannot modify terminal applications without policy.
- [ ] Roll back newly uploaded assets on DB failure; durable retry/reconciliation handles cleanup failure.
- [ ] CMS uploads receive the same signature/type/size protections and safe transformation policy.

## 6. OTP security

- [ ] Normalize phone consistently; bind challenge/token to user, phone, purpose, expiry, and nonce.
- [ ] Generate OTP using cryptographically secure randomness; hash/HMAC before storage with a dedicated rotatable secret.
- [ ] Five-minute OTP expiry, resend cooldown, attempt limit, and hourly/daily send caps.
- [ ] Constant-time hash/signature comparison.
- [ ] Send through provider adapter using approved templates; never return OTP outside explicit local/test mode.
- [ ] Signed verification token expires quickly, is stored hashed, and is consumed atomically once during submission.
- [ ] If applicant phone exactly matches Clerk's currently verified phone, issue the purpose-bound one-use token without SMS; still enforce replay protection.
- [ ] Never log OTP, verification token, full phone, provider auth data, or SMS body containing OTP.
- [ ] Current code gap closed: application submission calls token consumption and sets `mobileVerified: true` only on success.

## 7. Payment security

- [ ] Compute service/additional charge/discount/tax totals on backend from immutable snapshots and approved rules; use integer minor units.
- [ ] Never mark paid from frontend callback, query string, screenshot, or client body.
- [ ] Verify gateway webhook against raw body and correct environment secret; enforce maximum body size.
- [ ] Deduplicate unique provider events and orders; make reconciliation idempotent and transactional.
- [ ] Compare amount, currency, order, merchant, and application before applying payment.
- [ ] Store provider references, not card/UPI credentials or unnecessary payload PII.
- [ ] Refund command is admin-authorized, reasoned, capped to refundable balance, idempotent, audited, and reconciled asynchronously.
- [ ] Receipt is generated only after verified settlement and downloaded through authorization.
- [ ] Alert on signature failures, webhook lag, amount mismatch, repeated failures, and paid-without-application anomalies.

## 8. Data, database, and privacy

- [ ] Atlas TLS, least-privilege environment-specific DB users, network restriction/private endpoint, monitoring, and point-in-time backups.
- [ ] Mongo transactions available; transient retries bounded and tested.
- [ ] Unique/partial indexes enforce identity, idempotency, one active assignment, webhook event, and receipt invariants.
- [ ] Sensitive fields use `select: false` and explicit projections; API serializers are allowlists.
- [ ] Encrypt provider secrets in secret manager and rely on managed encryption at rest; add field-level encryption only for a defined threat/legal need.
- [ ] Define and approve retention, deletion, legal hold, export, and account-erasure/pseudonymization procedures.
- [ ] Test backup restoration and MongoDB/Cloudinary reference reconciliation.
- [ ] Do not run seeds, migrations, index drops, or production data fixes at app startup.

## 9. Secrets and configuration

- [ ] No secrets in Git, frontend build, logs, error responses, screenshots, analytics, or client-visible source maps.
- [ ] Separate secrets/accounts per environment and enforce non-placeholder production startup validation.
- [ ] Rotate Clerk, DB, Cloudinary, OTP, payment, SMS, email, and webhook secrets with documented owner/procedure.
- [ ] Use least-privilege provider keys and restrict origin/IP/webhook settings where supported.
- [ ] Store only non-secret, allowlisted runtime settings in admin `platformsettings`; secret keys can never be created there.
- [ ] Scan repository/history and dependencies in CI; respond to high/critical findings before release.

## 10. Logging, errors, and observability

- [ ] Assign/propagate request ID; structured logs use route templates and stable error codes.
- [ ] Central `ApiError`/error middleware hides 5xx details and maps validation/database/provider errors predictably.
- [ ] Do not log passwords, tokens, cookies, OTPs, full Mongo URI, provider secrets, signed URLs, raw form data, personal documents, payment payloads, or unnecessary PII.
- [ ] Redact audit before/after values and set tamper-resistant retention/access rules.
- [ ] Sentry/APM scrubbing tested; source maps uploaded privately to error provider if used.
- [ ] Monitor authorization denies, OTP abuse, document access spikes, admin exports, webhook anomalies, cleanup/outbox backlog, and account changes.
- [ ] Liveness/readiness reveal no secrets, versions, topology, or raw dependency errors publicly.

## 11. Frontend and browser security

- [ ] Production route guards wait for verified internal role/status; no protected data is embedded in static assets.
- [ ] CSP allows only required origins; prevent arbitrary CMS HTML/script injection.
- [ ] External links use safe schemes and `rel="noopener noreferrer"` where applicable.
- [ ] Do not cache personal API responses in service workers/shared caches.
- [ ] Clear sensitive form/file previews on unmount/logout; avoid long-lived browser storage for form PII.
- [ ] Display generic auth/OTP/tracking errors that resist enumeration.
- [ ] Dependency lockfile, build provenance, and private source map policy are documented.

## 12. Threat-to-control matrix

| Risk | Primary controls | Required proof |
|---|---|---|
| IDOR | owner/current-assignment query filters, safe 404, negative tests | cross-user document/application/payment tests |
| Broken role checks | Mongo-authoritative role, route guard, separate admin DTOs | all four-role route matrix |
| Privilege escalation/mass assignment | strict schemas/allowlists, audited role changes | forged payload tests |
| Unrestricted upload | count/size/MIME/extension/magic-byte validation, private delivery, scanning | malformed/polyglot/oversize tests |
| Signed URL leakage | short TTL, no-store, no permanent URLs in DTO/logs | expiry/regeneration and serializer tests |
| OTP brute force/replay | multi-key limits, HMAC, attempt lockout, one-use atomic consume | race/reuse/expiry tests |
| Duplicate payment webhook | raw signature, unique event/order, idempotent transaction | duplicate/out-of-order/amount-mismatch tests |
| Lead data leakage | pre-acceptance allowlist, eligibility, atomic assignment | serializer and unauthorized lead tests |
| XSS/unsafe CMS link | structured content, React escaping, URL allowlist, CSP | malicious URL/content tests |
| Sensitive logging | centralized redaction and provider scrubbing | automated log capture assertions |

## 13. Incident response minimum

- [ ] Named severity/on-call/escalation contacts.
- [ ] Ability to suspend user/admin, revoke Clerk sessions, rotate keys, disable provider/feature, and block abusive IP/ranges.
- [ ] Preserve audit/log evidence with access controls and synchronized timestamps.
- [ ] Runbooks for credential leak, account takeover, document exposure, OTP abuse, payment mismatch, malicious upload, and data loss.
- [ ] Regulatory/customer notification obligations and decision owners documented.
- [ ] Post-incident review produces tracked corrective actions and tests.
