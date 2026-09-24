// Day 1 practice: Python basics for JS developers. Shape: see ./index.js
export default {
  intro:
    "Seventeen small Python exercises, from printing a receipt to reading JSON files. Each one takes 5–20 minutes. Do them in order: later ones reuse earlier ideas.",
  setup: [
    "Make one folder for all of today's exercises and run each file with Python 3.12 (or newer).",
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day01 && cd ~/genai-practice/day01
python3 --version          # should print 3.12 or newer
# create ex01.py in VS Code, then run:
python3 ex01.py`,
    },
    {
      tip: "Install the **Python** extension in VS Code. It gives you autocomplete, error underlines and a Run button (▶) at the top right of every `.py` file.",
    },
  ],
  groups: [
    {
      title: "Variables, strings and f-strings",
      exercises: [
        {
          id: "receipt",
          title: "Print a chai shop receipt",
          level: "Easy",
          task: [
            "Store an item name, price and quantity in variables. Print a receipt line and a total, with the price formatted to 2 decimals and the item name padded to 12 characters.",
            { lang: "text", code: `Masala chai   x3   ₹ 45.00\nTotal: ₹135.00` },
          ],
          hint: "Inside an f-string, `{name:<12}` pads text to 12 characters on the left, and `{price:.2f}` shows 2 decimals.",
          solution: `item = "Masala chai"
price = 45
qty = 3

total = price * qty
print(f"{item:<12}  x{qty}   ₹{price:>6.2f}")
print(f"Total: ₹{total:.2f}")`,
          explanation: [
            "Variables are created by assignment; no `let` or `const`.",
            "The `f` before the quotes makes an **f-string**. Anything inside `{}` is evaluated. After a colon you can add a format: `<12` means left-align in 12 characters, `>6.2f` means right-align in 6 characters with 2 decimals.",
          ],
          concepts: [
            ["`str`", "Python's text type. Written with single or double quotes. Strings can't be changed in place; methods return new strings."],
            ["`int` / `float`", "Whole numbers and decimal numbers. `45` is an int, `45.0` is a float."],
            ["f-string", "A string starting with `f` where `{expression}` is replaced by its value. Python's version of JS template literals."],
            ["`print()`", "Writes text to the terminal, followed by a new line."],
          ],
        },
        {
          id: "clean-name",
          title: "Clean up a messy name",
          level: "Easy",
          task: [
            "A user typed their name as `\"   aSHA   kUMARI  \"`. Write code that prints the cleaned name, their initials, and the number of letters (without spaces).",
            { lang: "text", code: `Asha Kumari\nAK\n10` },
          ],
          hint: "`.strip()` removes outer spaces, `.split()` breaks into words, `.title()` capitalises each word, and `\"\".join(...)` glues pieces together.",
          solution: `raw = "   aSHA   kUMARI  "

words = raw.split()                 # ['aSHA', 'kUMARI']  (split() also drops extra spaces)
name = " ".join(w.capitalize() for w in words)
initials = "".join(w[0].upper() for w in words)
letters = len("".join(words))

print(name)
print(initials)
print(letters)`,
          explanation: [
            "`split()` with no argument splits on any run of whitespace and ignores leading and trailing spaces, so it's the easiest way to get clean words.",
            "`w[0]` is the first character of a string (indexing starts at 0). `\" \".join(list)` joins a list of strings with a space between them. Note that the separator comes first, unlike JS's `array.join(\" \")`.",
            "`w.capitalize() for w in words` inside `join(...)` is a generator expression: it produces each capitalised word one at a time.",
          ],
          concepts: [
            ["`.split()`", "Breaks a string into a list of words. With an argument, e.g. `.split(\",\")`, it splits on that text."],
            ["`\"sep\".join(items)`", "Joins a list of strings into one string with `sep` between items."],
            ["`len()`", "Returns the length of a string, list, dict or other collection."],
            ["Indexing `s[0]`", "Gets one character (or list item) by position, starting at 0. `s[-1]` is the last one."],
          ],
        },
        {
          id: "input-convert",
          title: "Celsius to Fahrenheit from user input",
          level: "Easy",
          task: [
            "Ask the user for a temperature in Celsius with `input()`, convert it to Fahrenheit (F = C × 9/5 + 32), and print it rounded to 1 decimal. If they type `37`, print `37.0°C = 98.6°F`.",
          ],
          hint: "`input()` always returns a string. Convert it with `float(...)` before doing maths.",
          solution: `text = input("Temperature in °C: ")
celsius = float(text)
fahrenheit = celsius * 9 / 5 + 32
print(f"{celsius:.1f}°C = {fahrenheit:.1f}°F")`,
          explanation: [
            "`input()` pauses the program, shows the prompt, and returns whatever the user typed **as a string**, even if they typed a number.",
            "`float(text)` converts the string into a decimal number. If the text isn't a number (say `abc`), it raises a `ValueError`; you'll handle that in the errors exercise.",
            "`/` always returns a float in Python (`9 / 5` is `1.8`). Use `//` if you want whole-number division.",
          ],
          concepts: [
            ["`input(prompt)`", "Reads one line typed by the user and returns it as a `str`."],
            ["`float(x)` / `int(x)`", "Convert a value (often a string) into a decimal or whole number. Raise `ValueError` if the text isn't a valid number."],
            ["`/` vs `//`", "`/` is true division and always gives a float. `//` is floor division (rounds down)."],
          ],
        },
      ],
    },
    {
      title: "Lists and slicing",
      exercises: [
        {
          id: "last-messages",
          title: "Keep the last N chat messages",
          level: "Easy",
          task: [
            "Given this list of chat messages, print only the last 3, then print them numbered from 1 using `enumerate`.",
            {
              lang: "python",
              code: `messages = ["hi", "what is RAG?", "and embeddings?", "show code", "thanks", "one more"]`,
            },
            { lang: "text", code: `['show code', 'thanks', 'one more']\n1. show code\n2. thanks\n3. one more` },
          ],
          hint: "A negative slice start counts from the end: `items[-3:]`.",
          solution: `messages = ["hi", "what is RAG?", "and embeddings?", "show code", "thanks", "one more"]

recent = messages[-3:]
print(recent)

for i, msg in enumerate(recent, start=1):
    print(f"{i}. {msg}")`,
          explanation: [
            "`messages[-3:]` means \"from the 3rd-from-last item to the end\". This exact pattern keeps chat history short so prompts fit an LLM's context window.",
            "`enumerate(recent, start=1)` gives pairs of (number, item), so you don't need a manual counter variable.",
          ],
          concepts: [
            ["`list`", "An ordered, changeable collection, like a JS array: `[1, 2, 3]`."],
            ["Slicing `seq[start:stop]`", "Returns a new list from `start` up to (not including) `stop`. Negative numbers count from the end; missing values mean \"from the beginning\" or \"to the end\"."],
            ["`enumerate()`", "Loops over items while also giving each item's position."],
            ["`for x in items:`", "Python's loop over any collection. No index variable needed."],
          ],
        },
        {
          id: "chunker",
          title: "Split text into overlapping chunks",
          level: "Medium",
          task: [
            "Write a function `chunk(text, size, overlap)` that splits a string into pieces of `size` characters, where each piece starts `size - overlap` characters after the previous one. This is how RAG systems split documents.",
            { lang: "python", code: `print(chunk("abcdefghij", size=4, overlap=1))\n# ['abcd', 'defg', 'ghij', 'j']` },
          ],
          hint: "Use `range(0, len(text), step)` to get the start positions, and slice `text[start:start + size]` for each.",
          solution: `def chunk(text: str, size: int, overlap: int) -> list[str]:
    if overlap >= size:
        raise ValueError("overlap must be smaller than size")
    step = size - overlap
    pieces = []
    for start in range(0, len(text), step):
        pieces.append(text[start:start + size])
    return pieces

print(chunk("abcdefghij", size=4, overlap=1))`,
          explanation: [
            "`range(0, 10, 3)` produces 0, 3, 6, 9: the start of each chunk.",
            "Slicing past the end is safe in Python: `\"abcdefghij\"[9:13]` just returns `\"j\"` instead of raising an error.",
            "The guard at the top prevents an infinite loop: if overlap equalled size, the step would be 0.",
            "Improvement to try: skip the last chunk when it's fully contained in the previous one (the lone `'j'`).",
          ],
          concepts: [
            ["`def`", "Defines a function. The body is the indented block below it."],
            ["Type hints `text: str`, `-> list[str]`", "Notes about expected types. Python doesn't enforce them, but editors and tools use them."],
            ["`range(start, stop, step)`", "Produces numbers from `start` up to (not including) `stop`, jumping by `step`."],
            ["`raise`", "Stops the function with an error, like `throw` in JS."],
          ],
        },
        {
          id: "palindrome",
          title: "Is it a palindrome?",
          level: "Easy",
          task: [
            "Write `is_palindrome(s)` that returns `True` if a sentence reads the same backwards, ignoring spaces, punctuation and case.",
            { lang: "python", code: `is_palindrome("A man, a plan, a canal: Panama")   # True\nis_palindrome("chai")                             # False` },
          ],
          hint: "Keep only characters where `c.isalnum()` is true, lower-case them, then compare with the reversed version `[::-1]`.",
          solution: `def is_palindrome(s: str) -> bool:
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

print(is_palindrome("A man, a plan, a canal: Panama"))
print(is_palindrome("chai"))`,
          explanation: [
            "`c for c in s if c.isalnum()` walks through every character and keeps letters and digits only.",
            "`cleaned[::-1]` is a slice with step −1: it walks backwards and returns a reversed copy.",
            "`==` compares the two strings' contents and gives a `bool`.",
          ],
          concepts: [
            ["`bool`", "`True` or `False` (capitalised in Python)."],
            ["`.isalnum()`", "String method: `True` if every character is a letter or digit."],
            ["`[::-1]`", "Slice that reverses a string or list."],
          ],
        },
      ],
    },
    {
      title: "Dicts, sets and tuples",
      exercises: [
        {
          id: "word-count",
          title: "Count words two ways",
          level: "Easy",
          task: [
            "Count how often each word appears in `\"the cat and the hat and the bat\"`. First with a plain dict and a loop, then with `collections.Counter`. Print the 2 most common words.",
            { lang: "text", code: `{'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}\n[('the', 3), ('and', 2)]` },
          ],
          hint: "`counts.get(word, 0)` returns 0 when the word isn't in the dict yet.",
          solution: `from collections import Counter

text = "the cat and the hat and the bat"

counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts)

print(Counter(text.split()).most_common(2))`,
          explanation: [
            "A dict maps keys to values. `counts[word] = ...` adds or updates an entry.",
            "`counts.get(word, 0)` avoids a `KeyError` for new words by returning a default.",
            "`Counter` is a ready-made dict subclass for counting. `most_common(n)` returns the top `n` as (item, count) tuples.",
          ],
          concepts: [
            ["`dict`", "Key → value mapping, like a JS object: `{\"role\": \"user\"}`. Read with `d[\"key\"]` (error if missing) or `d.get(\"key\", default)`."],
            ["`import` / `from x import y`", "Loads code from a module. `collections` is part of Python's standard library, so no install needed."],
            ["`Counter`", "A dict that counts things you give it."],
            ["`tuple`", "An ordered collection that can't be changed: `(\"the\", 3)`."],
          ],
        },
        {
          id: "group-by-city",
          title: "Group students by city",
          level: "Medium",
          task: [
            "Given a list of student dicts, build a dict of city → list of names, then print each city with its names sorted.",
            {
              lang: "python",
              code: `students = [
    {"name": "Asha", "city": "Pune"},
    {"name": "Ravi", "city": "Delhi"},
    {"name": "Meera", "city": "Pune"},
    {"name": "Kabir", "city": "Delhi"},
    {"name": "Zoya", "city": "Mumbai"},
]`,
            },
            { lang: "text", code: `Delhi: Kabir, Ravi\nMumbai: Zoya\nPune: Asha, Meera` },
          ],
          hint: "`collections.defaultdict(list)` creates an empty list automatically the first time you use a new key.",
          solution: `from collections import defaultdict

students = [
    {"name": "Asha", "city": "Pune"},
    {"name": "Ravi", "city": "Delhi"},
    {"name": "Meera", "city": "Pune"},
    {"name": "Kabir", "city": "Delhi"},
    {"name": "Zoya", "city": "Mumbai"},
]

by_city = defaultdict(list)
for s in students:
    by_city[s["city"]].append(s["name"])

for city in sorted(by_city):
    print(f"{city}: {', '.join(sorted(by_city[city]))}")`,
          explanation: [
            "Without `defaultdict` you'd write `if city not in by_city: by_city[city] = []` before appending. `defaultdict(list)` does that for you.",
            "`sorted(by_city)` sorts the dict's keys alphabetically. `sorted(list)` returns a new sorted list and leaves the original alone.",
            "Note `s[\"city\"]`, not `s.city`: dict values are read with square brackets.",
          ],
          concepts: [
            ["`defaultdict(list)`", "A dict that creates a default value (here an empty list) for missing keys."],
            ["`.append(x)`", "Adds `x` to the end of a list (like JS `push`)."],
            ["`sorted(x)`", "Returns a new sorted list from any collection."],
          ],
        },
        {
          id: "skills-sets",
          title: "Compare skills with sets",
          level: "Easy",
          task: [
            "A job needs `python, fastapi, rag, docker, aws`. A candidate has `python, react, node, docker, rag`. Print the matching skills, the missing skills, and a match percentage. Also remove duplicates from `[\"rag\", \"python\", \"rag\", \"aws\"]` while keeping the original order.",
            { lang: "text", code: `Match: ['docker', 'python', 'rag']\nMissing: ['aws', 'fastapi']\nScore: 60%\n['rag', 'python', 'aws']` },
          ],
          hint: "`a & b` is the intersection of two sets, `a - b` is what's in `a` but not `b`. `dict.fromkeys(list)` keeps first occurrences in order.",
          solution: `job = {"python", "fastapi", "rag", "docker", "aws"}
candidate = {"python", "react", "node", "docker", "rag"}

match = job & candidate
missing = job - candidate
score = len(match) / len(job)

print("Match:", sorted(match))
print("Missing:", sorted(missing))
print(f"Score: {score:.0%}")

tags = ["rag", "python", "rag", "aws"]
print(list(dict.fromkeys(tags)))`,
          explanation: [
            "Sets hold unique items and support maths-like operations: `&` (both), `|` (either), `-` (only in the first).",
            "Sets have no order, so we `sorted()` them before printing to get stable output.",
            "`:.0%` formats `0.6` as `60%`.",
            "`dict.fromkeys(tags)` makes a dict whose keys are the tags; dict keys are unique and keep insertion order, so converting back to a list removes duplicates in order.",
          ],
          concepts: [
            ["`set`", "Unordered collection of unique items: `{\"a\", \"b\"}`. Checking `x in s` is very fast."],
            ["`&`, `|`, `-` on sets", "Intersection, union and difference."],
            ["`dict.fromkeys(items)`", "Creates a dict with the given keys (values `None`)."],
          ],
        },
        {
          id: "min-max",
          title: "Return two values with a tuple",
          level: "Easy",
          task: [
            "Write `stats(scores)` that returns the lowest, highest and average score together. Unpack the result into three variables and print them.",
            { lang: "python", code: `low, high, avg = stats([72, 91, 64, 88])\n# 64 91 78.75` },
          ],
          solution: `def stats(scores: list[float]) -> tuple[float, float, float]:
    return min(scores), max(scores), sum(scores) / len(scores)

low, high, avg = stats([72, 91, 64, 88])
print(low, high, avg)`,
          explanation: [
            "`return a, b, c` returns a tuple of three values (the parentheses are optional).",
            "`low, high, avg = ...` is **unpacking**, like JS array destructuring.",
            "`min`, `max` and `sum` are built-in functions that work on any list of numbers.",
          ],
          concepts: [
            ["Tuple unpacking", "Assigning several variables at once from a tuple or list: `a, b = (1, 2)`."],
            ["`min()`, `max()`, `sum()`", "Built-ins for smallest, largest and total of a collection."],
          ],
        },
      ],
    },
    {
      title: "Functions and comprehensions",
      exercises: [
        {
          id: "js-to-py",
          title: "Translate JavaScript map/filter to Python",
          level: "Easy",
          task: [
            "Convert this JavaScript into one line of Python using a list comprehension.",
            {
              lang: "javascript",
              code: `const emails = users.filter(u => u.active).map(u => u.email.toLowerCase());`,
            },
            {
              lang: "python",
              code: `users = [
    {"email": "Asha@Mail.com", "active": True},
    {"email": "RAVI@mail.com", "active": False},
    {"email": "meera@MAIL.com", "active": True},
]
# expected: ['asha@mail.com', 'meera@mail.com']`,
            },
          ],
          hint: "Pattern: `[expression for item in items if condition]`.",
          solution: `users = [
    {"email": "Asha@Mail.com", "active": True},
    {"email": "RAVI@mail.com", "active": False},
    {"email": "meera@MAIL.com", "active": True},
]

emails = [u["email"].lower() for u in users if u["active"]]
print(emails)`,
          explanation: [
            "Read it left to right as: \"give me `u[\"email\"].lower()` for each `u` in `users`, but only if `u[\"active\"]` is true\".",
            "Comprehensions are the idiomatic Python replacement for most `filter` + `map` chains and are usually faster than an explicit loop.",
          ],
          concepts: [
            ["List comprehension", "`[expr for x in items if cond]` builds a new list in one expression."],
            ["`.lower()`", "Returns a lower-case copy of a string."],
          ],
        },
        {
          id: "kwargs-merge",
          title: "Build an API request with **kwargs",
          level: "Medium",
          task: [
            "Write `build_request(model, **options)` that starts from defaults `{\"temperature\": 0.7, \"max_tokens\": 256}`, applies any options passed in, and returns a dict including the model.",
            {
              lang: "python",
              code: `print(build_request("gpt-4o-mini", temperature=0))
# {'model': 'gpt-4o-mini', 'temperature': 0, 'max_tokens': 256}`,
            },
          ],
          hint: "Inside the function, `options` is a normal dict. Merge dicts with `{**a, **b}` or `a | b`.",
          solution: `DEFAULTS = {"temperature": 0.7, "max_tokens": 256}

def build_request(model: str, **options) -> dict:
    return {"model": model, **DEFAULTS, **options}

print(build_request("gpt-4o-mini", temperature=0))
print(build_request("gpt-4o-mini", max_tokens=50, top_p=0.9))`,
          explanation: [
            "`**options` collects any extra keyword arguments (`temperature=0`) into a dict named `options`.",
            "`{**a, **b}` spreads dicts into a new one, like `{...a, ...b}` in JS; later keys win, so user options override defaults.",
            "Constants at module level are written in `UPPER_CASE` by convention.",
          ],
          concepts: [
            ["`**kwargs`", "In a function definition, collects extra keyword arguments into a dict."],
            ["Keyword argument", "Passing a value by name: `f(temperature=0)`. Common in Python APIs."],
            ["`{**a, **b}`", "Creates a new dict by merging `a` and `b`."],
          ],
        },
        {
          id: "mutable-default",
          title: "Find and fix the mutable default bug",
          level: "Medium",
          task: [
            "Run this code and explain the surprising output. Then fix the function.",
            {
              lang: "python",
              code: `def add_message(msg, history=[]):
    history.append(msg)
    return history

print(add_message("hi"))       # ['hi']
print(add_message("hello"))    # expected ['hello'] ... what do you get?`,
            },
          ],
          hint: "Default values are created once, when `def` runs, not on each call.",
          solution: `def add_message(msg, history=None):
    if history is None:
        history = []
    history.append(msg)
    return history

print(add_message("hi"))       # ['hi']
print(add_message("hello"))    # ['hello']`,
          explanation: [
            "In the buggy version, the same list object is reused as the default in every call, so the second call returns `['hi', 'hello']`.",
            "The fix uses `None` as a marker and creates a fresh list inside the function each time.",
            "This bug is a favourite interview question. In a chat server it would make one user's messages appear in another user's conversation.",
          ],
          concepts: [
            ["Default argument", "A parameter value used when the caller doesn't pass one. Evaluated once at definition time."],
            ["`None` / `is None`", "Python's \"no value\". Check for it with `is None`, not `== None`."],
            ["Mutable", "Can be changed in place (lists, dicts, sets). Strings, numbers and tuples are immutable."],
          ],
        },
        {
          id: "timer-decorator",
          title: "Write a @timer decorator",
          level: "Medium",
          task: [
            "Write a decorator `@timer` that prints how long a function took. Use it on a function that sleeps for 0.5 seconds.",
            { lang: "text", code: `slow_task took 0.50s\ndone` },
          ],
          hint: "A decorator is a function that takes a function and returns a new wrapper function. Use `time.perf_counter()` for timing.",
          solution: `import functools
import time

def timer(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.2f}s")
        return result
    return wrapper

@timer
def slow_task():
    time.sleep(0.5)
    return "done"

print(slow_task())`,
          explanation: [
            "`@timer` above `slow_task` means `slow_task = timer(slow_task)`: the name now points to `wrapper`.",
            "`wrapper(*args, **kwargs)` accepts any arguments and passes them straight through to the original function.",
            "`functools.wraps(fn)` copies the original function's name and docstring onto the wrapper, so `fn.__name__` and tools like FastAPI still see the real function.",
          ],
          concepts: [
            ["Decorator", "A function that wraps another function to add behaviour. Applied with `@name`."],
            ["`*args`", "Collects extra positional arguments into a tuple."],
            ["`time.perf_counter()`", "A precise clock for measuring durations, in seconds."],
          ],
        },
      ],
    },
    {
      title: "Classes, files and errors",
      exercises: [
        {
          id: "dataclass-product",
          title: "A Product dataclass with a computed property",
          level: "Medium",
          task: [
            "Create a `Product` dataclass with `name`, `price` and `gst_percent` (default 18). Add a property `price_with_gst`. Create two products and print them sorted by final price.",
            { lang: "text", code: `Notebook: ₹59.00\nHeadphones: ₹1769.82` },
          ],
          hint: "`@dataclass` generates `__init__` for you. `@property` lets you call a method without parentheses.",
          solution: `from dataclasses import dataclass

@dataclass
class Product:
    name: str
    price: float
    gst_percent: float = 18

    @property
    def price_with_gst(self) -> float:
        return round(self.price * (1 + self.gst_percent / 100), 2)

items = [Product("Headphones", 1499.85), Product("Notebook", 50)]
for p in sorted(items, key=lambda p: p.price_with_gst):
    print(f"{p.name}: ₹{p.price_with_gst:.2f}")`,
          explanation: [
            "`@dataclass` reads the annotated fields and writes the constructor, a readable `print` output and `==` comparison for you.",
            "`self` is the object the method was called on (like `this` in JS, but written explicitly).",
            "`sorted(items, key=lambda p: ...)` sorts by whatever the key function returns.",
          ],
          concepts: [
            ["`class`", "A blueprint for objects with data (attributes) and behaviour (methods)."],
            ["`@dataclass`", "Auto-generates the boring parts of a data-holding class."],
            ["`@property`", "Makes a method readable like an attribute: `p.price_with_gst`."],
            ["`lambda`", "A tiny one-line anonymous function: `lambda p: p.price`."],
          ],
        },
        {
          id: "json-notes",
          title: "Save and load notes as JSON",
          level: "Medium",
          task: [
            "Write `add_note(text)` that appends a note (with today's date) to `notes.json`, creating the file if it doesn't exist, and `list_notes()` that prints all notes. Call `add_note` twice, then `list_notes`.",
            { lang: "text", code: `2026-09-25  Learn slicing\n2026-09-25  Practise dicts` },
          ],
          hint: "Use `pathlib.Path` to check `.exists()`, `json.loads(path.read_text())` to read, and `path.write_text(json.dumps(data))` to write.",
          solution: `import json
from datetime import date
from pathlib import Path

NOTES = Path("notes.json")

def load() -> list[dict]:
    if not NOTES.exists():
        return []
    return json.loads(NOTES.read_text(encoding="utf-8"))

def add_note(text: str) -> None:
    notes = load()
    notes.append({"date": date.today().isoformat(), "text": text})
    NOTES.write_text(json.dumps(notes, indent=2, ensure_ascii=False), encoding="utf-8")

def list_notes() -> None:
    for n in load():
        print(f"{n['date']}  {n['text']}")

add_note("Learn slicing")
add_note("Practise dicts")
list_notes()`,
          explanation: [
            "`json.dumps` turns Python lists and dicts into JSON text; `json.loads` turns JSON text back into Python objects.",
            "`Path(\"notes.json\")` is relative to the folder you run the script from.",
            "`ensure_ascii=False` keeps non-English text (like Hindi) readable in the file; `encoding=\"utf-8\"` makes reading and writing safe on every operating system.",
            "Run the script twice: notes accumulate because we always load the existing file first.",
          ],
          concepts: [
            ["`json` module", "Converts between JSON text and Python objects: dict ↔ object, list ↔ array, `None` ↔ null."],
            ["`pathlib.Path`", "An object for file paths with handy methods: `.exists()`, `.read_text()`, `.write_text()`."],
            ["`date.today().isoformat()`", "Today's date as text like `\"2026-09-25\"`."],
          ],
        },
        {
          id: "safe-input",
          title: "Keep asking until the input is a valid number",
          level: "Medium",
          task: [
            "Ask the user for their age. If they type something that isn't a whole number, or a number outside 1–120, print a friendly message and ask again. When valid, print `You are 27 years old.`",
          ],
          hint: "Use `while True:` with `try: int(text)` and `except ValueError:`. Use `break` (or `return`) when the value is valid.",
          solution: `def ask_age() -> int:
    while True:
        text = input("Your age: ")
        try:
            age = int(text)
        except ValueError:
            print(f"'{text}' is not a whole number. Try again.")
            continue
        if 1 <= age <= 120:
            return age
        print("Please enter an age between 1 and 120.")

age = ask_age()
print(f"You are {age} years old.")`,
          explanation: [
            "`int(\"abc\")` raises `ValueError`. The `except ValueError:` block catches only that error type and handles it.",
            "`continue` jumps back to the top of the loop; `return` leaves the function with the valid age.",
            "`1 <= age <= 120` is a chained comparison. Python allows this; in JS you'd write `age >= 1 && age <= 120`.",
          ],
          concepts: [
            ["`try` / `except`", "Run code that might fail and handle specific errors, like `try` / `catch` in JS."],
            ["`ValueError`", "The error raised when a value has the right type but a bad content, e.g. `int(\"abc\")`."],
            ["`while True:` + `continue` / `return`", "Loop forever until you explicitly leave; `continue` restarts the loop."],
          ],
        },
      ],
    },
  ],
};
