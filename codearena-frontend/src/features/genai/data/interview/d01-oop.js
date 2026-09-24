// Day 1 interview bank, part 2: OOP, iteration, errors, modules, concurrency, stdlib. Assembled in d01.js.

export const oop = {
  title: "Object-oriented Python",
  questions: [
    {
      id: "class-instance-attrs",
      q: "What is the difference between class attributes and instance attributes?",
      level: "Basic",
      common: true,
      answer:
        "A **class attribute** is defined on the class body and shared by all instances. An **instance attribute** is set on `self` (usually in `__init__`) and belongs to one object. Reading `obj.x` checks the instance first, then the class. A common bug is a mutable class attribute (like a list) that every instance accidentally shares.",
      detail: [
        {
          lang: "python",
          code: `class Cart:
    items = []                 # class attribute: SHARED (bug-prone)
    def __init__(self):
        self.owned = []        # instance attribute: one per object

a, b = Cart(), Cart()
a.items.append("chai")
print(b.items)                 # ['chai']  shared!
a.owned.append("chai")
print(b.owned)                 # []`,
        },
      ],
    },
    {
      id: "self",
      q: "What is `self`?",
      level: "Basic",
      common: true,
      answer:
        "`self` is the instance a method is called on. Python passes it automatically as the first argument (`obj.method()` becomes `Class.method(obj)`), but you must declare it in the method definition. It's the explicit version of JavaScript's `this`, and unlike `this` it never changes based on how the method is called. The name `self` is a convention, not a keyword.",
    },
    {
      id: "init-new",
      q: "What is the difference between `__init__` and `__new__`?",
      level: "Advanced",
      answer:
        "`__new__` **creates** the instance (it's a static method that returns the new object) and `__init__` **initialises** it (sets attributes; returns `None`). You almost always only write `__init__`. `__new__` is used for immutable types (subclassing `str` or `tuple`), singletons, or controlling instance creation.",
    },
    {
      id: "method-types",
      q: "Explain instance methods, class methods and static methods.",
      level: "Intermediate",
      common: true,
      answer:
        "**Instance methods** take `self` and work with one object. **Class methods** (`@classmethod`) take `cls` and work with the class; they're mainly used as alternative constructors like `User.from_dict(data)`, and they work correctly with subclasses. **Static methods** (`@staticmethod`) take neither; they're plain functions grouped inside the class for organisation.",
      detail: [
        {
          lang: "python",
          code: `class Money:
    def __init__(self, paise: int):
        self.paise = paise

    def rupees(self) -> float:                 # instance method
        return self.paise / 100

    @classmethod
    def from_rupees(cls, rupees: float):       # alternative constructor
        return cls(round(rupees * 100))

    @staticmethod
    def is_valid(amount: float) -> bool:       # utility, no self/cls
        return amount >= 0

Money.from_rupees(49.5).rupees()   # 49.5`,
        },
      ],
    },
    {
      id: "inheritance-mro",
      q: "How does inheritance work? What is the MRO?",
      level: "Intermediate",
      common: true,
      answer:
        "A class can inherit from one or more base classes and override their methods; `super()` calls the next implementation in line. With multiple inheritance, Python decides the lookup order using the **Method Resolution Order (MRO)**, computed by the C3 linearisation algorithm. It guarantees each class appears once and that children come before parents, which solves the \"diamond problem\". You can inspect it with `ClassName.__mro__`.",
      detail: [
        {
          lang: "python",
          code: `class A:
    def hello(self): return "A"
class B(A):
    def hello(self): return "B→" + super().hello()
class C(A):
    def hello(self): return "C→" + super().hello()
class D(B, C): pass

D().hello()          # 'B→C→A'
D.__mro__            # (D, B, C, A, object)`,
        },
      ],
      followups: ["What does `super()` actually call?", "When would you prefer composition over inheritance?"],
    },
    {
      id: "encapsulation",
      q: "Does Python have private members? What do `_x` and `__x` mean?",
      level: "Intermediate",
      common: true,
      answer:
        "Python has no truly private attributes. A single underscore `_x` is a **convention** meaning \"internal, don't use from outside\". A double underscore `__x` triggers **name mangling**: inside class `Account` it becomes `_Account__x`, which avoids accidental clashes in subclasses but can still be accessed. Names like `__init__` with double underscores on both sides are special \"dunder\" methods, not private.",
    },
    {
      id: "property",
      q: "What is `@property`, and why use it?",
      level: "Intermediate",
      common: true,
      answer:
        "`@property` turns a method into an attribute you read without parentheses, and `@x.setter` lets you run validation when it's assigned. It lets you start with plain attributes and later add logic without changing the class's public interface: callers keep writing `obj.price`.",
      detail: [
        {
          lang: "python",
          code: `class Product:
    def __init__(self, price: float):
        self.price = price              # goes through the setter

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float):
        if value <= 0:
            raise ValueError("price must be positive")
        self._price = value

    @property
    def price_with_gst(self) -> float:  # computed, read-only
        return round(self._price * 1.18, 2)`,
        },
      ],
    },
    {
      id: "dunder-methods",
      q: "What are dunder (magic) methods? What's the difference between `__str__` and `__repr__`?",
      level: "Intermediate",
      common: true,
      answer:
        "Dunder methods (double underscore, like `__len__`, `__eq__`, `__add__`, `__iter__`) let your classes work with Python's built-in syntax and functions. `__repr__` should return an unambiguous, developer-facing representation (ideally one that could recreate the object), used in the REPL and debuggers. `__str__` returns a user-friendly string for `print()`; if missing, Python falls back to `__repr__`.",
      detail: [
        {
          lang: "python",
          code: `class Money:
    def __init__(self, amount): self.amount = amount
    def __repr__(self): return f"Money({self.amount!r})"
    def __str__(self): return f"₹{self.amount:,.2f}"
    def __add__(self, other): return Money(self.amount + other.amount)
    def __eq__(self, other): return isinstance(other, Money) and self.amount == other.amount

m = Money(100) + Money(49.5)
print(m)      # ₹149.50
m             # Money(149.5)`,
        },
      ],
    },
    {
      id: "abc-protocol",
      q: "What are abstract base classes? How is that different from duck typing and `Protocol`?",
      level: "Advanced",
      answer:
        "An **abstract base class** (`abc.ABC` with `@abstractmethod`) defines methods subclasses must implement; you can't instantiate a class until all abstract methods are defined. **Duck typing** means Python doesn't care about the class, only that the object has the needed methods (\"if it quacks like a duck\"). `typing.Protocol` formalises duck typing for type checkers: any class with matching methods satisfies the protocol without inheriting from it, similar to a TypeScript interface.",
      detail: [
        {
          lang: "python",
          code: `from abc import ABC, abstractmethod
from typing import Protocol

class Storage(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> None: ...

class Embedder(Protocol):                    # structural: no inheritance needed
    def embed(self, texts: list[str]) -> list[list[float]]: ...

class FakeEmbedder:                          # satisfies Embedder automatically
    def embed(self, texts): return [[0.0] * 3 for _ in texts]`,
        },
      ],
    },
    {
      id: "dataclass-namedtuple-pydantic",
      q: "Dataclass vs namedtuple vs Pydantic model: when do you use each?",
      level: "Intermediate",
      common: true,
      answer:
        "A **namedtuple** is an immutable, lightweight tuple with field names, good for small fixed records. A **dataclass** generates `__init__`, `__repr__` and `__eq__` for mutable (or `frozen=True`) data containers, with no validation; use it for internal data. A **Pydantic model** validates and converts data at runtime and serialises to and from JSON; use it at boundaries such as API requests, LLM outputs and configuration.",
    },
    {
      id: "slots",
      q: "What does `__slots__` do?",
      level: "Advanced",
      answer:
        "`__slots__` declares a fixed set of attributes, so instances don't get a per-instance `__dict__`. This saves memory (useful when creating millions of small objects) and slightly speeds up attribute access, but you can't add new attributes dynamically. Dataclasses support it with `@dataclass(slots=True)`.",
    },
    {
      id: "metaclass",
      q: "What is a metaclass?",
      level: "Advanced",
      answer:
        "A metaclass is the class of a class: it controls how classes themselves are created. By default it's `type`. Frameworks use metaclasses (or the simpler `__init_subclass__` hook) to register or modify classes automatically; for example ORMs and Pydantic inspect class attributes to build fields. It's rarely needed in application code; say you'd reach for decorators or `__init_subclass__` first.",
    },
    {
      id: "composition",
      q: "Composition vs inheritance: which do you prefer?",
      level: "Intermediate",
      answer:
        "Prefer **composition**: build objects from other objects they hold (a `ProductService` has a `ProductRepository`) instead of inheriting behaviour. It keeps classes small, makes dependencies explicit and easy to swap in tests. Use inheritance for true \"is-a\" relationships or when a framework expects it (subclassing `BaseModel`, `Exception`).",
    },
  ],
};

