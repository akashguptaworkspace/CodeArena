// Day 2 interview bank, part 3: security, caching & scaling, Docker & deployment, scenarios, live coding. Assembled in d02.js.

export const security = {
  title: "Authentication and security",
  questions: [
    {
      id: "authn-authz",
      q: "Authentication vs authorisation?",
      level: "Basic",
      common: true,
      answer:
        "Authentication verifies **who** the user is (password, token, SSO); failure is 401. Authorisation decides **what** they may do (roles, permissions, ownership); failure is 403, or 404 when you shouldn't reveal the resource exists. In FastAPI, authentication is usually a `get_current_user` dependency, and authorisation lives in role dependencies and ownership checks in services.",
    },
    {
      id: "password-storage",
      q: "How should passwords be stored?",
      level: "Basic",
      common: true,
      answer:
        "As salted hashes from a slow, memory-hard password-hashing algorithm: Argon2id (recommended) or bcrypt. Never plain text, never fast hashes like MD5/SHA-256 alone, never reversible encryption. Enforce a sensible minimum length, rate-limit login attempts, and rehash with stronger parameters when users log in if settings change.",
    },
    {
      id: "jwt-structure",
      q: "What is inside a JWT, and what must you validate?",
      level: "Intermediate",
      common: true,
      answer:
        "A JWT is `header.payload.signature`, each part base64url-encoded. The header names the algorithm; the payload holds claims like `sub`, `exp`, `iat`, `iss`, `aud` and custom ones like `role`; the signature proves integrity. When decoding, verify the signature with an explicit allowed algorithm list (never accept `none`), check `exp` (and `nbf`), and check `iss`/`aud` if you use them. Remember the payload is readable by anyone.",
    },
    {
      id: "jwt-vs-session",
      q: "JWT vs server-side sessions?",
      level: "Intermediate",
      common: true,
      answer:
        "Sessions keep state on the server (Redis/DB) and give the client an opaque ID in a cookie: easy to revoke instantly, but need a shared store. JWTs are self-contained and verifiable by any server without a lookup, suiting APIs, mobile apps and microservices, but can't be revoked before expiry without extra state and are larger. The common hybrid: short-lived JWT access tokens plus revocable refresh tokens stored server-side.",
    },
    {
      id: "refresh-tokens",
      q: "How do refresh tokens work, and what is rotation?",
      level: "Advanced",
      common: true,
      answer:
        "Access tokens live minutes; a refresh token (long-lived, stored hashed in the database) is exchanged at `/auth/refresh` for a new access token. With **rotation**, each refresh also issues a new refresh token and invalidates the old one; if an old one is ever used again, that signals theft, so you revoke the whole token family. Logout deletes the refresh token; \"log out everywhere\" deletes all of a user's tokens.",
    },
    {
      id: "token-storage",
      q: "Where should a web app store tokens: localStorage or cookies?",
      level: "Intermediate",
      common: true,
      answer:
        "`localStorage` is simple but readable by any JavaScript, so an XSS bug can steal tokens. `httpOnly` + `Secure` + `SameSite` cookies can't be read by JavaScript, protecting against XSS theft, but are sent automatically, so you need CSRF protection (SameSite=Lax/Strict, CSRF tokens for state-changing requests). A common SPA pattern: access token in memory, refresh token in an httpOnly cookie scoped to the refresh endpoint.",
    },
    {
      id: "oauth-oidc",
      q: "What are OAuth 2.0 and OpenID Connect? How does \"Login with Google\" work?",
      level: "Advanced",
      common: true,
      answer:
        "OAuth 2.0 is a framework for **delegated authorisation**: an app gets an access token to act on a user's behalf without their password. OpenID Connect adds **authentication** on top with an ID token (a JWT describing the user). \"Login with Google\" uses the **authorization code flow with PKCE**: redirect to Google, the user consents, Google redirects back with a code, your backend exchanges the code (plus the PKCE verifier) for tokens, verifies the ID token, then creates your own session or JWT.",
    },
    {
      id: "rbac-abac",
      q: "RBAC vs ABAC?",
      level: "Intermediate",
      answer:
        "**Role-based access control** grants permissions via roles (admin, editor, customer): simple and common. **Attribute-based access control** decides using attributes of the user, resource and context (department, ownership, region, time), which is more flexible for rules like \"managers can approve refunds under ₹5,000 in their own region\". Many apps combine roles with ownership checks.",
    },
    {
      id: "idor",
      q: "What is IDOR (broken object-level authorisation)?",
      level: "Intermediate",
      common: true,
      answer:
        "The top API security risk: an endpoint checks that the user is logged in but not that the object belongs to them, so changing an ID in the URL exposes other users' data. Prevent it by scoping every query to the authenticated user or tenant (`WHERE owner_id = :me`) or checking ownership in the service, using identity from the token only, and testing with two users. Unguessable IDs help but are not a fix.",
    },
    {
      id: "sql-injection",
      q: "How does SQL injection happen, and how do you prevent it in Python?",
      level: "Basic",
      common: true,
      answer:
        "It happens when user input is concatenated into SQL text, so input like `' OR 1=1 --` changes the query's meaning. Prevent it with parameterised queries (SQLAlchemy ORM/Core or `text()` with bound parameters), never f-strings; map dynamic identifiers (sort columns, table names) through allow-lists; and use a least-privilege database user.",
    },
    {
      id: "owasp-api",
      q: "Name some OWASP API Security Top 10 risks.",
      level: "Intermediate",
      answer:
        "Broken object-level authorisation (IDOR), broken authentication, broken object property-level authorisation (mass assignment or exposing too many fields), unrestricted resource consumption (no rate limits or size limits), broken function-level authorisation (users calling admin endpoints), server-side request forgery (SSRF), security misconfiguration, and lack of inventory of old API versions. Pydantic input/output schemas, ownership checks, rate limits and least privilege address many of them.",
    },
    {
      id: "mass-assignment",
      q: "What is mass assignment, and how does Pydantic help prevent it?",
      level: "Intermediate",
      answer:
        "Mass assignment is when an API blindly copies request fields onto a model, letting a user set fields they shouldn't, such as `role: \"admin\"` or `is_verified: true`. Prevent it by using explicit input schemas containing only allowed fields (`UserUpdate` without `role`), optionally `extra=\"forbid\"`, and never passing the raw request dict into the ORM.",
    },
    {
      id: "secrets",
      q: "How do you manage secrets in a Python service?",
      level: "Basic",
      common: true,
      answer:
        "Keep them out of code and Git: environment variables loaded via pydantic-settings (`SecretStr` so they don't appear in logs), `.env` only for local development and git-ignored, and in production a secret store (AWS Secrets Manager, SSM Parameter Store, Vault) injected by the platform. Prefer IAM roles over long-lived keys, rotate secrets, and scan repositories for leaked keys.",
    },
    {
      id: "api-keys-hmac",
      q: "How do you authenticate service-to-service calls or public API clients?",
      level: "Advanced",
      answer:
        "Options: API keys (random, stored hashed, sent in a header, scoped and revocable per client); OAuth2 client-credentials tokens; mutual TLS inside private networks; or HMAC request signing, where the client signs method, path, timestamp and body with a shared secret and the server recomputes it (rejecting old timestamps to prevent replays), like payment webhooks. Always use HTTPS, rate-limit per key and log usage.",
    },
  ],
};

