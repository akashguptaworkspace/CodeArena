// Day 1 interview bank, part 1: language basics, data types, functions. Assembled in d01.js.

export const basics = {
  title: "Python basics",
  questions: [
    {
      id: "what-is-python",
      q: "What is Python, and what are its key features?",
      level: "Basic",
      common: true,
      answer:
        "Python is a high-level, general-purpose language that's **dynamically typed** (types are checked at runtime) but **strongly typed** (no silent conversions like `\"1\" + 1`). It's interpreted via bytecode, has automatic memory management, supports procedural, object-oriented and functional styles, and ships with a large standard library. It's popular for backends, data, automation and AI because it's readable and has a huge ecosystem.",
      detail: [
        {
          list: [
            "**Readable syntax:** indentation defines blocks; no braces or semicolons.",
            "**Batteries included:** `json`, `pathlib`, `datetime`, `asyncio`, `sqlite3`, `unittest` and more with no installs.",
            "**Ecosystem:** PyPI has packages for web (FastAPI, Django), data (pandas, NumPy), and AI (PyTorch, Hugging Face, LangChain).",
            "**Trade-off:** slower than compiled languages for CPU-heavy pure-Python loops; the usual fixes are C-backed libraries (NumPy), multiprocessing, or moving hot paths to faster code.",
          ],
        },
      ],
      followups: ["Why is Python the main language for AI and ML?", "What are Python's weaknesses?"],
    },
    {
      id: "compiled-interpreted",
      q: "Is Python compiled or interpreted?",
      level: "Basic",
      common: true,
      answer:
        "Both, in a sense. CPython (the standard implementation) first **compiles** source code to **bytecode**, then the Python Virtual Machine **interprets** that bytecode. There's no separate build step for you, and bytecode for imported modules is cached in `__pycache__/*.pyc` files so later starts are faster.",
      detail: [
        {
          lang: "python",
          code: `import dis

def add(a, b):
    return a + b

dis.dis(add)          # shows the bytecode instructions, e.g. LOAD_FAST, BINARY_OP, RETURN_VALUE`,
        },
        "Other implementations exist: **PyPy** (a JIT compiler, often much faster for pure-Python loops), Jython (JVM) and MicroPython (microcontrollers). When people say \"Python\" they usually mean CPython.",
      ],
      followups: ["What is a `.pyc` file?", "What's the difference between CPython and PyPy?"],
    },
    {
      id: "dynamic-strong",
      q: "Python is dynamically typed and strongly typed. What does that mean?",
      level: "Basic",
      common: true,
      answer:
        "**Dynamic** means a variable's type is decided at runtime and a name can later point to a value of a different type. **Strong** means Python won't silently convert between unrelated types: `\"1\" + 1` raises a `TypeError` instead of returning `\"11\"` like JavaScript.",
      detail: [
        {
          lang: "python",
          code: `x = 10        # int
x = "ten"     # now a str: allowed (dynamic)
"1" + 1       # TypeError: can only concatenate str (not "int") to str  (strong)
int("1") + 1  # 2: conversions must be explicit`,
        },
        "Type hints (`x: int`) add optional static checking with tools like mypy or Pyright, but Python doesn't enforce them at runtime.",
      ],
    },
    {
      id: "pep8",
      q: "What is PEP 8? What is a PEP?",
      level: "Basic",
      answer:
        "A **PEP** (Python Enhancement Proposal) is a design document for Python features and conventions. **PEP 8** is the official style guide: 4-space indentation, `snake_case` for functions and variables, `PascalCase` for classes, `UPPER_CASE` for constants, sensible line length, and import ordering. In practice teams enforce it automatically with formatters and linters like Ruff or Black.",
      followups: ["Name another PEP you know (e.g. PEP 484 type hints, PEP 20 the Zen of Python)."],
    },
    {
      id: "mutable-immutable",
      q: "What are mutable and immutable types? Give examples.",
      level: "Basic",
      common: true,
      answer:
        "Mutable objects can be changed in place after creation: `list`, `dict`, `set`, and most custom class instances. Immutable objects can't: `int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`. \"Changing\" an immutable value actually creates a new object. This matters for function arguments, default arguments, and dictionary keys (keys must be immutable/hashable).",
      detail: [
        {
          lang: "python",
          code: `s = "hi"
print(id(s))
s += "!"            # creates a NEW string object
print(id(s))        # different id

nums = [1, 2]
print(id(nums))
nums.append(3)      # modifies the SAME list in place
print(id(nums))     # same id`,
        },
        {
          warn: "A tuple is immutable, but if it contains a list, that list can still change: `t = ([1], 2); t[0].append(3)` works.",
        },
      ],
      followups: ["Why can't a list be a dict key?", "What happens when you pass a list to a function and modify it?"],
    },
    {
      id: "is-vs-eq",
      q: "What is the difference between `is` and `==`?",
      level: "Basic",
      common: true,
      answer:
        "`==` checks **value equality** (it calls `__eq__`). `is` checks **identity**: whether two names point to the same object in memory. Use `is` only for singletons like `None`, `True` and `False` (`if x is None:`), and `==` for everything else.",
      detail: [
        {
          lang: "python",
          code: `a = [1, 2]
b = [1, 2]
c = a
a == b   # True  (same contents)
a is b   # False (different objects)
a is c   # True  (same object)

x = 256; y = 256
x is y   # True in CPython: small ints (-5..256) are cached. Never rely on this.`,
        },
      ],
    },
    {
      id: "truthiness",
      q: "What values are \"falsy\" in Python?",
      level: "Basic",
      answer:
        "`False`, `None`, zero of any numeric type (`0`, `0.0`), and empty containers or strings (`\"\"`, `[]`, `{}`, `set()`, `()`, `range(0)`). Everything else is truthy by default. Unlike JavaScript, an empty list is falsy, so `if items:` means \"if the list is not empty\".",
      detail: [
        "Custom classes can control truthiness with `__bool__` (or `__len__`).",
      ],
    },
    {
      id: "scope-legb",
      q: "Explain scope in Python (the LEGB rule).",
      level: "Intermediate",
      common: true,
      answer:
        "Python looks up names in four scopes in order: **L**ocal (inside the current function), **E**nclosing (outer functions, for nested functions), **G**lobal (module level), and **B**uilt-in (like `len`, `print`). Assigning to a name inside a function makes it local by default; to reassign an outer name you need `global` or `nonlocal`.",
      detail: [
        {
          lang: "python",
          code: `count = 0                  # global

def outer():
    total = 0              # enclosing (for inner)
    def inner():
        nonlocal total     # reassign the enclosing variable
        total += 1
    inner()
    return total

def bump():
    global count           # reassign the module-level variable
    count += 1`,
        },
        {
          warn: "Without `global`/`nonlocal`, `count += 1` inside a function raises `UnboundLocalError`, because the assignment makes `count` local for the whole function.",
        },
      ],
      followups: ["What's the difference between `global` and `nonlocal`?", "Do `if` or `for` blocks create a new scope? (No.)"],
    },
    {
      id: "memory-management",
      q: "How does Python manage memory?",
      level: "Intermediate",
      common: true,
      answer:
        "CPython uses **reference counting**: each object tracks how many references point to it, and it's freed immediately when the count reaches zero. A **cyclic garbage collector** (the `gc` module) periodically finds groups of objects that reference each other but are unreachable, which reference counting alone can't free. Memory is managed in a private heap by Python's allocator; you don't free memory manually.",
      detail: [
        {
          lang: "python",
          code: `import sys, gc
a = []
print(sys.getrefcount(a))   # count (+1 for the argument itself)

x = []; y = []
x.append(y); y.append(x)    # a reference cycle
del x, y                    # refcounts never reach 0...
gc.collect()                # ...the cycle collector frees them`,
        },
        "Memory leaks in Python usually come from references you keep by accident: growing global caches, lists that are never cleared, or closures holding large objects.",
      ],
      followups: ["What is a reference cycle?", "How would you find a memory leak? (`tracemalloc`, profiling)"],
    },
    {
      id: "name-main",
      q: "What does `if __name__ == \"__main__\":` do?",
      level: "Basic",
      common: true,
      answer:
        "When a file is run directly, Python sets its `__name__` to `\"__main__\"`; when it's imported, `__name__` is the module's name. The check lets a file work both as a reusable module and as a script: code under the guard runs only when you execute the file directly, not when someone imports it.",
    },
    {
      id: "pass-continue-break",
      q: "What do `pass`, `continue` and `break` do?",
      level: "Basic",
      answer:
        "`pass` does nothing; it's a placeholder where syntax requires a statement (an empty function or class). `continue` skips the rest of the current loop iteration and moves to the next one. `break` exits the loop entirely. Loops also have an `else` block that runs only if the loop finished without `break`.",
      detail: [
        {
          lang: "python",
          code: `for n in [3, 7, 9]:
    if n % 2 == 0:
        print("found even", n)
        break
else:
    print("no even numbers")   # runs, because there was no break`,
        },
      ],
    },
    {
      id: "py2-py3",
      q: "What are the main differences between Python 2 and Python 3?",
      level: "Basic",
      answer:
        "Python 2 reached end of life in 2020, so all new work is Python 3. Key differences: `print` is a function in 3; strings are Unicode by default in 3 (bytes are separate); `/` is true division in 3 (`3 / 2 == 1.5`); `range` and many functions return lazy iterators; and 3 adds f-strings, type hints, async/await and many standard library improvements.",
    },
  ],
};

