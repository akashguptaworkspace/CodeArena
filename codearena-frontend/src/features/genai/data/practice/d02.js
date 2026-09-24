// Day 2 practice: async, httpx, Pydantic, FastAPI, REST design, SQL, auth, MongoDB, testing. Shape: see ./index.js
import { moreGroups } from "./d02-more.js";

export default {
  intro:
    "Twenty-five exercises that build backend muscle step by step: async code, calling APIs, Pydantic, FastAPI basics, then REST design, PostgreSQL with SQLAlchemy (including N+1 and race conditions), Alembic, authentication, MongoDB with Beanie and async tests. Spread them over several days if you need to.",
  setup: [
    "Use a uv project for today so packages stay isolated.",
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day02 && cd ~/genai-practice/day02
uv init --no-readme .
uv add httpx "pydantic[email]" pydantic-settings "fastapi[standard]" pytest
uv run python ex01.py          # run any exercise file
uv run fastapi dev api.py      # run a FastAPI app, then open http://127.0.0.1:8000/docs`,
    },
    {
      note: "The database groups need **Docker Desktop** running (for Postgres and MongoDB) plus extra packages: `uv add \"sqlalchemy[asyncio]\" asyncpg alembic \"pwdlib[argon2]\" pyjwt beanie pytest-asyncio aiosqlite`. Each exercise shows its own `docker run` command.",
    },
    {
      note: "Don't have uv yet? `curl -LsSf https://astral.sh/uv/install.sh | sh` (macOS/Linux). Or use `python3 -m venv .venv && source .venv/bin/activate && pip install ...` instead.",
    },
  ],
  groups: [
    {
      title: "async and await",
      exercises: [
        {
          id: "gather-timing",
          title: "Sequential vs concurrent: see the difference",
          level: "Easy",
          task: [
            "Write `async def fake_llm(prompt)` that waits 1 second (`asyncio.sleep`) and returns `\"answer to \" + prompt`. Call it for 3 prompts one after another, then with `asyncio.gather`, and print how long each approach took.",
            { lang: "text", code: `sequential: 3.0s\nconcurrent: 1.0s\n['answer to a', 'answer to b', 'answer to c']` },
          ],
          hint: "`await asyncio.gather(f(\"a\"), f(\"b\"), f(\"c\"))` runs them at the same time and returns a list of results in order.",
          solution: `import asyncio
import time

async def fake_llm(prompt: str) -> str:
    await asyncio.sleep(1)
    return f"answer to {prompt}"

async def main():
    prompts = ["a", "b", "c"]

    start = time.perf_counter()
    for p in prompts:
        await fake_llm(p)
    print(f"sequential: {time.perf_counter() - start:.1f}s")

    start = time.perf_counter()
    results = await asyncio.gather(*(fake_llm(p) for p in prompts))
    print(f"concurrent: {time.perf_counter() - start:.1f}s")
    print(results)

asyncio.run(main())`,
          explanation: [
            "While one coroutine waits in `asyncio.sleep`, the event loop runs the others. That's why three 1-second waits finish in about 1 second with `gather`.",
            "`*(fake_llm(p) for p in prompts)` unpacks the three coroutines as separate arguments to `gather`.",
            "`asyncio.run(main())` starts the event loop. In FastAPI you never call it yourself; the server does.",
          ],
          concepts: [
            ["`async def`", "Defines a coroutine function. Calling it creates a coroutine object that runs only when awaited."],
            ["`await`", "Pauses this coroutine until the awaited one finishes, letting others run meanwhile."],
            ["`asyncio.gather()`", "Runs several coroutines concurrently and returns their results as a list. Like `Promise.all`."],
            ["Event loop", "The scheduler that switches between coroutines when they wait on I/O. Same idea as Node's event loop."],
          ],
        },
        {
          id: "semaphore",
          title: "Limit concurrency with a Semaphore",
          level: "Medium",
          task: [
            "Run `fake_llm` for 10 prompts concurrently, but allow at most 3 to run at the same time (like respecting an API rate limit). Print when each one starts and ends. The whole run should take about 4 seconds.",
          ],
          hint: "Create `sem = asyncio.Semaphore(3)` and wrap the work in `async with sem:`.",
          solution: `import asyncio
import time

sem = asyncio.Semaphore(3)
t0 = time.perf_counter()

async def fake_llm(prompt: str) -> str:
    async with sem:
        print(f"{time.perf_counter() - t0:4.1f}s start {prompt}")
        await asyncio.sleep(1)
        print(f"{time.perf_counter() - t0:4.1f}s end   {prompt}")
        return prompt.upper()

async def main():
    results = await asyncio.gather(*(fake_llm(f"q{i}") for i in range(10)))
    print(results)
    print(f"total {time.perf_counter() - t0:.1f}s")

asyncio.run(main())`,
          explanation: [
            "A semaphore holds 3 \"permits\". `async with sem:` takes one before entering and gives it back on exit. The 4th coroutine waits until a permit is free.",
            "10 jobs, 3 at a time, 1 second each → 4 rounds → about 4 seconds.",
            "You'll use exactly this to embed thousands of texts without getting HTTP 429 rate-limit errors.",
          ],
          concepts: [
            ["`asyncio.Semaphore(n)`", "A counter that lets at most `n` coroutines into a block at once."],
            ["`async with`", "An async context manager: runs setup before the block and cleanup after, even if an error happens."],
          ],
        },
        {
          id: "async-generator",
          title: "Stream words like an LLM",
          level: "Easy",
          task: [
            "Write an async generator `stream_words(text)` that yields one word at a time with a 0.1s delay. Consume it with `async for` and print the words on one line as they arrive, like a typing effect.",
          ],
          hint: "An `async def` function that contains `yield` is an async generator. Use `print(word, end=\" \", flush=True)`.",
          solution: `import asyncio

async def stream_words(text: str):
    for word in text.split():
        await asyncio.sleep(0.1)
        yield word

async def main():
    async for word in stream_words("Retrieval augmented generation grounds answers in your documents"):
        print(word, end=" ", flush=True)
    print()

asyncio.run(main())`,
          explanation: [
            "`yield` hands one value to the caller and pauses the function until the next value is requested.",
            "`async for` pulls values from an async generator, waiting between them without blocking the event loop.",
            "`end=\" \"` replaces print's default newline; `flush=True` shows the text immediately instead of buffering it. This is the same shape as streaming tokens from an LLM API.",
          ],
          concepts: [
            ["Generator", "A function with `yield` that produces values lazily, one at a time."],
            ["Async generator", "An `async def` with `yield`; consumed with `async for`."],
            ["`flush=True`", "Forces printed text to appear right away."],
          ],
        },
      ],
    },
    {
      title: "Calling APIs with httpx",
      exercises: [
        {
          id: "github-stats",
          title: "Fetch GitHub repository stats",
          level: "Easy",
          task: [
            "Use `httpx` to call `https://api.github.com/repos/fastapi/fastapi` and print the stars, forks and open issues. Handle a wrong repo name (404) with a friendly message.",
            { lang: "text", code: `fastapi/fastapi: ⭐ 9xxxx  forks 8xxx  open issues 1xx` },
          ],
          hint: "`r = httpx.get(url, timeout=10)`, then `r.raise_for_status()` and `r.json()`. Catch `httpx.HTTPStatusError`.",
          solution: `import httpx

def repo_stats(full_name: str) -> None:
    url = f"https://api.github.com/repos/{full_name}"
    try:
        r = httpx.get(url, timeout=10)
        r.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(f"GitHub said {e.response.status_code} for {full_name}")
        return
    except httpx.RequestError as e:
        print(f"Network problem: {e}")
        return
    data = r.json()
    print(f"{full_name}: ⭐ {data['stargazers_count']}  forks {data['forks_count']}  "
          f"open issues {data['open_issues_count']}")

repo_stats("fastapi/fastapi")
repo_stats("fastapi/does-not-exist")`,
          explanation: [
            "`raise_for_status()` turns 4xx/5xx responses into an exception. Unlike `fetch`, you must call it (or check `status_code`) yourself.",
            "`httpx.RequestError` covers network failures (no internet, DNS). `HTTPStatusError` covers bad status codes.",
            "Always pass a `timeout` so a hanging server can't freeze your program.",
          ],
          concepts: [
            ["`httpx.get/post`", "Make HTTP requests. Returns a `Response` with `.status_code`, `.json()`, `.text`, `.headers`."],
            ["`r.json()`", "Parses the response body from JSON into Python dicts and lists."],
            ["Exception class", "A type of error you can catch specifically, e.g. `except httpx.HTTPStatusError`."],
          ],
        },
        {
          id: "concurrent-fetch",
          title: "Fetch several URLs concurrently",
          level: "Medium",
          task: [
            "With one `httpx.AsyncClient`, fetch these 3 URLs concurrently and print each status code and response time. Then print the total time.",
            { lang: "python", code: `URLS = ["https://httpbin.org/delay/1", "https://httpbin.org/delay/2", "https://httpbin.org/status/404"]` },
          ],
          hint: "Write `async def fetch(client, url)` that times one request, then `asyncio.gather` over all URLs inside `async with httpx.AsyncClient() as client:`.",
          solution: `import asyncio
import time
import httpx

URLS = ["https://httpbin.org/delay/1", "https://httpbin.org/delay/2", "https://httpbin.org/status/404"]

async def fetch(client: httpx.AsyncClient, url: str) -> tuple[str, int, float]:
    start = time.perf_counter()
    r = await client.get(url)
    return url, r.status_code, time.perf_counter() - start

async def main():
    start = time.perf_counter()
    async with httpx.AsyncClient(timeout=15) as client:
        results = await asyncio.gather(*(fetch(client, u) for u in URLS))
    for url, status, secs in results:
        print(f"{status}  {secs:.1f}s  {url}")
    print(f"total {time.perf_counter() - start:.1f}s")

asyncio.run(main())`,
          explanation: [
            "One `AsyncClient` reuses connections for all requests (connection pooling), which is faster than a new client per request.",
            "Total time is about the slowest request (~2s), not the sum (~3s+), because they run concurrently.",
            "We don't call `raise_for_status()` here because we want to report the 404 rather than stop.",
          ],
          concepts: [
            ["`httpx.AsyncClient`", "An async HTTP client; use it with `await` inside async code (e.g. FastAPI routes)."],
            ["Connection pooling", "Keeping connections open and reusing them for later requests."],
          ],
        },
        {
          id: "retry-helper",
          title: "Retry with exponential backoff",
          level: "Medium",
          task: [
            "Write `get_with_retry(url, attempts=4)` that retries on network errors and on status 429 or 5xx, waiting 0.5s, 1s, 2s between tries. It should **not** retry on 404. Test it with `https://httpbin.org/status/503` and `https://httpbin.org/status/404`.",
          ],
          hint: "Loop over `range(attempts)`. Compute the wait as `0.5 * 2 ** attempt`. Re-raise on the last attempt.",
          solution: `import time
import httpx

RETRY_STATUS = {429, 500, 502, 503, 504}

def get_with_retry(url: str, attempts: int = 4) -> httpx.Response:
    for attempt in range(attempts):
        try:
            r = httpx.get(url, timeout=10)
            if r.status_code not in RETRY_STATUS:
                return r                         # success, or an error not worth retrying
            print(f"attempt {attempt + 1}: got {r.status_code}")
        except httpx.RequestError as e:
            print(f"attempt {attempt + 1}: network error {e}")
        if attempt < attempts - 1:
            time.sleep(0.5 * 2 ** attempt)
    raise RuntimeError(f"gave up on {url} after {attempts} attempts")

print(get_with_retry("https://httpbin.org/status/404").status_code)   # 404, no retries
try:
    get_with_retry("https://httpbin.org/status/503")
except RuntimeError as e:
    print(e)`,
          explanation: [
            "Only temporary failures (rate limits, server errors, network issues) are retried. A 404 or 400 will fail the same way every time, so retrying wastes time and money.",
            "`0.5 * 2 ** attempt` gives 0.5, 1, 2 seconds: exponential backoff. Real code also adds a little random jitter so many clients don't retry at the same instant.",
            "LLM SDKs already do this internally; writing it once helps you understand and configure them.",
          ],
          concepts: [
            ["Exponential backoff", "Waiting longer after each failure (doubling), to give an overloaded service time to recover."],
            ["`**` operator", "Power: `2 ** 3` is 8."],
            ["`set` literal `{429, 500}`", "A set of values; `x in RETRY_STATUS` is a fast membership check."],
          ],
        },
      ],
    },
    {
      title: "Pydantic",
      exercises: [
        {
          id: "pydantic-validate",
          title: "Validate a signup form",
          level: "Easy",
          task: [
            "Create a Pydantic model `Signup` with `name` (at least 2 characters), `email` (a valid email), `age` (18–100) and `plan` (only `\"free\"` or `\"pro\"`, default `\"free\"`). Validate one good and one bad dict and print the errors for the bad one.",
            {
              lang: "python",
              code: `good = {"name": "Asha", "email": "asha@example.com", "age": "27"}
bad = {"name": "A", "email": "not-an-email", "age": 15, "plan": "gold"}`,
            },
          ],
          hint: "Use `Field(min_length=2)`, `EmailStr`, `Field(ge=18, le=100)` and `Literal[\"free\", \"pro\"]`. Catch `ValidationError` and loop over `e.errors()`.",
          solution: `from typing import Literal
from pydantic import BaseModel, EmailStr, Field, ValidationError

class Signup(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    age: int = Field(ge=18, le=100)
    plan: Literal["free", "pro"] = "free"

good = {"name": "Asha", "email": "asha@example.com", "age": "27"}
bad = {"name": "A", "email": "not-an-email", "age": 15, "plan": "gold"}

user = Signup(**good)
print(user)                 # age "27" was converted to 27
print(user.model_dump())

try:
    Signup(**bad)
except ValidationError as e:
    for err in e.errors():
        print(err["loc"][0], "→", err["msg"])`,
          explanation: [
            "A Pydantic model is a class whose type hints become validation rules. Creating an instance validates the data.",
            "Pydantic converts safe values: the string `\"27\"` becomes the int `27`.",
            "`ValidationError` lists **every** problem at once, with the field name (`loc`) and a message. FastAPI returns this as a 422 response automatically.",
          ],
          concepts: [
            ["`BaseModel`", "Base class for Pydantic models: data classes that validate their input."],
            ["`Field(...)`", "Adds rules and metadata to a field: `min_length`, `ge` (≥), `le` (≤), `description`."],
            ["`Literal[...]`", "The value must be exactly one of the listed options."],
            ["`model_dump()`", "Converts a model into a plain dict."],
          ],
        },
        {
          id: "pydantic-nested",
          title: "Parse nested JSON with a custom rule",
          level: "Medium",
          task: [
            "Model an order: `Order(id, customer, items: list[Item])` where `Item(name, qty ≥ 1, price > 0)`. Add a computed `total` property and a validator that rejects an order with no items. Parse this JSON string with `model_validate_json` and print the total.",
            {
              lang: "python",
              code: `raw = '{"id": 4521, "customer": "Ravi", "items": [{"name": "Kurta", "qty": 2, "price": 799}, {"name": "Dupatta", "qty": 1, "price": 349}]}'
# Total: ₹1947`,
            },
          ],
          hint: "Use `@field_validator(\"items\")` with `@classmethod`, and raise `ValueError` inside it.",
          solution: `from pydantic import BaseModel, Field, field_validator

class Item(BaseModel):
    name: str
    qty: int = Field(ge=1)
    price: float = Field(gt=0)

class Order(BaseModel):
    id: int
    customer: str
    items: list[Item]

    @field_validator("items")
    @classmethod
    def not_empty(cls, v: list[Item]) -> list[Item]:
        if not v:
            raise ValueError("an order needs at least one item")
        return v

    @property
    def total(self) -> float:
        return sum(i.qty * i.price for i in self.items)

raw = '{"id": 4521, "customer": "Ravi", "items": [{"name": "Kurta", "qty": 2, "price": 799}, {"name": "Dupatta", "qty": 1, "price": 349}]}'
order = Order.model_validate_json(raw)
print(f"Total: ₹{order.total:.0f}")
print(order.items[0].name)`,
          explanation: [
            "Nested models validate all the way down: each dict in `items` becomes an `Item` instance.",
            "`model_validate_json` parses JSON text and validates in one step. You'll use it to check JSON returned by LLMs.",
            "`@field_validator` runs custom code for one field after type checks; raising `ValueError` turns into a normal validation error.",
          ],
          concepts: [
            ["Nested model", "A model used as a field type inside another model."],
            ["`@field_validator`", "Custom validation for a field. Must be a `@classmethod` and return the (possibly cleaned) value."],
            ["`model_validate_json()`", "Parse + validate a JSON string into a model."],
          ],
        },
        {
          id: "settings",
          title: "Typed settings from .env",
          level: "Easy",
          task: [
            "Create a `.env` file with `APP_NAME`, `DEBUG=true` and `API_KEY`. Load it with `pydantic-settings` into a `Settings` class. Print the settings, then delete `API_KEY` from `.env` and see the error.",
          ],
          hint: "`class Settings(BaseSettings): model_config = SettingsConfigDict(env_file=\".env\")`. Use `SecretStr` for the key.",
          solution: `# .env
# APP_NAME=Practice API
# DEBUG=true
# API_KEY=sk-test-123

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str
    debug: bool = False
    api_key: SecretStr

settings = Settings()
print(settings.app_name, settings.debug)
print(settings.api_key)                      # **********  (hidden)
print(settings.api_key.get_secret_value())   # the real value, only when you need it`,
          explanation: [
            "Field names map to environment variables case-insensitively (`app_name` ← `APP_NAME`).",
            "Types are converted: the text `\"true\"` becomes the bool `True`.",
            "Missing required settings fail immediately at startup with a clear message, instead of a confusing error later.",
            "`SecretStr` hides the value when printed or logged.",
          ],
          concepts: [
            ["`BaseSettings`", "A Pydantic model that reads its values from environment variables and `.env` files."],
            ["`SecretStr`", "A string type that masks its value when printed."],
            ["`.env` file", "A local file of `KEY=value` lines for configuration and secrets. Never commit it."],
          ],
        },
      ],
    },
    {
      title: "FastAPI step by step",
      exercises: [
        {
          id: "fastapi-hello",
          title: "Path and query parameters",
          level: "Easy",
          task: [
            "Create `api.py` with two routes: `GET /hello/{name}` returning `{\"message\": \"Hello, Asha\"}`, and `GET /add?a=2&b=3` returning `{\"sum\": 5}`. Run with `uv run fastapi dev api.py` and try both in `/docs`. What happens with `/add?a=2&b=x`?",
          ],
          hint: "A parameter that appears in the path is a path parameter; any other simple parameter is a query parameter.",
          solution: `from fastapi import FastAPI

app = FastAPI(title="Practice API")

@app.get("/hello/{name}")
def hello(name: str):
    return {"message": f"Hello, {name.title()}"}

@app.get("/add")
def add(a: int, b: int):
    return {"sum": a + b}`,
          explanation: [
            "FastAPI reads the function signature: `name` is in the path, so it's a path parameter; `a` and `b` aren't, so they're query parameters.",
            "Type hints are enforced: `b=x` isn't an int, so FastAPI returns **422** with a clear error. You wrote no validation code.",
            "Returning a dict sends JSON automatically, and `/docs` is generated from your code.",
          ],
          concepts: [
            ["`@app.get(path)`", "Registers a function to handle GET requests on that path (like `app.get` in Express)."],
            ["Path parameter", "A value inside the URL path: `/hello/{name}`."],
            ["Query parameter", "A value after `?` in the URL: `/add?a=2&b=3`."],
            ["422 Unprocessable Entity", "FastAPI's response when input fails validation."],
          ],
        },
        {
          id: "fastapi-crud",
          title: "In-memory CRUD for notes",
          level: "Medium",
          task: [
            "Build a notes API with an in-memory dict: `POST /notes` (body `{title, body}`, returns the note with an id, status 201), `GET /notes`, `GET /notes/{id}` (404 if missing), `DELETE /notes/{id}` (204). Use separate `NoteIn` and `NoteOut` models.",
          ],
          hint: "`raise HTTPException(status_code=404, detail=\"Note not found\")`. Set `status_code=201` in the decorator.",
          solution: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

class NoteIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    body: str = ""

class NoteOut(NoteIn):
    id: int

NOTES: dict[int, NoteOut] = {}
next_id = 1

@app.post("/notes", response_model=NoteOut, status_code=201)
def create_note(note: NoteIn):
    global next_id
    saved = NoteOut(id=next_id, **note.model_dump())
    NOTES[next_id] = saved
    next_id += 1
    return saved

@app.get("/notes", response_model=list[NoteOut])
def list_notes():
    return list(NOTES.values())

@app.get("/notes/{note_id}", response_model=NoteOut)
def get_note(note_id: int):
    if note_id not in NOTES:
        raise HTTPException(status_code=404, detail="Note not found")
    return NOTES[note_id]

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    if NOTES.pop(note_id, None) is None:
        raise HTTPException(status_code=404, detail="Note not found")`,
          explanation: [
            "A parameter typed as a Pydantic model (`note: NoteIn`) is read from the JSON body and validated.",
            "`response_model` controls exactly what's returned. `NoteOut` inherits `NoteIn`'s fields and adds `id`.",
            "`HTTPException` stops the request and returns that status and message as JSON.",
            "`global next_id` is needed to reassign a module-level variable inside a function. (A real app uses a database instead.)",
          ],
          concepts: [
            ["Request body model", "A Pydantic model parameter; FastAPI parses and validates the JSON body into it."],
            ["`response_model`", "The model used to filter and document the response."],
            ["`HTTPException`", "Raise it to return an HTTP error such as 404 with a message."],
            ["Inheritance `class NoteOut(NoteIn)`", "`NoteOut` gets all of `NoteIn`'s fields plus its own."],
          ],
        },
        {
          id: "fastapi-depends",
          title: "Protect a route with an API key dependency",
          level: "Medium",
          task: [
            "Add a dependency `require_api_key` that reads an `X-API-Key` header and raises 401 unless it equals `\"secret123\"`. Use it on `GET /admin/stats` only. Test with and without the header in `/docs` (or curl).",
            { lang: "bash", code: `curl -H "X-API-Key: secret123" http://127.0.0.1:8000/admin/stats` },
          ],
          hint: "`def require_api_key(x_api_key: str | None = Header(default=None))`, then `Depends(require_api_key)` in the route parameters.",
          solution: `from typing import Annotated
from fastapi import Depends, FastAPI, Header, HTTPException

app = FastAPI()
API_KEY = "secret123"          # in real code: from settings / environment

def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> str:
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key

@app.get("/public")
def public():
    return {"ok": True}

@app.get("/admin/stats")
def admin_stats(_: Annotated[str, Depends(require_api_key)]):
    return {"users": 42, "notes": 128}`,
          explanation: [
            "`Header()` reads a request header. FastAPI converts the parameter name `x_api_key` to the header `X-API-Key`.",
            "`Depends(require_api_key)` runs the function before the route. If it raises, the route never runs. This replaces most Express middleware.",
            "The `_` name means \"I don't use this value\"; we only care that the check passed.",
          ],
          concepts: [
            ["`Depends()`", "FastAPI dependency injection: runs a function per request and passes its result into your route."],
            ["`Header()`", "Declares that a parameter comes from a request header."],
            ["`Annotated[type, extra]`", "Attaches extra information (like `Depends` or `Header`) to a type hint."],
            ["401 Unauthorized", "Status for missing or invalid credentials."],
          ],
        },
        {
          id: "fastapi-background",
          title: "Run work after the response with BackgroundTasks",
          level: "Easy",
          task: [
            "Add `POST /signup` that returns immediately with `{\"status\": \"ok\"}`, and after responding, waits 2 seconds and appends a line to `emails.log` (pretend it's sending a welcome email). Notice the response comes back instantly.",
          ],
          hint: "Add a parameter `tasks: BackgroundTasks` and call `tasks.add_task(function, arg1, ...)`.",
          solution: `import time
from datetime import datetime
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI()

class SignupIn(BaseModel):
    email: EmailStr

def send_welcome(email: str) -> None:
    time.sleep(2)                                   # pretend this is slow
    with open("emails.log", "a", encoding="utf-8") as f:
        f.write(f"{datetime.now().isoformat()} welcome sent to {email}\\n")

@app.post("/signup")
def signup(body: SignupIn, tasks: BackgroundTasks):
    tasks.add_task(send_welcome, body.email)
    return {"status": "ok"}`,
          explanation: [
            "FastAPI sends the response first, then runs the background task in the same process.",
            "Good for small follow-up work. For heavy or important jobs (indexing hundreds of PDFs), use a real queue, because background tasks are lost if the server restarts.",
            "`open(..., \"a\")` opens a file in append mode, adding to the end instead of overwriting.",
          ],
          concepts: [
            ["`BackgroundTasks`", "FastAPI helper to run functions after the response is sent."],
            ["File mode `\"a\"`", "Append: write at the end of the file, creating it if needed. `\"w\"` overwrites."],
          ],
        },
        {
          id: "fastapi-test",
          title: "Test your API with pytest",
          level: "Medium",
          task: [
            "Write `test_api.py` for the notes API from the CRUD exercise: create a note and check 201, fetch it back, check that a missing id gives 404, and that an empty title gives 422. Run `uv run pytest -q`.",
          ],
          hint: "`from fastapi.testclient import TestClient`; `client = TestClient(app)`; then `client.post(\"/notes\", json={...})`.",
          solution: `# test_api.py  (put the CRUD code in api.py)
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

def test_create_and_get():
    r = client.post("/notes", json={"title": "Learn FastAPI", "body": "Depends is neat"})
    assert r.status_code == 201
    note = r.json()
    assert note["title"] == "Learn FastAPI"

    r = client.get(f"/notes/{note['id']}")
    assert r.status_code == 200
    assert r.json()["body"] == "Depends is neat"

def test_missing_note_404():
    assert client.get("/notes/99999").status_code == 404

def test_empty_title_422():
    assert client.post("/notes", json={"title": ""}).status_code == 422`,
          explanation: [
            "`TestClient` calls your app in-process, with no running server needed.",
            "pytest finds files named `test_*.py` and runs every function named `test_*`. A plain `assert` is all you need.",
            "Testing 404 and 422 paths matters as much as the happy path; interviewers look for it.",
          ],
          concepts: [
            ["pytest", "Python's most popular test runner. Tests are plain functions with `assert`."],
            ["`TestClient`", "Sends fake HTTP requests to a FastAPI app in tests."],
            ["`assert`", "Fails the test if the condition is false."],
          ],
        },
      ],
    },
      ...moreGroups,
  ],
};
