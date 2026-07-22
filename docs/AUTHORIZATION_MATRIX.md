# Authentication and Authorization Design

## 1. Security model

Karlo Services has exactly four active roles: `customer`, `partner`, `expert`, and `admin`. A role alone never grants access to a specific record.

```text
Authentication: Who is this Clerk subject?
Authorization: May this internal role perform this action class?
Resource policy: Does this user own, currently hold, or administer this exact record?
Business guard: Is the action valid in the resource's current state?
```

All four checks run server-side. Frontend guards only improve navigation and user experience.

## 2. Clerk and MongoDB contract

Clerk owns sign-up, login, sessions, identity verification, and account recovery. MongoDB owns internal ID, role, status, profile link, application relationships, assignments, and permissions.

```js
// users
{
  clerkUserId: "user_...",
  role: "customer",
  status: "active",
  profileType: "customer",
  profileId: ObjectId("..."),
  createdAt: Date,
  updatedAt: Date
}
```

The authenticated backend context is:

```js
req.auth = {
  userId: "internal MongoDB user id",
  clerkUserId: "verified Clerk subject",
  role: "customer|partner|expert|admin",
  status: "active"
};
```

### Token flow

1. Clerk frontend SDK obtains a short-lived token for the API audience/template.
2. Axios request interceptor sets `Authorization: Bearer <token>`. It does not cache tokens in localStorage and does not send development role headers in production.
3. Backend verifies signature/JWKS, issuer, audience, time claims, and authorized party where configured.
4. Backend looks up `users.clerkUserId`, derives internal role/status/profile, and freezes `req.auth`.
5. Missing mapping returns `PROFILE_SETUP_REQUIRED` unless a specifically authorized idempotent sync flow creates a default customer.
6. `pending`, `suspended`, `deactivated`, or soft-deleted users are rejected before business controllers. Read-only access during suspension, if legally required, must be an explicit policy—not an accidental exception.

Clerk metadata may display a role hint but cannot override MongoDB. Role/status updates are admin-only, audited, and invalidate/correct cached authorization promptly.

## 3. Role-permission matrix

Legend: **Own** = record owned by internal user; **Assigned** = current assignment equals internal user and assignment type; **All** = admin scope still subject to purpose/audit/business rules.

| Resource/action | Customer | Partner | Expert | Admin |
|---|---|---|---|---|
| Public services/forms/CMS | Read active | Read active | Read active | Read + manage |
| Dashboard | Own summary | Own marketplace/work summary | Own work summary | Aggregate summary |
| Create application | Own identity | No | No | No; assisted submission requires a separately approved design |
| List/view applications | Own | Assigned | Assigned | All |
| Cancel application | Own, allowed early states only | No | No | Governed cancellation |
| Assign/reassign application | No | No | No | Yes |
| Change application status | Cancel only | Assigned allowed transitions | Assigned allowed transitions | Allowed transitions |
| Add customer-visible update | No | Assigned | Assigned | Yes |
| Add internal note | No | Assigned if policy allows | Assigned | Yes |
| View application documents | Own | Assigned | Assigned | All |
| Upload initial documents | During own submission | No | No | Exceptional admin upload only, audited |
| Upload requested replacement | Own | Assigned only when specifically permitted/requested | Policy-dependent; default no | Yes |
| Upload completion documents | No | Assigned | If expert completion output is added | Yes |
| Review/verify documents | No | No | Assigned only after explicit policy approval | Yes |
| Browse/accept leads | No | Approved, active, eligible; own acceptance | No | Publish/manage/manual assign |
| Partner profile | No | Own allowlisted fields | No | View/verify/manage |
| Expert profile | No | No | Own non-privileged fields | Create/manage/status |
| User directory | No | No | No | Paginated management projection |
| Notifications | Own inbox | Own inbox | Own inbox | Own + broadcast tooling only if added |
| Payments/receipts | Own | Own fees/wallet/payout views | Own compensation later | Reconcile/refund/report |
| Support tickets | Own | Own | Own when module enabled | Assigned/all management |
| Rewards/referrals | Own | Own | Not enabled | Manage/report |
| CMS/services/forms/settings | No | No | No | Yes |
| Reports/audit logs | No | Own statements only | Own work metrics only | Authorized admin access |

## 4. Resource policy rules

### Applications

- Customer: `customerUserId === req.auth.userId` (temporarily also support legacy `customerId`).
- Expert: `assignmentType === "expert" && assignedExpertId === req.auth.userId`.
- Partner: `assignmentType === "partner" && assignedPartnerId === req.auth.userId`.
- Admin: role is admin and account active; sensitive bulk/export actions may later require a named permission.
- Reassignment immediately revokes the previous assignee's access. Historical `applicationassignments` never grants current access.