export const iteration = {
  title: "Iterators, generators and context managers",
  questions: [
    {
      id: "iterable-iterator",
      q: "What is the difference between an iterable and an iterator?",
      level: "Intermediate",
      common: true,
      answer:
        "An **iterable** is anything you can loop over; it has `__iter__` that returns an iterator (lists, dicts, strings, files). An **iterator** is the object that produces values one at a time with `__next__` and raises `StopIteration` when done; it also has `__iter__` returning itself. A `for` loop calls `iter()` on the iterable, then `next()` repeatedly. Iterators are single-use; iterables like lists can be iterated many times.",
      detail: [
        {
          lang: "python",
          code: `nums = [1, 2]
it = iter(nums)
next(it)   # 1
next(it)   # 2
next(it)   # StopIteration

class Countdown:
    def __init__(self, start): self.n = start
    def __iter__(self): return self
    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n + 1

list(Countdown(3))   # [3, 2, 1]`,
        },
      ],
    },
    {
      id: "generator-benefits",
      q: "Why use generators? What are the benefits?",
      level: "Intermediate",
      common: true,
      answer:
        "Generators produce values lazily, so they use constant memory for huge or infinite sequences, start producing results immediately, and can be chained into pipelines (read → filter → transform) without intermediate lists. The trade-off: they can be consumed only once and don't support indexing or `len()`.",
      detail: [
        {
          lang: "python",
          code: `def lines(path):
    with open(path, encoding="utf-8") as f:
        yield from f

errors = (l for l in lines("app.log") if "ERROR" in l)
first_ten = [next(errors) for _ in range(10)]    # reads only as much of the file as needed`,
        },
      ],
    },
    {
      id: "yield-from",
      q: "What does `yield from` do?",
      level: "Advanced",
      answer:
        "`yield from iterable` yields every value from another iterable or generator, as if you'd written a loop with `yield` inside. With sub-generators it also passes through values sent in and returns the sub-generator's return value. It's useful for flattening and delegating, e.g. recursively walking nested structures.",
      detail: [
        {
          lang: "python",
          code: `def flatten(items):
    for x in items:
        if isinstance(x, list):
            yield from flatten(x)
        else:
            yield x

list(flatten([1, [2, [3, 4]], 5]))   # [1, 2, 3, 4, 5]`,
        },
      ],
    },
    {
      id: "context-managers",
      q: "What is a context manager? How do you write one?",
      level: "Intermediate",
      common: true,
      answer:
        "A context manager handles setup and cleanup around a block of code using `with`. Its `__enter__` runs at the start and `__exit__` runs at the end, **even if an exception happens**, so resources like files, locks and database sessions are always released. You can write one as a class with `__enter__`/`__exit__`, or more simply with `@contextlib.contextmanager` and a generator.",
      detail: [
        {
          lang: "python",
          code: `import time
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield                                  # the with-block runs here
    finally:
        print(f"{label}: {time.perf_counter() - start:.3f}s")

with timer("retrieve"):
    time.sleep(0.1)

class Timer:                                   # class version
    def __enter__(self):
        self.start = time.perf_counter(); return self
    def __exit__(self, exc_type, exc, tb):
        print(time.perf_counter() - self.start)
        return False                           # don't swallow exceptions`,
        },
      ],
      followups: ["What does returning `True` from `__exit__` do? (It suppresses the exception.)", "What is `async with`?"],
    },
    {
      id: "itertools",
      q: "Which `itertools` functions have you used?",
      level: "Intermediate",
      answer:
        "Commonly: `chain` (join iterables), `islice` (slice an iterator lazily), `groupby` (group consecutive items; sort first), `product` and `combinations`/`permutations`, `count`/`cycle`, `accumulate` (running totals), and `batched` (Python 3.12+, fixed-size batches: great for sending embeddings in batches of 100).",
      detail: [
        {
          lang: "python",
          code: `from itertools import batched, chain, islice
for batch in batched(texts, 100):
    embed(list(batch))
first_5 = list(islice(huge_generator(), 5))
all_items = list(chain(list_a, list_b))`,
        },
      ],
    },
  ],
};

