# Clerk Authentication Setup

This replaces the outdated version of this file, which referenced a
`server/server/` folder and endpoints (`/api/profile`, `/api/events`) that
don't exist in this codebase. Below matches the actual GameOn app.

## 1. Create a Clerk account and application

1. Go to https://clerk.com and sign up (free).
2. Create a new application in the dashboard.
3. In **Configure → API Keys**, copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## 2. Set environment variables

This project uses a single `.env` file at the repo root (see
`.env.example`), read by `docker-compose.yml` and injected into both
containers:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

If you're running the server without Docker, `server/index.js` calls
`require('dotenv').config()`, so a `.env` file in `server/` also works —
but keeping one root-level `.env` (as `docker-compose.yml` expects) is
simpler.

## 3. How auth actually works here

- **Frontend** (`client/src/App.tsx`): `<ClerkProvider>` wraps the app.
  `SignedIn` / `SignedOut` gate routes; `client/src/context/AuthContext.tsx`
  grabs a Clerk session token via `useAuth().getToken()` and hands it to
  `lib/api.ts`, which attaches it as `Authorization: Bearer <token>` on
  every request.
- **Backend** (`server/middleware/requireAuth.js`): verifies that Bearer
  token against Clerk using `@clerk/backend`'s `verifyToken()` (checks the
  signature, expiry, and issuer — not just decoded, actually verified),
  then loads the matching MongoDB `User` by `clerkId`.
  - `verifyClerkToken` — verifies the token only, no DB lookup. Used on
    `/api/auth/*` since a first-time user won't have a DB record yet.
  - `requireAuth` — verifies the token AND requires a DB user. Used on
    everything else.
  - `requireAdmin` — additionally requires `user.role === 'admin'`. Used
    on `/api/analytics/*` and `POST /api/courts/seed`.
- **Socket.io** (`server/socket/socketServer.js`): the client connects with
  a live Clerk token (`client/src/lib/socket.ts`), and the server verifies
  it the same way before allowing the connection.

## 4. Becoming an admin

There's no admin UI to promote yourself. Instead, set `ADMIN_EMAILS` in
`.env` to a comma-separated list of emails (e.g. your own) before your
first sign-in. `POST /api/auth/sync` checks this list and sets
`role: 'admin'` on that user's first-ever sync. To promote someone later,
update their user document's `role` field directly in MongoDB.

## 5. Run it

```bash
docker-compose up --build
```

Then open http://localhost:5173 — you'll be redirected to Clerk's hosted
sign-in page, and land on the GameOn dashboard after authenticating.