export const scaling = {
  title: "Caching, background jobs and scaling",
  questions: [
    {
      id: "cache-strategies",
      q: "What caching strategies do you know?",
      level: "Intermediate",
      common: true,
      answer:
        "**Cache-aside** (most common): read from cache, on a miss read from the database and populate the cache with a TTL; invalidate or update on writes. **Write-through**: write to cache and database together. **Write-behind**: write to cache, persist asynchronously (risk of loss). Plus HTTP/CDN caching for public responses. The hard part is invalidation: use TTLs, delete keys on updates, and version keys when data shapes change.",
      detail: [
        {
          lang: "python",
          code: `async def get_product(product_id: int) -> dict:
    key = f"product:{product_id}"
    if cached := await redis.get(key):
        return json.loads(cached)
    product = await repo.get(product_id)
    data = ProductOut.model_validate(product).model_dump(mode="json")
    await redis.set(key, json.dumps(data), ex=300)      # 5-minute TTL
    return data`,
        },
      ],
    },
    {
      id: "redis-uses",
      q: "What would you use Redis for in a backend?",
      level: "Basic",
      common: true,
      answer:
        "Caching hot data and expensive results (including LLM responses), rate-limit counters, sessions and token deny-lists, distributed locks, queues and task brokers (Celery, RQ, arq), pub/sub for WebSocket fan-out, and leaderboards or counters. It's in-memory, so it's very fast, with optional persistence.",
    },
    {
      id: "cache-stampede",
      q: "What is a cache stampede, and how do you prevent it?",
      level: "Advanced",
      answer:
        "When a popular key expires, many requests miss at once and all hit the database (or an expensive LLM call) simultaneously. Prevent it with a lock so only one request recomputes while others wait or get the stale value, randomised TTLs (jitter) so keys don't expire together, early background refresh of hot keys, and serving slightly stale data while refreshing.",
    },
    {
      id: "celery",
      q: "How does Celery work? When would you choose it over FastAPI BackgroundTasks?",
      level: "Intermediate",
      common: true,
      answer:
        "Celery has producers (your API) that send task messages to a **broker** (Redis or RabbitMQ), **workers** (separate processes or machines) that consume and execute tasks, and an optional **result backend**. It supports retries with backoff, scheduling (beat), rate limits and routing. Use it (or lighter options like arq/RQ, or SQS consumers) for heavy, long or critical work that must survive restarts and scale separately; `BackgroundTasks` is only for small in-process follow-ups.",
    },
    {
      id: "idempotent-jobs",
      q: "Why must background jobs be idempotent?",
      level: "Intermediate",
      answer:
        "Queues usually guarantee **at-least-once** delivery: a job may run twice after a timeout, crash or retry. If running it twice sends two emails or charges twice, that's a bug. Make jobs idempotent with unique job/event IDs recorded in the database, upserts instead of inserts, and checks of current state before acting.",
    },
    {
      id: "queues-compare",
      q: "Redis queues vs RabbitMQ vs SQS vs Kafka?",
      level: "Advanced",
      answer:
        "**Redis-based queues** (RQ, arq, Celery with Redis) are simple and fast for task queues. **RabbitMQ** is a full message broker with routing, acknowledgements and flexible exchanges. **SQS** is AWS's managed queue: no ops, at-least-once delivery, dead-letter queues. **Kafka** is a distributed, replayable event log for high-throughput streaming and event sourcing, where consumers track offsets. Choose by throughput, ordering and replay needs, and operational capacity.",
    },
    {
      id: "horizontal-scaling",
      q: "Vertical vs horizontal scaling? What makes a service easy to scale horizontally?",
      level: "Basic",
      common: true,
      answer:
        "Vertical scaling means a bigger machine; horizontal means more instances behind a load balancer. Horizontal scaling is easiest when the service is **stateless**: no local sessions, uploads or caches that other instances need. Keep state in shared stores (Postgres, Redis, S3), make instances interchangeable, and use health checks so the load balancer routes around bad instances.",
    },
    {
      id: "read-replicas",
      q: "What are read replicas?",
      level: "Intermediate",
      answer:
        "Copies of the primary database that receive changes asynchronously and serve read-only queries, taking read load off the primary (reports, listings). Writes still go to the primary. Because of replication lag, a user may not immediately see their own write on a replica, so read-your-own-writes paths should query the primary.",
    },
    {
      id: "traffic-spike",
      q: "Your API must handle 10× traffic during a sale. What do you do?",
      level: "Intermediate",
      common: true,
      answer:
        "Load-test first to find the bottleneck. Then: autoscale stateless API instances; cache hot reads (product pages) in Redis/CDN; make sure DB connection pools and PgBouncer can take the load and add read replicas; move non-critical work (emails, analytics) to queues; protect the database with rate limits and back-pressure; use row locks or atomic updates for stock; set timeouts and circuit breakers for third-party calls; and monitor latency, errors and saturation with alerts during the event.",
    },
    {
      id: "timeouts-retries",
      q: "How do you make calls to other services resilient?",
      level: "Intermediate",
      answer:
        "Set explicit timeouts; retry only transient failures (timeouts, 429, 5xx) with exponential backoff and jitter, respecting `Retry-After`; make retried operations idempotent; use circuit breakers to fail fast when a dependency is down; provide fallbacks or graceful degradation; and bulkhead concurrency (semaphores) so one slow dependency can't exhaust all workers.",
    },
  ],
};