export const errors = {
  title: "Exceptions and error handling",
  questions: [
    {
      id: "try-flow",
      q: "Explain `try`, `except`, `else` and `finally`.",
      level: "Basic",
      common: true,
      answer:
        "`try` holds code that might fail. `except SomeError` handles specific errors. `else` runs only if **no** exception occurred, which keeps the `try` block small. `finally` always runs, whether there was an error or not, even after `return`, so it's used for cleanup.",
      detail: [
        {
          lang: "python",
          code: `try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    log.warning("bad JSON at %s", e.pos)
    data = None
else:
    log.info("parsed ok")
finally:
    metrics.increment("parse_attempts")`,
        },
      ],
    },
    {
      id: "custom-exceptions",
      q: "How and why do you create custom exceptions?",
      level: "Intermediate",
      common: true,
      answer:
        "Subclass `Exception` (usually a base class for your app plus specific subclasses). Custom exceptions let callers catch your errors precisely and let one handler translate them, for example a FastAPI exception handler turning `NotFoundError` into a 404. They also carry meaningful names in logs.",
      detail: [
        {
          lang: "python",
          code: `class AppError(Exception):
    status_code = 400

class NotFoundError(AppError):
    status_code = 404

class LLMTimeout(AppError):
    status_code = 504

raise NotFoundError("Product 42 not found")`,
        },
      ],
    },
    {
      id: "raise-from",
      q: "What does `raise ... from e` do?",
      level: "Intermediate",
      answer:
        "It raises a new exception and explicitly records the original one as its **cause**, so the traceback shows both (\"The above exception was the direct cause of…\"). Use it when translating low-level errors into domain errors without losing debugging information. `raise ... from None` hides the original when it's just noise.",
      detail: [
        {
          lang: "python",
          code: `try:
    return json.loads(raw)
except json.JSONDecodeError as e:
    raise InvalidModelOutput("LLM did not return JSON") from e`,
        },
      ],
    },
    {
      id: "bare-except",
      q: "Why is a bare `except:` (or `except Exception: pass`) considered bad?",
      level: "Basic",
      common: true,
      answer:
        "It swallows every error, including programming bugs like typos (`NameError`) and, for bare `except:`, even `KeyboardInterrupt` and `SystemExit`. Problems then surface far from their cause or never at all. Catch the specific exceptions you expect, log them, and let unexpected errors propagate. If you must catch broadly (e.g. at a worker's top level), log with `logger.exception(...)` so the traceback isn't lost.",
      detail: [
        {
          lang: "python",
          code: `try:
    result = call_llm(prompt)
except (TimeoutError, ConnectionError) as e:   # several types in one tuple
    result = fallback(prompt)`,
        },
      ],
    },
    {
      id: "eafp-lbyl",
      q: "What are EAFP and LBYL?",
      level: "Intermediate",
      answer:
        "**LBYL** (look before you leap) checks conditions first: `if key in d: value = d[key]`. **EAFP** (easier to ask forgiveness than permission) just tries and handles the exception: `try: value = d[key] except KeyError: ...`. EAFP is considered more Pythonic, and it avoids race conditions (like a file being deleted between the check and the open). For simple lookups, `d.get(key, default)` is often best.",
    },
    {
      id: "assert",
      q: "When should you use `assert`?",
      level: "Intermediate",
      answer:
        "Use `assert` for internal sanity checks and in tests, not for validating user input or enforcing security. Assertions are removed when Python runs with the `-O` optimise flag, so any check that must always happen should use an `if` and raise a proper exception.",
    },
  ],
};