export const dataTypes = {
  title: "Data types and collections",
  questions: [
    {
      id: "list-vs-tuple",
      q: "What is the difference between a list and a tuple?",
      level: "Basic",
      common: true,
      answer:
        "Both are ordered sequences. A **list** is mutable (you can add, remove and change items); a **tuple** is immutable. Because tuples can't change, they're hashable (if their items are), so they can be dict keys or set members, and they're slightly faster and lighter. Use lists for collections that change, tuples for fixed records and multiple return values.",
      detail: [
        {
          lang: "python",
          code: `point = (12.97, 77.59)          # fixed record: lat, lng
locations = {point: "Bengaluru"}  # tuple as dict key
cart = ["chai", "samosa"]
cart.append("jalebi")             # list grows

def min_max(nums): return min(nums), max(nums)   # returns a tuple
low, high = min_max([4, 1, 9])`,
        },
      ],
      followups: ["Can a tuple contain a list?", "What is a namedtuple?"],
    },
    {
      id: "list-set-dict",
      q: "When would you use a list, a set, or a dict?",
      level: "Basic",
      common: true,
      answer:
        "Use a **list** for ordered data you iterate over or index, with duplicates allowed. Use a **set** for unique items and fast membership checks (`x in s` is O(1) on average vs O(n) for a list). Use a **dict** to look values up by key, like a JS object or Map. In GenAI code: chat messages are a list of dicts, seen document ids are a set, and config is a dict.",
      detail: [
        {
          table: {
            head: ["Operation", "list", "set", "dict"],
            rows: [
              ["`x in c`", "O(n)", "O(1) avg", "O(1) avg (keys)"],
              ["Add", "`append` O(1)", "`add` O(1)", "`d[k] = v` O(1)"],
              ["Ordered", "Yes", "No", "Insertion order (3.7+)"],
              ["Duplicates", "Allowed", "No", "Unique keys"],
            ],
          },
        },
      ],
    },
    {
      id: "dict-internals",
      q: "How is a dictionary implemented, and what is its time complexity?",
      level: "Intermediate",
      common: true,
      answer:
        "A dict is a **hash table**. Python hashes the key to find a slot, so get, set and delete are **O(1) on average** (O(n) in rare worst cases with many collisions). Since Python 3.7, dicts officially preserve insertion order, thanks to a compact layout that stores entries in an array and uses a separate index table for hashing.",
      detail: [
        "Keys must be **hashable**: they need a stable `__hash__` and `__eq__`. Immutable built-ins (str, int, tuple of hashables) are hashable; lists, dicts and sets aren't.",
      ],
      followups: ["What happens if two keys have the same hash?", "Why must dict keys be immutable?"],
    },
    {
      id: "shallow-deep-copy",
      q: "What is the difference between a shallow copy and a deep copy?",
      level: "Intermediate",
      common: true,
      answer:
        "A **shallow copy** creates a new outer container but shares the inner objects (`list.copy()`, `list[:]`, `dict.copy()`, `copy.copy()`). A **deep copy** (`copy.deepcopy()`) recursively copies everything, so nested objects are independent. Plain assignment (`b = a`) copies nothing; both names point to the same object.",
      detail: [
        {
          lang: "python",
          code: `import copy
original = [[1, 2], [3, 4]]
shallow = original.copy()
deep = copy.deepcopy(original)

original[0].append(99)
print(shallow)   # [[1, 2, 99], [3, 4]]  inner list is shared
print(deep)      # [[1, 2], [3, 4]]      fully independent`,
        },
      ],
    },
    {
      id: "comprehension-vs-generator",
      q: "What is the difference between a list comprehension and a generator expression?",
      level: "Intermediate",
      common: true,
      answer:
        "A list comprehension `[x * 2 for x in data]` builds the whole list in memory immediately. A generator expression `(x * 2 for x in data)` produces items lazily, one at a time, using almost no memory, and can be iterated only once. Use generators for large data or when passing straight into `sum`, `any`, `max` or `\"\".join`.",
      detail: [
        {
          lang: "python",
          code: `import sys
squares_list = [n * n for n in range(1_000_000)]
squares_gen = (n * n for n in range(1_000_000))
print(sys.getsizeof(squares_list))   # ~8 MB
print(sys.getsizeof(squares_gen))    # ~200 bytes
total = sum(n * n for n in range(1_000_000))   # no list built`,
        },
      ],
    },
    {
      id: "dedupe-order",
      q: "How do you remove duplicates from a list while keeping the order?",
      level: "Basic",
      common: true,
      answer:
        "Use `list(dict.fromkeys(items))`. Dict keys are unique and keep insertion order, so this removes duplicates in O(n) while preserving the first occurrence. `list(set(items))` also removes duplicates but loses the order.",
      detail: [
        {
          lang: "python",
          code: `tags = ["rag", "python", "rag", "aws", "python"]
list(dict.fromkeys(tags))   # ['rag', 'python', 'aws']

# Equivalent manual version (useful for unhashable items with a key function):
seen, result = set(), []
for t in tags:
    if t not in seen:
        seen.add(t); result.append(t)`,
        },
      ],
    },
    {
      id: "append-extend",
      q: "What is the difference between `append()` and `extend()`?",
      level: "Basic",
      answer:
        "`append(x)` adds `x` as a single item at the end. `extend(iterable)` adds each item from the iterable. So `[1, 2].append([3, 4])` gives `[1, 2, [3, 4]]`, while `[1, 2].extend([3, 4])` gives `[1, 2, 3, 4]`. `+=` on a list behaves like `extend`.",
    },
    {
      id: "sort-sorted",
      q: "What is the difference between `sort()` and `sorted()`?",
      level: "Basic",
      common: true,
      answer:
        "`list.sort()` sorts the list **in place** and returns `None`; it only works on lists. `sorted(iterable)` returns a **new** sorted list from any iterable and leaves the original unchanged. Both accept `key=` and `reverse=`, and both are stable (equal items keep their order). A classic bug is `nums = nums.sort()`, which sets `nums` to `None`.",
      detail: [
        {
          lang: "python",
          code: `people = [{"name": "Ravi", "age": 31}, {"name": "Asha", "age": 27}]
by_age = sorted(people, key=lambda p: p["age"])
people.sort(key=lambda p: p["name"], reverse=True)`,
        },
      ],
    },
    {
      id: "slicing",
      q: "Explain slicing. How do you reverse a list or string?",
      level: "Basic",
      common: true,
      answer:
        "Slicing is `seq[start:stop:step]`: `start` is included, `stop` excluded, all optional, and negative numbers count from the end. `seq[::-1]` reverses. Slicing always returns a new object and never raises `IndexError` for out-of-range bounds.",
      detail: [
        {
          lang: "python",
          code: `s = "python"
s[0:2]    # 'py'
s[-3:]    # 'hon'
s[::2]    # 'pto'
s[::-1]   # 'nohtyp'
nums = [1, 2, 3, 4]
nums[:]   # shallow copy`,
        },
      ],
    },
    {
      id: "collections-module",
      q: "What useful classes does the `collections` module provide?",
      level: "Intermediate",
      common: true,
      answer:
        "`Counter` counts items (`most_common(n)`), `defaultdict` provides default values for missing keys (great for grouping), `deque` is a double-ended queue with O(1) appends and pops at both ends, `namedtuple` creates lightweight immutable records with named fields, and `OrderedDict` has ordering operations like `move_to_end` (useful for LRU caches).",
      detail: [
        {
          lang: "python",
          code: `from collections import Counter, defaultdict, deque, namedtuple
Counter("banana").most_common(2)          # [('a', 3), ('n', 2)]
groups = defaultdict(list); groups["pune"].append("Asha")
q = deque([1, 2]); q.appendleft(0); q.pop()
Point = namedtuple("Point", "x y"); p = Point(1, 2); p.x`,
        },
      ],
    },
    {
      id: "string-concat",
      q: "Strings are immutable. Why does that matter for performance?",
      level: "Intermediate",
      answer:
        "Every `+` or `+=` on strings creates a new string and copies the old content, so building a long string in a loop can become O(n²). The idiomatic fix is to collect pieces in a list and join once: `\"\".join(parts)`, which is O(n). (CPython sometimes optimises `+=` in place, but don't rely on it.)",
      detail: [
        {
          lang: "python",
          code: `parts = []
for chunk in retrieved_chunks:
    parts.append(chunk["text"])
context = "\\n\\n".join(parts)`,
        },
      ],
    },
    {
      id: "string-formatting",
      q: "What are the ways to format strings, and which should you use?",
      level: "Basic",
      answer:
        "Three styles: `%` formatting (`\"%s is %d\" % (name, age)`, old), `str.format()` (`\"{} is {}\".format(name, age)`), and **f-strings** (`f\"{name} is {age}\"`, Python 3.6+). Prefer f-strings: they're the most readable and fastest. Exception: in `logging` calls use `%s` placeholders so formatting is skipped when the log level is disabled.",
      detail: [
        {
          lang: "python",
          code: `price = 1499.5
f"₹{price:,.2f}"      # '₹1,499.50'
f"{'left':<10}|"      # padding
f"{price=}"           # 'price=1499.5' (debugging)`,
        },
      ],
    },
    {
      id: "range-lazy",
      q: "What does `range()` return in Python 3? Why is that useful?",
      level: "Basic",
      answer:
        "`range()` returns a lazy **range object**, not a list. It computes numbers on demand, so `range(10**9)` uses almost no memory. It supports indexing, slicing, `len()` and fast `in` checks. Wrap it in `list()` only if you truly need a list.",
    },
    {
      id: "enumerate-zip",
      q: "What do `enumerate()` and `zip()` do?",
      level: "Basic",
      answer:
        "`enumerate(items, start=0)` gives `(index, item)` pairs so you don't need a manual counter. `zip(a, b)` pairs items from several iterables position by position and stops at the shortest (use `itertools.zip_longest` to go to the longest, or `zip(..., strict=True)` in 3.10+ to raise on unequal lengths).",
      detail: [
        {
          lang: "python",
          code: `for i, name in enumerate(["Asha", "Ravi"], start=1):
    print(i, name)
for q, a in zip(questions, answers):
    print(q, "->", a)
dict(zip(["a", "b"], [1, 2]))   # {'a': 1, 'b': 2}`,
        },
      ],
    },
    {
      id: "hashable",
      q: "What does \"hashable\" mean?",
      level: "Intermediate",
      answer:
        "An object is hashable if it has a hash value that never changes during its lifetime (`__hash__`) and can be compared for equality (`__eq__`). Hashable objects can be dict keys and set members. Immutable built-ins are hashable; lists, dicts and sets aren't. Custom class instances are hashable by identity unless you define `__eq__` without `__hash__`.",
    },
  ],
};

