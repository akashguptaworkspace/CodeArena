// Practice exercises: coding round in Python. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  "Write each solution with a few `assert` lines underneath (or pytest tests), the way you'd test in an interview.",
];

export default {
  groups: [
    {
      title: "Hashing",
      exercises: [
        {
          id: "two-sum",
          title: "Two Sum",
          level: "Easy",
          task: [
            "Given a list of numbers and a target, return the indexes of the two numbers that add up to the target. Assume exactly one answer. Aim for O(n).",
            { lang: "python", code: `two_sum([2, 7, 11, 15], 9)   # [0, 1]\ntwo_sum([3, 2, 4], 6)        # [1, 2]` },
          ],
          hint: "As you walk the list, store each value's index in a dict and check whether `target - value` is already there.",
          solution: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}            # value -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

assert two_sum([2, 7, 11, 15], 9) == [0, 1]
assert two_sum([3, 2, 4], 6) == [1, 2]
assert two_sum([3, 3], 6) == [0, 1]`,
          explanation: [
            "Brute force checks every pair: O(n²). The dict remembers what we've seen, so each lookup is O(1) and the whole thing is **O(n) time, O(n) space**.",
            "Checking before inserting handles duplicates like `[3, 3]` correctly.",
          ],
          concepts: [
            ["Hash map (dict)", "Key → value store with O(1) average lookup."],
            ["Time / space complexity", "How running time and memory grow with input size (Big-O)."],
          ],
        },
        {
          id: "group-anagrams",
          title: "Group Anagrams",
          level: "Medium",
          task: [
            "Group words that are anagrams of each other.",
            { lang: "python", code: `group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])\n# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]` },
          ],
          hint: "Anagrams have the same sorted letters. Use that as a dict key.",
          solution: `from collections import defaultdict

def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[tuple[str, ...], list[str]] = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)
    return list(groups.values())

assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`,
          explanation: [
            "`sorted(\"tea\")` gives `['a', 'e', 't']`. Lists can't be dict keys, so we convert to a tuple.",
            "Complexity: O(n · k log k) for n words of length k. A faster key is a 26-letter count tuple, O(n · k).",
          ],
          concepts: [
            ["`defaultdict(list)`", "Dict that creates an empty list for new keys."],
            ["Hashable key", "Dict keys must be immutable: tuples yes, lists no."],
          ],
        },
        {
          id: "top-k",
          title: "Top K Frequent Elements",
          level: "Medium",
          task: [
            "Return the k most frequent numbers. Solve it once with `Counter.most_common` and once with `heapq`, and state the complexity of each.",
            { lang: "python", code: `top_k([1, 1, 1, 2, 2, 3], 2)   # [1, 2]` },
          ],
          solution: `import heapq
from collections import Counter

def top_k(nums: list[int], k: int) -> list[int]:
    return [n for n, _ in Counter(nums).most_common(k)]

def top_k_heap(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    return heapq.nlargest(k, counts, key=counts.get)

assert top_k([1, 1, 1, 2, 2, 3], 2) == [1, 2]
assert sorted(top_k_heap([1, 1, 1, 2, 2, 3], 2)) == [1, 2]`,
          explanation: [
            "Counting is O(n). `most_common(k)` sorts all distinct items: O(m log m). `heapq.nlargest` keeps a heap of size k: **O(m log k)**, better when k is small.",
            "Interviewers like hearing both, plus the bucket-sort O(n) idea (index buckets by frequency).",
          ],
          concepts: [
            ["Heap", "A structure that gives the smallest (or largest) item quickly; Python's `heapq` is a min-heap."],
            ["`heapq.nlargest(k, items, key=...)`", "The k largest items by a key."],
          ],
        },
        {
          id: "longest-consecutive",
          title: "Longest Consecutive Sequence",
          level: "Medium",
          task: [
            "Find the length of the longest run of consecutive integers in an unsorted list, in O(n).",
            { lang: "python", code: `longest_consecutive([100, 4, 200, 1, 3, 2])   # 4  (1, 2, 3, 4)` },
          ],
          hint: "Put everything in a set. Only start counting from numbers where `n - 1` is not in the set.",
          solution: `def longest_consecutive(nums: list[int]) -> int:
    values = set(nums)
    best = 0
    for n in values:
        if n - 1 not in values:              # n starts a run
            length = 1
            while n + length in values:
                length += 1
            best = max(best, length)
    return best

assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4
assert longest_consecutive([]) == 0`,
          explanation: [
            "Starting only at run beginnings means each number is visited at most twice overall, so it's **O(n)** despite the inner `while`.",
            "Sorting would be simpler but O(n log n).",
          ],
          concepts: [
            ["Set membership", "`x in s` is O(1) on average."],
          ],
        },
      ],
    },
    {
      title: "Two pointers and sliding window",
      exercises: [
        {
          id: "container-water",
          title: "Container With Most Water",
          level: "Medium",
          task: [
            "Given heights of vertical lines, pick two lines that hold the most water (width × shorter height). Aim for O(n).",
            { lang: "python", code: `max_area([1, 8, 6, 2, 5, 4, 8, 3, 7])   # 49` },
          ],
          hint: "Start with the widest pair and always move the pointer at the shorter line inward.",
          solution: `def max_area(heights: list[int]) -> int:
    lo, hi, best = 0, len(heights) - 1, 0
    while lo < hi:
        best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
        if heights[lo] < heights[hi]:
            lo += 1
        else:
            hi -= 1
    return best

assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49`,
          explanation: [
            "The area is limited by the shorter line. Moving the taller one inward can only make the width smaller without raising that limit, so we always move the shorter one.",
            "Each step moves one pointer: **O(n)** time, O(1) space.",
          ],
          concepts: [
            ["Two pointers", "Two indexes moving through a list, usually from both ends."],
          ],
        },
        {
          id: "longest-substring",
          title: "Longest Substring Without Repeating Characters",
          level: "Medium",
          task: [
            "Return the length of the longest substring with no repeated characters.",
            { lang: "python", code: `longest_unique("abcabcbb")   # 3 ("abc")\nlongest_unique("pwwkew")     # 3 ("wke")` },
          ],
          solution: `def longest_unique(s: str) -> int:
    last_seen: dict[str, int] = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1              # jump past the previous copy
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best

assert longest_unique("abcabcbb") == 3
assert longest_unique("pwwkew") == 3
assert longest_unique("") == 0`,
          explanation: [
            "The window `[start, i]` always holds unique characters. When we see a repeat inside the window, we move `start` just past its previous position.",
            "The `>= start` check ignores old positions that are already outside the window. **O(n)** time.",
          ],
          concepts: [
            ["Sliding window", "A range over a sequence that grows on the right and shrinks on the left."],
          ],
        },
        {
          id: "max-window-sum",
          title: "Maximum sum of a window of size k",
          level: "Easy",
          task: [
            "Return the largest sum of any k consecutive numbers, in O(n). (Think: busiest 3-hour period of API traffic.)",
            { lang: "python", code: `max_window_sum([2, 1, 5, 1, 3, 2], 3)   # 9  (5 + 1 + 3)` },
          ],
          solution: `def max_window_sum(nums: list[int], k: int) -> int:
    if k > len(nums):
        raise ValueError("k is larger than the list")
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]      # add the new item, drop the oldest
        best = max(best, window)
    return best

assert max_window_sum([2, 1, 5, 1, 3, 2], 3) == 9`,
          explanation: [
            "Instead of re-summing each window (O(n·k)), update the running sum by adding the incoming item and subtracting the outgoing one: **O(n)**.",
          ],
          concepts: [
            ["Fixed-size sliding window", "Keep a running aggregate as the window moves one step at a time."],
          ],
        },
      ],
    },
    {
      title: "Stack and intervals",
      exercises: [
        {
          id: "valid-parentheses",
          title: "Valid Parentheses",
          level: "Easy",
          task: [
            "Return whether a string of `()[]{}` is balanced and correctly nested.",
            { lang: "python", code: `is_valid("({[]})")   # True\nis_valid("(]")       # False` },
          ],
          solution: `def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack

assert is_valid("({[]})") and not is_valid("(]") and not is_valid("((")`,
          explanation: [
            "Push opening brackets; on a closing bracket, the top of the stack must be its partner. At the end the stack must be empty.",
            "A Python list is a perfect stack: `append` to push, `pop` to pop. **O(n)** time and space.",
          ],
          concepts: [
            ["Stack", "Last in, first out: the most recently added item comes out first."],
          ],
        },
        {
          id: "merge-intervals",
          title: "Merge Intervals",
          level: "Medium",
          task: [
            "Merge overlapping intervals. (Think: combining overlapping meeting slots, or merging adjacent text chunks from the same page.)",
            { lang: "python", code: `merge([[1, 3], [2, 6], [8, 10], [15, 18]])   # [[1, 6], [8, 10], [15, 18]]` },
          ],
          solution: `def merge(intervals: list[list[int]]) -> list[list[int]]:
    merged: list[list[int]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert merge([[1, 4], [4, 5]]) == [[1, 5]]`,
          explanation: [
            "After sorting by start, overlapping intervals are next to each other, so one pass merges them. **O(n log n)** for the sort.",
            "`merged[-1][1]` is the end of the last merged interval.",
          ],
          concepts: [
            ["Sorting then scanning", "A common pattern: sort to bring related items together, then one linear pass."],
          ],
        },
      ],
    },
    {
      title: "GenAI live-coding",
      exercises: [
        {
          id: "topk-cosine",
          title: "Top-k semantic search without NumPy",
          level: "Medium",
          task: [
            "Given a query vector and a dict of `doc_id → vector`, return the top k doc ids by cosine similarity, without NumPy, using a heap. Handle zero vectors and mismatched lengths.",
          ],
          solution: `import heapq
import math

def cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return 0.0 if na == 0 or nb == 0 else sum(x * y for x, y in zip(a, b)) / (na * nb)

def top_k(query: list[float], docs: dict[str, list[float]], k: int = 3) -> list[tuple[str, float]]:
    scored = ((doc_id, cosine(query, vec)) for doc_id, vec in docs.items())
    return heapq.nlargest(k, scored, key=lambda pair: pair[1])

docs = {"a": [1, 0, 0], "b": [0.9, 0.1, 0], "c": [0, 1, 0], "z": [0, 0, 0]}
print(top_k([1, 0, 0], docs, k=2))   # [('a', 1.0), ('b', 0.99...)]`,
          explanation: [
            "Cosine is O(d) per vector, so scoring n documents is O(n·d); the heap adds O(n log k).",
            "Mention in the interview: normalising vectors once at indexing makes cosine a plain dot product; NumPy vectorises it; at scale you'd use an ANN index like HNSW.",
          ],
          concepts: [
            ["Cosine similarity", "Dot product divided by the product of vector lengths."],
            ["Generator expression", "Lazily produces scores without building a full list."],
          ],
        },
        {
          id: "retry-decorator",
          title: "A retry decorator with exponential backoff and jitter",
          level: "Medium",
          task: [
            "Write `@retry(times=3, base=0.5, on=(TimeoutError,))` that retries only the listed exceptions with delays base, 2·base, 4·base plus random jitter, re-raising after the last attempt. Test it with a function that fails twice then succeeds (patch `time.sleep` so the test is instant).",
          ],
          solution: `import functools
import random
import time

def retry(times: int = 3, base: float = 0.5, on: tuple[type[Exception], ...] = (Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except on:
                    if attempt == times - 1:
                        raise
                    time.sleep(base * 2 ** attempt + random.uniform(0, base))
        return wrapper
    return decorator

# test
calls = {"n": 0}

@retry(times=3, on=(TimeoutError,))
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise TimeoutError("slow provider")
    return "ok"

def test_flaky(monkeypatch):
    monkeypatch.setattr(time, "sleep", lambda s: None)
    assert flaky() == "ok" and calls["n"] == 3`,
          explanation: [
            "A decorator factory takes settings (`times`, `on`) and returns the real decorator; `functools.wraps` keeps the function's name and docstring.",
            "Only listed exceptions are retried, so bugs like `KeyError` fail immediately instead of being retried pointlessly.",
            "Jitter spreads retries out so many clients don't hammer a recovering server at the same moment.",
          ],
          concepts: [
            ["Decorator factory", "A function that takes arguments and returns a decorator."],
            ["Jitter", "Random extra delay added to backoff."],
            ["`monkeypatch`", "A pytest fixture for temporarily replacing functions in tests."],
          ],
        },
        {
          id: "lru-cache",
          title: "An LRU cache for embeddings",
          level: "Medium",
          task: [
            "Implement `LRUCache(capacity)` with `get(key)` and `put(key, value)` in O(1), evicting the least recently used item when full. Use it to cache embeddings by text.",
            { lang: "python", code: `c = LRUCache(2); c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3)\nc.get("b")   # None (evicted)` },
          ],
          hint: "`collections.OrderedDict` has `move_to_end(key)` and `popitem(last=False)`.",
          solution: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.items: OrderedDict = OrderedDict()

    def get(self, key):
        if key not in self.items:
            return None
        self.items.move_to_end(key)             # mark as most recently used
        return self.items[key]

    def put(self, key, value) -> None:
        if key in self.items:
            self.items.move_to_end(key)
        self.items[key] = value
        if len(self.items) > self.capacity:
            self.items.popitem(last=False)      # evict the least recently used

c = LRUCache(2)
c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3)
assert c.get("b") is None and c.get("a") == 1 and c.get("c") == 3`,
          explanation: [
            "An `OrderedDict` remembers order: we move items to the end when used, so the front is always the least recently used, and both operations are **O(1)**.",
            "In an interview, also mention `functools.lru_cache` for caching function results, and that the classic from-scratch version is a hash map plus a doubly linked list.",
          ],
          concepts: [
            ["LRU cache", "Evicts the least recently used item when full."],
            ["`OrderedDict`", "A dict with fast reordering: `move_to_end`, `popitem(last=False)`."],
          ],
        },
      ],
    },
  ],
};
