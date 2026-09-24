// Day 1 interview bank, part 3: FastAPI/Pydantic, testing, output prediction, live coding. Assembled in d01.js.

export const fastapi = {
  title: "FastAPI and Pydantic (backend)",
  questions: [
    {
      id: "why-fastapi",
      q: "FastAPI vs Flask vs Django: when would you choose each?",
      level: "Intermediate",
      common: true,
      answer:
        "**FastAPI** is async-first (ASGI), validates requests and serialises responses from type hints via Pydantic, generates OpenAPI docs automatically and has built-in dependency injection; it's ideal for APIs and AI services. **Flask** is a minimal synchronous (WSGI) micro-framework where you choose every extension yourself; good for small services and legacy code. **Django** is a batteries-included full-stack framework with ORM, admin panel and auth; best for content-heavy apps and teams wanting conventions. For GenAI backends I'd choose FastAPI because LLM calls are I/O-heavy and the AI ecosystem is in Python.",
      followups: ["What does FastAPI give you that Express doesn't?", "What is Starlette?"],
    },
    {
      id: "wsgi-asgi",
      q: "What is the difference between WSGI and ASGI? What are Uvicorn and Gunicorn?",
      level: "Intermediate",
      common: true,
      answer:
        "**WSGI** is the older synchronous interface between Python web servers and apps (Flask, classic Django): one request per worker thread at a time. **ASGI** is its async successor, supporting async request handling, WebSockets and streaming (FastAPI, Starlette, modern Django). **Uvicorn** is an ASGI server that runs FastAPI. **Gunicorn** is a process manager/WSGI server; in production it's often used to manage several Uvicorn worker processes, or you run `uvicorn --workers N` or one process per container behind a load balancer.",
    },
    {
      id: "validation-422",
      q: "How does FastAPI validate requests? What happens when validation fails?",
      level: "Basic",
      common: true,
      answer:
        "FastAPI reads your function signature: path parameters, query parameters and a Pydantic model for the JSON body. It parses and converts incoming data to those types and runs Pydantic's validation rules (`Field(gt=0)`, `EmailStr`, custom validators). If anything fails, it returns **422 Unprocessable Entity** with a JSON list of errors showing the field location and message, without your route code running.",
      detail: [
        {
          lang: "python",
          code: `class ProductCreate(BaseModel):
    name: str = Field(min_length=2)
    price: float = Field(gt=0)

@app.post("/products", status_code=201)
def create(body: ProductCreate):
    ...
# POST {"name": "A", "price": -5}
# 422 {"detail": [{"loc": ["body", "name"], "msg": "String should have at least 2 characters", ...},
#                 {"loc": ["body", "price"], "msg": "Input should be greater than 0", ...}]}`,
        },
      ],
      followups: ["How would you change the 422 error format? (a `RequestValidationError` exception handler)"],
    },
    {
      id: "param-sources",
      q: "How does FastAPI tell path, query and body parameters apart?",
      level: "Basic",
      common: true,
      answer:
        "If the name appears in the path (`/items/{item_id}`), it's a **path** parameter. Simple types (`int`, `str`, `bool`) not in the path are **query** parameters. A Pydantic model parameter is the JSON **body**. You can be explicit with `Path()`, `Query()`, `Body()`, `Header()`, `Cookie()` and `Form()`/`File()` to add validation and documentation.",
      detail: [
        {
          lang: "python",
          code: `@app.get("/users/{user_id}/orders")
def orders(user_id: int,                              # path
           status: str | None = None,                 # query ?status=paid
           page: int = Query(1, ge=1),                # query with validation
           x_request_id: str | None = Header(None)):  # header X-Request-Id
    ...`,
        },
      ],
    },
    {
      id: "pydantic-what",
      q: "What is Pydantic? What changed in Pydantic v2?",
      level: "Intermediate",
      common: true,
      answer:
        "Pydantic is a data validation library driven by type hints: you define a `BaseModel` and it parses, converts and validates input, gives detailed errors, and serialises to dicts, JSON and JSON Schema. **v2** rewrote the core in Rust (much faster) and renamed APIs: `.dict()` → `.model_dump()`, `.json()` → `.model_dump_json()`, `parse_obj` → `model_validate`, `@validator` → `@field_validator`, `orm_mode` → `from_attributes`, and `class Config` → `model_config`.",
    },
    {
      id: "pydantic-validators",
      q: "How do you add custom validation in Pydantic?",
      level: "Intermediate",
      answer:
        "Use `Field(...)` constraints for simple rules (lengths, ranges, patterns). For custom logic on one field, use `@field_validator(\"name\")` as a classmethod that returns the cleaned value or raises `ValueError`. For rules involving several fields, use `@model_validator(mode=\"after\")` on the instance.",
      detail: [
        {
          lang: "python",
          code: `from pydantic import BaseModel, field_validator, model_validator

class DateRange(BaseModel):
    start: date
    end: date
    title: str

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title can't be empty")
        return v.title()

    @model_validator(mode="after")
    def check_order(self):
        if self.end < self.start:
            raise ValueError("end must be after start")
        return self`,
        },
      ],
    },
    {
      id: "response-model",
      q: "What does `response_model` do? Why have separate input and output schemas?",
      level: "Intermediate",
      common: true,
      answer:
        "`response_model` validates and **filters** what the route returns, and documents it in OpenAPI. Separate schemas (`UserCreate` with a password, `UserOut` without) guarantee sensitive or internal fields like password hashes never leak, even if you return a full database object. Output schemas often use `from_attributes=True` so they can be built from ORM objects.",
    },
    {
      id: "depends",
      q: "Explain dependency injection in FastAPI.",
      level: "Intermediate",
      common: true,
      answer:
        "You declare what a route needs with `Depends(some_function)`; FastAPI calls that function for each request, resolves nested dependencies, caches results within the request, and passes the value in. Dependencies with `yield` run cleanup after the response (closing a DB session). It's used for database sessions, the current user, settings, and service objects, and `app.dependency_overrides` makes swapping them in tests easy.",
      detail: [
        {
          lang: "python",
          code: `def get_db():
    db = SessionLocal()
    try:
        yield db             # route runs here
    finally:
        db.close()           # cleanup after the response

def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    ...

@app.get("/me")
def me(user = Depends(get_current_user)):
    return user`,
        },
      ],
      followups: ["How is `Depends` different from middleware?", "How would you override a dependency in tests?"],
    },
    {
      id: "async-def-vs-def",
      q: "When should a FastAPI route be `async def` vs `def`?",
      level: "Intermediate",
      common: true,
      answer:
        "Use `async def` when everything inside is non-blocking and awaited (httpx.AsyncClient, async DB drivers, async LLM SDK clients). Use plain `def` when you call blocking libraries (requests, synchronous SQLAlchemy, heavy CPU work): FastAPI runs `def` routes in a thread pool so they don't block the event loop. The dangerous combination is blocking code inside `async def`.",
    },
    {
      id: "middleware-vs-deps",
      q: "Middleware vs dependencies in FastAPI: which do you use when?",
      level: "Intermediate",
      answer:
        "**Middleware** wraps **every** request and response: logging, timing, request IDs, CORS, compression, security headers. **Dependencies** apply to specific routes or routers and can return values into the route: authentication, the current user, DB sessions, permissions, pagination parameters. Dependencies are also easier to test and override.",
    },
    {
      id: "error-handling",
      q: "How do you handle errors in FastAPI?",
      level: "Intermediate",
      common: true,
      answer:
        "Raise `HTTPException(status_code, detail)` in route or dependency code for HTTP-level errors. For business errors, raise your own exceptions (`NotFoundError`, `ConflictError`) from services and register `@app.exception_handler(AppError)` to map them to status codes and a consistent JSON shape, like Express error middleware. Validation errors (422) can be customised with a `RequestValidationError` handler, and unexpected exceptions should be logged with a generic 500 response.",
    },
    {
      id: "background-tasks",
      q: "What are BackgroundTasks? When would you use Celery or a queue instead?",
      level: "Intermediate",
      common: true,
      answer:
        "`BackgroundTasks` runs a function **after** the response is sent, in the same process, which is fine for small follow-ups like sending an email or writing an audit log. For heavy, long or critical work (indexing hundreds of documents, video processing), use a real queue with separate workers: Celery or RQ with Redis, arq, or SQS. Queues survive restarts, retry failures, scale independently and don't slow the API.",
    },
    {
      id: "structure",
      q: "How do you structure a FastAPI project?",
      level: "Intermediate",
      common: true,
      answer:
        "A layered layout: `app/main.py` creates the app, adds middleware and includes routers; `api/routes/` holds thin route functions (controllers); `services/` holds business logic; `repositories/` (or `crud/`) holds data access; `models/` holds ORM models; `schemas/` holds Pydantic request and response models; `core/` holds config, security and error handlers; `api/deps.py` holds dependencies; and `tests/` mirrors the structure. Services don't import FastAPI, so they're reusable and easy to test.",
    },
    {
      id: "testing-fastapi",
      q: "How do you test a FastAPI application?",
      level: "Intermediate",
      common: true,
      answer:
        "Use pytest with `fastapi.testclient.TestClient` (or `httpx.AsyncClient` for async tests) to call endpoints in-process. Replace external dependencies (DB, LLM clients, auth) with fakes via `app.dependency_overrides`, use fixtures for fresh test data, and test both success and error paths (401, 404, 409, 422). Services can be unit-tested directly without HTTP.",
    },
    {
      id: "auth",
      q: "How do you implement authentication in FastAPI?",
      level: "Intermediate",
      common: true,
      answer:
        "Typically JWT bearer tokens: a login endpoint verifies the password (hashed with argon2 or bcrypt) and returns a signed token with `sub` and `exp` claims. `OAuth2PasswordBearer` extracts the token from the `Authorization` header, and a `get_current_user` dependency decodes and validates it and loads the user, raising 401 if invalid. Routes then depend on `get_current_user`, and authorisation checks (roles, ownership) happen in dependencies or services.",
    },
    {
      id: "cors",
      q: "What is CORS, and how do you configure it in FastAPI?",
      level: "Basic",
      answer:
        "CORS (Cross-Origin Resource Sharing) is the browser rule that blocks a page on one origin (e.g. `localhost:5173`) from reading responses from another origin unless the server allows it. In FastAPI you add `CORSMiddleware` with `allow_origins` set to your frontend's exact origins (not `*` when using credentials), plus allowed methods and headers.",
    },
    {
      id: "lifespan",
      q: "How do you run code at startup and shutdown in FastAPI?",
      level: "Intermediate",
      answer:
        "Use a **lifespan** async context manager passed to `FastAPI(lifespan=...)`: code before `yield` runs at startup (create a shared `httpx.AsyncClient`, connect to the database, load an ML model), and code after `yield` runs at shutdown (close connections). It replaces the older `@app.on_event(\"startup\")` hooks.",
      detail: [
        {
          lang: "python",
          code: `from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=30)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)`,
        },
      ],
    },
    {
      id: "partial-update",
      q: "How do you implement a PATCH (partial update) correctly with Pydantic?",
      level: "Intermediate",
      answer:
        "Make an update schema where every field is optional, then use `body.model_dump(exclude_unset=True)` to get only the fields the client actually sent. This distinguishes \"not sent\" from \"sent as null\", so you don't overwrite existing values with defaults.",
    },
    {
      id: "deploy",
      q: "How do you run FastAPI in production?",
      level: "Intermediate",
      answer:
        "Package it in a Docker image (slim Python base, locked dependencies, non-root user) and run Uvicorn with several workers, or Gunicorn managing Uvicorn workers, sized to CPU cores. Put it behind a load balancer or reverse proxy (ALB, Nginx) with HTTPS, add health checks, structured logging, metrics and tracing, configure via environment variables and a secret store, and run database migrations (Alembic) as a separate deployment step.",
    },
    {
      id: "openapi",
      q: "How does FastAPI generate API documentation?",
      level: "Basic",
      answer:
        "From your routes, type hints and Pydantic models it builds an **OpenAPI** schema at `/openapi.json`, and serves interactive docs at `/docs` (Swagger UI) and `/redoc`. Summaries, descriptions, tags, `Field(description=..., examples=[...])` and response models all appear there. The same schema can generate typed clients, for example TypeScript types for a React frontend.",
    },
  ],
};

