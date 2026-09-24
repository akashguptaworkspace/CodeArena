// HTTP, Express & APIs. Shape: see ../nodejs.js
export default {
  "node-http-server": {
    scenario: "Without Express, write a Node HTTP server with GET /health and POST /echo that returns the JSON body it receives.",
    answer: {
      summary:
        "http.createServer gives you a request (a readable stream) and a response (a writable stream). You route on method and URL yourself, read the body by collecting chunks, parse it, and write the status, headers and body.",
      points: [
        "The body isn't available immediately: it arrives as data chunks until 'end'.",
        "Limit body size, or a client can send gigabytes and exhaust memory.",
        "Handle invalid JSON with a 400, unknown routes with 404, and unexpected errors with 500.",
        "Express adds routing with params, middleware, body parsers, helpers like res.json and res.status, and error handling on top of exactly this.",
      ],
      code: `const http = require("node:http");
const MAX_BODY = 1_000_000;

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Body too large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method === "POST" && req.url === "/echo") return send(res, 200, await readJson(req));
    send(res, 404, { error: "Not found" });
  } catch (err) {
    send(res, err.status || 500, { error: err.status ? err.message : "Internal error" });
  }
}).listen(3000);`,
    },
  },

  "node-express-middleware": {
    scenario: "How does Express middleware work? What decides the order, and what does next() do?",
    answer: {
      summary:
        "Express keeps an ordered list of middleware and routes. For each request it calls them in the order they were registered, as long as the path matches. Each middleware either ends the response or calls next() to pass control on; next(err) jumps straight to error-handling middleware.",
      points: [
        "Signature: (req, res, next). They can read or modify req/res (e.g. set req.user) before the route runs.",
        "Order matters: body parser must come before routes that read req.body; auth must be registered before the routes it protects.",
        "Router-level middleware (router.use) only applies to that router's routes; route-level middleware applies to one route: app.get('/x', auth, handler).",
        "Forgetting to call next() or send a response leaves the request hanging until it times out.",
        "Calling next() after sending a response leads to 'Cannot set headers after they are sent'.",
      ],
      code: `app.use(express.json({ limit: "1mb" }));
app.use(requestId);

app.get("/health", health);          // public: registered before auth
app.use("/api", authenticate);       // everything below under /api needs auth
app.use("/api/orders", ordersRouter);

app.use(notFound);
app.use(errorHandler);               // (err, req, res, next): always last`,
    },
  },

  "node-error-middleware": {
    scenario: "How would you design error handling for a large Express API so every error produces a consistent, safe response?",
    answer: {
      summary:
        "Throw (or next()) typed errors from anywhere, and handle them in one error middleware registered last. It maps known errors to status codes and messages, hides internals for unknown ones, and logs everything with request context.",
      points: [
        "An error middleware has four parameters: (err, req, res, next). Express recognises it by the arity.",
        "Custom error classes (AppError with statusCode and code; NotFoundError, ValidationError, ConflictError) express intent in services without knowing about HTTP details like res.",
        "Operational errors (expected: validation, not found, conflicts) → their status and a helpful message. Programmer errors (bugs) → 500 with a generic message; the details go to logs only.",
        "Translate library errors at the edge: a unique constraint violation → 409, a validation library error → 400/422 with field errors.",
        "Consistent shape, e.g. { error: { code, message, details } }, plus the request ID so users and support can quote it.",
        "Async errors must reach next(): use a wrapper or Express 5.",
      ],
      code: `class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function errorHandler(err, req, res, next) {
  if (err.name === "SequelizeUniqueConstraintError") err = new AppError(409, "conflict", "Already exists");
  const known = err instanceof AppError;
  req.log.error({ err }, "request failed");
  res.status(known ? err.status : 500).json({
    error: { code: known ? err.code : "internal", message: known ? err.message : "Something went wrong", requestId: req.id },
  });
}`,
    },
  },

  "node-rest-design": {
    scenario: "Design the REST API for orders in an e-commerce app. Cover URLs, methods, status codes and versioning.",
    answer: {
      summary:
        "Model resources as nouns (/orders, /orders/{id}, /orders/{id}/items) and use HTTP methods for actions. Return precise status codes, a consistent error format, pagination for lists, and version the API so you can make breaking changes without breaking clients.",
      points: [
        "GET /v1/orders?status=paid&cursor=… (list), GET /v1/orders/{id}, POST /v1/orders (create → 201 + Location header), PATCH /v1/orders/{id} (partial update), DELETE → 204.",
        "Status codes: 400 malformed, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict (state or duplicates), 422 validation, 429 rate limited, 500/503 server side.",
        "Idempotency: GET, PUT and DELETE are idempotent; POST is not, so use Idempotency-Key headers for payments and orders.",
        "Actions that aren't CRUD: POST /orders/{id}/cancel (a sub-resource command), or model the state change (PATCH status) with server-side validation of allowed transitions.",
        "Versioning: /v1 in the path is simplest; add fields freely, but never remove or rename without a new version.",
        "Document with OpenAPI; return only needed fields; never expose internal IDs or fields you don't intend to support.",
      ],
    },
  },

  "node-pagination": {
    scenario: "The orders list endpoint gets slow on later pages and users see duplicate items while scrolling. Explain offset vs cursor pagination.",
    answer: {
      summary:
        "Offset pagination (LIMIT 20 OFFSET 10000) makes the database read and discard all skipped rows, so deep pages get slow, and inserts between requests shift rows, causing duplicates or gaps. Cursor (keyset) pagination remembers the last row's sort key and asks for rows after it, which uses an index and stays stable.",
      points: [
        "Cursor query: WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20. The id tie-breaker makes the order unique.",
        "Needs a composite index matching the ORDER BY.",
        "Return an opaque cursor (base64 of the last values) plus hasMore; the client sends it back.",
        "Trade-off: no 'jump to page 50' and total counts are expensive; fine for feeds and infinite scroll. Offset is OK for small admin tables.",
        "Sorting by a changing value (like count) is unstable either way: sort by a snapshot, or accept some movement.",
      ],
      code: `const rows = await db.query(
  \`SELECT id, total, created_at FROM orders
   WHERE user_id = ? AND (created_at, id) < (?, ?)
   ORDER BY created_at DESC, id DESC
   LIMIT 21\`,
  [userId, cursor.createdAt, cursor.id],
);
const hasMore = rows.length > 20;
const page = rows.slice(0, 20);`,
    },
  },

  "node-idempotency": {
    scenario:
      "A mobile app retries POST /payments when the network drops, and some customers get charged twice. Make the endpoint idempotent.",
    answer: {
      summary:
        "The client generates a unique Idempotency-Key per logical payment and sends it with every retry. The server stores each key with the result of the first request (using a unique constraint), and for any repeat with the same key it returns the stored result instead of charging again.",
      points: [
        "Store: key, user ID, a hash of the request body, status (processing/completed), response code and body, created time.",
        "Insert the key first with status 'processing' under a unique constraint. If the insert fails because the key exists: completed → return the saved response; processing → return 409 or wait.",
        "Same key with a different body → 422: the client is misusing the key.",
        "Pass the same key to the payment provider (Stripe and Razorpay support it) so their side dedupes too.",
        "Expire keys after a window (e.g. 24 h).",
        "Concurrent duplicates hitting two servers at once are handled by the database's unique constraint, not by application checks.",
      ],
      code: `app.post("/payments", asyncHandler(async (req, res) => {
  const key = req.get("Idempotency-Key");
  if (!key) throw new AppError(400, "missing_key", "Idempotency-Key header required");

  const inserted = await idem.tryInsert({ key, userId: req.user.id, hash: hash(req.body) });
  if (!inserted) {
    const saved = await idem.find(key, req.user.id);
    if (saved.hash !== hash(req.body)) throw new AppError(422, "key_reused", "Key used with a different request");
    if (saved.status === "processing") throw new AppError(409, "in_progress", "Payment is still processing");
    return res.status(saved.responseCode).json(saved.responseBody);
  }

  const payment = await payments.charge(req.body, { idempotencyKey: key });
  await idem.complete(key, 201, payment);
  res.status(201).json(payment);
}));`,
    },
  },

  "node-rate-limit-impl": {
    scenario: "Add rate limiting to an Express API that runs on several instances: 100 requests per minute per user.",
    answer: {
      summary:
        "Keep counters in Redis so all instances share them. The simplest correct version is a fixed window: INCR a key for the user and the current minute, set its expiry on the first hit, and reject with 429 once it passes the limit. Sliding windows or token buckets smooth out bursts at window edges.",
      points: [
        "Key by authenticated user or API key; fall back to IP for anonymous traffic.",
        "Behind a load balancer, req.ip is the balancer's address unless you set app.set('trust proxy', n) correctly; don't blindly trust X-Forwarded-For from clients.",
        "INCR and EXPIRE must be atomic (MULTI or a Lua script), or a crash between them leaves a key that never expires.",
        "Respond 429 with Retry-After and RateLimit headers.",
        "Libraries: express-rate-limit with a Redis store, rate-limiter-flexible. Often better done at the API gateway or reverse proxy (Nginx, Kong, Cloudflare).",
        "Fixed window allows 2× bursts at the boundary; sliding window log/counter or token bucket fixes that.",
      ],
      code: `function rateLimit({ limit = 100, windowSec = 60 } = {}) {
  return async (req, res, next) => {
    const id = req.user?.id ?? req.ip;
    const window = Math.floor(Date.now() / 1000 / windowSec);
    const key = "rl:" + id + ":" + window;

    const [[, count]] = await redis.multi().incr(key).expire(key, windowSec).exec();
    res.set("RateLimit-Remaining", String(Math.max(0, limit - count)));
    if (count > limit) {
      res.set("Retry-After", String(windowSec - (Math.floor(Date.now() / 1000) % windowSec)));
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}`,
    },
  },

  "node-validation": {
    scenario: "Where should request validation happen in a Node API, and how do you implement it?",
    answer: {
      summary:
        "Validate every input at the API boundary (body, params, query, headers) against a schema before it reaches business logic, and keep hard constraints in the database as the final safety net. Frontend validation is only for user experience; anyone can call your API directly.",
      points: [
        "Schema libraries: zod (TypeScript-friendly), joi, or ajv with JSON Schema (fast, used by Fastify).",
        "Reject unknown fields (strict schemas) to prevent mass assignment, e.g. a client sending isAdmin: true.",
        "Coerce query strings deliberately (they're always strings): page=2 → number.",
        "Return 400/422 with field-level errors the client can show.",
        "Business rules (e.g. stock available) belong in the service layer; data integrity rules (unique, not null, foreign keys) in the database too.",
      ],
      code: `const { z } = require("zod");

const createOrder = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(10) })).min(1),
  couponCode: z.string().max(20).optional(),
}).strict();

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(422).json({ errors: result.error.flatten().fieldErrors });
  req.body = result.data;
  next();
};

router.post("/orders", validate(createOrder), createOrderHandler);`,
    },
  },

  "node-cors": {
    scenario: "Your API works in Postman but the browser app on another domain gets a CORS error. Explain CORS and how to configure it correctly.",
    answer: {
      summary:
        "Browsers block JavaScript from reading responses from a different origin (scheme + host + port) unless the server explicitly allows it with Access-Control-Allow-* headers. For non-simple requests (JSON body, custom headers, PUT/DELETE), the browser first sends an OPTIONS preflight. Postman isn't a browser, so it ignores CORS.",
      points: [
        "Access-Control-Allow-Origin: the exact allowed origin (from an allowlist), or * for public, cookie-less APIs.",
        "Cookies or auth across origins: the client sets credentials: 'include'; the server sends Access-Control-Allow-Credentials: true and a specific origin (never * with credentials). Cookies also need SameSite=None; Secure.",
        "The preflight must succeed: OPTIONS returns 204 with Allow-Methods and Allow-Headers (e.g. Content-Type, Authorization); auth middleware must not reject OPTIONS.",
        "Debug in the browser's Network tab: look at the preflight response and which header is missing.",
        "CORS protects users' browsers, not your API: it doesn't stop curl or servers. You still need authentication and CSRF protection.",
      ],
      code: `const cors = require("cors");
const allowed = new Set(process.env.CLIENT_ORIGINS.split(","));

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
  credentials: true,
}));`,
    },
  },

  "node-file-structure": {
    scenario: "How would you structure a Node/Express codebase that 10 developers work on?",
    answer: {
      summary:
        "Separate HTTP concerns from business logic from data access, and as the app grows, group code by feature. Routes and controllers deal with HTTP (parse input, call a service, shape the response); services hold business rules; repositories or models talk to the database.",
      points: [
        "Example: src/modules/orders/{orders.routes.js, orders.controller.js, orders.service.js, orders.repository.js, orders.validators.js, orders.test.js}.",
        "Services don't know about req/res, so they can be reused (jobs, CLI scripts) and unit-tested without HTTP.",
        "Cross-cutting pieces in one place: config (validated at startup), logger, error classes and middleware, DB setup.",
        "Dependency injection (pass dependencies in, or a light container) makes testing and swapping implementations easy.",
        "Business rules like 'max 3 active orders per user' belong in the service layer (and enforced atomically), not in the route handler or the frontend.",
        "Consistency matters more than the exact pattern: lint rules, a README for conventions, and code reviews keep it that way.",
      ],
    },
  },

  "node-graceful-shutdown": {
    scenario: "During deploys some users see failed requests. Implement graceful shutdown for an Express server.",
    answer: {
      summary:
        "On SIGTERM, stop accepting new connections, let in-flight requests finish, close resources (DB pool, Redis, queue workers), then exit, with a hard timeout in case something hangs. In Kubernetes, also fail the readiness check first so the load balancer stops sending you traffic.",
      points: [
        "server.close() stops new connections and calls back when existing ones finish. Idle keep-alive connections can keep it open forever: use server.closeIdleConnections() (Node 18.2+) or track sockets.",
        "Set a force-exit timer (e.g. 10–25 s, less than Kubernetes' 30 s grace period) and unref() it.",
        "Readiness: flip a flag so /ready returns 503; wait a few seconds for the load balancer to notice before closing.",
        "Order: stop taking work → finish work → close DB/cache/queues → flush logs → exit.",
        "Make sure the signal reaches Node: run node directly, not through npm, in the container.",
      ],
      code: `let shuttingDown = false;
app.get("/ready", (req, res) => res.status(shuttingDown ? 503 : 200).end());

const server = app.listen(PORT);

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  setTimeout(() => process.exit(1), 25_000).unref();   // hard limit

  await new Promise((r) => setTimeout(r, 5_000));      // let the LB see /ready fail
  server.close(async () => {
    await Promise.allSettled([db.close(), redis.quit(), queue.close()]);
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);`,
    },
  },

  "node-websockets": {
    scenario: "You need to push real-time updates to users. Compare WebSockets, Server-Sent Events and long polling in Node.",
    answer: {
      summary:
        "WebSockets give a persistent two-way channel, which suits chat, games and collaborative editing. SSE is a one-way stream from server to client over plain HTTP, with built-in reconnection, which suits notifications, feeds and live scores. Long polling is a fallback that repeats HTTP requests.",
      points: [
        "Node handles many idle persistent connections cheaply thanks to the event loop.",
        "Libraries: ws (lightweight), socket.io (rooms, reconnection, fallbacks, acknowledgements).",
        "SSE: Content-Type: text/event-stream, write 'data: ...\\n\\n'; works through most proxies; browser EventSource reconnects automatically with Last-Event-ID.",
        "Scaling: a user is connected to one instance; to broadcast, publish through Redis pub/sub (socket.io Redis adapter) so every instance sends to its connected clients. Sticky sessions if using socket.io's polling transport.",
        "Authenticate at connection time, send heartbeats to detect dead connections, and limit message rates.",
        "Huge broadcast audiences (1M viewers of a score): SSE or a managed pub/sub/CDN-based service, with updates batched per second.",
      ],
    },
  },

  "node-express-vs-fastify": {
    scenario: "Express, Fastify or NestJS for a new service: how do you choose?",
    answer: {
      summary:
        "Express is minimal and has the largest ecosystem, but it's older and leaves structure and validation to you. Fastify is faster, with built-in JSON-schema validation and serialisation and a good plugin system. NestJS is an opinionated framework (modules, dependency injection, decorators) that runs on Express or Fastify.",
      points: [
        "Express: fine for most CRUD APIs; huge amount of middleware and answers online; Express 5 fixes async error handling.",
        "Fastify: often 2–3× the request throughput of Express in benchmarks, thanks to schema-based serialisation and a faster router; good TypeScript support; encapsulated plugins.",
        "NestJS: consistent structure for big teams, familiar to Angular/Spring developers; more boilerplate and abstraction, heavier to learn.",
        "Skip NestJS for small services, serverless functions, or teams that prefer explicit simple code.",
        "The framework rarely is the bottleneck; database queries and architecture matter more.",
      ],
    },
  },

  "node-http-caching": {
    scenario: "How can HTTP caching headers and compression make a Node API faster and cheaper to run?",
    answer: {
      summary:
        "Cache-Control tells browsers and CDNs whether and how long they may reuse a response; ETags let clients revalidate cheaply and get a 304 with no body; compression shrinks responses. Together they cut latency, bandwidth and server load.",
      points: [
        "Public, non-personalised data: Cache-Control: public, max-age=60, stale-while-revalidate=300 so a CDN can serve it.",
        "Personalised data: Cache-Control: private (browser only) or no-store for sensitive data. Missing this can make a CDN serve one user's data to another.",
        "Vary header tells caches which request headers change the response (e.g. Vary: Accept-Encoding, Authorization).",
        "ETag + If-None-Match → 304 Not Modified: saves bandwidth, though the server still does the work unless it can check the version cheaply.",
        "Compression: gzip/brotli at Nginx or the CDN is cheaper than in Node; skip tiny responses and already-compressed files.",
      ],
    },
  },
};
