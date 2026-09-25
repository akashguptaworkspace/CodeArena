// Day 19: Coding round + rapid-fire concepts. Shape: see ./index.js
export default {
  dsa: {
    minutes: 70,
    level: "Intermediate",
    intro:
      "Many Indian GenAI interview loops still start with a Python coding round, usually easy to medium problems on arrays, strings and hashmaps. The goal isn't competitive programming; it's writing correct, clean Python quickly while explaining your thinking. This lesson covers the five patterns that solve most of those questions.",
    sections: [
      {
        h: "Pattern 1: hashmap / counting",
        blocks: [
          "When you need to find pairs, duplicates, frequencies or groups, reach for a dict, `Counter` or set: they turn O(n²) searches into O(n).",
          {
            lang: "python",
            code: `from collections import Counter

def first_unique_char(s: str) -> int:
    counts = Counter(s)
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1

def subarray_sum_equals_k(nums: list[int], k: int) -> int:
    seen = {0: 1}          # prefix sum -> how many times seen
    total = count = 0
    for n in nums:
        total += n
        count += seen.get(total - k, 0)
        seen[total] = seen.get(total, 0) + 1
    return count`,
          },
        ],
      },
      {
        h: "Pattern 2: two pointers",
        blocks: [
          "Two indexes moving through a sorted array or string, usually from both ends or at different speeds. Used for pairs in sorted data, palindromes, removing duplicates in place, merging.",
          {
            lang: "python",
            code: `def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        s = nums[lo] + nums[hi]
        if s == target:
            return [lo, hi]
        if s < target:
            lo += 1
        else:
            hi -= 1
    return []`,
          },
        ],
      },
      {
        h: "Pattern 3: sliding window",
        blocks: [
          "For \"longest / shortest / count of subarrays or substrings with property X\": expand the right edge, shrink the left edge while the window is invalid.",
          {
            lang: "python",
            code: `def min_subarray_len(target: int, nums: list[int]) -> int:
    left = total = 0
    best = float("inf")
    for right, n in enumerate(nums):
        total += n
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best`,
          },
        ],
      },
      {
        h: "Pattern 4: stack",
        blocks: [
          "For matching brackets, \"next greater element\", undo operations, and evaluating expressions.",
          {
            lang: "python",
            code: `def daily_temperatures(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack: list[int] = []          # indexes of days waiting for a warmer day
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer`,
          },
        ],
      },
      {
        h: "Pattern 5: sorting + heap",
        blocks: [
          "For top-k, merging intervals and scheduling. `heapq` is a min-heap; `nlargest`/`nsmallest` are handy.",
          {
            lang: "python",
            code: `import heapq

def k_closest(points: list[list[int]], k: int) -> list[list[int]]:
    return heapq.nsmallest(k, points, key=lambda p: p[0] ** 2 + p[1] ** 2)

def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    merged: list[list[int]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged`,
          },
        ],
      },
      {
        h: "How to behave in the round",
        blocks: [
          {
            list: [
              "**Clarify:** input size, empty input, duplicates, negative numbers, what to return.",
              "**Say the brute force** and its complexity, then the better approach, before coding.",
              "**Write clean Python:** clear names, type hints, small helper functions.",
              "**Test out loud** with a small example and an edge case.",
              "**State time and space complexity** at the end.",
            ],
            ordered: true,
          },
          {
            tip: "CodeArena's **DSA 200** module groups problems by exactly these patterns. Do the Core problems in Arrays & Hashing, Two Pointers, Sliding Window and Stack for a quick refresher.",
          },
        ],
      },
    ],
    revise: [
      "Hashmap/counting: pairs, duplicates, frequencies, prefix sums (dict, Counter, set).",
      "Two pointers: sorted pairs, palindromes, in-place edits.",
      "Sliding window: expand right, shrink left while invalid.",
      "Stack: brackets, next greater element (monotonic stack).",
      "Sorting + heap: top-k (`heapq.nsmallest/nlargest`), intervals.",
      "Round routine: clarify → brute force → better → code → test → complexity.",
    ],
    interview: [
      {
        q: "Implement cosine similarity without numpy.",
        a: "Compute the dot product with `sum(x * y for x, y in zip(a, b))`, compute each norm as `math.sqrt(sum(x * x for x in v))`, and return dot / (norm_a × norm_b), handling zero vectors (return 0.0 or raise) and checking the lengths match. It's O(d) time and O(1) extra space. Mention that for many vectors you'd use NumPy matrix operations or a vector index instead.",
      },
    ],
    practice: [
      "Write cosine similarity without numpy, with length checks and zero-vector handling, plus two tests.",
    ],
  },

  "live-coding": {
    minutes: 60,
    level: "Intermediate",
    intro:
      "GenAI interviews increasingly include a practical live-coding task: \"build a minimal RAG over these files\" or \"implement a tool-calling loop\", in 30–60 minutes, often with documentation allowed. The trick is having the skeleton in your fingers so you spend the time on the problem, not on remembering APIs.",
    sections: [
      {
        h: "Minimal RAG skeleton (about 40 lines)",
        blocks: [
          {
            lang: "python",
            code: `from pathlib import Path
import numpy as np
from openai import OpenAI

client = OpenAI()
EMB, CHAT = "text-embedding-3-small", "gpt-4o-mini"

def chunk(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    return [text[i:i + size] for i in range(0, len(text), size - overlap)]

def embed(texts: list[str]) -> np.ndarray:
    data = client.embeddings.create(model=EMB, input=texts).data
    v = np.array([d.embedding for d in data], dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

# index
chunks, sources = [], []
for path in Path("docs").glob("*.txt"):
    for c in chunk(path.read_text(encoding="utf-8")):
        chunks.append(c)
        sources.append(path.name)
matrix = embed(chunks)

def ask(question: str, k: int = 4) -> str:
    q = embed([question])[0]
    top = np.argsort(-(matrix @ q))[:k]
    context = "\\n\\n".join(f"[{i + 1}] ({sources[j]}) {chunks[j]}" for i, j in enumerate(top))
    r = client.chat.completions.create(model=CHAT, temperature=0, messages=[
        {"role": "system", "content": "Answer only from the context. Cite like [1]. "
                                      "If it isn't there, say you don't know."},
        {"role": "user", "content": f"Context:\\n{context}\\n\\nQuestion: {question}"},
    ])
    return r.choices[0].message.content

print(ask("What is the refund window?"))`,
          },
          "Then talk through improvements: token-based chunking with structure, batching embeddings, a vector DB, hybrid search, reranking, evaluation. Interviewers value knowing what's missing as much as the working code.",
        ],
      },
      {
        h: "Tool-calling loop skeleton",
        blocks: [
          "Write the Day 4 / Day 10 loop from memory: tool specs → call → if `tool_calls`, run each and append `role: tool` messages → repeat with a max-steps cap → return the final text. Practise until you can type it in 10 minutes.",
        ],
      },
      {
        h: "Live-coding habits",
        blocks: [
          {
            list: [
              "Start with the simplest end-to-end version that runs, then improve. A working simple version beats an unfinished clever one.",
              "Think aloud: what you're doing and why.",
              "Put API keys in environment variables, even in an interview.",
              "Print intermediate results (retrieved chunks) to show you debug methodically.",
              "Leave 5 minutes to discuss evaluation and production concerns.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Minimal RAG: chunk → embed (normalise) → matrix @ query → top-k → grounded prompt with citations.",
      "Tool loop from memory with a step cap.",
      "Working simple version first; think aloud; print intermediate results; finish with improvements and evaluation.",
    ],
    interview: [
      {
        q: "You have 45 minutes to build a RAG system over 50 text files. What do you do?",
        a: "Build the simplest working pipeline first: read files, chunk with overlap, embed in batches with normalisation, keep vectors in a NumPy matrix, retrieve top-k by dot product, and prompt the model to answer only from numbered context with citations. Test with a few questions and print retrieved chunks. With the remaining time, discuss or add improvements: structure-aware chunking, a vector DB, hybrid search, reranking, an \"I don't know\" threshold, and a small evaluation set.",
      },
    ],
    practice: [
      "Type the minimal RAG skeleton from memory until it works first time.",
    ],
  },

  "leetcode-15": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Solve 15 problems in Python across the five patterns, timed. Use the round routine from the DSA lesson every time, including saying complexity out loud.",
    sections: [
      {
        h: "The list",
        blocks: [
          {
            table: {
              head: ["Pattern", "Problems"],
              rows: [
                ["Hashmap / counting", "Group Anagrams · Top K Frequent Elements · Longest Consecutive Sequence · Subarray Sum Equals K"],
                ["Two pointers", "Valid Palindrome · 3Sum · Container With Most Water"],
                ["Sliding window", "Longest Substring Without Repeating Characters · Longest Repeating Character Replacement · Minimum Size Subarray Sum"],
                ["Stack", "Valid Parentheses · Daily Temperatures · Min Stack"],
                ["Sorting / heap / intervals", "Merge Intervals · K Closest Points to Origin"],
              ],
            },
          },
          "All are in CodeArena's DSA 200 list; tick them off there too.",
        ],
      },
      {
        h: "Timing",
        blocks: [
          {
            list: [
              "Easy: 15 minutes. Medium: 25 minutes.",
              "Stuck at half time? Read the approach (not the code), then write it yourself.",
              "After each, note the pattern and one sentence on the key insight in your lesson notes below. That becomes your revision sheet.",
            ],
          },
        ],
      },
    ],
    revise: [
      "15 problems across hashmap, two pointers, sliding window, stack, sorting/heap.",
      "Timed: 15 min easy, 25 min medium; approach-only hints; note the key insight.",
    ],
    practice: [
      "Re-solve the three you found hardest tomorrow morning, without notes.",
    ],
  },

  "timed-rag": {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Simulate the live-coding round: build a minimal RAG from an empty folder in 45 minutes with a timer, just as you would in an interview. Doing it once under pressure makes the real thing feel familiar.",
    sections: [
      {
        h: "The drill",
        blocks: [
          {
            list: [
              "Prepare 5–10 text files on any topic (e.g. policies you write quickly, or Wikipedia articles saved as text).",
              "New empty folder. Start a 45-minute timer.",
              "Build: environment → load → chunk → embed → retrieve → answer with citations → test with 3 questions.",
              "At 35 minutes, stop coding and spend 10 minutes speaking aloud about what you'd improve for production.",
              "Note where you lost time (API syntax? numpy? environment setup?) and drill that part again.",
            ],
            ordered: true,
          },
          {
            tip: "Keep a personal cheat sheet with the three snippets you always forget (embeddings call, chat call, normalising vectors). Interviews usually allow docs, but a cheat sheet in your head is faster.",
          },
        ],
      },
    ],
    revise: [
      "45-minute timer, empty folder, end-to-end minimal RAG, then 10 minutes on improvements.",
      "Find where time is lost and drill it.",
    ],
    practice: [
      "Repeat the drill with a tool-calling agent instead of RAG (30 minutes).",
    ],
  },

  "bank-aloud": {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Go through the whole question bank on the GenAI Sprint page and answer each question **out loud**, in about 90 seconds. Answering in your head feels fine; saying it exposes the gaps. Each lesson's Interview questions section has model answers to compare against.",
    sections: [
      {
        h: "Method",
        blocks: [
          {
            list: [
              "For each question: answer aloud (record audio if you can), then open the matching lesson's model answer and compare.",
              "Mark each as ✅ confident, 🟡 shaky, or ❌ couldn't answer.",
              "For 🟡 and ❌, re-read the lesson section and write a 3-line answer in that lesson's notes.",
              "Re-do only the 🟡 and ❌ questions tomorrow.",
            ],
            ordered: true,
          },
        ],
      },
      {
        h: "A good spoken answer",
        blocks: [
          {
            list: [
              "**Definition first** in one sentence.",
              "**How it works** in 2–3 sentences.",
              "**When to use it / trade-off** in one or two sentences.",
              "**Your experience:** \"In my DocChat project, I…\". This is what makes an answer memorable.",
            ],
            ordered: true,
          },
          {
            lang: "text",
            code: `Q: What is reranking?
Definition: A second-stage model that re-scores retrieved candidates for relevance.
How: A cross-encoder reads the query and each passage together, so it's more accurate
     than embedding similarity but too slow for the whole corpus; we apply it to the top 20-50.
Trade-off: Adds ~100-300 ms but usually gives the biggest quality gain.
Experience: In DocChat, adding a BGE reranker raised hit rate@5 from 0.81 to 0.90.`,
          },
        ],
      },
    ],
    revise: [
      "Answer aloud, compare with the lesson's model answer, mark ✅/🟡/❌, fix gaps in notes, repeat the weak ones.",
      "Structure: definition → how it works → trade-off → your project experience.",
    ],
    practice: [
      "Record your answers to the 6 system design questions in the bank and listen back.",
    ],
  },
};