export const testing = {
  title: "Testing and code quality",
  questions: [
    {
      id: "pytest-fixtures",
      q: "pytest vs unittest? What are fixtures?",
      level: "Intermediate",
      common: true,
      answer:
        "`unittest` is the built-in, class-based framework (like JUnit). **pytest** is the de facto standard: tests are plain functions with plain `assert`, output is clearer, and it has a huge plugin ecosystem. **Fixtures** are functions decorated with `@pytest.fixture` that set up something a test needs (a client, a DB, sample data); tests receive them by naming them as parameters, code after `yield` does cleanup, and scopes (`function`, `module`, `session`) control how often they're created.",
      detail: [
        {
          lang: "python",
          code: `import pytest

@pytest.fixture
def cart():
    c = Cart()
    c.add("chai", 2)
    yield c
    c.clear()          # cleanup

def test_total(cart):
    assert cart.total() == 90`,
        },
      ],
    },
    {
      id: "parametrize",
      q: "What does `@pytest.mark.parametrize` do?",
      level: "Intermediate",
      answer:
        "It runs one test function with many sets of inputs, reporting each case separately. It replaces copy-pasted tests and makes edge cases cheap to add.",
      detail: [
        {
          lang: "python",
          code: `@pytest.mark.parametrize("text, expected", [
    ("A man, a plan, a canal: Panama", True),
    ("chai", False),
    ("", True),
])
def test_is_palindrome(text, expected):
    assert is_palindrome(text) == expected`,
        },
      ],
    },
    {
      id: "mocking",
      q: "How do you mock in Python tests? What does \"patch where it's used\" mean?",
      level: "Advanced",
      common: true,
      answer:
        "Use `unittest.mock` (`Mock`, `MagicMock`, `patch`) or pytest's `monkeypatch` to replace real dependencies such as HTTP calls, time or LLM clients. \"Patch where it's used\" means patching the name in the module that **looks it up**: if `app/services/llm.py` does `from openai import OpenAI`, patch `app.services.llm.OpenAI`, not `openai.OpenAI`. Even better, design code with dependency injection so tests pass a fake object and need no patching.",
      detail: [
        {
          lang: "python",
          code: `from unittest.mock import patch

def test_summary_uses_llm():
    with patch("app.services.summary.call_llm", return_value="short summary") as fake:
        assert summarise("long text") == "short summary"
        fake.assert_called_once()`,
        },
      ],
    },
    {
      id: "test-types",
      q: "Unit vs integration vs end-to-end tests?",
      level: "Basic",
      answer:
        "**Unit tests** check one function or class in isolation with fakes for dependencies: fast and many. **Integration tests** check several parts together, like an API route with a real test database. **End-to-end tests** exercise the whole system as a user would (browser to database): slow and few. The usual shape is many unit tests, fewer integration tests, and a handful of end-to-end tests.",
    },
    {
      id: "quality-tools",
      q: "What tools do you use to keep Python code quality high?",
      level: "Basic",
      common: true,
      answer:
        "**Ruff** for linting and formatting (it replaces Flake8, isort and often Black), **mypy** or **Pyright** for static type checking, **pytest** with coverage for tests, and **pre-commit** hooks to run them before each commit, plus the same checks in CI (GitHub Actions) and code review. Type hints on public functions make all of these tools more effective.",
    },
  ],
};

