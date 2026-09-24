// Day 2 interview bank, part 1: async deep dive, HTTP & REST, Pydantic, FastAPI advanced. Assembled in d02.js.

export const asyncDeep = {
  title: "Async Python in depth",
  questions: [
    {
      id: "coroutine-task-future",
      q: "What are coroutines, tasks and futures in asyncio?",
      level: "Intermediate",
      common: true,
      answer:
        "A **coroutine** is what calling an `async def` function returns: a paused computation that runs only when awaited or scheduled. A **Task** wraps a coroutine and schedules it on the event loop to run concurrently (`asyncio.create_task`). A **Future** is a low-level placeholder for a result that will be available later; Tasks are a subclass of Future. In application code you mostly work with coroutines and tasks.",
      detail: [
        {
          lang: "python",
          code: `async def work(n):
    await asyncio.sleep(1)
    return n * 2

coro = work(1)                          # coroutine: nothing runs yet
task = asyncio.create_task(work(2))     # task: starts running at the next await point
result = await task                     # 4`,
        },
      ],
    },
    {
      id: "gather-taskgroup",
      q: "`asyncio.gather` vs `TaskGroup` vs `as_completed` vs `wait`: when do you use each?",
      level: "Advanced",
      common: true,
      answer:
        "`gather` runs awaitables concurrently and returns results in order; with `return_exceptions=True` failures come back as values. `TaskGroup` (3.11+) is structured concurrency: if one task fails, the others are cancelled and errors are raised together, which is the safest default. `as_completed` yields results as each finishes, useful for streaming progress. `wait` gives fine control (first completed, first exception, timeouts) over sets of tasks.",
      detail: [
        {
          lang: "python",
          code: `async with asyncio.TaskGroup() as tg:                 # all-or-nothing
    a = tg.create_task(fetch("a")); b = tg.create_task(fetch("b"))

for coro in asyncio.as_completed([fetch(u) for u in urls]):
    result = await coro                                 # handle whichever finishes first
    print("done:", result)`,
        },
      ],
    },
    {
      id: "fire-and-forget",
      q: "What goes wrong with \"fire and forget\" `asyncio.create_task(...)`?",
      level: "Advanced",
      answer:
        "The event loop keeps only a weak reference to tasks, so a task you don't store can be garbage-collected before it finishes. Exceptions in it go unnoticed (only a warning at exit), and nothing waits for it on shutdown. Keep references (a set you discard from in a done-callback), use a `TaskGroup`, or for real background work in a web app use `BackgroundTasks` or a proper queue.",
      detail: [
        {
          lang: "python",
          code: `background = set()
task = asyncio.create_task(send_audit_log(event))
background.add(task)
task.add_done_callback(background.discard)`,
        },
      ],
    },
    {
      id: "cancellation-timeouts",
      q: "How do cancellation and timeouts work in asyncio?",
      level: "Advanced",
      answer:
        "Cancelling a task (`task.cancel()`, or a timeout via `asyncio.timeout(s)` / `wait_for`) raises `CancelledError` inside it at its current `await`. The coroutine can clean up in `finally` or `except CancelledError`, but it should re-raise the error so cancellation completes. Timeouts should wrap every network call to an LLM or external API so a hung connection can't block a request forever.",
      detail: [
        {
          lang: "python",
          code: `try:
    async with asyncio.timeout(20):
        answer = await llm.complete(prompt)
except TimeoutError:
    answer = "The assistant is taking too long. Please try again."`,
        },
      ],
    },
    {
      id: "run-blocking",
      q: "How do you run blocking or CPU-heavy code from async code?",
      level: "Intermediate",
      common: true,
      answer:
        "For blocking I/O (a sync SDK, file operations), use `await asyncio.to_thread(func, *args)`, which runs it in a thread pool without blocking the event loop. For CPU-heavy work, use `loop.run_in_executor(ProcessPoolExecutor(), func, ...)` to use other cores, or move it to a background worker queue. Never call blocking functions directly inside `async def`.",
    },
    {
      id: "queue-producer-consumer",
      q: "How would you process thousands of jobs concurrently with a limit?",
      level: "Intermediate",
      answer:
        "Either a `Semaphore` around each job with `gather`, or a producer–consumer pattern with `asyncio.Queue` and a fixed number of worker coroutines. The queue version gives natural back-pressure, easy retries (put a failed job back), and a clean shutdown with `queue.join()`.",
      detail: [
        {
          lang: "python",
          code: `async def worker(q: asyncio.Queue):
    while True:
        doc = await q.get()
        try:
            await index_document(doc)
        finally:
            q.task_done()

q = asyncio.Queue()
for d in documents: q.put_nowait(d)
workers = [asyncio.create_task(worker(q)) for _ in range(5)]
await q.join()                        # wait for all jobs
for w in workers: w.cancel()`,
        },
      ],
    },
    {
      id: "why-async-scales",
      q: "Why can async handle thousands of connections more cheaply than threads?",
      level: "Intermediate",
      answer:
        "Each OS thread needs its own stack (often around 1 MB reserved) and costs context switches in the kernel, so thousands of threads use a lot of memory and CPU. Coroutines are small Python objects scheduled cooperatively by the event loop in one thread, so tens of thousands of idle connections waiting on I/O cost very little. The trade-off: one blocking call stalls everything, and CPU work doesn't parallelise.",
    },
    {
      id: "async-from-sync",
      q: "How do you call async code from synchronous code, and vice versa?",
      level: "Intermediate",
      answer:
        "From sync code, start a loop with `asyncio.run(coro())` (only when no loop is running; it raises inside Jupyter or an already-async context, where you just `await`). From async code, call blocking sync functions with `await asyncio.to_thread(fn)`. Avoid mixing both styles deeply; pick async libraries end to end in async services.",
    },
    {
      id: "contextvars",
      q: "How do you keep per-request data (like a request ID) available in async code?",
      level: "Advanced",
      answer:
        "Use `contextvars.ContextVar`. Each asyncio task gets its own copy of the context, so a value set in middleware (the request ID or current user) is visible to all code handling that request, even across `await`s, without leaking into other concurrent requests. Thread-locals don't work for this in async code. Logging filters can read the ContextVar to add the request ID to every log line.",
      detail: [
        {
          lang: "python",
          code: `from contextvars import ContextVar
request_id: ContextVar[str] = ContextVar("request_id", default="-")

@app.middleware("http")
async def add_request_id(request, call_next):
    token = request_id.set(request.headers.get("x-request-id", uuid.uuid4().hex[:8]))
    try:
        return await call_next(request)
    finally:
        request_id.reset(token)`,
        },
      ],
    },
    {
      id: "async-context-iter",
      q: "What are `async with` and `async for`?",
      level: "Intermediate",
      answer:
        "`async with` uses an **async context manager** (`__aenter__`/`__aexit__`), whose setup and cleanup can await, such as opening an HTTP client or a database session. `async for` iterates an **async iterator** (`__aiter__`/`__anext__`) or async generator, where getting each item can await, such as reading a streamed LLM response token by token.",
    },
    {
      id: "uvloop",
      q: "What is uvloop?",
      level: "Advanced",
      answer:
        "A drop-in replacement for asyncio's event loop implemented on libuv (the same library behind Node.js). It's often 2–4× faster for network-heavy workloads. Uvicorn uses it automatically when installed (it's included in `uvicorn[standard]`).",
    },
    {
      id: "debug-event-loop",
      q: "How would you find what's blocking the event loop in production?",
      level: "Advanced",
      answer:
        "Symptoms are all requests slowing down together and latency spikes. Enable asyncio debug mode (`PYTHONASYNCIODEBUG=1`), which logs callbacks that take longer than `slow_callback_duration`; monitor event-loop lag; profile with `py-spy dump`/`py-spy top` to see what the loop thread is executing; and review for sync calls in async paths (`requests`, sync DB drivers, heavy JSON or PDF parsing). Fix by switching to async libraries or offloading with `to_thread` or a worker.",
    },
  ],
};