export const devops = {
  title: "Docker and deployment",
  questions: [
    {
      id: "image-container",
      q: "Docker image vs container? What are layers?",
      level: "Basic",
      common: true,
      answer:
        "An **image** is a read-only template (filesystem plus metadata) built from a Dockerfile; a **container** is a running instance of an image with its own writable layer. Each Dockerfile instruction creates a **layer**; unchanged layers are cached, so copying dependency files and installing packages **before** copying application code makes rebuilds fast.",
    },
    {
      id: "small-images",
      q: "How do you build small, secure Python images?",
      level: "Intermediate",
      common: true,
      answer:
        "Start from `python:3.x-slim`; install locked dependencies in a cached layer (uv or pip with a lockfile); use multi-stage builds so compilers and build tools don't end up in the final image; add a `.dockerignore` (exclude `.venv`, `.env`, `.git`); run as a non-root user; set `PYTHONUNBUFFERED=1`; and scan images for vulnerabilities. Never bake secrets into images.",
    },
    {
      id: "compose",
      q: "What is docker-compose used for?",
      level: "Basic",
      answer:
        "Defining and running multi-container setups with one file and one command, typically for local development and testing: the API, Postgres, Redis and a worker, with networks, volumes, environment variables and healthchecks. Services reach each other by service name (`db:5432`). Production usually uses an orchestrator like ECS or Kubernetes instead.",
    },
    {
      id: "workers-count",
      q: "How many Uvicorn/Gunicorn workers should you run?",
      level: "Intermediate",
      answer:
        "A common starting point is about one worker per CPU core for async apps (the classic Gunicorn formula `2 × cores + 1` targets sync workers). In containers, often run one or two workers per container and scale containers instead. Each worker is a separate process with its own memory and DB pool, so check memory and database connection limits, and tune with load tests.",
    },
    {
      id: "health-checks",
      q: "Liveness vs readiness checks?",
      level: "Intermediate",
      answer:
        "**Liveness** answers \"is the process alive?\"; if it fails, the orchestrator restarts the container. Keep it simple, with no dependency checks. **Readiness** answers \"can it serve traffic now?\" (database reachable, warm-up done); if it fails, the load balancer stops sending requests but doesn't restart it. Mixing them up causes restart loops when a dependency has a blip.",
    },
    {
      id: "deploy-strategies",
      q: "How do you deploy without downtime?",
      level: "Intermediate",
      common: true,
      answer:
        "**Rolling** deploys replace instances gradually while health checks keep traffic on healthy ones. **Blue-green** runs the new version alongside the old and switches traffic at once, with instant rollback. **Canary** sends a small percentage of traffic to the new version first and watches metrics. All need backward-compatible database migrations and graceful shutdown (finish in-flight requests).",
    },
    {
      id: "observability",
      q: "What do you monitor in production for a Python API?",
      level: "Intermediate",
      common: true,
      answer:
        "The three pillars: **logs** (structured JSON with request IDs, no secrets), **metrics** (request rate, error rate, p50/p95/p99 latency, CPU/memory, DB pool usage, queue depth), and **traces** (OpenTelemetry spans across services and DB calls). Add alerts on error rate and latency SLOs, plus error tracking (e.g. Sentry) for exceptions with context.",
    },
    {
      id: "config-12factor",
      q: "What is the Twelve-Factor App approach to configuration?",
      level: "Basic",
      answer:
        "Store config (URLs, credentials, feature flags) in the environment, not in code, so the same build runs in dev, staging and production with different settings. Related factors: explicit dependencies (a lockfile), stateless processes, logs as event streams to stdout, and running admin tasks (migrations) as one-off processes.",
    },
  ],
};

