# CodeArena

One place for developers to prepare for Tier 2 product-company interviews: DSA 200, System Design (HLD + LLD), Node.js 100, SQL, and the GenAI 20-Day Sprint (MERN → GenAI developer plan).

```
CodeArena/
  codearena-frontend/   React (Vite) app: pages, design system, progress tracking
  codearena-backend/    Node.js API: Express + MySQL (Sequelize), Google sign-in, live presence
  docs/
    API.md                    REST API contract shared by both
    ROADMAP.md                Upcoming modules and subscriptions
```

## Run locally

**Backend** (first time: see [codearena-backend/README.md](codearena-backend/README.md) for `.env`, the Google OAuth client and database setup):

```bash
cd codearena-backend
npm install
npm run db:migrate
npm run dev              # http://localhost:4000
```

**Frontend**, in a second terminal:

```bash
cd codearena-frontend
npm install
npm run dev              # http://localhost:5173
```

The frontend also runs on its own with no backend: leave `VITE_API_URL` unset and progress is saved in the browser (no sign-in). See [codearena-frontend/README.md](codearena-frontend/README.md).

## Environment files

| File | Holds | Committed |
|---|---|---|
| `codearena-backend/.env` | DB credentials, Google client ID, JWT secret | No |
| `codearena-backend/.env.example` | Template for the above | Yes |
| `codearena-frontend/.env.local` | `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` for your machine | No |
| `codearena-frontend/.env.development` | Safe local defaults | Yes |
| `codearena-frontend/.env.example` | Template | Yes |
# CodeArena