### Documents

Document access first authorizes the parent application and then the action. Reading does not imply reviewing; reviewing does not imply replacement; replacement additionally requires `replacementRequested` and a current document. Return a safe document DTO only. Every view/download/review/replacement is audited with actor and application/document opaque IDs.

Current code correctly scopes reads to owner/current assignment/admin and restricts review to admin. The target expert-review option is intentionally gated by approval; do not silently broaden it.

### Leads

Before acceptance, partners receive an allowlisted projection without application number, identity/contact data, form data, documents, or remarks. The partner must be active, approved, available, and match service/category/area rules. Acceptance uses an atomic open/unassigned filter. After acceptance, normal current-assignment policy governs application access.

### Notifications, tickets, payments

- Notification: recipient user ID **and recipient role** match request identity.
- Ticket: creator user ID/role match, or admin policy; replies do not grant ownership.
- Payment/receipt: payer/customer ID matches, or admin finance permission; application ownership alone is checked too where applicable.

### Profiles

Self-edit DTOs exclude role, status, verification state, counters, wallet, rating, createdBy, user ID, and provider identifiers. Privileged edits use separate admin schemas and audit events.

## 5. Middleware composition

Recommended endpoint order:

```js
router.post(
  "/applications/:id/transitions",
  requestId,
  authenticateClerk,
  resolveInternalUser,
  requireActiveAccount,
  requireRole(ROLES.EXPERT),
  validateParams(applicationIdSchema),
  validateBody(expertTransitionSchema),
  loadAssignedApplication,       // query includes assignedExpertId
  controller.transition
);
```

Reusable policies should express `can(actor, action, resource)` only for simple decisions. Prefer authorized database queries for ownership to prevent time-of-check/time-of-use mistakes. Services still validate state and repeat critical invariants inside transactions.

## 6. Frontend access design

- `ClerkProvider` wraps the app.
- `AuthBootstrap` loads `/auth/me` and exposes session/internal user state.
- `RequireRole` waits for both Clerk and internal mapping, redirects unauthenticated users to login, sends incomplete profiles to onboarding, shows suspended state, and sends wrong roles to an authorized home page.
- Each dashboard layout receives its portal from verified internal role rather than URL inference alone.
- Axios asynchronously obtains the current token per request, handles a single 401 by letting Clerk refresh according to SDK behavior, and never loops/replays uploads automatically.
- Hide unauthorized controls, but assume requests can be forged.

## 7. Account provisioning and role changes

- Normal sign-up creates `customer` only after verified identity and acceptance of terms.
- Partner onboarding creates a pending partner profile through an approved enrollment process; becoming `partner` is an audited administrative/business decision.
- Experts and admins are invited/provisioned by authorized admins. Prevent creating the first/super admin through public APIs.
- A role change checks conflicting active assignments and profile readiness, writes an audit event, and revokes active sessions if risk warrants it.
- Clerk deletion/deactivation webhook marks the internal identity safely; it does not cascade-delete applications/payments/audit evidence.

## 8. Authorization error behavior

- Missing/invalid token: 401.
- Valid identity with suspended account: 403 `ACCOUNT_SUSPENDED`.
- Wrong coarse role: 403 `FORBIDDEN`.
- Specific record not owned/assigned: normally 404 `RESOURCE_NOT_FOUND` to reduce enumeration.
- Invalid action for current state: 409 `INVALID_STATE_TRANSITION`.
- Missing internal profile: 409 or 403 `PROFILE_SETUP_REQUIRED` (choose consistently).

Production responses do not reveal expected roles, owner IDs, assignee IDs, or whether an inaccessible object exists.

## 9. Required authorization tests

At minimum, every protected endpoint has positive and negative table-driven tests:

- customer cannot access admin APIs or another customer's application/documents/payment/ticket;
- partner cannot access expert-private APIs, unaccepted application details, mismatched leads, or a previous assignment;
- expert cannot access partner-private APIs or unassigned applications;
- admin can perform only permitted management actions and cannot bypass state/payment prerequisites;
- suspended/missing-profile users fail before controllers;
- forged role/owner fields do not affect authorization;
- document signed URLs are issued only after fresh authorization;
- reassignment revokes prior access immediately;
- all four canonical roles pass only their intended guards; unknown/obsolete role values fail closed.

## 10. Current-to-target mapping

Current development headers and `requireRole` already provide a useful interface and fail closed in production. Replace `developmentAuth` with `authenticateClerk + resolveInternalUser`; retain `requireRole` semantics and existing ownership filters. Keep development auth only behind `NODE_ENV !== production`, explicit enablement, loopback/trusted test environment, and automated tests proving it cannot activate in production.
