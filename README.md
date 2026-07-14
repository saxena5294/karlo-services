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

Uploads accept PDF, JPG, PNG, and WEBP files, up to 10 MB each and 10 files per application.

## Test the flow

1. Start MongoDB, add real backend environment values, and run `npm run seed:forms` from `backend`.
2. Start the backend and frontend development servers.
3. Open `/services`, choose a service, review `/services/:slug`, and select **Apply now**.
4. Complete the fields and upload a supported document on `/services/:slug/apply`.
5. Save the returned `KARLO-...` application number.
6. Open `/track`, submit the number, and confirm the service, status, and history appear.
7. Confirm MongoDB contains the application and Cloudinary metadata, and that the actual file exists in Cloudinary under `karlo-services/<application-number>`.

Login and registration are placeholders for a future Clerk integration.
