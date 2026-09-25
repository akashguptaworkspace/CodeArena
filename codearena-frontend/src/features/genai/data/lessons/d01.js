// Day 1: Python for JS developers. Shape: see ./index.js
import setup from "./d01-setup.js";
import { backendStructure, firstApi } from "./d01-backend.js";

export default {
  setup,
  "backend-structure": backendStructure,
  "first-api": firstApi,
  types: {
    minutes: 60,
    level: "Beginner",
    intro:
      "Python's built-in data types are the raw material of every GenAI program: a chat history is a list of dicts, an embedding is a list of floats, an API response is a dict. You already know the JavaScript versions, so this lesson maps each one across and then goes past JS where Python is different.",
    sections: [
      {
        h: "Variables and the basic types",
        blocks: [
          "Python has no `let`, `const` or `var`. You assign, and the name exists. Names are `snake_case` by convention, not `camelCase`.",
          {
            lang: "python",
            code: `name = "Asha"          # str
age = 27               # int (arbitrary size: 10**100 works)
score = 91.5           # float
is_active = True       # bool: capital T / F
nothing = None         # like null (there is no undefined)

print(type(age))       # <class 'int'>
print(isinstance(score, float))  # True`,
          },
          {
            table: {
              head: ["JavaScript", "Python", "Notes"],
              rows: [
                ["`number`", "`int`, `float`", "Two types. `7 / 2` is `3.5`; `7 // 2` is `3` (floor division)."],
                ["`string`", "`str`", "Immutable, like JS. Single or double quotes are the same."],
                ["`true` / `false`", "`True` / `False`", "Capitalised."],
                ["`null` / `undefined`", "`None`", "Only one \"nothing\" value. Check with `x is None`."],
                ["`&&`, `||`, `!`", "`and`, `or`, `not`", "Words, not symbols."],
                ["`===`", "`==`", "Python `==` never coerces types: `1 == \"1\"` is `False`."],
              ],
            },
          },
          "**Truthiness** works like JS with one important difference: empty containers are falsy. `[]`, `{}`, `\"\"`, `0` and `None` are all falsy, so `if items:` means \"if the list is not empty\". In JS, `[]` is truthy, which trips people up in both directions.",
          {
            tip: "Use `is` only for `None`, `True` and `False` (identity checks). Use `==` for comparing values. `x is None` is the idiomatic null check.",
          },
        ],
      },
      {
        h: "Strings and f-strings",
        blocks: [
          "f-strings are Python's template literals. Put `f` before the quote and expressions inside `{}`. You will use them constantly to build prompts.",
          {
            lang: "python",
            code: `model = "gpt-4o-mini"
tokens = 1834
cost = tokens / 1_000_000 * 0.15

print(f"{model} used {tokens:,} tokens, cost \${cost:.5f}")
# gpt-4o-mini used 1,834 tokens, cost $0.00028

print(f"{tokens=}")            # tokens=1834  (great for debugging)
print(f"{'left':<10}|")        # 'left      |' (padding / alignment)

# Multi-line strings: triple quotes. Perfect for prompts.
system_prompt = f"""You are a support assistant for {model}.
Answer in under 100 words."""`,
          },
          "Common string methods, mapped from JS:",
          {
            table: {
              head: ["JavaScript", "Python"],
              rows: [
                ["`s.toUpperCase()`", "`s.upper()`"],
                ["`s.trim()`", "`s.strip()` (also `lstrip`, `rstrip`)"],
                ["`s.split(\",\")`", "`s.split(\",\")`; `s.split()` splits on any whitespace"],
                ["`arr.join(\", \")`", "`\", \".join(arr)` (the separator comes first)"],
                ["`s.includes(\"x\")`", "`\"x\" in s`"],
                ["`s.startsWith(\"a\")`", "`s.startswith(\"a\")`"],
                ["`s.replace(/a/g, \"b\")`", "`s.replace(\"a\", \"b\")` (replaces all by default)"],
                ["`s.length`", "`len(s)`"],
              ],
            },
          },
          {
            warn: "Python strings are immutable, and building a long string with `+=` in a loop is slow. Collect pieces in a list and `\"\".join(parts)` at the end. You'll do this when assembling retrieved chunks into a prompt.",
          },
        ],
      },
      {
        h: "Lists: Python's arrays",
        blocks: [
          "A `list` is an ordered, mutable sequence, like a JS array. It can hold mixed types, but in practice you keep one type per list.",
          {
            lang: "python",
            code: `messages = ["hi", "how are you?"]
messages.append("tell me a joke")   # push
messages.insert(0, "system")        # insert at index
last = messages.pop()               # remove + return last
messages.extend(["a", "b"])         # concat in place (like push(...arr))
combined = messages + ["c"]         # new list

print(len(messages))                # length
print("hi" in messages)             # includes -> True
print(messages.index("hi"))         # indexOf (raises ValueError if missing)

nums = [5, 2, 9]
nums.sort()                  # sorts in place, returns None
top = sorted(nums, reverse=True)   # returns a new sorted list`,
          },
          {
            warn: "`list.sort()` returns `None`. Writing `nums = nums.sort()` wipes your list. Use `sorted(nums)` when you want a new list.",
          },
          "Looping is simpler than JS: `for item in items:`. When you need the index too, use `enumerate` instead of a counter. To walk two lists together, use `zip`.",
          {
            lang: "python",
            code: `for i, msg in enumerate(messages, start=1):
    print(i, msg)

questions = ["What is RAG?", "What is HNSW?"]
answers = ["Retrieval + generation", "A graph index"]
for q, a in zip(questions, answers):
    print(f"Q: {q}\\nA: {a}")`,
          },
        ],
      },
      {
        h: "Slicing",
        blocks: [
          "Slicing extracts part of any sequence (list, string, tuple) with `seq[start:stop:step]`. `start` is included, `stop` is excluded, and all three are optional. Negative numbers count from the end.",
          {
            lang: "python",
            code: `tokens = ["The", "cat", "sat", "on", "the", "mat"]

tokens[0]      # 'The'
tokens[-1]     # 'mat'   (last item; JS needs .at(-1))
tokens[1:3]    # ['cat', 'sat']
tokens[:2]     # ['The', 'cat']      first 2
tokens[-2:]    # ['the', 'mat']      last 2
tokens[::2]    # ['The', 'sat', 'the']  every 2nd
tokens[::-1]   # reversed copy
tokens[:]      # shallow copy

"hello world"[:5]   # 'hello'`,
          },
          "You'll use slicing all the time in GenAI code: keeping only the last N chat messages so the prompt fits the context window, or cutting text into chunks.",
          {
            lang: "python",
            code: `MAX_TURNS = 6
history = history[-MAX_TURNS:]    # keep the most recent 6 messages

def chunk(text: str, size: int, overlap: int) -> list[str]:
    step = size - overlap
    return [text[i:i + size] for i in range(0, len(text), step)]

chunk("abcdefghij", size=4, overlap=1)
# ['abcd', 'defg', 'ghij', 'j']`,
            caption: "A character chunker with overlap: the same idea you'll use for RAG on Day 7.",
          },
          {
            note: "Slicing never raises an IndexError: `tokens[10:20]` just returns `[]`. Indexing a single item does: `tokens[10]` raises.",
          },
        ],
      },
      {
        h: "Dicts: Python's objects",
        blocks: [
          "A `dict` maps keys to values, like a JS object or `Map`. Keys must be hashable (strings, numbers, tuples). Since Python 3.7, dicts keep insertion order. Every JSON object you receive from an LLM API becomes a dict.",
          {
            lang: "python",
            code: `message = {"role": "user", "content": "What is RAG?"}

message["role"]                 # 'user'
message["tokens"] = 12          # add / update
message.get("name")             # None instead of KeyError
message.get("name", "anon")     # default value
"role" in message               # True (checks keys)
del message["tokens"]

for key, value in message.items():   # like Object.entries
    print(key, value)

list(message.keys())      # ['role', 'content']
list(message.values())

# Merge (like {...a, ...b} in JS)
defaults = {"temperature": 0.7, "max_tokens": 500}
overrides = {"temperature": 0}
params = defaults | overrides   # {'temperature': 0, 'max_tokens': 500}
params = {**defaults, **overrides}   # same thing, older syntax`,
          },
          {
            warn: "`message.role` does **not** work: dict access is always `message[\"role\"]`. Dot access is for object attributes (classes, Pydantic models), which you'll meet in the classes lesson.",
          },
          "Two helpers from the standard library save a lot of code when counting or grouping:",
          {
            lang: "python",
            code: `from collections import Counter, defaultdict

words = "the cat and the hat".split()
Counter(words).most_common(2)      # [('the', 2), ('cat', 1)]

by_source = defaultdict(list)       # missing keys start as []
for chunk in [("a.pdf", "text1"), ("b.pdf", "text2"), ("a.pdf", "text3")]:
    by_source[chunk[0]].append(chunk[1])
# {'a.pdf': ['text1', 'text3'], 'b.pdf': ['text2']}`,
          },
        ],
      },
      {
        h: "Tuples and sets",
        blocks: [
          "A **tuple** is an immutable list: `point = (3, 4)`. Use it for fixed-size records and for returning several values from a function. Because it's immutable, a tuple can be a dict key or live in a set; a list can't.",
          {
            lang: "python",
            code: `def min_max(nums: list[int]) -> tuple[int, int]:
    return min(nums), max(nums)      # parentheses are optional

low, high = min_max([4, 1, 9])       # unpacking, like array destructuring
first, *rest = [1, 2, 3, 4]          # first=1, rest=[2, 3, 4]

single = (5,)    # a one-item tuple needs the trailing comma
cache = {("gpt-4o", "hello"): "cached reply"}   # tuple as dict key`,
          },
          "A **set** is an unordered collection of unique items, like a JS `Set`, but with real set maths built in. Membership checks (`x in s`) are O(1) on average, versus O(n) for a list.",
          {
            lang: "python",
            code: `seen_ids = set()
seen_ids.add("doc-1")
"doc-1" in seen_ids        # True, fast

a = {"python", "fastapi", "rag"}
b = {"rag", "langchain"}
a & b     # {'rag'}                      intersection
a | b     # all four                     union
a - b     # {'python', 'fastapi'}        difference

unique = list(dict.fromkeys(["b", "a", "b"]))   # ['b', 'a']: dedupe, keep order`,
          },
          {
            table: {
              head: ["Type", "Ordered", "Mutable", "Duplicates", "Use it for"],
              rows: [
                ["`list`", "Yes", "Yes", "Yes", "A sequence you add to: chat messages, search results"],
                ["`tuple`", "Yes", "No", "Yes", "Fixed records, multiple return values, dict keys"],
                ["`set`", "No", "Yes", "No", "Uniqueness and fast \"have I seen this?\" checks"],
                ["`dict`", "Insertion order", "Yes", "Unique keys", "Lookup by key, JSON-shaped data"],
              ],
            },
          },
        ],
      },
      {
        h: "Mutability and copies: the bug that bites JS developers too",
        blocks: [
          "Assignment never copies in Python, just like objects in JS. Two names can point to the same list, and changing it through one name changes what the other sees.",
          {
            lang: "python",
            code: `a = [1, 2, 3]
b = a            # same list
b.append(4)
print(a)         # [1, 2, 3, 4]

import copy
shallow = a.copy()            # or a[:] or list(a)
nested = [{"role": "user"}]
deep = copy.deepcopy(nested)  # copies the inner dicts too`,
          },
          "This matters in GenAI code when you reuse a base `messages` list for many requests. If you `append` to the shared list, every request sees every other request's messages. Build a new list per request: `messages = [system_msg, *history, user_msg]`.",
        ],
      },
    ],
    revise: [
      "`int` and `float` are separate; `/` gives a float, `//` floors. `None` is the only null. `==` never coerces types.",
      "Empty containers are falsy: `if items:` means \"not empty\".",
      "f-strings: `f\"{value:.2f}\"`, `f\"{x=}\"` for debugging, triple quotes for multi-line prompts.",
      "Slicing `seq[start:stop:step]`: stop excluded, negatives count from the end, `[-n:]` = last n, `[::-1]` = reversed. Slicing never raises.",
      "Dict access is `d[\"key\"]` (raises if missing) or `d.get(\"key\", default)`. Merge with `a | b`.",
      "Tuple = immutable, hashable (can be a dict key). Set = unique items, O(1) membership, `& | -` for set maths.",
      "`list.sort()` returns `None`; `sorted()` returns a new list.",
      "Assignment shares, it never copies. Use `.copy()` or `copy.deepcopy()`.",
    ],
    mistakes: [
      "Writing `message.role` for a dict instead of `message[\"role\"]`.",
      "`nums = nums.sort()`, which sets `nums` to `None`.",
      "Writing `(5)` and expecting a tuple; you need `(5,)`.",
      "Mutating a shared list of messages across requests, so chat histories leak between users.",
      "Using a list for membership checks in a hot loop (`if id in big_list`) instead of a set.",
    ],
    interview: [
      {
        q: "List vs tuple vs set: when do you use each?",
        a: "A list is an ordered, mutable sequence: use it when you append and iterate, like chat messages. A tuple is ordered but immutable, so it's hashable: use it for fixed records, multiple return values or dict keys. A set holds unique, unordered items with O(1) average membership checks: use it for de-duplication and \"have I seen this id\" checks.",
      },
      {
        q: "Why can a tuple be a dict key but a list can't?",
        a: "Dict keys must be hashable, and a hash must never change while the key is in the dict. A list can change, so it has no hash. A tuple is immutable, so it's hashable as long as everything inside it is hashable too.",
      },
      {
        q: "What does `a[::-1]` do, and is it a copy?",
        a: "It's a slice with step −1, so it returns a new reversed sequence. Every slice creates a new (shallow) copy; the original is unchanged. `list.reverse()` reverses in place instead.",
      },
      {
        q: "What is the difference between `==` and `is`?",
        a: "`==` compares values (it calls `__eq__`); `is` checks whether two names point to the same object in memory. Use `is` for `None`, `True` and `False`, and `==` for everything else.",
      },
    ],
    practice: [
      "Given `messages` (a list of dicts with `role` and `content`), print only the user messages, numbered from 1, using `enumerate`.",
      "Keep only the last 4 messages, but always keep the first (system) message: `[messages[0], *messages[1:][-4:]]`. Explain why this works.",
      "Count word frequency in a paragraph with `Counter` and print the top 5 words with an f-string aligned to 12 characters.",
      "Remove duplicate document ids from a list while keeping order.",
    ],
  },

  functions: {
    minutes: 60,
    level: "Beginner",
    intro:
      "Functions and comprehensions are where Python code starts to look different from JavaScript. Comprehensions replace most `map`/`filter` chains, and `*args`/`**kwargs` are how Python libraries (LangChain, FastAPI, the OpenAI SDK) accept flexible options. You need to read these fluently.",
    sections: [
      {
        h: "Defining functions",
        blocks: [
          "Functions use `def`, a colon and indentation. Indentation is the block syntax: 4 spaces, no braces. If a function has no `return`, it returns `None`.",
          {
            lang: "python",
            code: `def estimate_cost(tokens: int, price_per_million: float = 0.15) -> float:
    """Return the dollar cost for a number of tokens."""
    return tokens / 1_000_000 * price_per_million

estimate_cost(2000)                             # positional
estimate_cost(2000, price_per_million=2.5)      # keyword argument
estimate_cost(price_per_million=2.5, tokens=2000)  # any order with keywords`,
          },
          "The string right under `def` is a **docstring**. Editors show it on hover, and tools like LangChain read it as a tool's description for the LLM, so write clear ones.",
          "**Keyword arguments** are a big part of Python style. Calls like `client.chat.completions.create(model=..., messages=..., temperature=0)` are just keyword arguments. They make calls self-documenting, which is why Python APIs prefer them over positional options objects.",
        ],
      },
      {
        h: "Default arguments and the mutable-default trap",
        blocks: [
          "Default values are evaluated **once**, when the function is defined, not on each call. With a mutable default like `[]` or `{}`, every call shares the same object.",
          {
            lang: "python",
            code: `# BUG
def add_message(msg, history=[]):
    history.append(msg)
    return history

add_message("hi")      # ['hi']
add_message("there")   # ['hi', 'there']  <- the previous call leaked in

# FIX: use None as the sentinel
def add_message(msg, history=None):
    if history is None:
        history = []
    history.append(msg)
    return history`,
          },
          {
            warn: "This is one of the most asked Python interview questions. In a chat server this bug makes one user's messages appear in another user's conversation.",
          },
        ],
      },
      {
        h: "`*args` and `**kwargs`",
        blocks: [
          "`*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dict. They're the Python version of rest parameters (`...args`) and an options object.",
          {
            lang: "python",
            code: `def log(level, *args, **kwargs):
    print(level, args, kwargs)

log("INFO", "user", 42, request_id="abc", ms=120)
# INFO ('user', 42) {'request_id': 'abc', 'ms': 120}`,
          },
          "The same stars **unpack** when calling a function, like JS spread:",
          {
            lang: "python",
            code: `params = {"model": "gpt-4o-mini", "temperature": 0, "max_tokens": 300}
client.chat.completions.create(messages=messages, **params)

nums = [3, 7, 1]
print(max(*nums))   # same as max(3, 7, 1)`,
          },
          "A real pattern: a wrapper that adds behaviour and passes everything else through untouched. You'll write this for retries and logging around LLM calls.",
          {
            lang: "python",
            code: `import time

def timed_call(fn, *args, **kwargs):
    start = time.perf_counter()
    result = fn(*args, **kwargs)
    print(f"{fn.__name__} took {time.perf_counter() - start:.2f}s")
    return result

timed_call(estimate_cost, 5000, price_per_million=2.5)`,
          },
          {
            note: "You may see `def f(a, /, b, *, c)`. Parameters before `/` are positional-only; parameters after `*` are keyword-only. Libraries use keyword-only parameters so callers must write `temperature=0` instead of passing a bare `0`.",
          },
        ],
      },
      {
        h: "Comprehensions: the Pythonic map and filter",
        blocks: [
          "A list comprehension builds a list from a loop in one expression: `[expression for item in iterable if condition]`. It replaces most `.map()` and `.filter()` chains and is usually faster than a manual loop.",
          {
            lang: "python",
            code: `docs = [
    {"id": 1, "text": "RAG basics", "score": 0.91},
    {"id": 2, "text": "Old notes", "score": 0.42},
    {"id": 3, "text": "Vector DBs", "score": 0.78},
]

# JS: docs.filter(d => d.score > 0.5).map(d => d.text)
relevant = [d["text"] for d in docs if d["score"] > 0.5]
# ['RAG basics', 'Vector DBs']

# dict comprehension
score_by_id = {d["id"]: d["score"] for d in docs}

# set comprehension
sources = {d["text"].split()[0] for d in docs}

# conditional expression inside (the ternary is: a if cond else b)
labels = ["high" if d["score"] > 0.8 else "low" for d in docs]`,
          },
          "**Generator expressions** use parentheses and produce values lazily, one at a time, without building a list in memory. Use them when you only need to consume the values once, for example in `sum`, `any`, `max` or `\"\".join`.",
          {
            lang: "python",
            code: `total_tokens = sum(len(d["text"].split()) for d in docs)
has_low = any(d["score"] < 0.5 for d in docs)
context = "\\n\\n".join(d["text"] for d in docs)`,
          },
          {
            tip: "If a comprehension needs more than one `if` or a nested loop that's hard to read, write a normal `for` loop. Readability beats cleverness in interviews and in code review.",
          },
        ],
      },
      {
        h: "lambda, map, filter, sorted",
        blocks: [
          "`lambda` makes a small anonymous function, limited to a single expression: `lambda x: x * 2`. Its main use is as a `key` function for sorting, `max` and `min`.",
          {
            lang: "python",
            code: `top = sorted(docs, key=lambda d: d["score"], reverse=True)
best = max(docs, key=lambda d: d["score"])

# map/filter exist but return lazy iterators; wrap in list()
texts = list(map(lambda d: d["text"], docs))
# ...but the comprehension is preferred:
texts = [d["text"] for d in docs]

from operator import itemgetter
top = sorted(docs, key=itemgetter("score"), reverse=True)  # same as the lambda`,
          },
        ],
      },
      {
        h: "Functions are objects: closures and decorators",
        blocks: [
          "Like JS, functions are values: you can pass them, return them and close over variables. A **decorator** is a function that takes a function and returns a new one that wraps it. The `@name` syntax applies it. FastAPI routes (`@app.get`), LangChain tools (`@tool`) and retry logic all use decorators.",
          {
            lang: "python",
            code: `import functools, time

def retry(times: int = 3, delay: float = 1.0):
    def decorator(fn):
        @functools.wraps(fn)             # keeps fn's name and docstring
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == times:
                        raise
                    print(f"attempt {attempt} failed: {e}; retrying")
                    time.sleep(delay * attempt)
        return wrapper
    return decorator

@retry(times=3)
def call_llm(prompt: str) -> str:
    ...  # an API call that can fail`,
            caption: "A decorator factory with retries and linear backoff. `@retry(times=3)` means `call_llm = retry(times=3)(call_llm)`.",
          },
          "Closures capture variables from the enclosing scope. To **reassign** (not just read) an enclosing variable inside a nested function, declare it `nonlocal`, otherwise Python treats it as a new local variable.",
          {
            lang: "python",
            code: `def make_counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc`,
          },
        ],
      },
    ],
    revise: [
      "`def name(a: int, b: float = 1.0) -> float:`; no `return` means it returns `None`.",
      "Defaults are evaluated once. Never use `[]`/`{}` as a default; use `None` and create inside.",
      "`*args` → tuple of extra positional args; `**kwargs` → dict of extra keyword args. The same stars unpack in calls.",
      "List comprehension: `[expr for x in xs if cond]`; also dict `{k: v for ...}` and set `{...}` versions.",
      "Generator expression `(expr for x in xs)` is lazy; use it inside `sum`, `any`, `join`.",
      "`sorted(xs, key=lambda x: ..., reverse=True)`; `max(xs, key=...)`.",
      "Decorator = function that wraps a function; `@functools.wraps` keeps metadata. Used by FastAPI, LangChain tools and retry logic.",
    ],
    mistakes: [
      "Mutable default arguments (`def f(x=[])`).",
      "Forgetting `list()` around `map`/`filter` and printing `<map object>`.",
      "Writing multi-line logic in a `lambda`; it only allows one expression, so use `def`.",
      "Decorators without `functools.wraps`, which breaks FastAPI and LangChain because they read the function's name, signature and docstring.",
    ],
    interview: [
      {
        q: "What goes wrong with a mutable default argument?",
        a: "Default values are created once, when the `def` runs, and shared across calls. A default list or dict keeps changes from earlier calls, so state leaks between calls. Use `None` as the default and create a fresh object inside the function.",
      },
      {
        q: "What are `*args` and `**kwargs`?",
        a: "In a definition, `*args` gathers extra positional arguments into a tuple and `**kwargs` gathers extra keyword arguments into a dict. In a call, `*` unpacks an iterable into positional arguments and `**` unpacks a dict into keyword arguments. They're used for wrappers that forward arguments and for flexible APIs.",
      },
      {
        q: "List comprehension vs generator expression?",
        a: "A list comprehension builds the whole list in memory immediately. A generator expression yields items lazily, one at a time, so it uses constant memory and can only be consumed once. Use a generator for large data or when feeding straight into `sum`, `any` or `join`.",
      },
      {
        q: "What is a decorator? Give a real use.",
        a: "A decorator is a callable that takes a function and returns a replacement, usually a wrapper that adds behaviour before or after the call. Real uses: FastAPI's `@app.get` registers routes, `@retry` retries flaky LLM calls, `@lru_cache` memoises, and LangChain's `@tool` turns a function into an LLM tool.",
      },
    ],
    practice: [
      "Write `format_context(chunks, max_chars)` that joins chunk texts with blank lines and stops before exceeding `max_chars`. Use a generator somewhere.",
      "Write a `@timer` decorator that prints how long a function took, and use `functools.wraps`.",
      "Convert this JS to one Python line: `users.filter(u => u.active).map(u => u.email.toLowerCase())`.",
      "Write `build_request(model, **options)` that merges `options` over defaults `{\"temperature\": 0.7, \"max_tokens\": 256}` and returns the dict.",
    ],
  },

  classes: {
    minutes: 70,
    level: "Beginner",
    intro:
      "GenAI code in Python is full of classes: SDK clients, Pydantic models, LangChain components, your own services. This lesson covers how Python classes differ from JS classes, why dataclasses save you boilerplate, how type hints work (they power FastAPI and Pydantic), and how imports and packages are organised.",
    sections: [
      {
        h: "Classes: the Python way",
        blocks: [
          "The constructor is `__init__`, and every method takes `self` as its first parameter explicitly (JS's `this` is implicit). Attributes are created by assigning to `self`.",
          {
            lang: "python",
            code: `class ChatSession:
    max_turns = 20                      # class attribute: shared by all instances

    def __init__(self, user_id: str, system_prompt: str):
        self.user_id = user_id          # instance attributes
        self.messages = [{"role": "system", "content": system_prompt}]

    def add(self, role: str, content: str) -> None:
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > self.max_turns:
            self.messages = [self.messages[0], *self.messages[-(self.max_turns - 1):]]

    def __len__(self) -> int:           # makes len(session) work
        return len(self.messages)

    def __repr__(self) -> str:          # what print/debugger shows
        return f"ChatSession(user_id={self.user_id!r}, turns={len(self)})"

s = ChatSession("u1", "You are helpful.")   # no 'new' keyword
s.add("user", "hi")
print(s, len(s))`,
          },
          "Methods with double underscores on both sides are **dunder methods**. They hook your class into Python syntax: `__len__` for `len()`, `__repr__` for printing, `__eq__` for `==`, `__iter__` for `for` loops, `__enter__`/`__exit__` for `with` blocks.",
          {
            note: "Python has no truly private members. A single leading underscore (`self._client`) means \"internal, don't touch\" by convention. There is no `private` keyword.",
          },
        ],
      },
      {
        h: "Inheritance, and the alternatives",
        blocks: [
          "Inheritance works as in JS, using `super()`. In GenAI code you'll mostly use it to plug into a framework (subclassing a LangChain base class, or Pydantic's `BaseModel`).",
          {
            lang: "python",
            code: `from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str: ...

class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model

    def complete(self, prompt: str) -> str:
        return f"[{self.model}] reply to: {prompt}"

class FakeProvider(LLMProvider):          # great for tests: no API cost
    def complete(self, prompt: str) -> str:
        return "fake reply"`,
            caption: "An abstract base class defines an interface. Day 4's adapter pattern builds exactly this.",
          },
          "`@staticmethod` is a method that needs neither the instance nor the class. `@classmethod` receives the class as `cls` and is commonly used for alternative constructors such as `Config.from_env()`. `@property` makes a method readable like an attribute.",
          {
            lang: "python",
            code: `class Usage:
    def __init__(self, prompt_tokens: int, completion_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

    @property
    def total(self) -> int:              # usage.total, no parentheses
        return self.prompt_tokens + self.completion_tokens

    @classmethod
    def from_api(cls, data: dict) -> "Usage":
        return cls(data["prompt_tokens"], data["completion_tokens"])`,
          },
        ],
      },
      {
        h: "Dataclasses: classes without boilerplate",
        blocks: [
          "Most classes you write just hold data. `@dataclass` generates `__init__`, `__repr__` and `__eq__` from type-annotated fields.",
          {
            lang: "python",
            code: `from dataclasses import dataclass, field, asdict

@dataclass
class Chunk:
    doc_id: str
    text: str
    page: int = 0
    metadata: dict = field(default_factory=dict)   # safe mutable default

c = Chunk("policy.pdf", "Refunds within 30 days", page=4)
print(c)          # Chunk(doc_id='policy.pdf', text='Refunds within 30 days', page=4, metadata={})
asdict(c)         # plain dict, e.g. for JSON

@dataclass(frozen=True)       # immutable and hashable
class ModelPrice:
    name: str
    input_per_m: float
    output_per_m: float`,
          },
          {
            table: {
              head: ["Use", "When"],
              rows: [
                ["`@dataclass`", "Internal data containers you create yourself. Fast, standard library, no validation."],
                ["Pydantic `BaseModel`", "Data crossing a boundary: API requests, LLM JSON output, config. Validates and converts types (Day 2)."],
                ["`TypedDict`", "Type hints for plain dicts you don't want to convert, like API message dicts."],
              ],
            },
          },
        ],
      },
      {
        h: "Type hints",
        blocks: [
          "Type hints annotate what a variable, parameter or return value should be. Python itself **doesn't enforce them at runtime**, but editors, type checkers (mypy, pyright) and libraries use them. FastAPI and Pydantic read them to validate requests, so in GenAI backends they're effectively required.",
          {
            lang: "python",
            code: `from typing import Literal, Optional, Any
from collections.abc import Callable, Iterator

def top_k(scores: list[float], k: int = 3) -> list[int]: ...
config: dict[str, Any] = {}
pair: tuple[str, int] = ("a", 1)
maybe_name: str | None = None            # Python 3.10+; same as Optional[str]
Role = Literal["system", "user", "assistant"]   # only these strings

def apply(fn: Callable[[str], str], text: str) -> str:
    return fn(text)

def stream_tokens() -> Iterator[str]:
    yield "Hel"
    yield "lo"`,
          },
          {
            table: {
              head: ["TypeScript", "Python"],
              rows: [
                ["`string[]`", "`list[str]`"],
                ["`Record<string, number>`", "`dict[str, float]`"],
                ["`string | null`", "`str | None`"],
                ["`\"a\" | \"b\"`", "`Literal[\"a\", \"b\"]`"],
                ["`any`", "`Any`"],
                ["`(x: string) => number`", "`Callable[[str], int]`"],
                ["`interface`", "`Protocol`, `TypedDict`, dataclass or Pydantic model"],
              ],
            },
          },
          {
            tip: "Turn on type checking in your editor (VS Code: Pylance, set type checking mode to \"basic\"). It catches the same class of bugs TypeScript catches for you today.",
          },
        ],
      },
      {
        h: "Modules, packages and imports",
        blocks: [
          "Every `.py` file is a **module**. A folder of modules is a **package** (traditionally with an `__init__.py` file, which can be empty). Imports are by module path, not file path.",
          {
            code: `docchat/
  app/
    __init__.py
    main.py            # FastAPI app
    config.py
    rag/
      __init__.py
      chunking.py
      retriever.py
  tests/
  pyproject.toml`,
            lang: "text",
          },
          {
            lang: "python",
            code: `# app/main.py
import json                                   # standard library
from pathlib import Path
from fastapi import FastAPI                   # third-party
from app.rag.chunking import chunk_text       # your code (absolute import)
from .config import settings                  # relative import inside the package
import numpy as np                            # alias`,
          },
          "Order imports as: standard library, then third-party, then your own code, separated by blank lines. Tools like `ruff` sort them automatically.",
          "Code at the top level of a module runs when it's first imported. To have code that runs only when the file is executed directly (not imported), use the main guard:",
          {
            lang: "python",
            code: `def main():
    print("running as a script")

if __name__ == "__main__":
    main()`,
          },
          {
            warn: "Run package code from the project root as a module: `python -m app.main`, not `python app/main.py`. Otherwise absolute imports like `from app.rag...` fail with `ModuleNotFoundError`.",
          },
          {
            note: "Never name your file after a library you import. A file called `openai.py` or `json.py` shadows the real package and causes confusing import errors.",
          },
        ],
      },
    ],
    revise: [
      "`__init__(self, ...)` is the constructor; `self` is explicit in every method; no `new` keyword.",
      "Dunder methods (`__repr__`, `__len__`, `__eq__`) plug classes into Python syntax.",
      "`_name` means internal by convention; there is no real private.",
      "`@property` = computed attribute; `@classmethod` = alternative constructors; `ABC` + `@abstractmethod` = interfaces.",
      "`@dataclass` generates init/repr/eq; use `field(default_factory=list)` for mutable defaults; `frozen=True` for immutable.",
      "Dataclass for internal data; Pydantic for data crossing boundaries (it validates).",
      "Type hints aren't enforced by Python, but FastAPI and Pydantic use them. `str | None`, `list[str]`, `Literal[...]`.",
      "File = module, folder = package. Run with `python -m package.module`. Use the `if __name__ == \"__main__\":` guard.",
    ],
    mistakes: [
      "Forgetting `self` in a method definition, then getting \"takes 0 positional arguments but 1 was given\".",
      "Using a mutable default in a dataclass (`tags: list = []`); Python raises a ValueError. Use `field(default_factory=list)`.",
      "Expecting type hints to reject wrong types at runtime. They don't, unless a library like Pydantic checks them.",
      "Circular imports (a imports b, b imports a). Move shared code into a third module.",
    ],
    interview: [
      {
        q: "What is `self` in Python?",
        a: "`self` is the instance a method was called on. Python passes it automatically as the first argument when you call `obj.method()`, but you must declare it in the definition. It's the explicit version of JavaScript's `this`, and it doesn't change based on how the function is called.",
      },
      {
        q: "Dataclass vs Pydantic model?",
        a: "Both describe structured data with type hints. A dataclass is standard library and just generates boilerplate; it doesn't validate. Pydantic validates and converts input at runtime, gives clear errors, and serialises to and from JSON, so it's used at boundaries: API requests, LLM outputs, settings.",
      },
      {
        q: "Are type hints enforced in Python?",
        a: "No. The interpreter ignores them at runtime. They're used by editors and static type checkers like mypy and pyright, and by libraries such as FastAPI and Pydantic, which read them to validate and convert data.",
      },
      {
        q: "What does `if __name__ == \"__main__\":` do?",
        a: "When a file is run directly, Python sets `__name__` to `\"__main__\"`; when it's imported, `__name__` is the module's name. The guard lets a file work both as an importable module and as a script without running script code on import.",
      },
    ],
    practice: [
      "Write a `@dataclass` `Document` with `id`, `title`, `chunks: list[str]` (safe default) and a `@property` `word_count`.",
      "Create an abstract `Embedder` with `embed(texts: list[str]) -> list[list[float]]`, plus a `FakeEmbedder` that returns vectors of zeros.",
      "Organise a mini package `mytools/` with `strings.py` and `numbers.py`, and import from both in `main.py`. Run it with `python -m`.",
    ],
  },

  envs: {
    minutes: 45,
    level: "Beginner",
    intro:
      "In Node, `package.json` and `node_modules` sit in each project automatically. Python installs packages globally unless you create a virtual environment, which is why \"it works on my machine\" problems are so common. Set this up correctly on Day 1 and you'll avoid hours of debugging.",
    sections: [
      {
        h: "Why virtual environments exist",
        blocks: [
          "A **virtual environment** (venv) is a folder containing its own Python interpreter link and its own installed packages. Each project gets one, so project A can use `langchain 0.2` and project B `langchain 0.3` without conflict. It's the equivalent of a per-project `node_modules`.",
          {
            table: {
              head: ["Node", "Python"],
              rows: [
                ["`nvm`", "`uv python` or `pyenv` (manage Python versions)"],
                ["`node_modules/`", "`.venv/` (virtual environment)"],
                ["`npm install x`", "`uv add x` or `pip install x`"],
                ["`package.json`", "`pyproject.toml` (or `requirements.txt`)"],
                ["`package-lock.json`", "`uv.lock` (or a pinned `requirements.txt`)"],
                ["`npx tool`", "`uvx tool`"],
                ["`npm run dev`", "`uv run python -m app.main` / `uv run fastapi dev`"],
              ],
            },
          },
        ],
      },
      {
        h: "The modern way: uv",
        blocks: [
          "`uv` is a fast Python package and project manager (written in Rust). It installs Python versions, creates the venv, resolves dependencies and writes a lockfile. It has become the default choice for new projects, and it feels closest to npm.",
          {
            lang: "bash",
            code: `# install uv (macOS / Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

uv init docchat && cd docchat      # creates pyproject.toml, .python-version, main.py
uv python pin 3.12                 # choose the Python version
uv add fastapi uvicorn openai python-dotenv    # adds deps + creates .venv + uv.lock
uv add --dev pytest ruff           # dev dependencies
uv run python main.py              # runs inside the venv, no activation needed
uv sync                            # teammate clones repo: install exactly what's locked`,
          },
          "What `pyproject.toml` looks like after that:",
          {
            lang: "toml",
            code: `[project]
name = "docchat"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "openai>=1.50",
    "python-dotenv>=1.0",
    "uvicorn>=0.30",
]

[dependency-groups]
dev = ["pytest>=8", "ruff>=0.6"]`,
          },
        ],
      },
      {
        h: "The classic way: venv + pip",
        blocks: [
          "Many tutorials, company codebases and Docker images still use the built-in `venv` module with `pip`. You need to know both.",
          {
            lang: "bash",
            code: `python3 -m venv .venv               # create
source .venv/bin/activate           # activate (macOS/Linux)
# .venv\\Scripts\\activate            # activate (Windows)
which python                        # should point inside .venv

pip install fastapi openai python-dotenv
pip freeze > requirements.txt       # pin exact versions
pip install -r requirements.txt     # reproduce elsewhere
deactivate`,
          },
          {
            warn: "Always add `.venv/` to `.gitignore`. Never commit it, just like `node_modules`. And never `sudo pip install`; it breaks your system Python.",
          },
          "In VS Code, choose the interpreter inside `.venv` (Command Palette → \"Python: Select Interpreter\"). If imports show red squiggles even though the code runs, the editor is using the wrong interpreter.",
        ],
      },
      {
        h: "Secrets with .env and python-dotenv",
        blocks: [
          "API keys must never be hard-coded or committed. Put them in a `.env` file, load it at startup, and read them from environment variables, exactly like `dotenv` in Node.",
          {
            lang: "bash",
            code: `# .env  (in .gitignore!)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
DATABASE_URL=postgresql://localhost/docchat`,
          },
          {
            lang: "python",
            code: `import os
from dotenv import load_dotenv

load_dotenv()                                   # reads .env into os.environ
api_key = os.environ["OPENAI_API_KEY"]         # fails loudly if missing: good
debug = os.getenv("DEBUG", "false").lower() == "true"`,
          },
          "Commit a `.env.example` with the variable names and fake values so teammates know what to set. On Day 2 you'll upgrade this to typed settings with `pydantic-settings`, which validates every variable at startup.",
          {
            tip: "The OpenAI, Anthropic and Google SDKs read their key from the standard environment variable automatically (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`), so after `load_dotenv()` you can create the client with no arguments.",
          },
        ],
      },
      {
        h: "Jupyter notebooks for experiments",
        blocks: [
          "Notebooks let you run code cell by cell and see the output inline. They're ideal for trying prompts, looking at embeddings and comparing models. Keep production code in `.py` files, though.",
          {
            lang: "bash",
            code: `uv add --dev ipykernel
# In VS Code: open a .ipynb file and choose the .venv kernel.`,
          },
        ],
      },
    ],
    revise: [
      "One virtual environment per project (`.venv`), never committed. Equivalent to `node_modules`.",
      "uv: `uv init`, `uv add pkg`, `uv run ...`, `uv sync`; `pyproject.toml` + `uv.lock`.",
      "Classic: `python -m venv .venv`, `source .venv/bin/activate`, `pip install -r requirements.txt`, `pip freeze`.",
      "Secrets in `.env` (git-ignored), loaded with `load_dotenv()`, read with `os.environ[...]`; commit `.env.example`.",
      "Point your editor at the `.venv` interpreter.",
    ],
    mistakes: [
      "Installing packages globally, then getting version conflicts between projects.",
      "Committing `.env` or `.venv/` to Git.",
      "Running `pip install` in one terminal while the editor uses a different interpreter.",
      "Using `os.getenv(\"OPENAI_API_KEY\")` with no check, then getting a confusing auth error much later. Fail fast at startup.",
    ],
    interview: [
      {
        q: "Why do we use virtual environments in Python?",
        a: "Python installs packages into the interpreter's site-packages by default, which is shared. A virtual environment gives each project its own isolated packages and interpreter link, so different projects can use different versions and the setup is reproducible from a lockfile.",
      },
      {
        q: "How do you manage secrets in a Python service?",
        a: "Locally, a git-ignored `.env` file loaded with python-dotenv or pydantic-settings. In production, environment variables injected by the platform from a secret store such as AWS Secrets Manager or SSM Parameter Store, never baked into the image or committed. Validate required variables at startup so the app fails fast.",
      },
    ],
    practice: [
      "Install uv, create a project, pin Python 3.12, and add `openai` and `python-dotenv`.",
      "Create `.env`, `.env.example` and `.gitignore`, and write `config.py` that fails with a clear message if `OPENAI_API_KEY` is missing.",
      "Delete `.venv` and recreate it with `uv sync`. Notice that nothing changes, which is the point of a lockfile.",
    ],
  },

  errors: {
    minutes: 50,
    level: "Beginner",
    intro:
      "LLM APIs time out, return malformed JSON and hit rate limits. Files go missing. Robust GenAI code is mostly good error handling. This lesson covers exceptions, reading and writing files, JSON, and reading a Python traceback quickly.",
    sections: [
      {
        h: "try / except / else / finally",
        blocks: [
          "Python's `try/except` is JS's `try/catch`, but you catch **specific exception types**, which is how you handle different failures differently.",
          {
            lang: "python",
            code: `import json

def parse_llm_json(raw: str) -> dict | None:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Model returned invalid JSON at char {e.pos}: {e.msg}")
        return None
    else:
        # runs only if no exception happened
        return data
    finally:
        # always runs: cleanup, metrics
        print("parse attempted")`,
          },
          {
            table: {
              head: ["Exception", "Typical cause"],
              rows: [
                ["`KeyError`", "`d[\"missing\"]` on a dict"],
                ["`IndexError`", "`items[99]` past the end of a list"],
                ["`TypeError`", "Wrong type, e.g. `\"a\" + 1`, or a wrong number of arguments"],
                ["`ValueError`", "Right type, bad value, e.g. `int(\"abc\")`"],
                ["`AttributeError`", "`None.strip()`, often a function that returned `None`"],
                ["`FileNotFoundError`", "Wrong path or wrong working directory"],
                ["`json.JSONDecodeError`", "Invalid JSON (a subclass of `ValueError`)"],
                ["`ModuleNotFoundError`", "Package not installed in this venv, or a bad import path"],
              ],
            },
          },
          {
            warn: "Avoid a bare `except:` or `except Exception: pass`. It hides real bugs, including typos. Catch what you expect, log it, and let everything else crash loudly during development.",
          },
        ],
      },
      {
        h: "Raising and custom exceptions",
        blocks: [
          "Use `raise` (JS's `throw`). Define your own exception classes so callers can catch your app's errors specifically. Use `raise ... from e` to keep the original cause in the traceback.",
          {
            lang: "python",
            code: `class LLMError(Exception):
    """Base error for our LLM layer."""

class LLMTimeout(LLMError): ...
class InvalidModelOutput(LLMError): ...

def get_answer(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise InvalidModelOutput(f"not JSON: {raw[:80]!r}") from e

try:
    get_answer("Sure! Here is the JSON: {...")
except InvalidModelOutput as e:
    print("retry with a stricter prompt:", e)`,
          },
          "The base class lets FastAPI code later map every `LLMError` to a clean HTTP 502 response in one place, instead of repeating try/except in every route.",
        ],
      },
      {
        h: "Files with pathlib and with",
        blocks: [
          "`with` is a **context manager**: it guarantees cleanup (closing the file) even if an exception happens. Use `pathlib.Path` for paths instead of string concatenation; it works on every OS.",
          {
            lang: "python",
            code: `from pathlib import Path

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
notes = data_dir / "notes.txt"          # the / operator joins paths

with open(notes, "w", encoding="utf-8") as f:
    f.write("first line\\n")

with open(notes, encoding="utf-8") as f:     # "r" is the default
    for line in f:                           # streams line by line
        print(line.rstrip())

text = notes.read_text(encoding="utf-8")     # shortcut for small files
for pdf in Path("docs").glob("**/*.pdf"):    # every PDF, recursively
    print(pdf.name, pdf.stat().st_size)`,
          },
          {
            tip: "Always pass `encoding=\"utf-8\"`. The default depends on the operating system, and Hindi or other non-ASCII text breaks on Windows without it.",
          },
          "Relative paths are resolved against the **current working directory**, not the script's folder. For files that ship next to your code, build the path from the file's location: `Path(__file__).parent / \"prompts\" / \"system.txt\"`.",
        ],
      },
      {
        h: "JSON",
        blocks: [
          "The `json` module converts between JSON text and Python objects: objects become dicts, arrays become lists, `null` becomes `None`, `true` becomes `True`.",
          {
            lang: "python",
            code: `import json

payload = {"model": "gpt-4o-mini", "stream": False, "stop": None}
text = json.dumps(payload)                     # dict -> str
pretty = json.dumps(payload, indent=2, ensure_ascii=False)  # keep non-ASCII readable
back = json.loads(text)                        # str -> dict

with open("expenses.json", "w", encoding="utf-8") as f:
    json.dump([{"amount": 250, "note": "chai"}], f, indent=2)

with open("expenses.json", encoding="utf-8") as f:
    expenses = json.load(f)`,
          },
          "Memory aid: the functions ending in **s** work with **s**trings (`dumps`, `loads`); the others work with files (`dump`, `load`). `json.dumps` can't serialise datetimes, sets or dataclasses by default. Convert them first (`asdict`, `.isoformat()`), or use Pydantic's `.model_dump_json()`.",
          "**JSONL** (one JSON object per line) is the standard format for eval datasets and fine-tuning data. Read it line by line:",
          {
            lang: "python",
            code: `with open("evals.jsonl", encoding="utf-8") as f:
    rows = [json.loads(line) for line in f if line.strip()]`,
          },
        ],
      },
      {
        h: "Reading a traceback",
        blocks: [
          "A Python traceback reads **top to bottom, oldest call first**, and the actual error is on the **last line**. Start at the bottom, then move up to the last frame that's in *your* code (not a library file).",
          {
            lang: "text",
            code: `Traceback (most recent call last):
  File "/app/main.py", line 14, in <module>
    total = summarise(expenses)
  File "/app/main.py", line 8, in summarise
    return sum(e["amount"] for e in items)
  File "/app/main.py", line 8, in <genexpr>
    return sum(e["amount"] for e in items)
KeyError: 'amount'`,
          },
          {
            list: [
              "**Last line:** `KeyError: 'amount'`, so some dict has no `amount` key.",
              "**Last frame in your code:** `main.py`, line 8, inside `summarise`.",
              "**Hypothesis:** one expense was saved with a different key. Print the offending item or use `e.get(\"amount\", 0)`.",
            ],
            ordered: true,
          },
          {
            tip: "Drop `breakpoint()` on any line to open the debugger there (`n` next, `s` step into, `p var` print, `c` continue). VS Code's debugger works on Python files too.",
          },
        ],
      },
    ],
    revise: [
      "Catch specific exceptions: `except json.JSONDecodeError as e:`. `else` runs when nothing failed, `finally` always runs.",
      "Never write a bare `except:` or `except Exception: pass`.",
      "Custom exceptions: `class LLMError(Exception)` with subclasses; `raise X(...) from e` keeps the cause.",
      "`with open(path, encoding=\"utf-8\") as f:` closes the file automatically. Use `pathlib.Path` and the `/` operator.",
      "`json.loads/dumps` for strings, `json.load/dump` for files. JSONL = one JSON object per line.",
      "Tracebacks: read the last line first, then find the last frame in your own code.",
    ],
    mistakes: [
      "Swallowing exceptions silently, so bugs appear far from their cause.",
      "Forgetting `encoding=\"utf-8\"` and corrupting non-English text.",
      "Relative paths that only work when you run the script from one particular folder.",
      "Trying to `json.dumps` a dataclass or datetime and getting `TypeError: Object of type ... is not JSON serializable`.",
    ],
    interview: [
      {
        q: "How would you handle an LLM returning invalid JSON?",
        a: "First prevent it: use the provider's structured output or JSON mode and give a schema. Then parse defensively: try `json.loads` inside a try/except for `JSONDecodeError`, validate the result with Pydantic, and on failure retry once with the validation error fed back to the model. Log the raw output, and after a limited number of retries return a clear error or fallback instead of crashing.",
      },
      {
        q: "What is a context manager?",
        a: "An object used with `with` that defines setup in `__enter__` and cleanup in `__exit__`. Cleanup runs even if the block raises. Files, locks, database sessions and HTTP clients use it to guarantee resources are released.",
      },
      {
        q: "Difference between `raise` and `raise ... from e`?",
        a: "Both raise an exception. `raise NewError(...) from e` explicitly chains the original exception as the cause, so the traceback shows both. It's the right way to translate a low-level error (JSONDecodeError) into a domain error (InvalidModelOutput) without losing debugging information.",
      },
    ],
    practice: [
      "Write `load_jsonl(path)` that skips blank lines and reports the line number of any invalid line instead of crashing.",
      "Create `LLMError`, `LLMTimeout` and `InvalidModelOutput`. Write a function that raises each depending on its input, and catch them in different `except` blocks.",
      "Deliberately cause a `KeyError`, `TypeError` and `AttributeError`, and practise reading each traceback bottom-up.",
    ],
  },

  "port-utils": {
    minutes: 90,
    level: "Beginner",
    intro:
      "The fastest way to learn a second language is to translate code you already understand. You'll port three small utilities you'd write in any MERN project, then make each one idiomatic Python rather than \"JavaScript with Python syntax\".",
    sections: [
      {
        h: "Setup",
        blocks: [
          {
            lang: "bash",
            code: `uv init py-utils && cd py-utils
uv add --dev pytest
mkdir utils tests && touch utils/__init__.py`,
          },
          "Each utility goes in `utils/`, with a test in `tests/`. Writing tests from the start is a habit interviewers look for, and pytest is much lighter than Jest: any function named `test_*` with a plain `assert` is a test.",
        ],
      },
      {
        h: "Utility 1: slugify",
        blocks: [
          "In JS you'd probably chain `.toLowerCase().trim().replace(/[^\\w\\s-]/g, \"\")...`. In Python, use the `re` module.",
          {
            lang: "python",
            code: `# utils/text.py
import re
import unicodedata

def slugify(text: str, max_len: int = 60) -> str:
    """'Hello, World!  RAG 101' -> 'hello-world-rag-101'"""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\\w\\s-]", "", text.lower()).strip()
    text = re.sub(r"[\\s_-]+", "-", text)
    return text[:max_len].rstrip("-")`,
          },
          {
            lang: "python",
            code: `# tests/test_text.py
from utils.text import slugify

def test_slugify_basic():
    assert slugify("Hello, World!  RAG 101") == "hello-world-rag-101"

def test_slugify_accents():
    assert slugify("Café Déjà Vu") == "cafe-deja-vu"`,
          },
          "Run `uv run pytest -q`. The `r\"...\"` prefix makes a raw string, so backslashes in regexes don't need doubling.",
        ],
      },
      {
        h: "Utility 2: groupBy and chunk",
        blocks: [
          "Lodash-style helpers. Python's standard library already covers most of them, which is itself a lesson: check `itertools`, `collections` and `functools` before writing your own.",
          {
            lang: "python",
            code: `# utils/collections.py
from collections import defaultdict
from collections.abc import Callable, Iterable
from itertools import islice
from typing import TypeVar

T = TypeVar("T")
K = TypeVar("K")

def group_by(items: Iterable[T], key: Callable[[T], K]) -> dict[K, list[T]]:
    groups: dict[K, list[T]] = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    return dict(groups)

def chunked(items: Iterable[T], size: int) -> Iterable[list[T]]:
    """Yield lists of up to 'size' items (for batching API calls)."""
    it = iter(items)
    while batch := list(islice(it, size)):
        yield batch`,
          },
          "`chunked` is a **generator** (it uses `yield`), so it works on huge inputs without loading everything. You'll use exactly this to send texts to an embeddings API in batches of 100. The `:=` \"walrus\" operator assigns and tests in one step. (Python 3.12 also ships `itertools.batched`.)",
          {
            lang: "python",
            code: `def test_group_by():
    people = [{"n": "a", "city": "Pune"}, {"n": "b", "city": "Delhi"}, {"n": "c", "city": "Pune"}]
    g = group_by(people, key=lambda p: p["city"])
    assert [p["n"] for p in g["Pune"]] == ["a", "c"]

def test_chunked():
    assert list(chunked(range(5), 2)) == [[0, 1], [2, 3], [4]]`,
          },
        ],
      },
      {
        h: "Utility 3: debounce-style retry with backoff",
        blocks: [
          "A retry helper with exponential backoff and jitter, the kind you'd use around `fetch` in Node. You'll wrap every LLM call with this idea (Day 4 uses the `tenacity` library, but write it yourself once so you understand it).",
          {
            lang: "python",
            code: `# utils/retry.py
import random
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

def with_retry(fn: Callable[[], T], attempts: int = 4, base: float = 0.5,
               retry_on: tuple[type[Exception], ...] = (Exception,)) -> T:
    for attempt in range(attempts):
        try:
            return fn()
        except retry_on:
            if attempt == attempts - 1:
                raise
            sleep = base * 2 ** attempt + random.uniform(0, base)   # 0.5, 1, 2 ... + jitter
            time.sleep(sleep)
    raise RuntimeError("unreachable")`,
          },
          {
            lang: "python",
            code: `def test_retry_eventually_succeeds(monkeypatch):
    monkeypatch.setattr("time.sleep", lambda s: None)   # don't actually wait in tests
    calls = {"n": 0}
    def flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise ConnectionError("boom")
        return "ok"
    assert with_retry(flaky, retry_on=(ConnectionError,)) == "ok"
    assert calls["n"] == 3`,
          },
        ],
      },
      {
        h: "Make it idiomatic",
        blocks: [
          "Before you finish, run the formatter and linter and read what they say. It's the quickest way to learn Python conventions.",
          {
            lang: "bash",
            code: `uv add --dev ruff
uv run ruff format .
uv run ruff check . --fix`,
          },
          {
            list: [
              "Names are `snake_case`; classes are `PascalCase`; constants are `UPPER_CASE`.",
              "Prefer comprehensions and built-ins over manual index loops.",
              "Every public function has type hints and a one-line docstring.",
              "Push to GitHub with a short README: what each utility does and how to run the tests.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Check `itertools`, `collections`, `functools` and `re` before writing your own helpers.",
      "pytest: files `test_*.py`, functions `test_*`, plain `assert`; run with `uv run pytest -q`.",
      "Generators (`yield`) process large inputs lazily, e.g. batching API calls.",
      "Retry with exponential backoff + jitter; only retry errors that are worth retrying.",
      "`ruff format` + `ruff check` teach you the conventions.",
    ],
    practice: [
      "Add `deep_get(d, \"a.b.c\", default=None)` (like lodash `get`) with tests.",
      "Add `truncate_words(text, n)` that cuts at a word boundary and adds \"…\".",
    ],
  },

  "cli-tracker": {
    minutes: 120,
    level: "Beginner",
    intro:
      "Build a small but complete command-line expense tracker. It combines everything from today: dataclasses, type hints, JSON files, error handling, comprehensions and a proper `main`. It's a small project, but written properly it shows a reviewer you can structure Python code.",
    sections: [
      {
        h: "What you're building",
        blocks: [
          {
            lang: "bash",
            code: `uv run python -m tracker add 250 food "chai and samosa"
uv run python -m tracker add 1200 travel "cab to airport"
uv run python -m tracker list
uv run python -m tracker summary --month 2026-09
uv run python -m tracker delete 2`,
          },
          {
            list: [
              "Expenses are stored in `expenses.json` next to the package.",
              "Each expense has an id, amount (rupees), category, note and date.",
              "`summary` shows totals by category, sorted by amount.",
              "Bad input (a negative amount, an unknown id) prints a friendly error and exits with code 1.",
            ],
          },
        ],
      },
      {
        h: "Model and storage",
        blocks: [
          {
            lang: "python",
            code: `# tracker/store.py
from __future__ import annotations
import json
from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path

DB = Path(__file__).parent / "expenses.json"

@dataclass
class Expense:
    id: int
    amount: float
    category: str
    note: str
    spent_on: str          # ISO date "2026-09-24"

def load() -> list[Expense]:
    if not DB.exists():
        return []
    try:
        raw = json.loads(DB.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise SystemExit(f"expenses.json is corrupted: {e}")
    return [Expense(**row) for row in raw]

def save(expenses: list[Expense]) -> None:
    tmp = DB.with_suffix(".tmp")
    tmp.write_text(json.dumps([asdict(e) for e in expenses], indent=2), encoding="utf-8")
    tmp.replace(DB)        # atomic swap: a crash never leaves a half-written file

def add(amount: float, category: str, note: str) -> Expense:
    if amount <= 0:
        raise ValueError("amount must be positive")
    expenses = load()
    new = Expense(
        id=max((e.id for e in expenses), default=0) + 1,
        amount=amount, category=category.lower(), note=note,
        spent_on=date.today().isoformat(),
    )
    save([*expenses, new])
    return new`,
            caption: "`Expense(**row)` unpacks a dict into keyword arguments. Writing to a temporary file and swapping it in is a real-world pattern for safe writes.",
          },
        ],
      },
      {
        h: "Summary logic",
        blocks: [
          {
            lang: "python",
            code: `# tracker/report.py
from collections import defaultdict
from .store import Expense

def summary(expenses: list[Expense], month: str | None = None) -> list[tuple[str, float]]:
    rows = [e for e in expenses if month is None or e.spent_on.startswith(month)]
    totals: dict[str, float] = defaultdict(float)
    for e in rows:
        totals[e.category] += e.amount
    return sorted(totals.items(), key=lambda kv: kv[1], reverse=True)

def format_table(rows: list[tuple[str, float]]) -> str:
    total = sum(v for _, v in rows)
    lines = [f"{cat:<12} ₹{amt:>10,.2f}  {amt / total:>5.0%}" for cat, amt in rows]
    lines.append(f"{'TOTAL':<12} ₹{total:>10,.2f}")
    return "\\n".join(lines)`,
          },
        ],
      },
      {
        h: "The CLI with argparse",
        blocks: [
          "`argparse` is the standard library's CLI parser: subcommands, types, help text and validation, without dependencies.",
          {
            lang: "python",
            code: `# tracker/__main__.py   (runs with: python -m tracker)
import argparse
import sys
from . import store, report

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="tracker", description="Track expenses")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_add = sub.add_parser("add", help="add an expense")
    p_add.add_argument("amount", type=float)
    p_add.add_argument("category")
    p_add.add_argument("note", nargs="?", default="")

    sub.add_parser("list", help="list expenses")
    p_sum = sub.add_parser("summary", help="totals by category")
    p_sum.add_argument("--month", help="YYYY-MM")
    p_del = sub.add_parser("delete")
    p_del.add_argument("id", type=int)

    args = parser.parse_args(argv)
    try:
        if args.cmd == "add":
            e = store.add(args.amount, args.category, args.note)
            print(f"Added #{e.id}: ₹{e.amount:,.2f} on {e.category}")
        elif args.cmd == "list":
            for e in store.load():
                print(f"#{e.id:<3} {e.spent_on}  ₹{e.amount:>9,.2f}  {e.category:<10} {e.note}")
        elif args.cmd == "summary":
            print(report.format_table(report.summary(store.load(), args.month)))
        elif args.cmd == "delete":
            items = store.load()
            if not any(e.id == args.id for e in items):
                raise ValueError(f"no expense with id {args.id}")
            store.save([e for e in items if e.id != args.id])
            print(f"Deleted #{args.id}")
    except ValueError as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())`,
          },
          {
            tip: "`main(argv=None)` takes arguments as a parameter, so tests can call `main([\"add\", \"100\", \"food\"])` directly without spawning a process.",
          },
        ],
      },
      {
        h: "Tests and finishing touches",
        blocks: [
          {
            lang: "python",
            code: `# tests/test_report.py
from tracker.report import summary
from tracker.store import Expense

def test_summary_groups_and_sorts():
    data = [
        Expense(1, 100, "food", "", "2026-09-01"),
        Expense(2, 500, "travel", "", "2026-09-02"),
        Expense(3, 50, "food", "", "2026-08-30"),
    ]
    assert summary(data, month="2026-09") == [("travel", 500), ("food", 100)]`,
          },
          {
            list: [
              "Make the storage path configurable with an environment variable, so tests use a temporary file (pytest's `tmp_path` fixture).",
              "Add `ruff` and run it.",
              "README: a screenshot of the CLI output, the commands, and one paragraph on design decisions (atomic writes, dataclasses).",
            ],
          },
        ],
      },
    ],
    revise: [
      "`python -m package` runs `package/__main__.py`.",
      "`Expense(**row)` turns a dict into a dataclass; `asdict()` turns it back.",
      "Atomic writes: write a temp file, then `Path.replace()`.",
      "argparse subcommands with types; return exit codes from `main()` and use `raise SystemExit(main())`.",
      "Accept `argv` as a parameter so the CLI is testable.",
    ],
    practice: [
      "Add an `export --csv` command using the `csv` module.",
      "Add a monthly budget per category and warn when it's exceeded.",
    ],
  },

  "leetcode-10": {
    minutes: 150,
    level: "Beginner",
    intro:
      "Many Indian GenAI interview loops still include a Python coding round. The goal today isn't hard algorithms: it's learning the Python idioms that make array, string and hashmap problems short and correct. Solve these 10 problems in Python; each note shows the idiom to reach for.",
    sections: [
      {
        h: "The Python DSA toolkit",
        blocks: [
          {
            table: {
              head: ["Need", "Python"],
              rows: [
                ["Hash map / counting", "`dict`, `collections.Counter`, `defaultdict(int)`"],
                ["Hash set", "`set()`"],
                ["Stack", "`list` with `append` / `pop`"],
                ["Queue / deque", "`collections.deque` (`append`, `popleft`)"],
                ["Heap / priority queue", "`heapq.heappush`, `heappop` (min-heap)"],
                ["Sorting with a key", "`sorted(xs, key=...)`"],
                ["Infinity", "`float(\"inf\")`"],
                ["Index + value", "`enumerate(xs)`"],
                ["Character codes", "`ord(\"a\")`, `chr(97)`"],
              ],
            },
          },
        ],
      },
      {
        h: "The 10 problems",
        blocks: [
          {
            table: {
              head: ["#", "Problem", "Idiom to use"],
              rows: [
                ["1", "Two Sum", "`dict` of value → index in one pass"],
                ["2", "Contains Duplicate", "`len(set(nums)) != len(nums)`"],
                ["3", "Valid Anagram", "`Counter(s) == Counter(t)`"],
                ["4", "Group Anagrams", "`defaultdict(list)` keyed by `tuple(sorted(word))`"],
                ["5", "Top K Frequent Elements", "`Counter(nums).most_common(k)`, then explain the heap version"],
                ["6", "Valid Palindrome", "Filter with `c.isalnum()`, compare with `[::-1]`"],
                ["7", "Best Time to Buy and Sell Stock", "Track the running minimum in one loop"],
                ["8", "Valid Parentheses", "`list` as a stack plus a closing → opening dict"],
                ["9", "Longest Substring Without Repeating Characters", "Sliding window with a `dict` of last-seen indexes"],
                ["10", "Product of Array Except Self", "Prefix and suffix products in two passes"],
              ],
            },
          },
          "Worked example, so you can see the style interviewers like:",
          {
            lang: "python",
            code: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}              # value -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

from collections import defaultdict

def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[tuple[str, ...], list[str]] = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)
    return list(groups.values())

def length_of_longest_substring(s: str) -> int:
    last: dict[str, int] = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best`,
          },
        ],
      },
      {
        h: "How to practise",
        blocks: [
          {
            list: [
              "Give yourself 20 minutes per problem. If you're stuck, read the approach (not the code), then write it yourself.",
              "Say the time and space complexity out loud before you run it.",
              "Once it passes, rewrite it more idiomatically: could a `Counter`, comprehension or `enumerate` make it shorter and clearer?",
              "The CodeArena **DSA 200** module has these under Arrays & Hashing; tick them off there too.",
            ],
            ordered: true,
          },
          {
            note: "In interviews, write type hints and clear names. It costs seconds and signals production habits, which matters more for a GenAI developer role than clever one-liners.",
          },
        ],
      },
    ],
    revise: [
      "Hashmap problems: `dict`, `Counter`, `defaultdict`. Sets for uniqueness.",
      "Stack = `list`; queue = `deque`; heap = `heapq` (min-heap; negate values for max).",
      "Sliding window: two indexes plus a dict or set of what's inside the window.",
      "State time and space complexity before running the code.",
    ],
    practice: [
      "Solve the Top K problem with `heapq.nlargest` and explain why it's O(n log k).",
      "Re-solve Two Sum without looking, in under 5 minutes.",
    ],
  },
};