export const scenarios = {
  title: "Scenario and debugging questions",
  questions: [
    {
      id: "slow-api",
      q: "An endpoint became slow in production. How do you investigate?",
      level: "Intermediate",
      common: true,
      answer:
        "Start with data: which endpoint, since when (a deploy or data growth?), p95 vs p50, all requests or some users. Use traces and logs to see where time goes: database queries (N+1, missing index: check with `EXPLAIN ANALYZE`), external calls (LLM/API latency), or CPU/event-loop blocking. Reproduce with production-like data, fix the biggest contributor, and verify with metrics and a load test. Add alerts so it's caught earlier next time.",
    },
    {
      id: "memory-growth",
      q: "The Python service's memory keeps growing until it restarts. What could it be?",
      level: "Advanced",
      answer:
        "Common causes: unbounded in-memory caches or global lists (a dict used as a cache without size limits), objects kept alive by references (listeners, closures, task sets), loading huge files or query results fully into memory, or leaks in C extensions. Investigate with `tracemalloc` snapshots or memory profilers (memray), compare heap growth over time, add size limits (`lru_cache(maxsize=...)`), stream large data, and consider worker recycling (`--max-requests`) as a temporary mitigation.",
    },
    {
      id: "intermittent-500",
      q: "Users report intermittent 500 errors. What's your approach?",
      level: "Intermediate",
      common: true,
      answer:
        "Correlate: find the errors in logs or error tracking with request IDs, identify common factors (endpoint, input, instance, time, dependency). Typical culprits are timeouts to external services, DB pool exhaustion, race conditions on concurrent requests, unhandled edge-case inputs, or one bad instance. Reproduce with the same input, add a test, fix, and add better error handling and alerting so failures are graceful (clear 4xx/503) rather than generic 500s.",
    },
    {
      id: "pool-exhausted",
      q: "You see \"QueuePool limit reached\" / too many connections errors. What's wrong?",
      level: "Advanced",
      answer:
        "Sessions aren't being returned fast enough: long transactions, slow queries holding connections, sessions not closed (missing `yield` cleanup), background tasks holding sessions, or pools that are too large across many workers (hitting the Postgres limit) or too small for concurrency. Fix leaks and slow queries first, keep transactions short, size pools per process with the total in mind, and add PgBouncer/RDS Proxy.",
    },
    {
      id: "data-leak-bug",
      q: "A user reports seeing another user's data. What do you do?",
      level: "Intermediate",
      common: true,
      answer:
        "Treat it as a security incident: contain it first (disable the feature or endpoint), then find the cause. Typical causes are missing ownership filters (IDOR), shared mutable state across requests (a global variable or mutable default holding user data), or a cache keyed without the user. Fix it, add tests with two users, assess and notify affected users per policy and law (India's DPDP Act), and review similar endpoints.",
    },
    {
      id: "bad-deploy",
      q: "A deploy broke production. What's your process?",
      level: "Intermediate",
      answer:
        "Restore service first: roll back to the previous version (or switch traffic back in blue-green) if possible, since investigation can wait. Communicate status. If a migration can't be rolled back, deploy a forward fix. Afterwards, run a blameless post-mortem: timeline, root cause, why tests and checks didn't catch it, and concrete actions (tests, canary deploys, feature flags, better alerts).",
    },
    {
      id: "third-party-outage",
      q: "The LLM provider (or any third-party API) you depend on is down. How should your app behave?",
      level: "Intermediate",
      common: true,
      answer:
        "Fail gracefully rather than hang: timeouts, retries with backoff for transient errors, a circuit breaker to stop hammering it, and a fallback (another provider or model, cached answers, or a clear \"try again later\" message with 503). Queue non-urgent work to process later, surface status to users, and alert the team. Design this in advance with a provider-agnostic interface.",
    },
    {
      id: "express-to-fastapi",
      q: "How would you migrate an existing Express service to FastAPI?",
      level: "Intermediate",
      common: true,
      answer:
        "Incrementally, not as a big-bang rewrite. Document the existing API contract (OpenAPI), write contract tests against it, and build the FastAPI service to pass them. Route traffic endpoint by endpoint through a gateway or reverse proxy (strangler-fig pattern), sharing the same database or events during the transition, and compare responses or shadow traffic before switching. Migrate auth compatibly (same JWT secret/claims), and retire Express routes once each is fully moved.",
    },
    {
      id: "design-url-shortener",
      q: "Design a simple URL shortener API.",
      level: "Intermediate",
      answer:
        "Endpoints: `POST /links` {url} → 201 {code, short_url}; `GET /{code}` → 301/302 redirect; optional `GET /links/{code}/stats`. Store `code` (unique), original URL, owner and created_at in Postgres; generate codes from a random base62 string or an encoded ID, retrying on unique collisions. Cache code→URL lookups in Redis because reads dominate; count clicks asynchronously via a queue; validate URLs and block malicious domains; rate-limit creation.",
    },
    {
      id: "design-notifications",
      q: "How would you send order-confirmation emails reliably?",
      level: "Intermediate",
      answer:
        "Don't send inside the request. Commit the order, then enqueue an \"order_created\" job (ideally with the transactional outbox pattern: write an outbox row in the same transaction, and a relay publishes it) so events aren't lost. A worker sends the email via a provider with retries and backoff, records a sent status using the event ID for idempotency, and moves repeated failures to a dead-letter queue for inspection.",
    },
  ],
};