export const modules = {
  title: "Modules, packages and environments",
  questions: [
    {
      id: "module-package",
      q: "What is the difference between a module and a package?",
      level: "Basic",
      common: true,
      answer:
        "A **module** is a single `.py` file. A **package** is a folder of modules, traditionally with an `__init__.py` file (which can be empty or expose selected names). Packages let you organise code with dotted imports like `from app.services.product_service import ProductService`. A **library/distribution** is what you install from PyPI, which may contain several packages.",
    },
    {
      id: "imports",
      q: "How does Python find modules when you import them? What causes circular imports?",
      level: "Intermediate",
      common: true,
      answer:
        "Python searches the directories in `sys.path`: the script's folder (or the current directory with `-m`), then `PYTHONPATH`, then the standard library and installed site-packages. A module runs once on first import and is cached in `sys.modules`. A **circular import** happens when module A imports B while B imports A at load time, so one sees a partially initialised module. Fix it by moving shared code to a third module, importing inside a function, or restructuring dependencies.",
      followups: ["Why does naming your file `json.py` break `import json`?", "What's the difference between `python app/main.py` and `python -m app.main`?"],
    },
    {
      id: "venv-why",
      q: "What is a virtual environment, and why use one?",
      level: "Basic",
      common: true,
      answer:
        "A virtual environment is an isolated folder (usually `.venv`) with its own Python link and installed packages. Each project gets its own dependencies and versions without conflicting with other projects or the system Python, and the setup can be reproduced from a lockfile. It's the Python equivalent of a per-project `node_modules`.",
    },
    {
      id: "dependency-tools",
      q: "pip, requirements.txt, pyproject.toml, Poetry, uv: how do they relate?",
      level: "Intermediate",
      answer:
        "`pip` installs packages. `requirements.txt` is a simple list of dependencies (often pinned with `pip freeze`). `pyproject.toml` is the modern standard project file (like `package.json`) for metadata, dependencies and tool settings. **Poetry** and **uv** are project managers that read `pyproject.toml`, resolve versions, write a lockfile and manage the virtual environment; uv is newer and very fast. I use uv for new projects and understand pip/requirements for older codebases and Docker images.",
    },
    {
      id: "relative-imports",
      q: "Absolute vs relative imports?",
      level: "Intermediate",
      answer:
        "Absolute imports use the full package path (`from app.core.config import settings`); relative imports use dots from the current package (`from .config import settings`, `from ..models import User`). PEP 8 recommends absolute imports for clarity. Relative imports only work inside a package, which is why code using them must be run as a module (`python -m app.main`), not as a loose script.",
    },
    {
      id: "pycache",
      q: "What is `__pycache__`?",
      level: "Basic",
      answer:
        "It's where Python caches compiled bytecode (`.pyc` files) for imported modules, so it doesn't recompile unchanged files on every start. It's safe to delete and should be in `.gitignore`.",
    },
  ],
};

