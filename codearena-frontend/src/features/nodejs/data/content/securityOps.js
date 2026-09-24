// Security & auth, Testing & production. Shape: see ../nodejs.js
export default {
  // ---------- Security & auth ----------
  "node-jwt": {
    scenario: "Explain how JWT-based authentication works in a Node API. What are the security pitfalls?",
    answer: {
      summary:
        "A JWT is header.payload.signature, base64url-encoded. On login the server signs a token containing claims (user ID, expiry); on each request it verifies the signature and expiry with its secret or public key, without a database lookup. The payload is only encoded, not encrypted, so anyone can read it.",
      points: [
        "Stateless verification scales easily across instances and services.",
        "Revocation is hard: a stolen token is valid until it expires. Keep access tokens short-lived (5–15 min) and pair them with refresh tokens, or keep a denylist/token version per user.",
        "Pin the algorithm when verifying (algorithms: ['HS256'] or RS256); never accept 'none'. Use a long random secret or asymmetric keys.",
        "Validate exp, and iss/aud where relevant; allow small clock skew.",
        "Never put secrets or sensitive personal data in the payload.",
        "Storage: an httpOnly cookie protects against XSS token theft; localStorage is readable by any injected script.",
        "Logout everywhere: increment a tokenVersion on the user and include it in tokens; reject tokens with an old version.",
      ],
      code: `const jwt = require("jsonwebtoken");

const sign = (user) =>
  jwt.sign({ sub: user.id, ver: user.tokenVersion }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "15m" });

function authenticate(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer /, "");
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}`,
    },
  },

  "node-refresh-tokens": {
    scenario: "Design access and refresh tokens for a web app. Where does each live, how are they rotated, and how do you detect theft?",
    answer: {
      summary:
        "Use a short-lived access token (minutes) sent with each API call, and a long-lived refresh token (days) used only to get new access tokens. Keep the refresh token in an httpOnly, Secure, SameSite cookie scoped to the auth endpoint; keep the access token in memory. Rotate the refresh token on every use and store only its hash server-side.",
      points: [
        "Refresh flow: client calls /auth/refresh with the cookie → server checks the stored hash, revokes it, issues a new refresh token (same family) and a new access token.",
        "Reuse detection: if a refresh token that was already rotated is presented again, someone copied it. Revoke the whole token family and force re-login.",
        "Store tokens hashed (SHA-256), so a database leak doesn't hand out valid tokens.",
        "Multiple tabs refreshing at once can trigger false reuse detection: allow a short grace period for the just-rotated token, or coordinate refreshes in the client (one in-flight refresh shared by all requests).",
        "Logout: revoke the refresh token and clear the cookie.",
        "Cookie path limited to /api/auth reduces where the refresh token is sent.",
      ],
    },
  },

  "node-session-vs-jwt": {
    scenario: "Server-side sessions or JWTs: which would you use for a typical web app, and why?",
    answer: {
      summary:
        "Sessions store state on the server (Redis/DB) and give the browser a random session ID cookie; they're simple, small, and instantly revocable. JWTs carry the state inside the token and are verified without storage, which helps across many services, but they're hard to revoke and easy to misuse. For a single web app, sessions are often the simpler, safer choice.",
      points: [
        "Sessions with multiple instances need a shared store (Redis) rather than in-memory sessions.",
        "Session revocation (logout, ban, password change) is just deleting the record.",
        "JWT fits: service-to-service auth, many microservices verifying the same token, third-party API access, mobile clients, short-lived tokens with an identity provider.",
        "Both need secure cookies (httpOnly, Secure, SameSite) or careful storage, CSRF protection for cookies, and HTTPS.",
        "Hybrid is common: short-lived JWT access tokens plus a server-stored, revocable refresh token.",
      ],
    },
  },

  "node-password-hashing": {
    scenario: "How should a Node app store user passwords, and how do you check them on login?",
    answer: {
      summary:
        "Store only a slow, salted password hash made with bcrypt, scrypt or argon2id, never the password or a fast hash like SHA-256. On login, hash the given password with the stored salt and parameters and compare. The slowness makes brute-forcing leaked hashes very expensive.",
      points: [
        "Salts are random per user and stored inside the hash string, so identical passwords get different hashes and rainbow tables don't work.",
        "Tune cost (bcrypt cost ~10–12, argon2 memory/time) so one hash takes ~100–300 ms on your servers.",
        "Use the async API: bcrypt.hash/compare run on the libuv thread pool; the Sync versions block the event loop.",
        "Hashing is CPU-heavy, so login endpoints are a DoS target: rate-limit by IP and account, and use CAPTCHA or lockouts after failures.",
        "Return the same generic error for wrong email and wrong password to avoid user enumeration.",
        "bcrypt only uses the first 72 bytes of the password.",
      ],
      code: `const bcrypt = require("bcrypt");

const hash = await bcrypt.hash(password, 12);           // on sign-up
const ok = await bcrypt.compare(attempt, user.passwordHash); // on login
if (!ok) throw new AppError(401, "invalid_credentials", "Email or password is incorrect");`,
    },
  },

  "node-owasp": {
    scenario: "You're reviewing a Node API before launch. What are the top security issues you check for, and how do you fix them?",
    answer: {
      summary:
        "The most damaging API issues are broken access control, injection, weak authentication, sensitive data exposure, misconfiguration and vulnerable dependencies. Most fixes are consistent habits applied at the right layer: authorise every object access, validate input, use parameterised queries, and ship secure defaults.",
      points: [
        "Broken object-level authorisation (IDOR): GET /orders/1234 must check the order belongs to the caller. Put the check in the service/query (WHERE id = ? AND user_id = ?), not only in the UI.",
        "Injection: parameterised SQL, no eval or shell commands with user input (use execFile with an argument array).",
        "Mass assignment: whitelist fields that can be updated; never Model.update(req.body).",
        "Security headers with helmet, HTTPS everywhere (HSTS), correct CORS, secure cookies.",
        "Rate limiting and body size limits; generic error messages without stack traces in production.",
        "Dependency scanning, secrets outside code, least-privilege DB and cloud credentials, and logging of security events.",
      ],
    },
  },

  "node-xss-csrf": {
    scenario: "Explain XSS and CSRF. How do they relate to how you store auth tokens in the browser?",
    answer: {
      summary:
        "XSS (cross-site scripting) is when an attacker gets their JavaScript to run in your site, where it can read the page, call your API as the user, and steal anything readable (like tokens in localStorage). CSRF (cross-site request forgery) is when another site makes the user's browser send a request to your API, and the browser attaches your cookies automatically.",
      points: [
        "XSS prevention: escape output (React does by default; avoid dangerouslySetInnerHTML), sanitise user HTML (DOMPurify), and set a Content-Security-Policy.",
        "httpOnly cookies can't be read by JavaScript, so XSS can't steal them (though it can still make requests while the page is open).",
        "Tokens in localStorage are readable by any injected script: XSS = token theft.",
        "CSRF prevention: SameSite=Lax/Strict cookies, CSRF tokens (double submit or synchronizer tokens) for cookie-authenticated state-changing requests, checking the Origin header.",
        "APIs authenticated only with an Authorization header aren't vulnerable to CSRF, since browsers don't attach it automatically.",
      ],
    },
  },

  "node-secrets": {
    scenario: "How do you manage configuration and secrets like database passwords and API keys in a Node service?",
    answer: {
      summary:
        "Keep configuration out of code and read it from the environment (the twelve-factor approach). Secrets come from a secret manager or the platform's secret store in production, are never committed, and are validated at startup so the app fails fast with a clear error.",
      points: [
        ".env files for local development only, in .gitignore; commit a .env.example with the variable names.",
        "Production: AWS Secrets Manager/SSM, GCP Secret Manager, Vault, or Kubernetes secrets, injected as env variables or files.",
        "Validate at startup with a schema (zod/envalid): missing or malformed config crashes immediately instead of failing on the first request.",
        "Don't log config objects or full request headers; redact secrets in logs.",
        "Rotate secrets periodically and on staff changes; use separate credentials per environment.",
        "Leaked to GitHub: revoke/rotate the secret first (bots scrape within minutes), then check logs for misuse, then clean history.",
      ],
    },
  },

  "node-prototype-pollution": {
    scenario: "What is prototype pollution? Show how a deep-merge of req.body could make every user an admin.",
    answer: {
      summary:
        "JavaScript objects inherit from Object.prototype. If user input can set a key like __proto__ or constructor.prototype during a merge or path assignment, the attacker writes properties onto Object.prototype itself, and every object in the process inherits them.",
      points: [
        "Vulnerable pattern: a recursive merge(target, source) that copies every key, including __proto__.",
        "Impact: authorisation bypass (every object now has isAdmin: true), crashes (overwritten toString), and in some libraries even remote code execution.",
        "Fix: skip __proto__, constructor and prototype keys; validate input with strict schemas; use Object.create(null) or Map for dictionaries built from user keys.",
        "Keep libraries updated (lodash, minimist and others had pollution bugs).",
        "node --disable-proto=delete removes the __proto__ accessor as extra hardening.",
      ],
      code: `function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = merge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Body: {"__proto__": {"isAdmin": true}}  (JSON.parse creates an own "__proto__" key)
merge({}, JSON.parse(body));
({}).isAdmin; // true: every object is now "admin"`,
    },
  },

  "node-redos": {
    scenario: "One request with a long, specially crafted email address made your whole Node API unresponsive. What happened?",
    answer: {
      summary:
        "Probably ReDoS (regular expression denial of service): a regex with nested or overlapping quantifiers can backtrack exponentially on certain inputs, taking seconds or minutes of CPU. Because Node runs your JavaScript on one thread, that single request blocks every other request.",
      points: [
        "Dangerous patterns: nested quantifiers like (a+)+, (\\w+\\s?)*, or alternations that overlap, followed by something that fails to match.",
        "Test with tools (safe-regex, recheck) and with long near-matching inputs in unit tests.",
        "Mitigations: limit input length before matching, use simpler or anchored regexes, use validator libraries, or the RE2 engine (linear time).",
        "Other single-request attacks: huge JSON bodies (set body limits), deeply nested JSON, zip bombs in uploads, expensive queries (limit page sizes), and slowloris-style slow connections (server timeouts).",
      ],
    },
  },

  "node-oauth": {
    scenario: "Explain the OAuth 2.0 authorization code flow as used by 'Sign in with Google' in a Node app.",
    answer: {
      summary:
        "The app redirects the user to Google with its client ID, requested scopes, a redirect URI, a random state value and a PKCE challenge. After the user consents, Google redirects back with a one-time code. The server exchanges that code (with the PKCE verifier and client secret) for tokens, verifies the ID token, and creates its own session for the user.",
      points: [
        "state: a random value stored before redirecting and checked on return; stops CSRF-style login attacks where an attacker injects their own code.",
        "PKCE (code_verifier/code_challenge): stops an intercepted code from being usable by someone else; required for mobile and SPAs, recommended everywhere.",
        "Verify the ID token: signature (Google's public keys), aud equals your client ID, iss is Google, not expired, email verified.",
        "Then find or create the user by Google's sub (a stable ID), not by email alone, and issue your own session or tokens.",
        "OAuth is authorisation (access to APIs); OpenID Connect adds the ID token for authentication (who the user is).",
        "Google Identity Services' button can give you an ID token directly; the server still must verify it.",
      ],
    },
  },

  // ---------- Testing & production ----------
  "node-testing-pyramid": {
    scenario: "How do you test a Node REST API? What goes in unit, integration and end-to-end tests?",
    answer: {
      summary:
        "Unit tests cover pure business logic quickly and in isolation. Integration tests run real HTTP requests against the app with a real database to verify routes, validation, queries and migrations together. A few end-to-end tests check critical user flows across the whole deployed system.",
      points: [
        "Tools: node:test, Jest or Vitest; supertest to call Express without opening a port.",
        "Integration tests with a real DB (Docker/Testcontainers, a test database, transactions rolled back per test) catch SQL, constraint and migration bugs that mocks hide.",
        "Test behaviour, not implementation: status codes, response shape, DB state after the call.",
        "Cover error paths: invalid input, unauthorised access to another user's resource, conflicts, downstream failures.",
        "Run tests in CI on every PR, including migrations from scratch.",
      ],
      code: `const request = require("supertest");
const app = require("../src/app");

test("cannot read another user's order", async () => {
  const res = await request(app)
    .get("/api/orders/" + otherUsersOrder.id)
    .set("Authorization", "Bearer " + tokenFor(alice));
  expect(res.status).toBe(404);
});`,
    },
  },

  "node-mocking": {
    scenario: "How do you test code that calls a payment API, uses the current time, and waits with setTimeout?",
    answer: {
      summary:
        "Mock at the boundaries of your system: intercept outgoing HTTP (nock, msw) or inject a fake client, and control time with fake timers. Keep your own code real, so tests exercise actual logic.",
      points: [
        "Dependency injection (pass paymentClient into the service) makes swapping in a fake trivial.",
        "nock/msw intercept HTTP calls so tests never hit the real provider, and let you simulate timeouts, 500s and slow responses.",
        "Fake timers (jest.useFakeTimers, Vitest vi.useFakeTimers, node:test mock.timers) control Date.now and setTimeout: advance by 30 s instantly.",
        "Don't mock what you don't own in detail; wrap third-party SDKs in a thin adapter and mock the adapter.",
        "Over-mocking makes tests pass while production breaks; prefer a real DB over mocking the ORM.",
      ],
      code: `jest.useFakeTimers();

test("retries after a timeout", async () => {
  nock("https://api.pay.example").post("/charge").reply(503).post("/charge").reply(200, { id: "ch_1" });
  const promise = chargeWithRetry({ amount: 500 });
  await jest.advanceTimersByTimeAsync(2000);
  await expect(promise).resolves.toEqual({ id: "ch_1" });
});`,
    },
  },

  "node-logging": {
    scenario: "A customer says their payment failed at 3:42 pm. How should your logging be set up so you can find out exactly what happened?",
    answer: {
      summary:
        "Log structured JSON (pino is the fast standard in Node) with consistent fields, and attach a request/correlation ID to every log line for a request, passed along to downstream services. Ship logs to a central system (ELK, Loki, Datadog, CloudWatch) where you can filter by user, request ID and time.",
      points: [
        "Levels: error for failures needing attention, warn for unusual but handled, info for key business events, debug off in production.",
        "Include context: requestId, userId, route, status, duration, and error objects with stack traces.",
        "Never log passwords, tokens, card numbers or full personal data; use redaction config.",
        "Generate or accept X-Request-Id at the edge, return it in responses and error messages so support can search by it.",
        "console.log writes synchronously to terminals and files and isn't structured; pino writes asynchronously and is much faster.",
        "Find the incident: search by user ID around 3:42 → get the request ID → see every log line across services for that request.",
      ],
      code: `const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({ redact: ["req.headers.authorization", "*.password", "*.cardNumber"] });
app.use(pinoHttp({ logger, genReqId: (req) => req.get("x-request-id") || crypto.randomUUID() }));

// in a handler
req.log.info({ orderId, amount }, "payment attempt");`,
    },
  },

  "node-health-checks": {
    scenario: "What's the difference between liveness and readiness checks, and what should each endpoint check?",
    answer: {
      summary:
        "Liveness answers 'is this process healthy, or should it be restarted?' Readiness answers 'should this instance receive traffic right now?' Liveness should be cheap and self-contained; readiness can check dependencies and is also used to drain an instance during shutdown.",
      points: [
        "Liveness: return 200 if the event loop is responding. A stuck process (deadlock, blocked loop) fails it and gets restarted.",
        "Readiness: check DB and cache connections are established, warm-up done, not shutting down.",
        "Don't check downstream dependencies in liveness: if the DB goes down, every pod fails liveness and Kubernetes restarts them all in a loop, making recovery worse.",
        "Set timeouts on dependency checks so the health endpoint itself doesn't hang.",
        "Startup probes for slow-starting apps, so liveness doesn't kill them during boot.",
      ],
    },
  },

  "node-docker": {
    scenario: "Write and explain a production Dockerfile for a Node API.",
    answer: {
      summary:
        "Use a small official Node base image, copy package files first and run npm ci so the dependency layer is cached, install only production dependencies in the final image, run as a non-root user, and start with node directly so signals reach your process.",
      points: [
        "Multi-stage builds: build (TypeScript, bundling) in one stage with dev dependencies, copy only the output and production node_modules into the final stage.",
        "Copying package*.json before the source means code changes don't reinstall dependencies.",
        ".dockerignore: node_modules, .git, .env, tests, logs.",
        "USER node: a compromised process doesn't have root in the container.",
        "CMD [\"node\", \"server.js\"] in exec form: Node is PID 1 and receives SIGTERM. npm start adds a shell/npm layer that may not forward signals; docker run --init or tini handles zombie reaping.",
        "NODE_ENV=production, a HEALTHCHECK or orchestrator probes, and memory limits aligned with --max-old-space-size.",
      ],
      code: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]`,
    },
  },

  "node-debugging": {
    scenario: "How do you debug a Node application, locally and when the problem only happens in production?",
    answer: {
      summary:
        "Locally, run with --inspect and use Chrome DevTools or VS Code breakpoints. In production, rely on good logs, error tracking with stack traces (Sentry), metrics, and diagnostics you can capture safely: diagnostic reports, heap snapshots and CPU profiles.",
      points: [
        "node --inspect (or --inspect-brk to pause at start) and open chrome://inspect; VS Code's JavaScript debugger attaches the same way.",
        "Read the stack trace from the top; Node shows async stack traces for async/await code.",
        "Error tracking tools group errors, show stack traces with source maps, and record the request context.",
        "node --report-on-fatalerror or process.report.writeReport() produce a JSON report (stack, heap stats, handles, env).",
        "Reproduce: same Node version, same config, similar data; add targeted logging behind a flag.",
        "Never expose the inspector port publicly: it allows remote code execution.",
      ],
    },
  },

  "node-observability": {
    scenario: "What would you measure and trace for a Node microservice, and what would you alert on?",
    answer: {
      summary:
        "Collect request metrics per route (rate, errors, duration percentiles), runtime metrics specific to Node (event loop lag, heap, GC, active handles), and distributed traces that follow a request across services. Alert on user-visible symptoms like error rate and latency SLOs, not on every metric.",
      points: [
        "RED per route: requests/sec, error %, p50/p95/p99 latency. USE for resources: utilisation, saturation, errors (CPU, memory, DB pool wait).",
        "Node-specific: event loop delay, heap used vs limit, GC pause time, open handles, libuv thread pool pressure (indirectly via fs/crypto latency).",
        "Prometheus (prom-client) or OpenTelemetry metrics; dashboards in Grafana or your APM.",
        "OpenTelemetry tracing auto-instruments http, Express, pg/mysql, Redis: see which span in a slow request took the time.",
        "After a bad deploy: compare latency and error rate by version, then open traces of slow requests to find the new or slower span.",
      ],
    },
  },

  "node-zero-downtime-deploy": {
    scenario: "How do you deploy a new version of a Node API with zero downtime, and limit the damage if the new version is broken?",
    answer: {
      summary:
        "Start new instances, send them traffic only once their readiness checks pass, and drain old instances with graceful shutdown (a rolling or blue-green deploy). Keep database and API changes backward compatible so old and new versions can run side by side, and make rollback fast and automatic.",
      points: [
        "Rolling update (Kubernetes default): replace instances a few at a time; maxUnavailable 0 keeps capacity.",
        "Blue-green: bring up the full new version, switch the load balancer, keep the old one ready to switch back.",
        "Canary: send 5% of traffic to the new version first, compare error rate and latency, then continue or roll back automatically.",
        "Graceful shutdown and readiness probes prevent dropped requests during the switch.",
        "Schema changes use expand/contract so a rollback doesn't meet an incompatible database.",
        "Data-corrupting bugs: canaries, feature flags to switch off new code paths without redeploying, audit logs, and backups/point-in-time recovery.",
      ],
    },
  },
};
