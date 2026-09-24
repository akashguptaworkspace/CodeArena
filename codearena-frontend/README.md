# CodeArena: frontend

One place for developers to prepare for Tier 2 product-company interviews. Each area of preparation is a **module**:

| Module | Route | Status | Access |
|---|---|---|---|
| DSA 200 | `/dsa` | Live | Free |
| System Design (50 HLD + 50 LLD) | `/system-design/hld`, `/lld`, `/guide` | Live | Paid (₹200) |
| Node.js 100 | `/nodejs` | Coming soon | Paid (₹200) |
| MySQL 100 | `/mysql` | Coming soon | Paid (₹200) |

The plan for upcoming modules and subscriptions is in [docs/ROADMAP.md](../docs/ROADMAP.md). The backend contract is in [docs/API.md](../docs/API.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

That runs the app in **local mode**: no sign-in, progress saved in the browser.

For **accounts** (Google sign-in, progress saved in MySQL) and the live "online now" count, run the backend in [`../codearena-backend`](../codearena-backend). Setup, including creating the Google OAuth client, is in its [README](../codearena-backend/README.md):

```bash
cd ../codearena-backend
npm install
npm run dev
```

### Environment (`.env`, see `.env.example`)

| Variable | Default | Effect |
|---|---|---|
| `VITE_API_URL` | empty | Empty: progress saved in the browser, no sign-in. Set: uses the backend with Google sign-in. |
| `VITE_GOOGLE_CLIENT_ID` | empty | Google OAuth Web client ID for the sign-in button (same as the server's `GOOGLE_CLIENT_ID`). |
| `VITE_PRESENCE_URL` | `ws://localhost:4001/presence` in dev | Presence server for the live "● N online" count. Empty: hidden. |
| `VITE_APP_URL` | current origin | Public site URL, used in link previews and share links. |
| `VITE_ENABLE_PAYWALL` | `false` | `true` locks paid modules unless the user owns them. Keep `false` until payments are live. |

## Project structure

Code is organised **by feature**. Each module is a self-contained folder; shared building blocks live in `shared/`.
Imports use the `@/` alias for `src/` (e.g. `import { Button } from "@/shared/ui"`).

```
src/
  main.jsx                     Entry point
  app/
    App.jsx                    Providers: Auth → Access → Progress, and the sign-in gate
    routes.jsx                 One route per module, each wrapped in <ModuleGate>
    AppShell.jsx               Responsive layout: Sidebar (desktop) or TopBar + TabBar (phone/tablet)
    Sidebar.jsx, TopBar.jsx, TabBar.jsx, useNavItems.js
  config/
    app.js                     Product name and tagline
    env.js                     VITE_* settings
    modules.js                 Module registry: id, title, path, status, access, price, highlights

  features/
    home/                      Home page: a card per module with progress and access state
    access/                    What the user can open: AccessContext, ModuleGate, Paywall, ComingSoon
    auth/                      AuthContext, authService, SignInDialog (popup), GoogleSignInButton
    progress/                  ProgressContext (useReducer + optimistic saves), stores (local / HTTP)
    dsa/                       DSA 200: data, components, hooks, utils, DsaPage
    system-design/             HLD/LLD: SystemDesignPage (lists), QuestionPage (practice session)
      data/catalog.js          Light question list (titles, levels, rubric, follow-ups): safe to import anywhere
      data/content/*.js        Scenarios and model answers (loaded only on System Design pages)

    presence/                  Live "● N online" per page: PresenceProvider (one WebSocket), OnlineIndicator
    share/                     LinkedIn / native share buttons, share links, LinkedIn visitor welcome

  shared/                      Used by every feature; never imports from features/
    ui/                        Badge, Button, Card, DifficultyBadge, EmptyState, FilterBar, IconButton, ListPanel,
                               NavTabs, ProgressBar, ProgressTileGrid, SectionHeader, SegmentedControl, Select,
                               StatNumber, Tag, TextField, icons, moduleIcons
    layout/                    PageContainer, PageIntro, Stack
    feedback/                  Banner, LoadingState
    hooks/                     usePersistentState, useToday
    api/                       apiClient (fetch, bearer token, auto-refresh on 401), tokenStorage (memory only)
    utils/                     dates
    styles/                    tokens.css (colours, fonts, light/dark), global.css
```

### Rules that keep it scalable

- `shared/` never imports from `features/`. Features may import from `shared/`, `config/`, and the platform features (`auth`, `access`, `progress`).
- Content modules (`dsa`, `system-design`, …) don't import each other.
- Anything a page shows about access (locked, coming soon, price) comes from `config/modules.js`, never hard-coded in a page.

### Adding a module (e.g. Node.js 100)

1. Create `src/features/nodejs/` with `data/`, `components/`, and `NodejsPage.jsx`.
2. In `config/modules.js`, set the module's `status` to `"live"`.
3. In `app/routes.jsx`, render the page inside its `<ModuleGate moduleId="nodejs">`.
4. If it tracks progress, add a field to `features/progress/progressModel.js`, a reducer case, a store method (local + HTTP) and the endpoint in `../docs/API.md` (plus the backend route).
5. Add its headline number to `features/home/useModuleProgress.js`.

The nav and home page pick the module up automatically.

### How data flows

1. `AuthProvider` decides who the user is (guest in local mode, `/api/auth/me` in remote mode).
2. `AccessProvider` decides which modules they can open (`user.entitlements` from the backend).
3. `ProgressProvider` loads progress from the right store into a `useReducer`.
4. Pages read with `useProgressState()` and change things with `useProgressActions()`. Each change shows immediately, then saves; if the save fails it's rolled back and a banner explains why.

## Design system

All visual values live in [src/shared/styles/tokens.css](src/shared/styles/tokens.css). Components never hard-code colours, font sizes, spacing or radii; they use tokens, so changing a token restyles the whole app.

**Fonts**: *Bricolage Grotesque* (headings, big numbers), *Figtree* (body and UI), *JetBrains Mono* (counts, labels, badges).

| Token group | Examples | Use |
|---|---|---|
| Type scale | `--text-xs` … `--text-3xl` | `--text-base` body, `--text-lg` section titles, `--text-3xl` page titles (fluid) |
| Spacing (4px grid) | `--space-1` … `--space-16` | All padding, margins and gaps |
| Layout | `--page-max`, `--gutter`, `--section-gap`, `--stack-gap` | Page width, side padding, vertical rhythm |
| Cards | `--card-pad-sm/md/lg`, `--card-radius`, `--card-min-width`, `--tile-min-width`, `--row-min-height` | Consistent card sizes everywhere |
| Controls | `--control-height`, `--touch-target` | Buttons, inputs, selects; 40px targets on touch screens |
| Colour | `--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`, `--easy/medium/hard` | Light and dark palettes, switched automatically |

**Breakpoints**: phones ≤ 520px, small tablets ≤ 767px, desktop ≥ 1024px.

**Layout by screen size**
- **Desktop (≥ 1024px):** sidebar navigation + content column.
- **Tablet and phone (< 1024px):** sticky top bar + content + bottom tab bar (like a native app). Filter bars stack and scroll with the page on phones.

**Building blocks** (in `src/shared/`), use these before writing new CSS:

| Component | Purpose |
|---|---|
| `Stack` | Vertical spacing: `gap="section"` between page sections, `"stack"` inside a section |
| `PageIntro` | Page eyebrow, title and intro text |
| `Card` | Every boxed container. `size` sm/md/lg, `variant` default/flat/dashed, `interactive` for link cards |
| `SectionHeader` | Section title + count + one-line description |
| `ListPanel` | Bordered list of rows with dividers (problems, questions) |
| `StatNumber` | Big "42 / 200" headline figure with caption |
| `FilterBar` | Sticky row of filters above a list |
| `EmptyState` | "Nothing matches" message with an action |
| `Button`, `IconButton`, `SegmentedControl`, `Select`, `TextField`, `NavTabs`, `Badge`, `Tag`, `ProgressBar`, `ProgressTileGrid` | Controls and indicators |

## Deploying

The app uses browser routes, so configure your host to serve `index.html` for unknown paths (Netlify `_redirects`: `/* /index.html 200`; Vercel does this automatically for Vite; Nginx: `try_files $uri /index.html;`).
