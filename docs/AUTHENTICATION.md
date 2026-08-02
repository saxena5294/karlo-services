# Clerk authentication and MongoDB authorization

Karlo Services uses Clerk only for registration, email verification, password recovery, social login, sessions, and logout. The `users` MongoDB collection is the source of truth for the business role and account state.

## Request flow

1. React obtains the active Clerk session token and sends it as `Authorization: Bearer <token>`.
2. `clerkMiddleware` validates the session token and its authorized party.
3. `requireAuth` resolves the Clerk user ID to the MongoDB `User` profile. The first authenticated request creates a customer profile if one does not exist.
4. `requireCustomer`, `requirePartner`, `requireExpert`, or `requireAdmin` checks the MongoDB role. Partner and expert business routes additionally require an approved account.
5. Existing services continue to receive the immutable Clerk ID through `req.auth.userId`, preserving ownership and assignment contracts.

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

To promote an existing, already-signed-in Clerk user through the approved seed workflow:

```powershell
cd backend
npm run promote:admin -- user_CLERK_ID
```

## Operational notes

- Keep `CLERK_SECRET_KEY` only on the backend.
- Use HTTPS in production and list every trusted frontend origin in `CLERK_AUTHORIZED_PARTIES`.
- Existing accounts must sign in once to create their MongoDB identity profile before role promotion.
- A `401` means the Clerk session is absent, expired, or invalid. A `403` means the MongoDB role/status does not permit the operation.