export const liveCoding = {
  title: "Live coding questions",
  questions: [
    {
      id: "lc-paginated-endpoint",
      q: "Write a paginated, filterable list endpoint with FastAPI and SQLAlchemy.",
      level: "Intermediate",
      common: true,
      answer:
        "Validate query parameters (page ≥ 1, size capped, allow-listed sort), build one `select()` with optional filters, count with a subquery, then apply order, offset and limit, and return items plus totals.",
      detail: [
        {
          lang: "python",
          code: `SORTS = {"price": Product.price.asc(), "-price": Product.price.desc()}

@router.get("/products", response_model=Page[ProductOut])
async def list_products(session: SessionDep, page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                        category: str | None = None, sort: Literal["price", "-price"] = "price"):
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = await session.scalars(stmt.order_by(SORTS[sort], Product.id).offset((page - 1) * size).limit(size))
    return Page(items=[ProductOut.model_validate(p) for p in rows], total=total, page=page, size=size)`,
        },
      ],
    },
    {
      id: "lc-jwt-dependency",
      q: "Write a FastAPI dependency that returns the current user from a JWT.",
      level: "Intermediate",
      common: true,
      answer:
        "Use `OAuth2PasswordBearer` to extract the token, decode it with an explicit algorithm, handle expiry and invalid tokens as 401 with a `WWW-Authenticate` header, load the user by `sub`, and return it.",
      detail: [
        {
          lang: "python",
          code: `oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2)], session: SessionDep) -> User:
    error = HTTPException(401, "Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise error
    user = await session.get(User, user_id)
    if user is None:
        raise error
    return user`,
        },
      ],
    },
    {
      id: "lc-async-fetch",
      q: "Fetch 100 URLs concurrently with at most 10 in flight, a timeout per request, and collect failures.",
      level: "Intermediate",
      common: true,
      answer:
        "One shared `httpx.AsyncClient`, a `Semaphore(10)`, a timeout, and `gather(..., return_exceptions=True)` (or try/except inside the task) so one failure doesn't cancel the rest.",
      detail: [
        {
          lang: "python",
          code: `import asyncio, httpx

async def fetch_all(urls: list[str], limit: int = 10) -> tuple[dict, dict]:
    sem = asyncio.Semaphore(limit)
    ok, failed = {}, {}
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        async def one(url: str):
            async with sem:
                try:
                    r = await client.get(url)
                    r.raise_for_status()
                    ok[url] = r.status_code
                except httpx.HTTPError as e:
                    failed[url] = type(e).__name__
        await asyncio.gather(*(one(u) for u in urls))
    return ok, failed`,
        },
      ],
    },
    {
      id: "lc-token-bucket",
      q: "Implement a token-bucket rate limiter.",
      level: "Advanced",
      common: true,
      answer:
        "Each key has a bucket with a capacity and a refill rate. On each request, add tokens for the time elapsed (up to capacity), then allow the request if at least one token is available and subtract it. In production the state lives in Redis (with a Lua script for atomicity) so all instances share it.",
      detail: [
        {
          lang: "python",
          code: `import time
from dataclasses import dataclass, field

@dataclass
class TokenBucket:
    capacity: float
    refill_per_sec: float
    tokens: float = field(init=False)
    updated: float = field(default_factory=time.monotonic)

    def __post_init__(self):
        self.tokens = self.capacity

    def allow(self) -> bool:
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.refill_per_sec)
        self.updated = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

buckets: dict[str, TokenBucket] = {}
def check(user_id: str) -> bool:
    bucket = buckets.setdefault(user_id, TokenBucket(capacity=10, refill_per_sec=1))   # 10 burst, 1/s
    return bucket.allow()`,
        },
      ],
    },
    {
      id: "lc-top-per-group-sql",
      q: "SQL: return each customer's most recent order.",
      level: "Intermediate",
      common: true,
      answer:
        "Use a window function to rank orders per customer by date and keep rank 1. In Postgres, `DISTINCT ON` is a concise alternative.",
      detail: [
        {
          lang: "sql",
          code: `SELECT customer_id, id, created_at, amount
FROM (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn
  FROM orders o
) t
WHERE rn = 1;

-- Postgres-specific:
SELECT DISTINCT ON (customer_id) customer_id, id, created_at, amount
FROM orders
ORDER BY customer_id, created_at DESC, id DESC;`,
        },
      ],
    },
    {
      id: "lc-async-retry",
      q: "Write an async retry helper for httpx calls with exponential backoff and jitter.",
      level: "Intermediate",
      answer:
        "Retry only transient errors (network errors, 429, 5xx), wait `base * 2**attempt` plus random jitter using `asyncio.sleep` (never `time.sleep`), respect `Retry-After` when present, and re-raise after the last attempt.",
      detail: [
        {
          lang: "python",
          code: `import asyncio, random, httpx

RETRY_STATUS = {429, 500, 502, 503, 504}

async def get_with_retry(client: httpx.AsyncClient, url: str, attempts: int = 4, base: float = 0.5) -> httpx.Response:
    for attempt in range(attempts):
        try:
            r = await client.get(url)
            if r.status_code not in RETRY_STATUS:
                return r
            delay = float(r.headers.get("retry-after", base * 2 ** attempt))
        except httpx.TransportError:
            if attempt == attempts - 1:
                raise
            delay = base * 2 ** attempt
        if attempt < attempts - 1:
            await asyncio.sleep(delay + random.uniform(0, base))
    return r`,
        },
      ],
    },
  ],
};
