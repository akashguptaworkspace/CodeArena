# Backend API contract

The frontend switches to this API when `VITE_API_URL` is set. It's implemented in [codearena-backend/](../codearena-backend) (Express + MySQL/Sequelize).

- All bodies are JSON.
- Authenticated routes expect `Authorization: Bearer <token>` (JWT).
- Errors return a non-2xx status with `{ "message": "Human-readable reason" }` — the UI shows `message` directly.
- A `401` on any route signs the user out on the frontend.
- Enable CORS for the frontend origin (e.g. `http://localhost:5173`).

## Auth (Google sign-in only)

Sessions use two tokens:

- **Access token**: short-lived JWT (15 min) returned in the JSON body. The frontend keeps it in memory and sends `Authorization: Bearer <token>`.
- **Refresh token**: random, long-lived (30 days), set by the server as an `httpOnly` cookie `pg_refresh` scoped to `/api/auth`. Stored hashed in the `sessions` table and **rotated on every refresh**. Replaying an already-rotated token more than 60 s later revokes all of that user's sessions (theft detection).

All `/api/auth/*` calls must send cookies (`fetch(..., { credentials: "include" })`). `refresh` and `logout` reject requests whose `Origin` isn't in `CLIENT_ORIGINS` (CSRF protection).

### `POST /api/auth/google`
Body: `{ "credential": "<Google ID token from Google Identity Services>" }`
The server verifies the token with Google (signature, expiry, audience = `GOOGLE_CLIENT_ID`, verified email), creates the user on first sign-in, and starts a session.
Response `200`: `{ "accessToken": "<jwt>", "user": { "id": "1", "name": "Asha", "email": "asha@example.com", "avatarUrl": "https://…", "entitlements": [] } }` + `Set-Cookie: pg_refresh=…`
Errors: `400` missing credential, `401` invalid Google token or unverified email.

### `POST /api/auth/refresh`
Uses the `pg_refresh` cookie. Response `200`: same shape as sign-in, with a new (rotated) cookie.
Errors: `401` signed out / expired / revoked. `401` with `"code": "stale_refresh"` means another tab refreshed a moment ago: retry once after ~0.5 s.

### `POST /api/auth/logout`
Revokes this device's session and clears the cookie. Response `204`.

### `GET /api/auth/me` (auth)
Response `200`: `{ "user": { … same as above … } }`

## Progress

`problemId` is the LeetCode slug (e.g. `two-sum`) — see `src/data/problems.js`. Validate it against that list on the server.

Dates are the user's **local** day as `"YYYY-MM-DD"`, sent by the client. Store them as strings; don't convert to UTC or "solved today" will be wrong across timezones.

### `GET /api/progress` (auth)
Response `200`:
```json
{
  "solved":  { "two-sum": "2026-09-24", "3sum": "2026-09-23" },
  "flagged": { "3sum": true },
  "dailyGoal": 5,
  "design":  { "hld-url-shortener": "ready", "lld-parking-lot": "studied" },
  "designAttempts": {
    "hld-url-shortener": { "notes": "API servers + base62 IDs…", "covered": [0, 1, 2], "revealed": true }
  }
}
```
A user with no progress yet gets `{ "solved": {}, "flagged": {}, "dailyGoal": 5, "design": {}, "designAttempts": {} }`.

### `PATCH /api/progress/problems/:problemId` (auth)
Body contains either or both fields:
- `{ "solvedOn": "2026-09-24" }` — mark solved on that day
- `{ "solvedOn": null }` — mark unsolved
- `{ "flagged": true | false }`

Response `200` or `204`. Upsert: create the record if it doesn't exist.

### `PATCH /api/progress/design/:questionId` (auth)
System design stage for one question. `questionId` comes from `src/data/systemDesign.js` (e.g. `hld-url-shortener`, `lld-parking-lot`).

Body: `{ "status": "studied" | "practised" | "ready" | null }` (`null` = back to "Not started").
Response `200` or `204`. Upsert.

### `PUT /api/progress/design/:questionId/attempt` (auth)
Saves the student's attempt at a design question (replaces the whole attempt).

Body: `{ "notes": string (max ~20,000 chars), "covered": number[] (rubric indexes), "revealed": boolean }`
Response `200` or `204`. The frontend debounces notes, so expect roughly one call per second while typing.

### `DELETE /api/progress/design/:questionId/attempt` (auth)
Clears the attempt ("Start a fresh attempt"). Response `204`.

### `PATCH /api/progress/settings` (auth)
Body: `{ "dailyGoal": 1..20 }`
Response `200` or `204`.

## Database

MySQL tables (see `codearena-backend/src/models` and `codearena-backend/src/db/migrations`):

| Table | Holds |
|---|---|
| `users` | Google account id, email, name, photo, daily goal |
| `sessions` | One row per signed-in device: SHA-256 of the refresh token, expiry, revoked time |
| `problem_progress` | (user, problem) → solved date, flagged |
| `design_progress` | (user, question) → studied / practised / ready |
| `design_attempts` | (user, question) → notes, covered rubric indexes, revealed |
| `entitlements` | (user, module) → paid modules the user can open |

One row per user per item (unique index), so two devices editing different items never overwrite each other.
