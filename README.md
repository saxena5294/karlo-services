# Karlo Services

A MERN application for browsing digital services, submitting MongoDB-configured dynamic forms, uploading documents through the backend to Cloudinary, and tracking applications.

## Setup

Backend environment (`backend/.env`):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/karlo
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=REPLACE_WITH_REAL_CLOUD_NAME
CLOUDINARY_API_KEY=REPLACE_WITH_REAL_API_KEY
CLOUDINARY_API_SECRET=REPLACE_WITH_REAL_API_SECRET
```

Frontend environment (`frontend/.env`):

```env
VITE_API_URL=http://localhost:5000/api
```

Cloudinary credentials belong only in `backend/.env`. Never add them to a `VITE_` variable.

Install, seed form configurations without replacing existing records, and run:

```powershell
cd backend
npm install
npm run seed:forms
npm run dev

cd ../frontend
npm install
npm run dev
```

Run `npm run seed:services` only if the services collection is empty. The service and form seed scripts use upserts and preserve existing records.

## API

- `GET /api/services` — list active services; supports `category`, `popular`, and `search` query parameters.
- `GET /api/services/:slug` — service details.
- `GET /api/services/:slug/form` — service and active dynamic form configuration.
- `POST /api/applications/:slug` — submit `multipart/form-data`; file field names must match the form configuration.
- `GET /api/applications/track/:applicationNumber` — public, privacy-safe application status.

Uploads accept PDF, JPG, PNG, and WEBP files. Dynamic forms default to 5 MB per file,
may configure a lower or higher per-field limit, and have a 25 MB hard ceiling and
10-file limit per application.

## Test the flow

1. Start MongoDB, add real backend environment values, and run `npm run seed:forms` from `backend`.
2. Start the backend and frontend development servers.
3. Open `/services`, choose a service, review `/services/:slug`, and select **Apply now**.
4. Complete the fields and upload a supported document on `/services/:slug/apply`.
5. Save the returned `KARLO-...` application number.
6. Open `/track`, submit the number, and confirm the service, status, and history appear.
7. Confirm MongoDB contains the application and Cloudinary metadata, and that the actual file exists in Cloudinary under `karlo-services/<application-number>`.

Login and registration are placeholders for a future Clerk integration.

## Retailer to expert compatibility migration

Back up MongoDB, then run `npm run migrate:expert-roles` from `backend`. The idempotent
normalizer copies legacy `customerId`, `assignedRetailerId`, and `retailerUserId` values
into the canonical fields, marks only the latest assignment history row active, changes
legacy retailer notifications to expert, and defaults existing services/applications to
`fulfillmentType: internal`. The existing `retailerprofiles` MongoDB collection is retained
intentionally and is read through the `ExpertProfile` model.

The `/api/retailer` API, `/retailer` frontend route, old admin retailer endpoints, legacy
request field `retailerId`, and response aliases remain temporarily available. New clients
should use `/api/expert`, `/expert`, `/api/admin/experts`, and canonical assignment fields.

## Partner Marketplace development data

Set `DEV_USER_ID=dev_partner_001` and `DEV_USER_ROLE=partner` in both development
environments. After services and at least one `partner` or `hybrid` application exist, run:

```powershell
cd backend
npm run seed:partner-marketplace
```

This idempotently creates an approved sample partner and, when an eligible unassigned
application exists, one privacy-safe open lead. Admins can also publish a lead from a
partner/hybrid application through the application details page or
`POST /api/admin/applications/:id/publish-lead`.

Partner routes are under `/partner`; marketplace APIs are under `/api/partner`. Lead
acceptance and application assignment run in one MongoDB transaction, so local MongoDB
must be configured as a replica set, matching the existing application workflow.

Run validation with:

```powershell
cd backend
npm test

cd ../frontend
npm run lint
npm run build
```

Before acceptance, lead responses use a strict allowlist and exclude application numbers,
customer identity/contact data, dynamic form data, uploaded documents, and remarks.
Accepted application details are owner-scoped to `assignedPartnerId`.

## Admin Business Control Center

Use `DEV_USER_ID=dev_admin_001` and `DEV_USER_ROLE=admin` only in development. Admin
pages are under `/admin`; all APIs are under `/api/admin` and use the shared admin role
guard. Customer, expert, and partner development identities receive HTTP 403. Temporary
development auth remains unavailable when `NODE_ENV=production`.

The admin module manages application assignments, expert capacity, partner verification,
lead lifecycle, services and forms, reports, CMS content, non-secret settings, and redacted
audit history. Lead acceptance/manual assignment and the underlying application assignment
remain transactional and require MongoDB replica-set support.

No destructive data migration is required. Existing expert records remain in the
`retailerprofiles` collection; new `categories`, `skills`, and `availability` fields use
schema defaults. Existing form file fields default to 5 MB. MongoDB creates the new
`auditlogs`, `contententries`, and `platformsettings` collections and indexes when first
used. In production, run index synchronization through the normal deployment process
rather than dropping or recreating existing collections.
