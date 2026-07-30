# Customer Documents

## Architecture

The customer document vault is separate from embedded application uploads:

- `customerdocuments` stores ownership, application/service links, current metadata, verification, expiry, lock, deletion, and counters.
- `customerdocumentversions` stores append-only file versions. Replacing or restoring a version never destroys history.
- Existing application uploads remain unchanged.
- Linked vault documents contribute to the existing application required-document checklist.

Customer identity uses the existing Clerk-compatible string user ID contract (`req.auth.userId`). Application and service links use MongoDB references.

## Storage and validation

The module reuses Multer memory storage, `uploadBuffer`, Cloudinary authenticated delivery, short-lived backend-generated access URLs, and the existing binary-signature checks.

Files are stored below:

```text
karlo-services/customers/{customerUserId}/documents/{documentType}
```

Accepted formats are PDF, JPG/JPEG, PNG, and WEBP. MIME type, extension, file size, and binary signature must agree. `CUSTOMER_DOCUMENT_MAX_MB` controls the upload ceiling and is clamped to 1–25 MB.

Cloudinary public IDs, asset IDs, versions, folders, delivery types, and stored URLs are excluded from normal MongoDB projections and API responses.

## Authorization

- Customers can access only their own active documents.
- Partners and experts can access only documents linked to an application currently assigned to them.
- Admin has operational access to active and deleted records, locks, restore, verification, and version restore.
- Customers cannot replace locked or verified documents, or documents used by applications under processing, except when re-upload has explicitly been requested.
- Customers cannot delete a document linked to an active application.

Every preview and download request revalidates authorization before issuing a five-minute delivery URL.

## Verification, expiry, and locking

Verification states are `pending`, `under_review`, `verified`, `rejected`, and `reupload_required`. Customer-visible and internal remarks are stored separately. Internal remarks are never selected for customer queries.

Verification automatically locks a document. A re-upload request unlocks it, and replacement resets verification to pending.

Expiry is calculated by the backend as `valid`, `expiring_soon`, `expired`, or `no_expiry`. `DOCUMENT_EXPIRY_WARNING_DAYS` controls the warning window.

## Routes

All routes are under `/api/customer-documents` and use the shared authentication adapter:

- `GET /types`
- `POST /`
- `GET /my`
- `GET /`
- `GET|PUT|DELETE /:id`
- `GET /:id/preview`
- `GET /:id/download`
- `POST /:id/replace`
- `POST /:id/restore`
- `GET /:id/versions`
- `GET /:id/versions/:versionId/download`
- `POST /:id/versions/:versionId/restore`
- `PATCH /:id/verify`
- `PATCH /:id/lock`
- `PATCH /:id/unlock`

Lists use server-side search, filtering, sorting, pagination, controlled population, and safe field selection.

## Audit

The existing `auditlogs` collection records uploads, updates, previews, downloads, replacements, verification outcomes, locks, unlocks, soft deletes, restores, and historical-version restoration. File buffers and private Cloudinary metadata are excluded by the audit sanitizer.