export const outputs = {
  title: "What does this code print?",
  questions: [
    {
      id: "out-mutable-default",
      q: "What does this print? `def f(x, acc=[]): acc.append(x); return acc` then `print(f(1), f(2))`",
      level: "Intermediate",
      common: true,
      answer:
        "`[1, 2] [1, 2]`. The default list is created once and shared by both calls, and both calls run before `print` formats the result, so both arguments are the same list object containing `[1, 2]`.",
      detail: [
        {
          lang: "python",
          code: `def f(x, acc=[]):
    acc.append(x)
    return acc

print(f(1), f(2))     # [1, 2] [1, 2]`,
        },
      ],
    },
    {
      id: "out-late-binding",
      q: "What does this print? `funcs = [lambda: i for i in range(3)]` then `print([f() for f in funcs])`",
      level: "Advanced",
      common: true,
      answer:
        "`[2, 2, 2]`. Closures capture **variables, not values**; every lambda looks up `i` when it's called, and by then the loop has finished with `i = 2`. Fix it by binding the current value as a default argument: `lambda i=i: i`, giving `[0, 1, 2]`.",
    },
    {
      id: "out-aliasing",
      q: "What does this print? `a = b = []` then `a.append(1)` then `print(b)`",
      level: "Basic",
      common: true,
      answer:
        "`[1]`. Chained assignment binds both names to the **same** list object, so appending through `a` is visible through `b`. Use `a, b = [], []` for two separate lists.",
    },
    {
      id: "out-grid",
      q: "What does this print? `grid = [[0] * 3] * 3` then `grid[0][0] = 1` then `print(grid)`",
      level: "Intermediate",
      common: true,
      answer:
        "`[[1, 0, 0], [1, 0, 0], [1, 0, 0]]`. `* 3` on the outer list repeats **references** to the same inner list, so all three rows are one object. Build independent rows with a comprehension: `[[0] * 3 for _ in range(3)]`.",
    },
    {
      id: "out-float",
      q: "What does `print(0.1 + 0.2 == 0.3)` print, and why?",
      level: "Basic",
      common: true,
      answer:
        "`False`. Floats are binary (IEEE 754), and 0.1 and 0.2 can't be represented exactly, so the sum is `0.30000000000000004`. Compare with a tolerance using `math.isclose(a, b)`, and use `decimal.Decimal` (or integer paise) for money.",
    },
    {
      id: "out-finally-return",
      q: "What does this return? `def f():` with `try: return \"try\"` and `finally: return \"finally\"`",
      level: "Advanced",
      answer:
        "`\"finally\"`. The `finally` block always runs, and a `return` inside it overrides the earlier return (it would even swallow an exception). That's why returning from `finally` is considered bad practice; newer Python versions warn about it.",
      detail: [
        {
          lang: "python",
          code: `def f():
    try:
        return "try"
    finally:
        return "finally"

print(f())   # finally`,
        },
      ],
    },
    {
      id: "out-dict-modify",
      q: "What happens? `d = {\"a\": 1, \"b\": 2}` then `for k in d: del d[k]`",
      level: "Intermediate",
      answer:
        "`RuntimeError: dictionary changed size during iteration`. You can't add or remove keys while iterating a dict. Iterate over a copy of the keys (`for k in list(d):`) or build a new dict with a comprehension (`{k: v for k, v in d.items() if keep(k)}`).",
    },
    {
      id: "out-generator-twice",
      q: "What does this print? `g = (x * x for x in range(3))` then `print(sum(g), sum(g))`",
      level: "Intermediate",
      common: true,
      answer:
        "`5 0`. A generator can be consumed only once: the first `sum` uses up 0 + 1 + 4 = 5, and the second finds it already exhausted. Use a list if you need to iterate more than once, or recreate the generator.",
    },
    {
      id: "out-plus-equals",
      q: "What's the difference? `x = [1, 2]; y = x; y += [3]` vs `t = (1, 2); u = t; u += (3,)`: what are `x` and `t` afterwards?",
      level: "Advanced",
      answer:
        "`x` is `[1, 2, 3]` but `t` is still `(1, 2)`. For a list, `+=` calls `__iadd__`, which extends the **same** object in place, so `x` sees the change. Tuples are immutable, so `u += (3,)` creates a **new** tuple and rebinds only `u`.",
    },
    {
      id: "out-truthiness",
      q: "What does `print(bool(\"False\"), bool([]), bool([0]), bool(0.0))` print?",
      level: "Basic",
      answer:
        "`True False True False`. Any non-empty string is truthy (even `\"False\"`), an empty list is falsy, a list containing `0` is non-empty so it's truthy, and `0.0` is falsy.",
    },
    {
      id: "out-division-round",
      q: "What does `print(7 // 2, -7 // 2, round(2.5), round(3.5))` print?",
      level: "Intermediate",
      answer:
        "`3 -4 2 4`. `//` is floor division, which rounds **down** toward negative infinity, so `-7 // 2` is `-4`, not `-3`. `round()` uses \"banker's rounding\" (round half to even), so 2.5 rounds to 2 and 3.5 to 4.",
    },
    {
      id: "out-get-default",
      q: "What does this print? `d = {}` then `d.get(\"x\", []).append(1)` then `print(d)`",
      level: "Intermediate",
      answer:
        "`{}`. `get` returns the default list but doesn't store it in the dict, so the appended value is lost. Use `d.setdefault(\"x\", []).append(1)` or a `defaultdict(list)` to create and store the list.",
    },
    {
      id: "out-unbound-local",
      q: "What happens? `count = 0`, then `def inc(): count += 1`, then `inc()`",
      level: "Intermediate",
      common: true,
      answer:
        "`UnboundLocalError: cannot access local variable 'count'`. Because `count` is assigned inside the function, Python treats it as local for the whole function, and `count += 1` reads it before it has a local value. Declare `global count` (or better, avoid global state and return the new value).",
    },
    {
      id: "out-class-attr",
      q: "What does this print? A class with `tags = []` at class level; `a = Post(); b = Post(); a.tags.append(\"ai\")`; `print(b.tags)`",
      level: "Intermediate",
      answer:
        "`['ai']`. `tags` is a class attribute shared by all instances, and `append` modifies that shared list. Create per-instance lists in `__init__` (`self.tags = []`) or use a dataclass with `field(default_factory=list)`.",
    },
  ],
};

