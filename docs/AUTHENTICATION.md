# Clerk authentication and MongoDB authorization

Karlo Services uses Clerk only for registration, email verification, password recovery, social login, sessions, and logout. The `users` MongoDB collection is the source of truth for the business role and account state.

## Request flow

1. React obtains the active Clerk session token and sends it as `Authorization: Bearer <token>`.
2. `clerkMiddleware` validates the session token and its authorized party.
3. `requireAuth` resolves the Clerk user ID to the MongoDB `User` profile. The first authenticated request creates a customer profile if one does not exist.
4. `requireCustomer`, `requirePartner`, `requireExpert`, or `requireAdmin` checks the MongoDB role. Partner and expert business routes additionally require an approved account.
5. Existing services continue to receive the immutable Clerk ID through `req.auth.userId`, preserving ownership and assignment contracts.

After sign-in, Clerk always returns to `/auth/redirect`, which loads `GET /api/auth/me` and routes from the MongoDB role. After sign-up, Clerk returns to `/auth/onboarding`, where the authenticated user chooses Customer, Partner, or Expert. Partner and Expert choices call protected backend onboarding endpoints; the browser never decides the persisted role by itself.

Clerk metadata is never read for a Karlo business role.

## Configuration

Copy both `.env.example` files and set:

- Frontend: `VITE_CLERK_PUBLISHABLE_KEY`
- Backend: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES`

In Clerk, allow the frontend origin and configure `/login` and `/register` as the hosted component routes. Clerk's built-in flows provide email verification and password reset.

## Roles and approval

- Customer signup creates an active customer account and permits immediate dashboard access after required profile fields are completed.
- Partner and expert signup changes the MongoDB role and account status to `pending`. Partner business details and expert skills are collected before review.
- The existing Admin Partners and Admin Experts screens approve, reject, suspend, or deactivate registrations. Approval updates both the business profile and the authoritative `User` record.
- Public registration cannot request the admin role.
- Public Partner and Expert onboarding uses `POST /api/auth/onboarding/partner` and `POST /api/auth/onboarding/expert`. Both require a valid Clerk session and an existing MongoDB user without a conflicting business role.

To promote an existing, already-signed-in Clerk user through the approved seed workflow:

```powershell
cd backend
npm run promote:admin -- user_CLERK_ID
```

The command intentionally refuses to create a missing profile. If it reports that the profile is missing, first confirm the frontend and backend use the same Clerk instance, restart both servers after changing environment values, sign in, and complete an authenticated `GET /api/auth/me` request.

For local environment-driven setup, set `ADMIN_CLERK_USER_ID` only in `backend/.env` and run `npm run promote:admin:env`. Never put this value in a `VITE_` variable.

## Operational notes

- Keep `CLERK_SECRET_KEY` only on the backend.
- Use HTTPS in production and list every trusted frontend origin in `CLERK_AUTHORIZED_PARTIES`.
- Existing accounts must sign in once to create their MongoDB identity profile before role promotion.
- A `401` means the Clerk session is absent, expired, or invalid. A `403` means the MongoDB role/status does not permit the operation.