export const httpRest = {
  title: "HTTP and REST API design",
  questions: [
    {
      id: "rest-principles",
      q: "What makes an API RESTful?",
      level: "Basic",
      common: true,
      answer:
        "REST models data as **resources** identified by URLs (plural nouns like `/orders/42`), manipulated with standard HTTP **methods** (GET, POST, PUT, PATCH, DELETE) and represented as JSON. Each request is **stateless**: it carries everything needed (like the auth token), so any server can handle it. Responses use proper **status codes** and can be cacheable. In practice teams also agree on consistent naming, error formats, pagination and versioning.",
    },
    {
      id: "safe-idempotent",
      q: "What are safe and idempotent HTTP methods?",
      level: "Basic",
      common: true,
      answer:
        "**Safe** methods don't change server state: GET, HEAD, OPTIONS. **Idempotent** methods have the same effect whether called once or many times: GET, PUT, DELETE (and safe methods). POST isn't idempotent (two calls create two orders), and PATCH isn't guaranteed to be. It matters for retries: clients and proxies can safely retry idempotent requests; POSTs need idempotency keys.",
    },
    {
      id: "put-patch",
      q: "PUT vs PATCH?",
      level: "Basic",
      common: true,
      answer:
        "PUT replaces the whole resource with the representation sent, so omitted fields are reset; it's idempotent. PATCH applies a partial update with only the fields provided. In FastAPI, PATCH uses an all-optional schema and `model_dump(exclude_unset=True)` so unsent fields aren't overwritten.",
    },
    {
      id: "status-codes",
      q: "Explain 400 vs 422, 401 vs 403, and 200 vs 201 vs 202 vs 204.",
      level: "Basic",
      common: true,
      answer:
        "**400** is a generally bad request (malformed, or a business rule broken); **422** means well-formed but semantically invalid data, which FastAPI uses for validation errors. **401** means not authenticated; **403** means authenticated but not allowed. **200** is success with a body; **201** means a resource was created (return it, plus a `Location` header); **202** means accepted for later processing (async jobs); **204** means success with no body (typical for DELETE).",
    },
    {
      id: "pagination",
      q: "Offset vs cursor pagination?",
      level: "Intermediate",
      common: true,
      answer:
        "Offset (`LIMIT/OFFSET`, page numbers) is simple and supports jumping to any page and totals, but deep pages are slow because skipped rows are still scanned, and rows shift if data changes between requests. Cursor/keyset pagination (`WHERE (created_at, id) < (:last_created, :last_id) ORDER BY ... LIMIT n`) stays fast at any depth and is stable, but can't jump to arbitrary pages. Use offset for admin tables, cursor for feeds and large datasets.",
    },
    {
      id: "versioning",
      q: "How do you version an API?",
      level: "Intermediate",
      answer:
        "Most commonly with a URL prefix (`/api/v1`), which is explicit and easy to route and document; alternatives are headers (`Accept: application/vnd.app.v2+json`) or query parameters. Make additive, backward-compatible changes within a version; introduce a new version only for breaking changes, run both during a deprecation window, and communicate deprecation dates.",
    },
    {
      id: "http-caching",
      q: "How does HTTP caching work (Cache-Control, ETag, 304)?",
      level: "Intermediate",
      answer:
        "`Cache-Control` tells clients and CDNs whether and how long they may cache a response (`max-age=60`, `private`, `no-store`). An `ETag` is a version identifier for a resource; the client sends it back in `If-None-Match`, and if nothing changed the server replies **304 Not Modified** with no body, saving bandwidth. Use `no-store` for sensitive or per-user data.",
    },
    {
      id: "cors-preflight",
      q: "What is a CORS preflight request?",
      level: "Intermediate",
      common: true,
      answer:
        "Before a cross-origin request that isn't \"simple\" (e.g. JSON body, `Authorization` header, PUT/DELETE), the browser sends an `OPTIONS` request asking the server which origins, methods and headers are allowed. The server answers with `Access-Control-Allow-*` headers; if they don't match, the browser blocks the real request. CORS is enforced by browsers only; it isn't a server-side security control against other clients like curl.",
    },
    {
      id: "rest-graphql-grpc",
      q: "REST vs GraphQL vs gRPC: when would you use each?",
      level: "Intermediate",
      answer:
        "**REST**: simple, cacheable, universal for public and CRUD APIs. **GraphQL**: one endpoint where clients ask for exactly the fields they need; great for complex frontends aggregating many resources, but harder to cache and secure (query cost). **gRPC**: binary Protocol Buffers over HTTP/2 with generated clients and streaming; fast and strongly typed for internal service-to-service calls, but not browser-native.",
    },
    {
      id: "error-format",
      q: "How should an API format its errors?",
      level: "Intermediate",
      answer:
        "Consistently across every endpoint: correct HTTP status plus a JSON body with a machine-readable code, a human-readable message and field-level details for validation errors, e.g. `{\"error\": {\"code\": \"duplicate_email\", \"message\": \"...\", \"details\": [...]}}`. RFC 9457 \"Problem Details\" is a standard shape (`type`, `title`, `status`, `detail`). Never leak stack traces or internal messages in 500 responses; log them server-side with a request ID the client can quote.",
    },
    {
      id: "idempotency-keys",
      q: "How do idempotency keys work?",
      level: "Advanced",
      common: true,
      answer:
        "The client generates a unique key per logical operation and sends it in an `Idempotency-Key` header. The server stores the key (scoped to the user) with the request hash and the response, protected by a unique constraint. A retry with the same key returns the stored response instead of performing the action again; a different payload with the same key is rejected. Keys expire after a TTL. Payment APIs rely on this to avoid double charges.",
    },
    {
      id: "rate-limit-algorithms",
      q: "What rate-limiting algorithms do you know?",
      level: "Advanced",
      answer:
        "**Fixed window** counts requests per clock minute: simple but allows bursts at window edges. **Sliding window** (log or counter) smooths that edge effect. **Token bucket** refills tokens at a steady rate and allows bursts up to the bucket size; very common. **Leaky bucket** processes at a constant rate, queueing bursts. In distributed systems the counters live in Redis (often with Lua scripts for atomicity) and exceeded limits return 429 with `Retry-After`.",
    },
    {
      id: "webhooks",
      q: "How do you build and consume webhooks safely?",
      level: "Advanced",
      answer:
        "When consuming: verify the provider's HMAC signature over the raw body with the shared secret (and a timestamp to prevent replays), respond quickly with 2xx and process asynchronously via a queue, and make processing idempotent using the event ID because providers retry. When sending: sign payloads, retry with backoff, and let receivers see delivery logs.",
    },
    {
      id: "long-running",
      q: "How do you design an API for a long-running operation (like indexing 500 documents)?",
      level: "Intermediate",
      common: true,
      answer:
        "Return **202 Accepted** immediately with a job ID and a status URL, run the work in background workers via a queue, and store job status and progress in the database. Clients poll `GET /jobs/{id}`, or receive updates via Server-Sent Events, WebSockets or a webhook. Make the job idempotent and retryable, and support cancellation if needed.",
    },
    {
      id: "large-uploads",
      q: "How do you handle large file uploads?",
      level: "Intermediate",
      answer:
        "Avoid pushing big files through the API server: issue a presigned S3 URL (or POST policy) so the browser uploads directly to object storage, with size and type conditions. If they must go through the API, stream them in chunks (`UploadFile.read(chunk)`) to disk or storage, enforce a size limit, verify the file signature, and store under generated names. Process them asynchronously after upload.",
    },
  ],
};

