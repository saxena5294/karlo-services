# Application Lifecycle

## Overview

Applications are the central workflow record for every service request. The application document stores the current state and current assignment pointers; append-only collections retain timeline, status, assignment, document-verification, comment, note, and audit history.

Application numbers are reserved atomically from a per-year counter and formatted as `KARLO-YYYY-000001`. The application number also has a unique database index. Reservations may contain gaps after failed submissions, but they cannot be duplicated.

## Canonical statuses

- `Pending`
- `Submitted`
- `In Review`
- `Assigned`
- `Documents Required`
- `Waiting For Documents`
- `Documents Uploaded`
- `Payment Verified`
- `Verification Pending`
- `Verified`
- `Processing`
- `Awaiting Admin Review`
- `Approved`
- `Completed`
- `Delivered`
- `Rejected`
- `Cancelled`
- `Archived`

Legacy lowercase values remain readable through the application status normalizer.

Assignment target remains separate from status. `assignmentType`, `assignedExpertId`, and `assignedPartnerId` provide efficient dashboard queries, while `applicationassignments` retains the complete transfer/reassignment history and enforces one active assignment.

## Configurable transition graph

The constants in `backend/src/constants/applicationConstants.js` define the safe default graph. Administrators can edit enabled stages and allowed transitions from **Admin → Settings → Application lifecycle**.

The persisted singleton is stored in `applicationworkflowconfigs`. Updates:

- accept only canonical statuses;
- reject duplicate statuses, duplicate transition sources, self-transitions, and references to disabled statuses;
- prevent disabling a status currently used by an active application;
- record the administrator and an audit event.

Status mutation resolves the persisted graph at runtime and falls back to the default graph when no custom configuration exists. The REST endpoints are:

- `GET /api/admin/application-workflow`
- `PUT /api/admin/application-workflow`

## History and visibility

`applicationtimelines` is append-only and records status, assignment, document, verification, workflow, comment, and note events. Each event includes its timestamp, actor ID, actor role, action, description, visibility, and metadata.

- Public events are visible in the customer workflow timeline.
- Internal events are visible only to authorized internal roles.
- Public and internal comments are stored separately in `applicationcomments`.
- Admin-only notes are stored in `applicationnotes`; create, edit, and delete actions also create internal timeline and audit entries.
- Security-sensitive audit records remain in `auditlogs` and are not exposed through customer workflow APIs.

Previous status and assignment records are never overwritten.

## Archive, delete, and restore

Archive is both a lifecycle state and a query flag. Archiving stores `statusBeforeArchive`, sets `Archived`, and records actor/time metadata. Unarchiving restores the prior state.

Admin delete is a soft delete: it retains all workflow history, archives the application, and removes it from normal role-scoped queries. An administrator can restore it through:

- `POST /api/admin/applications/:id/restore`

Restore clears delete/archive metadata, restores the pre-archive status, and appends timeline and audit events.

## Documents

Required, additional, replacement, and completion documents use Cloudinary authenticated delivery and safe API projections. Storage IDs and permanent URLs are not returned to clients.

Document review states are:

- `pending`
- `verified`
- `rejected`
- `reupload_required`

Admin, the active expert, and the active partner can review documents. Replacement requires an explicit re-upload request. Admin deletion is soft in MongoDB and removes the Cloudinary asset after the database transaction succeeds.

## Operational controls and reports

Admin application queries support pagination, sorting, global search, status, priority, service, partner, expert, assignment, date, archive/delete, and processing-day filters.

Reports exclude soft-deleted records and include:

- today, pending, processing, completed, and rejected totals;
- completion and rejection rates;
- average actual processing time;
- applications by status, service, partner, expert, and submission date.

Expected and actual completion dates are stored on the application. Overdue state is calculated when an expected date has passed and no actual completion date exists.

## Authorization

All admin lifecycle configuration, archive, delete, restore, notes, assignment, and override routes use the shared admin role guard. Customer, expert, and partner reads are owner/current-assignee scoped. The current development identity middleware preserves the contract expected by Clerk: `req.auth.userId` and `req.auth.role`.

When Clerk is connected, replace only the authentication adapter; keep the role and resource-ownership guards.