export const coding = {
  title: "Live coding questions",
  questions: [
    {
      id: "code-reverse-words",
      q: "Reverse the order of words in a sentence (and handle extra spaces).",
      level: "Basic",
      common: true,
      answer:
        "Split on whitespace (which also drops extra spaces), reverse the list, and join with single spaces: `\" \".join(s.split()[::-1])`. O(n) time and space.",
      detail: [
        {
          lang: "python",
          code: `def reverse_words(s: str) -> str:
    return " ".join(s.split()[::-1])

assert reverse_words("  learn   python  fast ") == "fast python learn"`,
        },
      ],
    },
    {
      id: "code-anagram",
      q: "Check whether two strings are anagrams.",
      level: "Basic",
      common: true,
      answer:
        "Normalise (lowercase, remove spaces), then compare character counts with `collections.Counter`, which is O(n). Comparing `sorted()` strings also works in O(n log n).",
      detail: [
        {
          lang: "python",
          code: `from collections import Counter

def is_anagram(a: str, b: str) -> bool:
    clean = lambda s: s.replace(" ", "").lower()
    return Counter(clean(a)) == Counter(clean(b))

assert is_anagram("Listen", "Silent")
assert not is_anagram("chai", "chat")`,
        },
      ],
    },
    {
      id: "code-duplicates",
      q: "Find the duplicate items in a list.",
      level: "Basic",
      common: true,
      answer:
        "Count with `Counter` and keep items with count > 1, or track `seen` and `dupes` sets in one pass. Both are O(n).",
      detail: [
        {
          lang: "python",
          code: `from collections import Counter

def duplicates(items: list) -> list:
    return [x for x, n in Counter(items).items() if n > 1]

def duplicates_one_pass(items: list) -> set:
    seen, dupes = set(), set()
    for x in items:
        (dupes if x in seen else seen).add(x)
    return dupes

assert duplicates([1, 2, 2, 3, 3, 3]) == [2, 3]`,
        },
      ],
    },
    {
      id: "code-flatten",
      q: "Flatten an arbitrarily nested list.",
      level: "Intermediate",
      common: true,
      answer:
        "Use recursion: for each item, if it's a list, recurse; otherwise yield it. A generator with `yield from` keeps it lazy and short. Mention the recursion limit for extremely deep nesting, where an explicit stack avoids it.",
      detail: [
        {
          lang: "python",
          code: `def flatten(items):
    for x in items:
        if isinstance(x, list):
            yield from flatten(x)
        else:
            yield x

assert list(flatten([1, [2, [3, [4]]], 5])) == [1, 2, 3, 4, 5]`,
        },
      ],
    },
    {
      id: "code-first-unique",
      q: "Find the first non-repeating character in a string.",
      level: "Basic",
      common: true,
      answer:
        "Count all characters with `Counter` (O(n)), then scan the string in order and return the first character with count 1. Dicts keep insertion order, but scanning the string is clearer.",
      detail: [
        {
          lang: "python",
          code: `from collections import Counter

def first_unique(s: str) -> str | None:
    counts = Counter(s)
    return next((ch for ch in s if counts[ch] == 1), None)

assert first_unique("swiss") == "w"
assert first_unique("aabb") is None`,
        },
      ],
    },
    {
      id: "code-top-words",
      q: "Return the top N most frequent words in a text, ignoring case and punctuation.",
      level: "Intermediate",
      common: true,
      answer:
        "Lowercase the text, extract words with a regex (`re.findall(r\"[a-z']+\", text)`), count with `Counter`, and use `most_common(n)`. Mention stop-word removal as an optional improvement.",
      detail: [
        {
          lang: "python",
          code: `import re
from collections import Counter

def top_words(text: str, n: int = 3) -> list[tuple[str, int]]:
    words = re.findall(r"[a-z']+", text.lower())
    return Counter(words).most_common(n)

top_words("The cat and the hat. The END!", 2)   # [('the', 3), ('cat', 1)]`,
        },
      ],
    },
    {
      id: "code-merge-sorted",
      q: "Merge two sorted lists into one sorted list without using `sorted()`.",
      level: "Intermediate",
      answer:
        "Two pointers: compare the current items of both lists, append the smaller and advance that pointer; at the end, add whatever remains. O(n + m) time. (In real code, `heapq.merge` does this lazily.)",
      detail: [
        {
          lang: "python",
          code: `def merge(a: list[int], b: list[int]) -> list[int]:
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    return out + a[i:] + b[j:]

assert merge([1, 4, 9], [2, 3, 10]) == [1, 2, 3, 4, 9, 10]`,
        },
      ],
    },
    {
      id: "code-group-by",
      q: "Group a list of dicts by a key, e.g. orders by city, and total the amounts.",
      level: "Intermediate",
      common: true,
      answer:
        "Use `defaultdict` to accumulate per key in one pass. This is a very common backend/data question and maps directly to a SQL `GROUP BY`.",
      detail: [
        {
          lang: "python",
          code: `from collections import defaultdict

orders = [{"city": "Pune", "amount": 500}, {"city": "Delhi", "amount": 300},
          {"city": "Pune", "amount": 200}]

def total_by(items: list[dict], key: str, value: str) -> dict:
    totals = defaultdict(float)
    for row in items:
        totals[row[key]] += row[value]
    return dict(totals)

assert total_by(orders, "city", "amount") == {"Pune": 700, "Delhi": 300}`,
        },
      ],
    },
    {
      id: "code-batches",
      q: "Write a generator that splits any iterable into batches of size n.",
      level: "Intermediate",
      common: true,
      answer:
        "Pull `n` items at a time with `itertools.islice` until an empty batch comes back. It works on any iterable, including generators, without loading everything. (Python 3.12 has `itertools.batched` built in.) Useful for sending texts to an embeddings API in batches.",
      detail: [
        {
          lang: "python",
          code: `from itertools import islice

def batched(iterable, n: int):
    if n < 1:
        raise ValueError("n must be at least 1")
    it = iter(iterable)
    while batch := list(islice(it, n)):
        yield batch

assert list(batched(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]]`,
        },
      ],
    },
    {
      id: "code-fib-gen",
      q: "Write a Fibonacci generator.",
      level: "Basic",
      answer:
        "Keep two variables and yield the current one each step. A generator gives an infinite, memory-constant sequence; take what you need with `islice`.",
      detail: [
        {
          lang: "python",
          code: `from itertools import islice

def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

assert list(islice(fibonacci(), 8)) == [0, 1, 1, 2, 3, 5, 8, 13]`,
        },
      ],
    },
    {
      id: "code-fastapi-endpoint",
      q: "Write a FastAPI endpoint that creates a user with validation and returns 409 for a duplicate email.",
      level: "Intermediate",
      common: true,
      answer:
        "Define `UserCreate` (with `EmailStr` and a password length rule) and `UserOut` (without the password), check for an existing email, hash the password, store the user, and return it with status 201. Raise a 409 for duplicates. In a real project the check and storage live in a service and repository.",
      detail: [
        {
          lang: "python",
          code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field

app = FastAPI()
USERS: dict[str, dict] = {}

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2)
    password: str = Field(min_length=8)

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str

@app.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserCreate):
    if body.email in USERS:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = {"id": len(USERS) + 1, "email": body.email, "name": body.name,
            "password_hash": hash_password(body.password)}      # never store plain text
    USERS[body.email] = user
    return user                     # response_model drops password_hash`,
        },
      ],
      followups: ["How would you store passwords safely?", "How would you make the email check race-free with a real database? (unique constraint)"],
    },
  ],
};