export const functions = {
  title: "Functions",
  questions: [
    {
      id: "args-kwargs",
      q: "What are `*args` and `**kwargs`?",
      level: "Basic",
      common: true,
      answer:
        "In a function definition, `*args` collects extra positional arguments into a **tuple** and `**kwargs` collects extra keyword arguments into a **dict**. In a call, `*` unpacks an iterable into positional arguments and `**` unpacks a dict into keyword arguments. They're used for flexible APIs and for wrappers (like decorators) that pass arguments through.",
      detail: [
        {
          lang: "python",
          code: `def log(level, *args, **kwargs):
    print(level, args, kwargs)

log("INFO", "user", 42, request_id="abc")
# INFO ('user', 42) {'request_id': 'abc'}

params = {"model": "gpt-4o-mini", "temperature": 0}
client.chat.completions.create(messages=msgs, **params)`,
        },
      ],
    },
    {
      id: "mutable-default",
      q: "What goes wrong with a mutable default argument?",
      level: "Intermediate",
      common: true,
      answer:
        "Default values are evaluated **once**, when the function is defined, not each time it's called. A mutable default like `[]` or `{}` is therefore shared across all calls, so changes leak between calls. The fix is to use `None` as the default and create a new object inside the function.",
      detail: [
        {
          lang: "python",
          code: `def add(item, items=[]):      # bug
    items.append(item)
    return items
add(1); add(2)                  # [1, 2]  (state leaked)

def add(item, items=None):      # fix
    if items is None:
        items = []
    items.append(item)
    return items`,
        },
      ],
      followups: ["How do dataclasses handle mutable defaults? (`field(default_factory=list)`)"],
    },
    {
      id: "pass-by",
      q: "Is Python pass-by-value or pass-by-reference?",
      level: "Intermediate",
      common: true,
      answer:
        "Neither exactly: it's **pass-by-object-reference** (also called pass-by-assignment). The function parameter becomes a new name bound to the same object. If the object is mutable and you modify it in place, the caller sees the change. If you **reassign** the parameter to a new object, the caller's variable is unaffected.",
      detail: [
        {
          lang: "python",
          code: `def modify(lst):
    lst.append(4)       # changes the caller's list

def reassign(lst):
    lst = [99]          # only rebinds the local name

nums = [1, 2, 3]
modify(nums);   print(nums)   # [1, 2, 3, 4]
reassign(nums); print(nums)   # [1, 2, 3, 4]`,
        },
      ],
    },
    {
      id: "lambda",
      q: "What is a lambda function, and what are its limits?",
      level: "Basic",
      answer:
        "A lambda is a small anonymous function written in one expression: `lambda x: x * 2`. It can't contain statements (no assignments, loops or multiple lines) and has no name, which makes tracebacks less clear. Use it for short `key=` functions in `sorted`, `max` or `min`; use `def` for anything more.",
    },
    {
      id: "map-filter-reduce",
      q: "Explain `map`, `filter` and `reduce`. What's more Pythonic?",
      level: "Basic",
      answer:
        "`map(fn, items)` applies a function to each item, `filter(fn, items)` keeps items where the function is true, and `functools.reduce(fn, items)` combines items into one value. In Python 3, map and filter return lazy iterators. Comprehensions are usually more readable (`[x * 2 for x in items if x > 0]`), and built-ins like `sum`, `max` and `any` replace most reduce uses.",
    },
    {
      id: "closures",
      q: "What is a closure?",
      level: "Intermediate",
      common: true,
      answer:
        "A closure is an inner function that remembers variables from its enclosing function's scope even after the outer function has returned. It's how decorators and function factories keep state. To reassign (not just read) an enclosed variable, the inner function must declare it `nonlocal`.",
      detail: [
        {
          lang: "python",
          code: `def make_multiplier(n):
    def multiply(x):
        return x * n      # n is remembered
    return multiply

triple = make_multiplier(3)
triple(10)                # 30
triple.__closure__[0].cell_contents   # 3`,
        },
      ],
    },
    {
      id: "decorators",
      q: "What is a decorator? Write one.",
      level: "Intermediate",
      common: true,
      answer:
        "A decorator is a function that takes a function and returns a new function that wraps it, adding behaviour before or after the call without changing the original code. The `@name` syntax applies it: `@timer` above `def f` means `f = timer(f)`. Real uses: FastAPI's `@app.get`, `@functools.lru_cache`, retry logic, auth checks and logging.",
      detail: [
        {
          lang: "python",
          code: `import functools, time

def timer(fn):
    @functools.wraps(fn)                  # keep fn's name and docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper

@timer
def slow(): time.sleep(0.2)`,
        },
        "A decorator **with arguments** needs one more level: a function that takes the arguments and returns the decorator (`@retry(times=3)`).",
      ],
      followups: ["Why use `functools.wraps`?", "Write a decorator that takes arguments.", "Can you stack decorators? In what order do they apply?"],
    },
    {
      id: "decorator-args",
      q: "How do you write a decorator that accepts arguments, like `@retry(times=3)`?",
      level: "Advanced",
      answer:
        "Add an outer function that receives the arguments and returns the actual decorator. So there are three levels: the factory (takes `times`), the decorator (takes the function), and the wrapper (takes the call's arguments).",
      detail: [
        {
          lang: "python",
          code: `import functools, time

def retry(times: int = 3, delay: float = 0.5, on=(Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except on:
                    if attempt == times:
                        raise
                    time.sleep(delay * 2 ** (attempt - 1))
        return wrapper
    return decorator

@retry(times=3, on=(TimeoutError,))
def call_llm(prompt): ...`,
        },
        "Stacked decorators apply bottom-up: `@a` over `@b` over `def f` means `f = a(b(f))`.",
      ],
    },
    {
      id: "param-kinds",
      q: "What do `/` and `*` mean in a function signature?",
      level: "Advanced",
      answer:
        "Parameters before `/` are **positional-only** (callers can't pass them by name). Parameters after `*` are **keyword-only** (callers must pass them by name). Libraries use keyword-only parameters so calls stay readable and safe to extend, e.g. `create(model=..., temperature=0)`.",
      detail: [
        {
          lang: "python",
          code: `def f(a, b, /, c, *, d):
    ...
f(1, 2, 3, d=4)        # ok
f(1, 2, c=3, d=4)      # ok
f(a=1, b=2, c=3, d=4)  # TypeError: a, b are positional-only
f(1, 2, 3, 4)          # TypeError: d is keyword-only`,
        },
      ],
    },
    {
      id: "type-hints",
      q: "What are type hints? Are they enforced?",
      level: "Basic",
      common: true,
      answer:
        "Type hints annotate expected types (`def f(x: int) -> str:`). Python **doesn't enforce them at runtime**; they're used by editors, static checkers (mypy, Pyright) and libraries. FastAPI and Pydantic **do** read them at runtime to validate and convert data, which is why they're essential in modern backend code.",
      detail: [
        {
          lang: "python",
          code: `from typing import Literal
def greet(name: str, times: int = 1) -> str:
    return " ".join([f"Hi {name}"] * times)

greet(123)   # runs! only a type checker would complain

Role = Literal["system", "user", "assistant"]
maybe: str | None = None`,
        },
      ],
    },
    {
      id: "first-class",
      q: "What does it mean that functions are first-class objects?",
      level: "Basic",
      answer:
        "Functions are values like any other: you can assign them to variables, store them in lists or dicts, pass them as arguments, and return them from other functions. This enables callbacks, decorators, strategy dictionaries (`{\"add\": add, \"sub\": sub}`), and higher-order functions like `sorted(key=...)`.",
    },
    {
      id: "docstrings",
      q: "What is a docstring? How is it different from a comment?",
      level: "Basic",
      answer:
        "A docstring is a string literal right after a `def`, `class` or module start. Unlike a comment, it's stored on the object (`fn.__doc__`), shown by `help()` and editors, and used by tools: FastAPI shows it in API docs, and LangChain's `@tool` sends it to the LLM as the tool description.",
    },
    {
      id: "generator-function",
      q: "What does `yield` do in a function?",
      level: "Intermediate",
      common: true,
      answer:
        "A function containing `yield` becomes a **generator function**. Calling it returns a generator object without running the body. Each `next()` (or loop iteration) runs until the next `yield`, hands out that value and pauses, keeping local state. It's ideal for streaming large data lazily, like reading a huge file line by line or streaming LLM tokens.",
      detail: [
        {
          lang: "python",
          code: `def read_chunks(path, size=1024):
    with open(path, encoding="utf-8") as f:
        while chunk := f.read(size):
            yield chunk

for piece in read_chunks("big.txt"):
    process(piece)            # only one chunk in memory at a time`,
        },
      ],
      followups: ["What is `yield from`?", "Can you iterate a generator twice?"],
    },
  ],
};
