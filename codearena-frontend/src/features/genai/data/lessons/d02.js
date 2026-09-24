// Day 2: Python backend (async, httpx, Pydantic, FastAPI, databases). Shape: see ./index.js
export default {
  asyncio: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "LLM calls take seconds, not milliseconds. A GenAI backend spends most of its time waiting on model APIs, vector databases and HTTP calls, so async is essential. You already understand Node's event loop; Python's `asyncio` is the same idea with different defaults, and those differences are where people get stuck.",
    sections: [
      {
        h: "The same idea as Node",
        blocks: [
          "`asyncio` runs an **event loop on one thread**. When a coroutine hits `await` on I/O, it gives control back to the loop, which runs other work until the I/O completes. That's exactly Node's model.",
          {
            lang: "python",
            code: `import asyncio

async def fetch_answer(question: str) -> str:
    await asyncio.sleep(1)          # stands in for an LLM call
    return f"answer to {question}"

async def main():
    answer = await fetch_answer("What is RAG?")
    print(answer)

asyncio.run(main())                 # start the loop, run main, close the loop`,
          },
          {
            table: {
              head: ["Node", "Python asyncio"],
              rows: [
                ["`async function f()`", "`async def f():`"],
                ["`await p`", "`await coro`"],
                ["Promise", "Coroutine / Task / Future"],
                ["Event loop starts automatically", "You start it: `asyncio.run(main())` (FastAPI does it for you)"],
                ["`Promise.all([...])`", "`await asyncio.gather(...)`"],
                ["`Promise.race` + timeout", "`asyncio.wait_for(coro, timeout=5)` or `async with asyncio.timeout(5)`"],
                ["`setTimeout(fn, ms)`", "`await asyncio.sleep(s)` (seconds, not ms)"],
                ["Fire and forget: `f()`", "`asyncio.create_task(f())` (keep a reference!)"],
              ],
            },
          },
        ],
      },
      {
        h: "The big difference: calling doesn't start it",
        blocks: [
          "In JS, calling an async function starts it immediately and returns a promise. In Python, calling `fetch_answer(\"x\")` just creates a **coroutine object**. Nothing runs until you `await` it or schedule it as a task.",
          {
            lang: "python",
            code: `coro = fetch_answer("x")    # nothing happens yet
print(coro)                 # <coroutine object fetch_answer at 0x...>
result = await coro          # now it runs

# Forgetting await is a classic bug:
answer = fetch_answer("x")  # RuntimeWarning: coroutine was never awaited`,
          },
          {
            warn: "If you see `coroutine ... was never awaited`, or a value prints as `<coroutine object ...>`, you forgot an `await`.",
          },
        ],
      },
      {
        h: "Running things concurrently",
        blocks: [
          "Awaiting one call after another is sequential. To run independent calls at the same time, use `asyncio.gather` (like `Promise.all`) or a `TaskGroup`.",
          {
            lang: "python",
            code: `import asyncio, time

async def main():
    start = time.perf_counter()

    # Sequential: ~3 seconds
    a = await fetch_answer("a")
    b = await fetch_answer("b")
    c = await fetch_answer("c")

    # Concurrent: ~1 second
    a, b, c = await asyncio.gather(fetch_answer("a"), fetch_answer("b"), fetch_answer("c"))

    # gather with error handling: failures come back as values
    results = await asyncio.gather(*[fetch_answer(q) for q in ["x", "y"]], return_exceptions=True)

    # Python 3.11+: TaskGroup cancels the others if one fails
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch_answer("a"))
        t2 = tg.create_task(fetch_answer("b"))
    print(t1.result(), t2.result(), time.perf_counter() - start)`,
          },
          "Real GenAI example: a RAG query that searches the vector store and the keyword index at the same time, then reranks. Running the two searches concurrently cuts latency.",
          {
            lang: "python",
            code: `async def hybrid_search(query: str):
    vector_hits, keyword_hits = await asyncio.gather(
        vector_store.search(query, k=20),
        bm25_index.search(query, k=20),
    )
    return merge(vector_hits, keyword_hits)`,
          },
        ],
      },
      {
        h: "Limiting concurrency and adding timeouts",
        blocks: [
          "LLM providers have rate limits. Firing 500 requests at once gets you HTTP 429 errors. Use a `Semaphore` to cap how many run at the same time, and always set timeouts.",
          {
            lang: "python",
            code: `sem = asyncio.Semaphore(5)                 # at most 5 in flight

async def embed_one(text: str) -> list[float]:
    async with sem:
        async with asyncio.timeout(30):     # Python 3.11+
            return await client.embed(text)

vectors = await asyncio.gather(*(embed_one(t) for t in texts))`,
          },
        ],
      },
      {
        h: "Blocking code: the thing that kills async",
        blocks: [
          "Because there's one thread, any **blocking** call inside an `async def` freezes every other request, just like a synchronous loop in Node. Common culprits: `time.sleep`, `requests.get`, synchronous database drivers, heavy CPU work (parsing a big PDF, running a local model).",
          {
            lang: "python",
            code: `import time, asyncio, requests, httpx

async def bad():
    time.sleep(2)                    # blocks the whole server
    requests.get("https://...")      # blocks too

async def good():
    await asyncio.sleep(2)
    async with httpx.AsyncClient() as client:
        await client.get("https://...")

# Unavoidable blocking library? Push it to a thread:
text = await asyncio.to_thread(extract_pdf_text, "big.pdf")`,
          },
          {
            note: "In FastAPI, a plain `def` route (not `async def`) is automatically run in a thread pool, so blocking code there is safe. The danger is blocking code inside `async def`. Rule: use `async def` only when everything inside is awaitable.",
          },
        ],
      },
      {
        h: "Threads, processes and the GIL",
        blocks: [
          "The **GIL** (Global Interpreter Lock) lets only one thread run Python bytecode at a time in standard CPython. That's why:",
          {
            list: [
              "**I/O-bound work** (API calls, DB queries): async or threads work well, because the GIL is released while waiting. This is 90% of GenAI backend work.",
              "**CPU-bound work** (heavy parsing, local embeddings on CPU): use `multiprocessing` / `ProcessPoolExecutor`, or libraries like NumPy and PyTorch that release the GIL inside C code.",
            ],
          },
          {
            note: "Python 3.13 added an experimental free-threaded build without the GIL, but most production code still assumes the GIL. In interviews, explain the I/O vs CPU distinction; that's what they're checking.",
          },
        ],
      },
      {
        h: "Async generators: the shape of streaming",
        blocks: [
          "An `async def` that uses `yield` is an **async generator**. You consume it with `async for`. This is exactly how LLM token streaming works in Python SDKs, and what FastAPI's `StreamingResponse` consumes (Day 4).",
          {
            lang: "python",
            code: `async def stream_tokens(text: str):
    for word in text.split():
        await asyncio.sleep(0.05)
        yield word + " "

async def main():
    async for token in stream_tokens("Retrieval augmented generation grounds answers"):
        print(token, end="", flush=True)`,
          },
        ],
      },
    ],
    revise: [
      "asyncio = single-threaded event loop, like Node. `asyncio.run(main())` starts it; FastAPI starts it for you.",
      "Calling an `async def` returns a coroutine and runs nothing until awaited. \"never awaited\" warning = missing `await`.",
      "Concurrency: `asyncio.gather(...)` (like `Promise.all`), `TaskGroup`, `return_exceptions=True`.",
      "Rate limits: `asyncio.Semaphore(n)`. Timeouts: `asyncio.timeout(s)` / `wait_for`.",
      "Never block inside `async def` (`time.sleep`, `requests`). Use async libraries or `asyncio.to_thread`.",
      "GIL: threads/async suit I/O-bound work; processes suit CPU-bound work.",
      "Async generator + `async for` = token streaming.",
    ],
    mistakes: [
      "Forgetting `await`, so you get a coroutine object instead of a result.",
      "Using `requests` or `time.sleep` inside `async def` FastAPI routes, which freezes the server under load.",
      "Awaiting independent calls one after another instead of using `gather`.",
      "`asyncio.create_task(...)` without keeping a reference; the task can be garbage-collected mid-flight.",
      "Firing unlimited concurrent LLM calls and hitting 429 rate limits.",
    ],
    interview: [
      {
        q: "How does async in Python compare with Node?",
        a: "Both use a single-threaded event loop with non-blocking I/O and async/await syntax. Differences: Python needs the loop started explicitly (`asyncio.run`, or a framework does it); calling an async function creates a coroutine that doesn't run until awaited, whereas JS starts promises immediately; and much of Python's ecosystem is still synchronous, so you must choose async libraries (httpx, asyncpg, Motor) or offload blocking calls to threads.",
      },
      {
        q: "What is the GIL, and does it matter for a GenAI API server?",
        a: "The Global Interpreter Lock lets only one thread execute Python bytecode at a time in CPython. It matters for CPU-bound Python code, which doesn't scale across threads. A GenAI API server is mostly I/O-bound, waiting on LLM APIs and databases, and the GIL is released during I/O, so async or threads work well. CPU-heavy work like local inference goes to separate processes, GPU libraries, or dedicated inference servers.",
      },
      {
        q: "You need embeddings for 10,000 texts. How do you do it quickly without hitting rate limits?",
        a: "Batch texts (most embedding APIs accept up to a few hundred inputs per request), run batches concurrently with `asyncio.gather`, cap concurrency with a `Semaphore` tuned to the provider's rate limit, add retries with exponential backoff for 429 and 5xx responses, and set timeouts. Cache results by a hash of the text so re-runs don't pay again.",
      },
    ],
    practice: [
      "Write `fake_llm(prompt)` that sleeps a random 0.5–2 seconds. Call it 10 times sequentially and then with `gather`, and time both.",
      "Add a `Semaphore(3)` and print when each call starts and ends to see the concurrency cap working.",
      "Write an async generator that yields the characters of a string with a delay, and print it like a typing effect.",
    ],
  },

  httpx: {
    minutes: 40,
    level: "Beginner",
    intro:
      "Before SDKs, there's HTTP. Every LLM SDK is a wrapper around HTTP requests, and you'll often call APIs that have no SDK (internal services, webhooks, a vector DB's REST API). `requests` is the classic synchronous library; `httpx` has the same API plus async support, and it's what the OpenAI and Anthropic SDKs use internally.",
    sections: [
      {
        h: "requests: the classic",
        blocks: [
          {
            lang: "python",
            code: `import requests

r = requests.get("https://api.github.com/repos/python/cpython", timeout=10)
r.raise_for_status()                   # raises for 4xx / 5xx
data = r.json()
print(data["stargazers_count"])

r = requests.post(
    "https://httpbin.org/post",
    json={"question": "What is RAG?"},          # sends JSON + sets Content-Type
    headers={"Authorization": "Bearer TOKEN"},
    timeout=(3, 30),                            # (connect, read) seconds
)`,
          },
          {
            warn: "`requests` has **no default timeout**. Without `timeout=...`, a hung server blocks your code forever. Always set one.",
          },
          "Unlike `fetch`, which only rejects on network errors, `raise_for_status()` turns HTTP error codes into exceptions. Call it (or check `r.status_code`) every time.",
        ],
      },
      {
        h: "httpx: sync and async",
        blocks: [
          "`httpx` mirrors the `requests` API, adds async and HTTP/2, and has sensible default timeouts (5 seconds). Use it in FastAPI apps.",
          {
            lang: "python",
            code: `import httpx

# sync
r = httpx.get("https://httpbin.org/get", params={"q": "rag"})

# async, with a reusable client (connection pooling)
async def call_model(prompt: str) -> str:
    async with httpx.AsyncClient(
        base_url="https://api.openai.com/v1",
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=httpx.Timeout(60.0, connect=5.0),
    ) as client:
        r = await client.post("/chat/completions", json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
        })
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]`,
            caption: "What the OpenAI SDK does under the hood. Calling the raw API once makes the SDK much less magical.",
          },
          {
            tip: "Create one `AsyncClient` for the life of your app (for example in FastAPI's lifespan) and reuse it. Creating a client per request throws away connection pooling and TLS handshakes, adding latency to every call.",
          },
        ],
      },
      {
        h: "Handling errors properly",
        blocks: [
          {
            lang: "python",
            code: `try:
    r = await client.post("/chat/completions", json=payload)
    r.raise_for_status()
except httpx.TimeoutException:
    ...                      # retry, or return 504 to your caller
except httpx.HTTPStatusError as e:
    status = e.response.status_code
    if status == 429:        # rate limited: back off, respect Retry-After
        wait = float(e.response.headers.get("retry-after", 1))
    elif status >= 500:      # provider problem: retry
        ...
    else:                    # 400/401/403/404: your bug, don't retry
        raise
except httpx.RequestError as e:   # DNS, connection refused, etc.
    ...`,
          },
          {
            table: {
              head: ["Status", "Meaning for LLM APIs", "Retry?"],
              rows: [
                ["400", "Bad request: invalid params, context too long", "No, fix the request"],
                ["401 / 403", "Bad or missing API key, no access to model", "No"],
                ["404", "Wrong model name or endpoint", "No"],
                ["408 / timeout", "Took too long", "Yes, with backoff"],
                ["429", "Rate limit or quota exceeded", "Yes, after `Retry-After`"],
                ["500 / 502 / 503 / 529", "Provider error or overloaded", "Yes, with backoff"],
              ],
            },
          },
        ],
      },
      {
        h: "Streaming responses",
        blocks: [
          "LLM streaming uses Server-Sent Events over a normal HTTP response. With httpx you read the body line by line as it arrives:",
          {
            lang: "python",
            code: `async with client.stream("POST", "/chat/completions", json={**payload, "stream": True}) as r:
    async for line in r.aiter_lines():
        if line.startswith("data: ") and line != "data: [DONE]":
            chunk = json.loads(line[6:])
            delta = chunk["choices"][0]["delta"].get("content", "")
            print(delta, end="", flush=True)`,
          },
          "You'll rarely parse SSE by hand, because SDKs do it, but understanding this helps you debug streaming when it breaks behind a proxy (Day 4).",
        ],
      },
    ],
    revise: [
      "`requests`: sync only, no default timeout, so always pass `timeout=`.",
      "`httpx`: same API, sync + async, default timeouts. Use `AsyncClient` in FastAPI and reuse one client.",
      "`raise_for_status()` turns 4xx/5xx into exceptions (unlike `fetch`).",
      "Retry 429/5xx/timeouts with backoff; don't retry 400/401/404.",
      "SSE streaming: `client.stream(...)` + `aiter_lines()`; lines start with `data: `.",
    ],
    mistakes: [
      "No timeout on `requests` calls.",
      "Creating a new HTTP client for every request.",
      "Retrying 400 errors, such as a prompt that's too long, which will never succeed.",
      "Logging full request headers, which leaks the API key.",
    ],
    interview: [
      {
        q: "How do you call a third-party API reliably from a Python service?",
        a: "Use a shared, pooled client (httpx.AsyncClient) with explicit connect and read timeouts; check status codes; retry only transient failures (timeouts, 429, 5xx) with exponential backoff and jitter, respecting Retry-After; cap concurrency; log request IDs and latency without leaking secrets; and wrap it all in a small client class so the rest of the code doesn't deal with HTTP details.",
      },
      {
        q: "requests vs httpx?",
        a: "requests is the long-standing synchronous library with no default timeout. httpx has a near-identical API but supports both sync and async, HTTP/2 and default timeouts. In an async framework like FastAPI, httpx's AsyncClient avoids blocking the event loop, which requests would.",
      },
    ],
    practice: [
      "Call the GitHub API for a repository and print its stars, forks and open issues with httpx.",
      "Fetch 5 URLs concurrently with one `AsyncClient` and `asyncio.gather`, and print each status and time.",
      "Write a `get_json(url)` helper that retries on 429/5xx up to 3 times with exponential backoff.",
    ],
  },

  pydantic: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Pydantic is the most important library in Python GenAI work after the LLM SDKs. It validates data using type hints, like Zod but driven by Python classes. FastAPI uses it for every request and response, LLM SDKs use it for structured output, and LangChain uses it for tool schemas. Learn it well.",
    sections: [
      {
        h: "Your first model",
        blocks: [
          {
            lang: "python",
            code: `from pydantic import BaseModel, Field, EmailStr, ValidationError
from typing import Literal
from datetime import datetime

class Candidate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr                               # needs: uv add "pydantic[email]"
    years_experience: float = Field(ge=0, le=50)
    skills: list[str] = []                        # safe: Pydantic copies defaults
    level: Literal["junior", "mid", "senior"] = "junior"
    applied_at: datetime | None = None

c = Candidate(name="Asha", email="asha@example.com", years_experience="3.5")
print(c.years_experience)      # 3.5  <- the string was converted to float
print(c.model_dump())          # dict
print(c.model_dump_json())     # JSON string`,
          },
          {
            table: {
              head: ["Zod (TypeScript)", "Pydantic (Python)"],
              rows: [
                ["`z.object({...})`", "`class X(BaseModel):`"],
                ["`z.string().min(2)`", "`str = Field(min_length=2)`"],
                ["`z.number().int().nonnegative()`", "`int = Field(ge=0)`"],
                ["`z.enum([\"a\",\"b\"])`", "`Literal[\"a\", \"b\"]` or an `Enum`"],
                ["`.optional()`", "`X | None = None`"],
                ["`schema.parse(data)`", "`Model.model_validate(data)` or `Model(**data)`"],
                ["`schema.safeParse(data)`", "`try: ... except ValidationError`"],
                ["`z.infer<typeof schema>`", "The class *is* the type"],
              ],
            },
          },
        ],
      },
      {
        h: "Validation errors",
        blocks: [
          "Invalid data raises a `ValidationError` listing **every** problem, with the field path. FastAPI turns this into a 422 response automatically.",
          {
            lang: "python",
            code: `try:
    Candidate(name="A", email="not-an-email", years_experience=-2)
except ValidationError as e:
    print(e.error_count())       # 3
    for err in e.errors():
        print(err["loc"], err["msg"])
# ('name',) String should have at least 2 characters
# ('email',) value is not a valid email address: ...
# ('years_experience',) Input should be greater than or equal to 0`,
          },
          {
            tip: "When an LLM returns JSON that fails validation, send `str(e)` back to the model in a retry: \"Your previous output had these errors: ... Return corrected JSON.\" Models fix their own output well when told exactly what was wrong.",
          },
        ],
      },
      {
        h: "Nested models and custom validators",
        blocks: [
          {
            lang: "python",
            code: `from pydantic import BaseModel, field_validator, model_validator

class Citation(BaseModel):
    doc_id: str
    page: int = Field(ge=1)

class RagAnswer(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float = Field(ge=0, le=1)

    @field_validator("answer")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("answer must not be empty")
        return v

    @model_validator(mode="after")
    def citations_required_when_confident(self):
        if self.confidence > 0.7 and not self.citations:
            raise ValueError("confident answers must cite sources")
        return self

raw = '{"answer": "30 days", "citations": [{"doc_id": "policy.pdf", "page": 4}], "confidence": 0.9}'
ans = RagAnswer.model_validate_json(raw)     # parse + validate JSON in one step
ans.citations[0].page                        # 4, typed all the way down`,
          },
        ],
      },
      {
        h: "JSON Schema: why LLM tools love Pydantic",
        blocks: [
          "Every model can produce a **JSON Schema** describing itself. LLM APIs accept JSON Schema for structured output and function calling, so a Pydantic model becomes the contract between your code and the model.",
          {
            lang: "python",
            code: `import json
print(json.dumps(RagAnswer.model_json_schema(), indent=2))
# {"properties": {"answer": {"type": "string"}, "citations": {...}, ...},
#  "required": ["answer", "citations", "confidence"], "type": "object", ...}

# The OpenAI SDK takes the model directly (Day 4):
# completion = client.chat.completions.parse(model=..., messages=..., response_format=RagAnswer)
# completion.choices[0].message.parsed  -> a RagAnswer instance`,
          },
          "Use `Field(description=\"...\")` on fields. The descriptions go into the schema, and the LLM reads them as instructions.",
          {
            lang: "python",
            code: `class Ticket(BaseModel):
    category: Literal["billing", "bug", "feature"] = Field(description="Main topic of the ticket")
    urgency: int = Field(ge=1, le=5, description="1 = can wait, 5 = production down")
    summary: str = Field(description="One sentence, under 20 words")`,
          },
        ],
      },
      {
        h: "Settings from environment variables",
        blocks: [
          "`pydantic-settings` reads configuration from environment variables and `.env`, validates types, and fails at startup if something required is missing. It's the professional upgrade from `os.getenv`.",
          {
            lang: "python",
            code: `# uv add pydantic-settings
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: SecretStr            # reads OPENAI_API_KEY; hidden when printed
    database_url: str
    llm_model: str = "gpt-4o-mini"
    max_tokens: int = 800
    debug: bool = False                  # "true", "1", "yes" all work

settings = Settings()                    # raises clearly if something is missing
settings.openai_api_key.get_secret_value()`,
          },
        ],
      },
      {
        h: "Useful model options",
        blocks: [
          {
            list: [
              "`model_config = ConfigDict(extra=\"forbid\")`: reject unknown fields, which is useful for strict API input.",
              "`model_config = ConfigDict(from_attributes=True)`: build a model from an ORM object (SQLAlchemy row), used in FastAPI responses.",
              "`model.model_dump(exclude={\"password\"})`, `exclude_none=True`: control what's serialised.",
              "`model.model_copy(update={...})`: an immutable-style update.",
              "`Field(alias=\"userId\")` with `populate_by_name=True`: accept camelCase JSON from your React frontend while keeping snake_case in Python.",
            ],
          },
          {
            note: "Pydantic v2 (current) renamed methods from v1: `.dict()` → `.model_dump()`, `.json()` → `.model_dump_json()`, `parse_obj` → `model_validate`. Old tutorials use v1 names; prefer the v2 ones.",
          },
        ],
      },
    ],
    revise: [
      "`class X(BaseModel)` with type hints = schema + parser + type. Types are converted when safe (\"3.5\" → 3.5).",
      "`Field(ge=, le=, min_length=, description=)` adds constraints and docs.",
      "`ValidationError` lists every problem with its location; FastAPI returns it as 422.",
      "`@field_validator` for one field, `@model_validator(mode=\"after\")` for cross-field rules.",
      "`model_validate_json(raw)` parses + validates; `model_dump()` / `model_dump_json()` serialise.",
      "`model_json_schema()` → JSON Schema → structured output and tool calling. Field descriptions guide the LLM.",
      "`pydantic-settings` + `SecretStr` for config; fail fast at startup.",
    ],
    mistakes: [
      "Using v1 methods (`.dict()`, `.parse_obj`) from old tutorials.",
      "Trusting LLM JSON without validating it.",
      "Returning ORM objects with password hashes from APIs; use a separate response model.",
      "Leaving `extra` at its default when you want to catch typos in client input.",
    ],
    interview: [
      {
        q: "What does Pydantic give you?",
        a: "Runtime validation and parsing driven by type hints: it converts input to the declared types, enforces constraints, and produces detailed errors. It also serialises models to dicts and JSON and generates JSON Schema. In GenAI apps that means validated API requests (FastAPI), reliable structured output from LLMs, tool schemas for function calling, and typed configuration.",
      },
      {
        q: "How do you get reliable structured data out of an LLM?",
        a: "Define the output as a Pydantic model with clear field descriptions; pass its JSON Schema through the provider's structured output or function calling feature, which constrains generation; validate the response with the model; on a validation error, retry once with the errors included; and keep fields simple (enums, short strings) to reduce failure rates.",
      },
    ],
    practice: [
      "Model a job posting with nested `Salary(min, max, currency)` and a validator that `max >= min`.",
      "Print the JSON Schema of your model and read it as if you were the LLM.",
      "Create `Settings` with `pydantic-settings`, remove a required variable from `.env` and read the startup error.",
    ],
  },

  fastapi: {
    minutes: 90,
    level: "Intermediate",
    intro:
      "FastAPI is the default web framework for GenAI backends in Python. It's as quick to write as Express, but it validates requests, serialises responses and generates API docs automatically from your type hints. This lesson covers everything you need to build production APIs, mapped from Express.",
    sections: [
      {
        h: "Hello FastAPI",
        blocks: [
          {
            lang: "bash",
            code: `uv add "fastapi[standard]"
uv run fastapi dev app/main.py        # auto-reload dev server on :8000
# open http://localhost:8000/docs for Swagger UI`,
          },
          {
            lang: "python",
            code: `# app/main.py
from fastapi import FastAPI

app = FastAPI(title="DocChat API", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}        # dicts and models are serialised to JSON`,
          },
          {
            table: {
              head: ["Express", "FastAPI"],
              rows: [
                ["`app.get(\"/x\", (req, res) => ...)`", "`@app.get(\"/x\")` on a function"],
                ["`req.params.id`", "Function parameter matching `{id}` in the path"],
                ["`req.query.page`", "Function parameter not in the path"],
                ["`req.body` + manual validation", "Parameter typed as a Pydantic model"],
                ["`res.status(201).json(x)`", "`return x` + `status_code=201` in the decorator"],
                ["Middleware `(req, res, next)`", "Dependencies (`Depends`) and middleware"],
                ["`express.Router()`", "`APIRouter()`"],
                ["Error middleware", "`HTTPException` and exception handlers"],
                ["Swagger via extra packages", "Built in at `/docs`"],
              ],
            },
          },
        ],
      },
      {
        h: "Path, query and body",
        blocks: [
          "FastAPI decides where each parameter comes from by its type and name: in the path → path parameter; a simple type not in the path → query parameter; a Pydantic model → JSON body.",
          {
            lang: "python",
            code: `from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)

class AskResponse(BaseModel):
    answer: str
    sources: list[str]

DOCS: dict[int, dict] = {1: {"id": 1, "title": "Refund policy"}}

@app.get("/documents/{doc_id}")
async def get_document(doc_id: int):                     # path: converted to int
    if doc_id not in DOCS:
        raise HTTPException(status_code=404, detail="Document not found")
    return DOCS[doc_id]

@app.get("/documents")
async def list_documents(q: str | None = None,
                         page: int = Query(1, ge=1),
                         size: int = Query(20, le=100)):   # query params with limits
    ...

@app.post("/ask", response_model=AskResponse, status_code=status.HTTP_200_OK)
async def ask(body: AskRequest):                          # JSON body, validated
    return AskResponse(answer=f"You asked: {body.question}", sources=[])`,
          },
          "Send invalid data (for example `top_k: 99`) and FastAPI returns **422** with the exact field errors. You wrote no validation code.",
          {
            tip: "`response_model` filters the output to exactly that model's fields. Use separate input and output models (e.g. `UserCreate` with a password, `UserOut` without) so secrets can never leak in a response.",
          },
        ],
      },
      {
        h: "Dependency injection with Depends",
        blocks: [
          "`Depends` is FastAPI's replacement for most Express middleware. A dependency is a function whose result is injected into your route. FastAPI calls it for each request, caches it within the request, and supports `yield` for cleanup. Use it for database sessions, the current user, settings and shared clients.",
          {
            lang: "python",
            code: `from typing import Annotated
from fastapi import Depends, Header

async def get_db():
    db = SessionLocal()
    try:
        yield db                 # the route runs here
    finally:
        db.close()               # cleanup after the response

async def get_current_user(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(authorization.removeprefix("Bearer "))

DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[dict, Depends(get_current_user)]

@app.get("/me/documents")
async def my_documents(user: CurrentUser, db: DB):
    return db.query(Document).filter_by(owner_id=user["id"]).all()`,
          },
          "Dependencies make testing easy: `app.dependency_overrides[get_current_user] = lambda: {\"id\": 1}` replaces auth in tests. Swapping a real LLM client for a fake one works the same way.",
        ],
      },
      {
        h: "Routers, lifespan and app structure",
        blocks: [
          {
            code: `app/
  main.py          # create app, include routers, middleware, lifespan
  config.py        # Settings (pydantic-settings)
  deps.py          # shared dependencies (db, current user, llm client)
  routers/
    documents.py
    chat.py
  services/        # business logic: rag.py, llm.py (no FastAPI imports here)
  models/          # Pydantic schemas and DB models`,
            lang: "text",
          },
          {
            lang: "python",
            code: `# app/routers/chat.py
from fastapi import APIRouter
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("")
async def chat(body: AskRequest): ...

# app/main.py
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from app.routers import chat, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=60)    # startup: shared clients, load models
    yield
    await app.state.http.aclose()                     # shutdown

app = FastAPI(lifespan=lifespan)
app.include_router(chat.router)
app.include_router(documents.router)`,
          },
          {
            note: "Keep business logic in `services/`, free of FastAPI imports. Routes should be thin: validate, call a service, return. You can then reuse the same RAG service from a CLI, a background worker or tests.",
          },
        ],
      },
      {
        h: "Middleware, CORS and errors",
        blocks: [
          {
            lang: "python",
            code: `import time, uuid, logging
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],     # your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_id_and_timing(request: Request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    logging.info("%s %s %s %.0fms", rid, request.method, request.url.path,
                 (time.perf_counter() - start) * 1000)
    return response

class LLMError(Exception): ...

@app.exception_handler(LLMError)
async def llm_error_handler(request: Request, exc: LLMError):
    return JSONResponse(status_code=502, content={"detail": "The AI provider failed. Try again."})`,
          },
        ],
      },
      {
        h: "Background tasks",
        blocks: [
          "`BackgroundTasks` runs a function **after** the response is sent, in the same process. It's good for short follow-up work: logging usage, sending an email, updating a cache.",
          {
            lang: "python",
            code: `from fastapi import BackgroundTasks, UploadFile

@app.post("/documents", status_code=202)
async def upload(file: UploadFile, tasks: BackgroundTasks):
    path = save_upload(file)
    tasks.add_task(index_document, path)       # chunk + embed after responding
    return {"status": "processing", "file": file.filename}`,
          },
          {
            warn: "Background tasks die if the process restarts, and they compete with requests for resources. For heavy or important jobs (indexing 500 PDFs), use a real queue: Celery, RQ, arq, or SQS with a separate worker. Interviewers ask exactly this trade-off.",
          },
        ],
      },
      {
        h: "sync def or async def?",
        blocks: [
          {
            table: {
              head: ["Route uses…", "Declare it as", "Why"],
              rows: [
                ["Only async libraries (httpx.AsyncClient, async SDK clients, asyncpg)", "`async def`", "Runs on the event loop, highest concurrency"],
                ["Any blocking library (requests, sync SQLAlchemy, heavy CPU)", "`def`", "FastAPI runs it in a thread pool so the loop isn't blocked"],
                ["Mixed", "`async def` + `await asyncio.to_thread(blocking_fn)`", "Explicitly offload the blocking part"],
              ],
            },
          },
        ],
      },
      {
        h: "Testing",
        blocks: [
          {
            lang: "python",
            code: `from fastapi.testclient import TestClient
from app.main import app
from app.deps import get_llm

class FakeLLM:
    async def complete(self, prompt: str) -> str:
        return "fake answer"

app.dependency_overrides[get_llm] = lambda: FakeLLM()
client = TestClient(app)

def test_ask_validates():
    r = client.post("/ask", json={"question": "hi", "top_k": 99})
    assert r.status_code == 422

def test_ask_ok():
    r = client.post("/ask", json={"question": "What is the refund policy?"})
    assert r.status_code == 200
    assert "answer" in r.json()`,
          },
        ],
      },
    ],
    revise: [
      "Parameter source: in the path → path param; simple type → query param; Pydantic model → JSON body.",
      "Validation is automatic; bad input → 422 with field errors. `HTTPException(status_code, detail)` for your own errors.",
      "`response_model` controls the output shape. Separate input and output models.",
      "`Depends` = dependency injection for DB sessions, auth, clients; `yield` for cleanup; `dependency_overrides` in tests.",
      "`APIRouter` for structure; `lifespan` for startup/shutdown (shared httpx client, loading models).",
      "CORS via `CORSMiddleware`; custom middleware with `@app.middleware(\"http\")`; `exception_handler` for domain errors.",
      "`BackgroundTasks` for small post-response work; a real queue for heavy jobs.",
      "`async def` only with non-blocking code; plain `def` for blocking code.",
      "Docs are free at `/docs` (Swagger) and `/redoc`.",
    ],
    mistakes: [
      "Blocking calls in `async def` routes.",
      "Returning DB objects directly with sensitive fields instead of a response model.",
      "Creating an LLM or HTTP client inside every request instead of once in lifespan or a cached dependency.",
      "Heavy document indexing in `BackgroundTasks` in production.",
      "Forgetting CORS, then debugging \"blocked by CORS policy\" in the React app.",
    ],
    interview: [
      {
        q: "FastAPI vs Express vs Flask: why FastAPI for AI services?",
        a: "FastAPI is async-native, which suits I/O-heavy LLM calls, and it validates requests and serialises responses from type hints via Pydantic, so there's less boilerplate and fewer bugs. It generates OpenAPI docs automatically and has built-in dependency injection. Python is where the AI ecosystem lives (SDKs, LangChain, Hugging Face), so FastAPI avoids a language hop. Express is comparable in speed of development but lacks built-in validation and sits outside the Python ML ecosystem; Flask is synchronous-first and older.",
      },
      {
        q: "How does dependency injection work in FastAPI?",
        a: "You declare a parameter with `Depends(some_function)`. For each request FastAPI resolves the dependency graph, calls the functions (sync or async), caches results within the request, injects the values, and runs any code after `yield` as cleanup. It's used for DB sessions, auth, settings and clients, and `app.dependency_overrides` lets tests swap them out.",
      },
      {
        q: "A user uploads 200 PDFs. How do you process them without timing out the request?",
        a: "Accept the upload, store the files (e.g. S3), create job records, and return 202 with a job ID immediately. A separate worker consumes a queue (Celery/SQS/arq), parses, chunks and embeds each file with retries, and updates job status. The client polls a status endpoint or gets pushed updates over SSE/WebSocket. BackgroundTasks is only fine for small, non-critical work because it's in-process and lost on restart.",
      },
    ],
    practice: [
      "Build `/ask` with request and response models, and check that invalid input returns 422.",
      "Add a `get_current_user` dependency reading a fake bearer token, and protect one route.",
      "Add request-ID middleware and a custom `LLMError` handler returning 502.",
      "Write two tests with `TestClient`, overriding a dependency.",
    ],
  },

  db: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "GenAI apps still need normal databases: users, chat history, documents, usage logs. Coming from MERN, you can pick MongoDB with Motor (the async driver) or go relational with SQLAlchemy and Postgres. Postgres is worth learning because pgvector lets it double as your vector database (Day 5). This lesson also covers logging, which you'll lean on heavily when debugging LLM apps.",
    sections: [
      {
        h: "Option A: MongoDB with Motor (async)",
        blocks: [
          "You already know MongoDB. Motor is the async Python driver (PyMongo also has an async API in recent versions). Queries look almost exactly like the Mongo shell and Mongoose.",
          {
            lang: "python",
            code: `# uv add motor
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.docchat

async def save_message(conversation_id: str, role: str, content: str):
    await db.messages.insert_one({
        "conversation_id": conversation_id, "role": role, "content": content,
    })

async def get_history(conversation_id: str, limit: int = 20) -> list[dict]:
    cursor = db.messages.find({"conversation_id": conversation_id}).sort("_id", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return list(reversed(docs))

async def get_user(user_id: str):
    return await db.users.find_one({"_id": ObjectId(user_id)})`,
          },
          {
            tip: "`ObjectId` is not JSON-serialisable. Convert it with `str(doc[\"_id\"])` before returning, or define a Pydantic response model with `id: str`. Beanie (an async ODM built on Pydantic) gives you a Mongoose-like experience if you want models.",
          },
        ],
      },
      {
        h: "Option B: SQLAlchemy 2.0 with Postgres",
        blocks: [
          "SQLAlchemy is Python's standard ORM. Version 2.0 uses typed models and `select()` statements. It supports async through `asyncpg`.",
          {
            lang: "python",
            code: `# uv add "sqlalchemy[asyncio]" asyncpg
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost/docchat")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase): ...

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    documents: Mapped[list["Document"]] = relationship(back_populates="owner")

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    owner: Mapped[User] = relationship(back_populates="documents")`,
          },
          {
            lang: "python",
            code: `async def get_db():
    async with SessionLocal() as session:
        yield session

@app.post("/documents", response_model=DocumentOut, status_code=201)
async def create_document(body: DocumentIn, db: AsyncSession = Depends(get_db),
                          user=Depends(get_current_user)):
    doc = Document(title=body.title, content=body.content, owner_id=user.id)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc                                   # DocumentOut has from_attributes=True

@app.get("/documents", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(
        select(Document).where(Document.owner_id == user.id).order_by(Document.created_at.desc())
    )
    return result.scalars().all()`,
          },
          "Manage schema changes with **Alembic** (like Sequelize migrations): `alembic revision --autogenerate -m \"add documents\"` then `alembic upgrade head`. Never rely on `create_all()` in production.",
          {
            note: "SQLModel (by FastAPI's author) merges SQLAlchemy and Pydantic models into one class. It's popular in tutorials; knowing plain SQLAlchemy 2.0 transfers everywhere.",
          },
        ],
      },
      {
        h: "Which should you choose?",
        blocks: [
          {
            table: {
              head: ["", "MongoDB + Motor", "Postgres + SQLAlchemy"],
              rows: [
                ["Learning curve for you", "Low: you know Mongo", "Medium"],
                ["Vector search", "Atlas Vector Search (cloud)", "pgvector extension (anywhere, including RDS)"],
                ["Relations, joins, transactions", "Limited", "Strong"],
                ["Common in GenAI job descriptions", "Sometimes", "Very often (Postgres + pgvector)"],
              ],
            },
          },
          "Recommendation: use Postgres for your portfolio projects. It adds a strong keyword to your resume, and pgvector means one database for both your app data and your embeddings.",
        ],
      },
      {
        h: "Logging properly",
        blocks: [
          "`print` is fine for scripts, but services need **logging**: levels, timestamps, module names, and output that production log systems (CloudWatch, Datadog) can parse.",
          {
            lang: "python",
            code: `import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)      # one logger per module

logger.debug("chunks=%s", chunks)          # hidden at INFO level
logger.info("answered question in %.0f ms, %d tokens", ms, tokens)
logger.warning("retrying LLM call, attempt %d", attempt)
try:
    ...
except Exception:
    logger.exception("RAG pipeline failed")   # logs the traceback too`,
          },
          {
            list: [
              "Use `%s` placeholders instead of f-strings in log calls; formatting is skipped when the level is disabled.",
              "Log **metadata** (model, tokens, latency, request ID), not full prompts containing user data, unless you have a policy for it.",
              "In production, log JSON (`python-json-logger` or `structlog`) so you can search by fields.",
              "Never log API keys or auth headers.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Motor = async MongoDB driver; queries look like the shell; convert `ObjectId` to `str`.",
      "SQLAlchemy 2.0: `DeclarativeBase`, `Mapped[...]`, `mapped_column`, `select()`; async with `asyncpg`.",
      "Session per request via a `yield` dependency; `commit()` then `refresh()`.",
      "Alembic for migrations; don't use `create_all()` in production.",
      "Postgres + pgvector = one DB for app data and embeddings.",
      "`logging.getLogger(__name__)`; `%s` placeholders; `logger.exception` for tracebacks; JSON logs in production; never log secrets.",
    ],
    mistakes: [
      "Using the synchronous `pymongo` or `psycopg2` inside `async def` routes.",
      "Sharing one SQLAlchemy session across requests.",
      "Returning `ObjectId` directly and getting a serialisation error.",
      "N+1 queries: loading relations in a loop instead of `selectinload`.",
      "Logging full prompts and user PII without thinking about privacy.",
    ],
    interview: [
      {
        q: "Where would you store chat history for a chatbot, and how?",
        a: "In a durable database keyed by conversation and user: a `messages` table or collection with conversation_id, role, content, token count and timestamps, indexed on (conversation_id, created_at). Load the recent N messages (or a summary plus recent messages) to build the prompt. Add Redis in front for hot conversations if latency matters, and apply retention and PII policies.",
      },
      {
        q: "Why might you choose Postgres with pgvector over a dedicated vector database?",
        a: "One system to operate, back up and secure; transactions across app data and embeddings; SQL joins and filters for permissions and metadata; and it's available on managed services like RDS. It performs well up to millions of vectors with HNSW indexes. A dedicated vector DB makes sense at very large scale or when you need specialised features like built-in hybrid search or multi-tenancy at scale.",
      },
    ],
    practice: [
      "Create a `conversations` + `messages` schema (Mongo or SQLAlchemy) and functions to add a message and load the last 20.",
      "Add logging to your FastAPI app that records method, path, status and latency for every request.",
      "Run Postgres in Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 pgvector/pgvector:pg16`.",
    ],
  },

  "crud-api": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Build a complete, production-shaped API: a **notes service** with users, JWT authentication and CRUD for documents. This becomes the skeleton you'll reuse for DocChat on Day 6, so structure it well.",
    sections: [
      {
        h: "Project setup",
        blocks: [
          {
            lang: "bash",
            code: `uv init notes-api && cd notes-api
uv add "fastapi[standard]" "sqlalchemy[asyncio]" asyncpg pydantic-settings "pyjwt" "pwdlib[argon2]"
uv add --dev pytest httpx ruff
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 pgvector/pgvector:pg16`,
          },
          {
            code: `app/
  main.py        config.py      db.py        security.py     deps.py
  models.py      # SQLAlchemy tables
  schemas.py     # Pydantic in/out models
  routers/auth.py
  routers/documents.py
tests/`,
            lang: "text",
          },
        ],
      },
      {
        h: "Security: hashing and JWT",
        blocks: [
          {
            lang: "python",
            code: `# app/security.py
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from app.config import settings

password_hash = PasswordHash.recommended()        # argon2

def hash_password(p: str) -> str:
    return password_hash.hash(p)

def verify_password(p: str, hashed: str) -> bool:
    return password_hash.verify(p, hashed)

def create_access_token(user_id: int, minutes: int = 60) -> str:
    payload = {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")

def decode_token(token: str) -> int:
    data = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    return int(data["sub"])`,
          },
          {
            lang: "python",
            code: `# app/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import User
from app.security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")    # adds the Authorize button in /docs

async def get_current_user(token: Annotated[str, Depends(oauth2)],
                           db: Annotated[AsyncSession, Depends(get_db)]) -> User:
    try:
        user_id = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]`,
          },
        ],
      },
      {
        h: "Schemas and routes",
        blocks: [
          {
            lang: "python",
            code: `# app/schemas.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class DocumentIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    content: str

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    created_at: datetime`,
          },
          {
            lang: "python",
            code: `# app/routers/documents.py
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.deps import CurrentUser, DB
from app.models import Document
from app.schemas import DocumentIn, DocumentOut

router = APIRouter(prefix="/documents", tags=["documents"])

async def owned(db, doc_id: int, user) -> Document:
    doc = await db.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:          # 404, not 403: don't reveal it exists
        raise HTTPException(404, "Document not found")
    return doc

@router.post("", response_model=DocumentOut, status_code=201)
async def create(body: DocumentIn, user: CurrentUser, db: DB):
    doc = Document(**body.model_dump(), owner_id=user.id)
    db.add(doc); await db.commit(); await db.refresh(doc)
    return doc

@router.get("", response_model=list[DocumentOut])
async def list_(user: CurrentUser, db: DB, limit: int = 20, offset: int = 0):
    rows = await db.execute(select(Document).where(Document.owner_id == user.id)
                            .order_by(Document.id.desc()).limit(min(limit, 100)).offset(offset))
    return rows.scalars().all()

@router.put("/{doc_id}", response_model=DocumentOut)
async def update(doc_id: int, body: DocumentIn, user: CurrentUser, db: DB):
    doc = await owned(db, doc_id, user)
    doc.title, doc.content = body.title, body.content
    await db.commit(); await db.refresh(doc)
    return doc

@router.delete("/{doc_id}", status_code=204)
async def delete(doc_id: int, user: CurrentUser, db: DB):
    await db.delete(await owned(db, doc_id, user)); await db.commit()`,
          },
          "The auth router has `/auth/register` (hash the password, save the user) and `/auth/login`, which accepts `OAuth2PasswordRequestForm` and returns `{\"access_token\": ..., \"token_type\": \"bearer\"}`. Write it yourself using the security functions above; it's good practice.",
        ],
      },
      {
        h: "Checklist before you call it done",
        blocks: [
          {
            list: [
              "`/docs` shows every route; the Authorize button works with your login endpoint.",
              "A user can't read, update or delete another user's document (test it).",
              "Invalid bodies return 422; missing or invalid tokens return 401.",
              "Passwords are hashed with argon2 or bcrypt; the JWT secret comes from settings, not code.",
              "Tests cover register → login → create → list → delete.",
              "`ruff check` passes; the README shows how to run it.",
            ],
          },
          {
            tip: "Compare it with how you'd write this in Express + Mongoose. Put the comparison in the README; it's a great talking point for \"Why did you move to Python?\"",
          },
        ],
      },
    ],
    revise: [
      "Hash passwords (argon2/bcrypt), never store them in plain text; JWT with `sub` + `exp`.",
      "`OAuth2PasswordBearer` wires auth into Swagger's Authorize button.",
      "Ownership checks on every read/update/delete; return 404 for other users' resources.",
      "Separate `In` and `Out` schemas; `from_attributes=True` to return ORM objects.",
      "Cap pagination limits on the server.",
    ],
    practice: [
      "Add a `tags` field and a `?tag=` filter.",
      "Add refresh tokens, or rate-limit login attempts.",
    ],
  },

  docker: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "You know Docker from MERN deployments. Python images have a few specifics: getting a slim image, installing dependencies with uv so they're cached, running uvicorn correctly, and not running as root. By the end you'll have a Dockerfile you can reuse for every project in this plan.",
    sections: [
      {
        h: "Explore the generated docs first",
        blocks: [
          "Open `http://localhost:8000/docs`. FastAPI generated it from your routes, models and descriptions. Improve it before you move on, because interviewers and teammates will read it.",
          {
            list: [
              "Add `summary=` and `description=` to route decorators, and `tags=` on routers.",
              "Add `Field(description=..., examples=[...])` to request models so \"Try it out\" is pre-filled.",
              "Download `/openapi.json`. You can generate a typed TypeScript client for your React app from it (e.g. with `openapi-typescript`), with no hand-written API types.",
            ],
          },
        ],
      },
      {
        h: "A production Dockerfile",
        blocks: [
          {
            lang: "dockerfile",
            code: `FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    UV_COMPILE_BYTECODE=1 \\
    UV_LINK_MODE=copy
WORKDIR /app

# uv binary from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 1) dependencies only: this layer is cached until pyproject/uv.lock change
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 2) your code
COPY app ./app
RUN uv sync --frozen --no-dev

# 3) run as a non-root user
RUN useradd --create-home appuser
USER appuser

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]`,
          },
          {
            list: [
              "`PYTHONUNBUFFERED=1` makes logs appear immediately in `docker logs`.",
              "Copying the lockfile before the code means code changes don't reinstall every dependency.",
              "`--host 0.0.0.0` is required; the default `127.0.0.1` isn't reachable from outside the container.",
              "`--workers` gives multiple processes (a CPU-bound escape from the GIL). Start with about the number of CPU cores.",
            ],
          },
          {
            lang: "text",
            code: `# .dockerignore
.venv
__pycache__
.env
.git
tests
*.pyc`,
            caption: "Without `.dockerignore`, your local `.venv` and `.env` (with secrets) get copied into the image.",
          },
        ],
      },
      {
        h: "docker-compose with Postgres",
        blocks: [
          {
            lang: "yaml",
            code: `services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/notes
    depends_on:
      db:
        condition: service_healthy
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: notes
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
volumes:
  pgdata:`,
          },
          {
            lang: "bash",
            code: `docker compose up --build
docker compose exec api alembic upgrade head   # run migrations inside the container
docker image ls | grep notes                   # check the image size (aim for < 300 MB)`,
          },
          {
            note: "Inside Compose, the database host is the service name (`db`), not `localhost`. This is the most common \"connection refused\" cause.",
          },
        ],
      },
    ],
    revise: [
      "Improve `/docs` with summaries, descriptions and examples; `/openapi.json` can generate a TS client.",
      "`python:3.12-slim` base; copy the lockfile and install deps before copying code (layer caching).",
      "`PYTHONUNBUFFERED=1`, non-root user, `.dockerignore` excluding `.venv` and `.env`.",
      "`uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers N`.",
      "In Compose, use the service name as the DB host, plus a healthcheck and `depends_on` condition.",
    ],
    practice: [
      "Build the image and get it under 300 MB. Compare with `python:3.12` (non-slim).",
      "Add a `/health` endpoint that also checks the database connection, and use it as a Docker healthcheck.",
    ],
  },
};