export const concurrency = {
  title: "Concurrency and performance",
  questions: [
    {
      id: "gil",
      q: "What is the GIL?",
      level: "Intermediate",
      common: true,
      answer:
        "The **Global Interpreter Lock** is a mutex in CPython that lets only one thread execute Python bytecode at a time. It simplifies memory management (reference counting) but means threads can't speed up **CPU-bound** Python code. It's released during I/O and inside many C extensions (NumPy, PyTorch), so threads and async still work well for **I/O-bound** work like API calls and database queries.",
      detail: [
        "Python 3.13 introduced an optional experimental **free-threaded** build without the GIL. Most production code still assumes the GIL; in interviews, explain the I/O-bound vs CPU-bound distinction.",
      ],
      followups: ["How would you speed up a CPU-heavy task in Python?", "Does the GIL matter for a FastAPI server calling an LLM API?"],
    },
    {
      id: "thread-process-async",
      q: "Threading vs multiprocessing vs asyncio: when do you use each?",
      level: "Intermediate",
      common: true,
      answer:
        "**asyncio**: many concurrent I/O operations on one thread with cooperative scheduling; best for high-concurrency network work like API servers and LLM calls, if your libraries are async. **Threading**: I/O-bound work with blocking libraries (e.g. `requests`, some DB drivers); simpler to adopt, limited by the GIL for CPU work. **Multiprocessing**: CPU-bound work (parsing, image processing, local model inference) across CPU cores, with separate memory and higher overhead.",
      detail: [
        {
          table: {
            head: ["Workload", "Best tool"],
            rows: [
              ["1,000 concurrent HTTP / LLM calls", "asyncio (+ semaphore)"],
              ["A few blocking API calls in parallel", "`ThreadPoolExecutor`"],
              ["Parsing 10,000 PDFs (CPU)", "`ProcessPoolExecutor` / multiprocessing"],
              ["Heavy numeric work", "NumPy / vectorised libraries (release the GIL)"],
            ],
          },
        },
      ],
    },
    {
      id: "asyncio-how",
      q: "How does async/await work in Python? How is it different from Node?",
      level: "Intermediate",
      common: true,
      answer:
        "`asyncio` runs an event loop on a single thread; when a coroutine hits `await` on I/O, it yields control so other coroutines run, just like Node. The differences: Python code is synchronous by default and the loop must be started (`asyncio.run`, or your framework does it); calling an `async def` creates a coroutine object that does nothing until awaited (JS starts promises immediately); and many Python libraries are synchronous, so you must choose async ones (httpx, asyncpg) or offload blocking calls with `asyncio.to_thread`.",
      detail: [
        {
          lang: "python",
          code: `import asyncio

async def fetch(i):
    await asyncio.sleep(1)
    return i

async def main():
    results = await asyncio.gather(*(fetch(i) for i in range(3)))   # ~1s, not 3s
    print(results)

asyncio.run(main())`,
        },
      ],
      followups: ["What happens if you call `time.sleep()` inside an async function?", "What is `asyncio.gather` vs `TaskGroup`?"],
    },
    {
      id: "blocking-async",
      q: "What happens if you use blocking code inside an `async def` FastAPI route?",
      level: "Intermediate",
      common: true,
      answer:
        "It blocks the event loop, so **every** request on that worker waits until the blocking call finishes, and latency explodes under load. Examples: `time.sleep`, `requests.get`, synchronous DB drivers, heavy CPU work. Fixes: use async libraries, declare the route with plain `def` (FastAPI runs those in a thread pool), or wrap the call in `await asyncio.to_thread(...)`.",
    },
    {
      id: "never-awaited",
      q: "What does \"coroutine was never awaited\" mean?",
      level: "Basic",
      answer:
        "You called an `async def` function without `await`, so you got a coroutine object and the function body never ran. Add `await` (inside another async function) or schedule it with `asyncio.create_task(...)` and keep a reference to the task.",
    },
    {
      id: "speed-up",
      q: "How would you make slow Python code faster?",
      level: "Intermediate",
      common: true,
      answer:
        "First **measure**: profile with `cProfile`, `py-spy` or timing to find the real bottleneck. Then: use better algorithms and data structures (a set instead of a list for lookups), built-ins and comprehensions (implemented in C), caching (`functools.lru_cache`, Redis), vectorised libraries like NumPy, concurrency for I/O (asyncio/threads), multiprocessing for CPU work, and finally faster runtimes or extensions (PyPy, Cython, Rust via PyO3) for hot paths.",
    },
    {
      id: "lru-cache",
      q: "What is `functools.lru_cache`?",
      level: "Intermediate",
      answer:
        "A decorator that memoises a function: it stores results keyed by the arguments and returns the cached result for repeated calls, evicting the least recently used entries beyond `maxsize`. Arguments must be hashable. It's great for pure functions (same input → same output) such as expensive computations or reading settings once (`@lru_cache` on `get_settings()` in FastAPI).",
      detail: [
        {
          lang: "python",
          code: `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(100)            # instant thanks to caching
fib.cache_info()`,
        },
      ],
    },
    {
      id: "complexity",
      q: "What are the time complexities of common list, dict and set operations?",
      level: "Intermediate",
      common: true,
      answer:
        "List: index access and `append` are O(1); `insert(0, x)`, `pop(0)`, `remove(x)` and `x in list` are O(n); sorting is O(n log n). Dict and set: get, set, delete and `in` are O(1) on average. `deque` gives O(1) appends and pops at both ends, so use it for queues instead of `list.pop(0)`.",
    },
  ],
};