export const pydanticAdv = {
  title: "Pydantic in depth",
  questions: [
    {
      id: "validate-methods",
      q: "`Model(...)` vs `model_validate()` vs `model_validate_json()`?",
      level: "Intermediate",
      answer:
        "`Model(**data)` validates keyword arguments. `Model.model_validate(obj)` validates a dict or, with `from_attributes=True`, any object with attributes (like an ORM row). `Model.model_validate_json(text)` parses and validates a JSON string in one step, which is faster than `json.loads` followed by validation and ideal for LLM outputs and request bodies.",
    },
    {
      id: "strict-lax",
      q: "What is strict mode in Pydantic?",
      level: "Intermediate",
      answer:
        "By default Pydantic is \"lax\": it converts compatible inputs, such as `\"42\"` to `42` or `\"true\"` to `True`. **Strict mode** (`ConfigDict(strict=True)`, `Field(strict=True)` or `StrictInt`) rejects anything that isn't already the exact type. Use strict mode where silent conversion could hide bugs, like money amounts from other services.",
    },
    {
      id: "aliases",
      q: "How do you accept camelCase JSON but use snake_case in Python?",
      level: "Intermediate",
      common: true,
      answer:
        "Use aliases: `ConfigDict(alias_generator=to_camel, populate_by_name=True)` (from `pydantic.alias_generators`), so incoming `createdAt` fills `created_at`. For responses, dump with `by_alias=True`; in FastAPI you can set `response_model_by_alias=True` (the default), so the React frontend sees camelCase.",
      detail: [
        {
          lang: "python",
          code: `from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class OrderOut(CamelModel):
    order_id: int
    created_at: datetime

OrderOut(order_id=1, created_at=now).model_dump(by_alias=True)   # {"orderId": 1, "createdAt": ...}`,
        },
      ],
    },
    {
      id: "computed-field",
      q: "What is `@computed_field`?",
      level: "Intermediate",
      answer:
        "A decorator for a `@property` on a Pydantic model that should be **included in serialisation and the JSON Schema**, e.g. `price_with_gst` derived from `price`. A plain `@property` isn't included in `model_dump()` or API responses; `@computed_field` is.",
    },
    {
      id: "discriminated-unions",
      q: "What are discriminated unions?",
      level: "Advanced",
      answer:
        "A union of models where a literal field (the discriminator, e.g. `type`) decides which model applies: `Annotated[Card | Upi | NetBanking, Field(discriminator=\"type\")]`. Pydantic validates directly against the right model instead of trying each one, giving faster validation and clearer errors. They're useful for polymorphic payloads such as payment methods, webhook events or LLM tool calls.",
    },
    {
      id: "dump-options",
      q: "Which `model_dump()` options do you use most?",
      level: "Intermediate",
      answer:
        "`exclude_unset=True` (only fields actually provided: PATCH), `exclude_none=True` (drop nulls), `exclude={\"password\"}` / `include={...}`, `by_alias=True` (camelCase output), and `mode=\"json\"` (convert datetimes, UUIDs and Decimals to JSON-safe values). `model_dump_json()` produces the JSON string directly.",
    },
    {
      id: "custom-types",
      q: "How do you create reusable validated types?",
      level: "Advanced",
      answer:
        "With `Annotated` and validators: `IndianPhone = Annotated[str, AfterValidator(check_phone)]` or constraints like `Annotated[str, StringConstraints(pattern=..., strip_whitespace=True)]`. The type can then be used in any model or FastAPI parameter. For validating plain values or lists without a model, use `TypeAdapter(list[int]).validate_python(data)`.",
    },
    {
      id: "pydantic-performance",
      q: "Why is Pydantic v2 fast, and how do you validate large payloads efficiently?",
      level: "Advanced",
      answer:
        "Pydantic v2's validation core (`pydantic-core`) is written in Rust, typically several times faster than v1. For speed: validate JSON directly with `model_validate_json` (skips building intermediate Python objects), reuse `TypeAdapter` instances instead of recreating them, avoid unnecessary custom Python validators in hot paths, and don't validate the same data twice across layers.",
    },
  ],
};

