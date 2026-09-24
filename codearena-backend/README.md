# CodeArena backend

Node.js backend for CodeArena: an **Express 5 REST API** on **MySQL (Sequelize)** with **Google sign-in**, plus **live presence** over WebSockets, all on one port.

## Structure (MVC)

```
src/
  index.js                 Starts HTTP server: REST API + presence WebSocket, graceful shutdown
  app.js                   Express app: security headers, CORS, JSON, routes, error handling
  config/
    env.js                 Loads and validates .env (fails fast with a clear message)
    database.js            Sequelize connection (MySQL; SQLite only for tests)
  models/                  Sequelize models + associations (M)
    User, Session, ProblemProgress, DesignProgress, DesignAttempt, Entitlement
  controllers/             HTTP in/out only: read request, call a service, send response (C)
    auth.controller.js, progress.controller.js, health.controller.js
  routes/                  URL → middleware → controller
    index.js (/api), auth.routes.js (/api/auth), progress.routes.js (/api/progress)
  services/                Business logic, no HTTP
    google.service.js      Verifies Google ID tokens
    token.service.js       Access JWTs, refresh-token sessions, rotation, reuse detection
    user.service.js        Create/find users from Google accounts
    progress.service.js    Read/write progress
  middleware/              requireAuth, validate (zod), checkOrigin (CSRF), rateLimits, errorHandler
  validators/              Request schemas (zod)
  db/
    migrations/            Versioned schema changes
    migrator.js, migrate.js, createDatabase.js
  presence/                Live "● N online" per page
  data/catalog.json        Valid problem/question ids (generated from the frontend)
  utils/                   HttpError, catalog lookups
test/                      API tests (in-memory SQLite, Google stubbed) + presence tests
```

A request flows **route → middleware (auth, validation, rate limit) → controller → service → model**. Errors thrown anywhere become `{ "message": "…" }` with the right status.

## Setup

### 1. Google OAuth client
1. [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → OAuth consent screen**: set it up (External, app name, support email). Scopes: the default `email`, `profile`, `openid` are all you need.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
4. Under **Authorised JavaScript origins** add every frontend URL, e.g. `http://localhost:5173` (and your production domain later). No redirect URIs are needed; sign-in uses Google's popup button.
5. Copy the **Client ID**. It goes in both `codearena-backend/.env` (`GOOGLE_CLIENT_ID`) and `codearena-frontend/.env.local` (`VITE_GOOGLE_CLIENT_ID`). There's no client secret to store: the ID-token flow doesn't use one.

### 2. Environment
```bash
cd codearena-backend
cp .env.example .env
```
Fill in `DB_*`, `GOOGLE_CLIENT_ID` and a random `JWT_ACCESS_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Database
```bash
npm install
npm run db:create     # creates DB_NAME (utf8mb4) if it doesn't exist
npm run db:migrate    # creates the tables
```
`npm run db:status` shows applied/pending migrations; `npm run db:rollback` undoes the last one.

### 4. Run
```bash
npm run dev           # API http://localhost:4000/api, presence ws://localhost:4000/presence
```

### 5. Point the frontend at it
In `codearena-frontend/`, create `.env.local`:
```
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=<same client id>
```
Restart `npm run dev` in `codearena-frontend/`. The app now shows **Continue with Google** and saves progress to MySQL.

## Security notes
- Google ID tokens are verified server-side (signature, expiry, audience, verified email).
- Access token: 15-minute JWT, kept in memory by the frontend (not localStorage).
- Refresh token: random, `httpOnly` cookie, stored only as a SHA-256 hash, rotated on every use, revocable per device; reuse after rotation revokes all sessions.
- `refresh`/`logout` check `Origin` against `CLIENT_ORIGINS` (CSRF); CORS allows only those origins.
- Input validated with zod (unknown fields rejected; problem/question ids checked against the catalogue); helmet headers; JSON body limit; rate limits on sign-in and writes.
- Known: `npm audit` reports a moderate issue in `uuid` inside Sequelize. It only affects a code path we don't use (passing a buffer to uuid); the suggested fix downgrades Sequelize to v3, so don't run `npm audit fix --force`.

## Deploying
- Host: Render, Railway, Fly.io or a VPS (needs long-lived WebSockets). Managed MySQL: PlanetScale-compatible, Aiven, Railway MySQL, or AWS RDS.
- Set `NODE_ENV=production` (secure cookies, trusted proxy), `CLIENT_ORIGINS=https://your-site`, and run `npm run db:migrate` on each deploy before starting.
- If the API and site are on **different domains** (e.g. `*.vercel.app` + `*.onrender.com`), set `COOKIE_SAMESITE=none` (requires HTTPS). Easier: put the API on a subdomain of your site (`api.your-domain.com`) and keep `lax`.
- Frontend build: `VITE_API_URL=https://api.your-domain.com`, `VITE_PRESENCE_URL=wss://api.your-domain.com/presence`.

## Tests
```bash
npm test
```
Runs the real migrations on in-memory SQLite, with Google verification stubbed: sign-in, refresh rotation, two-tab refresh race, theft detection, logout, CSRF origin check, every progress endpoint, validation, and presence.

## Presence protocol

| Direction | Message |
|---|---|
| client → server | `{ "type": "join", "page": "/dsa", "clientId": "<uuid>" }` |
| client → server | `{ "type": "leave" }` (tab hidden) |
| server → client | `{ "type": "count", "page": "/dsa", "count": 12 }` |