export const stdlib = {
  title: "Files and the standard library",
  questions: [
    {
      id: "large-file",
      q: "How do you read a very large file without running out of memory?",
      level: "Intermediate",
      common: true,
      answer:
        "Iterate over the file object line by line (`for line in f:`), which streams from disk, or read fixed-size chunks with `f.read(size)` in a loop. Avoid `f.read()` or `f.readlines()` on huge files because they load everything into memory. Wrap it in a generator to build processing pipelines.",
      detail: [
        {
          lang: "python",
          code: `def error_lines(path):
    with open(path, encoding="utf-8") as f:
        for line in f:                 # one line in memory at a time
            if "ERROR" in line:
                yield line.rstrip()

count = sum(1 for _ in error_lines("app.log"))`,
        },
      ],
    },
    {
      id: "json",
      q: "How do you work with JSON? How do you serialise objects that aren't JSON-compatible?",
      level: "Basic",
      common: true,
      answer:
        "`json.loads`/`json.dumps` convert between JSON strings and Python objects; `json.load`/`json.dump` work with files. Types like `datetime`, `Decimal`, sets or custom classes need conversion: pass `default=str` (or a custom function) to `dumps`, convert dataclasses with `asdict()`, or use Pydantic's `model_dump_json()`, which handles these automatically.",
      detail: [
        {
          lang: "python",
          code: `import json
from datetime import datetime
json.dumps({"at": datetime.now()}, default=str)
json.dumps(data, indent=2, ensure_ascii=False)   # readable, keeps Hindi text as-is`,
        },
      ],
    },
    {
      id: "pathlib",
      q: "Why use `pathlib` instead of `os.path`?",
      level: "Basic",
      answer:
        "`pathlib.Path` gives object-oriented paths that work on every OS: join with `/`, and use methods like `.exists()`, `.read_text()`, `.glob(\"**/*.pdf\")`, `.stem`, `.suffix` and `.parent`. It's more readable than string manipulation with `os.path.join`. Build file paths relative to the code with `Path(__file__).parent / \"data\"` so they don't depend on the current directory.",
    },
    {
      id: "datetime-tz",
      q: "What is the difference between naive and aware datetimes?",
      level: "Intermediate",
      answer:
        "A **naive** datetime has no timezone, so it's ambiguous. An **aware** datetime includes a timezone (`tzinfo`). Store and compare times in UTC with aware datetimes (`datetime.now(timezone.utc)`), and convert to local time (e.g. `Asia/Kolkata` with `zoneinfo`) only for display. Mixing naive and aware datetimes in comparisons raises a `TypeError`.",
    },
    {
      id: "logging",
      q: "Why use `logging` instead of `print` in a backend?",
      level: "Basic",
      common: true,
      answer:
        "`logging` gives levels (DEBUG, INFO, WARNING, ERROR), timestamps and module names, configurable output (console, files, JSON for log platforms), and the ability to turn verbosity up or down without code changes. `logger.exception()` includes the traceback. Use `logger = logging.getLogger(__name__)` per module and `%s` placeholders in messages.",
    },
    {
      id: "env-vars",
      q: "How do you manage configuration and secrets in a Python app?",
      level: "Intermediate",
      common: true,
      answer:
        "Read configuration from environment variables, with a git-ignored `.env` file for local development (python-dotenv or pydantic-settings). pydantic-settings gives typed, validated settings that fail fast at startup if something is missing, and `SecretStr` hides secrets in logs. In production, inject values from a secret store (AWS Secrets Manager, SSM, Vault) via the platform, never bake them into code or images, and commit a `.env.example` with placeholder values.",
    },
  ],
};