export const fastapiAdv = {
  title: "FastAPI in depth",
  questions: [
    {
      id: "request-lifecycle",
      q: "Walk through what happens when a request hits a FastAPI app.",
      level: "Intermediate",
      common: true,
      answer:
        "The ASGI server (Uvicorn) parses the HTTP request and calls the app. It passes through the middleware stack (outermost first: CORS, logging, etc.), then Starlette's router matches the path and method. FastAPI resolves dependencies (with per-request caching), extracts and validates path, query, header and body parameters with Pydantic (422 on failure), and calls the endpoint (in the event loop for `async def`, in a thread pool for `def`). The return value is validated and filtered by `response_model`, serialised to JSON, and passed back out through the middleware. Exceptions are turned into responses by exception handlers, and code after `yield` in dependencies runs for cleanup.",
    },
    {
      id: "dependency-cache",
      q: "Are dependencies called once per request? What is `use_cache`?",
      level: "Intermediate",
      answer:
        "Within a single request, a dependency used in several places is called once and its result reused (e.g. one DB session shared by two services). Pass `Depends(fn, use_cache=False)` to force a fresh call each time it's declared. Across requests nothing is cached, unless you cache yourself (e.g. `@lru_cache` on `get_settings`).",
    },
    {
      id: "class-deps",
      q: "Can dependencies be classes? What are sub-dependencies?",
      level: "Intermediate",
      answer:
        "Yes: any callable works, so `Depends(Pagination)` creates an instance using the class's `__init__` parameters as query params. Dependencies can themselves declare dependencies (sub-dependencies), forming a graph FastAPI resolves automatically, e.g. `get_current_user` depends on `oauth2_scheme` and `get_session`. Dependency factories (functions returning dependencies) let you parametrise them, like `require_role(\"admin\")`.",
    },
    {
      id: "router-deps",
      q: "How do you apply a dependency to a whole group of routes?",
      level: "Basic",
      answer:
        "Pass `dependencies=[Depends(require_admin)]` to `APIRouter(...)`, to `app.include_router(router, dependencies=[...])`, or to the `FastAPI(...)` app itself. Those dependencies run for every route in that scope without adding a parameter to each function.",
    },
    {
      id: "streaming-sse",
      q: "How do you stream a response (e.g. LLM tokens) from FastAPI?",
      level: "Intermediate",
      common: true,
      answer:
        "Return a `StreamingResponse` wrapping a (preferably async) generator that yields chunks, with `media_type=\"text/event-stream\"` for Server-Sent Events, where each event is `data: ...\\n\\n`. Disable proxy buffering (`X-Accel-Buffering: no`), send errors as events (the status is already 200 once streaming starts), and stop the upstream call if `await request.is_disconnected()`.",
    },
    {
      id: "websockets",
      q: "When would you use WebSockets in FastAPI instead of SSE?",
      level: "Intermediate",
      answer:
        "WebSockets are two-way and persistent: good for chat where both sides send messages at any time, real-time collaboration, live dashboards or voice streaming. SSE is simpler and one-way (server → client) over normal HTTP, enough for streaming an LLM answer. FastAPI supports both (`@app.websocket(\"/ws\")` with `await ws.accept()`, `receive_text`, `send_json`). Scaling WebSockets across instances needs sticky sessions or a pub/sub layer such as Redis.",
    },
    {
      id: "uploadfile-bytes",
      q: "`UploadFile` vs `bytes` for file uploads?",
      level: "Intermediate",
      answer:
        "`file: bytes = File()` reads the whole file into memory, fine only for small files. `UploadFile` uses a spooled temporary file (memory up to a limit, then disk), exposes the filename and content type, and supports async `read(size)` for streaming, so it's the right choice for real uploads. Both require `python-multipart`.",
    },
    {
      id: "custom-middleware",
      q: "How do you write middleware, and in what order does it run?",
      level: "Intermediate",
      answer:
        "Use `@app.middleware(\"http\")` with `async def mw(request, call_next)`, or a class added with `app.add_middleware(...)`; for high performance, pure ASGI middleware. The last middleware added is the outermost: it runs first on the request and last on the response. Keep middleware light, because it runs for every request, including health checks.",
    },
    {
      id: "security-scopes",
      q: "What security utilities does FastAPI provide?",
      level: "Advanced",
      answer:
        "`fastapi.security` includes `OAuth2PasswordBearer` (bearer tokens with a password-flow token URL), `OAuth2AuthorizationCodeBearer`, `HTTPBasic`, `HTTPBearer`, `APIKeyHeader/Query/Cookie`, and `SecurityScopes` for OAuth2 scopes (`Security(get_user, scopes=[\"orders:write\"])`). They extract credentials and document the security scheme in OpenAPI so Swagger's Authorize button works; verification logic is yours.",
    },
    {
      id: "scale-fastapi",
      q: "How do you make a FastAPI service handle more traffic?",
      level: "Intermediate",
      common: true,
      answer:
        "Keep request paths non-blocking (async libraries, `to_thread` for blocking calls); run several worker processes per machine (roughly per CPU core); scale horizontally behind a load balancer since the app is stateless; use connection pooling sized to database limits; cache hot reads (Redis); move heavy work to background workers; and measure with profiling and load tests before tuning.",
    },
    {
      id: "rate-limit-fastapi",
      q: "How would you add rate limiting to a FastAPI app?",
      level: "Intermediate",
      answer:
        "Implement a dependency or middleware that increments a per-user (or per-IP/API key) counter in Redis with an expiry and returns 429 with `Retry-After` when exceeded, or use a library like `slowapi`. For stricter control, use a token-bucket algorithm in a Redis Lua script. API gateways (AWS API Gateway, Nginx, Cloudflare) can also enforce limits before traffic reaches the app. LLM endpoints usually need both request limits and token budgets.",
    },
    {
      id: "mount-subapps",
      q: "What's the difference between `include_router` and `mount`?",
      level: "Advanced",
      answer:
        "`include_router` merges an `APIRouter`'s routes into the app, sharing its middleware, dependencies, exception handlers and one OpenAPI schema. `app.mount(\"/path\", other_app)` attaches an independent ASGI app (another FastAPI app, `StaticFiles`, a Gradio UI) with its own middleware and docs. Use routers for organising one API, mounts for separate applications.",
    },
  ],
};
