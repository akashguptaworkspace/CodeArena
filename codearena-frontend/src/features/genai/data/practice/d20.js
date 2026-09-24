// Day 20 practice: final drills. Shape: see ./index.js
export default {
  intro:
    "Five final drills that mix everything: two timed builds from an empty folder, two \"find the bugs\" challenges in RAG and agent code (a common interview format), and a small tool to run your own mock interview sessions from the question bank.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day20 && cd ~/genai-practice/day20
uv init --no-readme .
uv add openai python-dotenv numpy
cp ../day03/llm.py ../day03/.env . && cp -r ../day06/docs .`,
    },
  ],
  groups: [
    {
      title: "Timed builds",
      exercises: [
        {
          id: "timed-rag",
          title: "RAG from an empty file in 45 minutes",
          level: "Hard",
          task: [
            "Start a 45-minute timer. In a new file, without looking at earlier code: load `docs/*.md`, chunk, embed (normalised), retrieve top-3, answer with `[n]` citations and an \"I couldn't find this\" rule. Ask 3 questions including one unanswerable. At minute 35 stop coding and write 5 bullet points on how you'd make it production-ready.",
          ],
          solution: `from pathlib import Path
import numpy as np
from llm import chat, embed

def chunk(text: str, size: int = 600, overlap: int = 100) -> list[str]:
    return [text[i:i + size] for i in range(0, len(text), size - overlap)]

chunks, sources = [], []
for path in sorted(Path("docs").glob("*.md")):
    for c in chunk(path.read_text(encoding="utf-8")):
        chunks.append(c); sources.append(path.name)

M = np.array(embed(chunks), dtype=np.float32)
M /= np.linalg.norm(M, axis=1, keepdims=True)

def ask(q: str, k: int = 3) -> str:
    qv = np.array(embed([q])[0], dtype=np.float32); qv /= np.linalg.norm(qv)
    top = np.argsort(-(M @ qv))[:k]
    ctx = "\\n\\n".join(f"[{i}] ({sources[j]}) {chunks[j]}" for i, j in enumerate(top, 1))
    return chat(f"Context:\\n{ctx}\\n\\nQuestion: {q}", temperature=0,
                system="Answer only from the context and cite like [1]. "
                       "If the answer isn't there, say: I couldn't find this in the documents.")

for q in ["How many sick leaves do employees get?", "What is the per diem in Chennai?", "Who founded the company?"]:
    print(q, "→", ask(q), "\\n")

# Production next steps: heading-aware chunks + metadata; vector DB with per-user filters;
# hybrid search + reranker; score-threshold fallback; streaming FastAPI endpoint;
# golden-set evals in CI; tracing, caching and cost logging.`,
          explanation: [
            "About 30 lines covers the whole pipeline. If you can type this from memory, the \"build a RAG in 45 minutes\" round becomes comfortable.",
            "Interviewers care as much about your production bullet points as about the code: they show you know what the simple version is missing.",
            "Note where you lost time (NumPy syntax? the embeddings call?) and drill just that part.",
          ],
          concepts: [
            ["Minimal viable pipeline", "The simplest end-to-end version that works; improve from there."],
          ],
        },
        {
          id: "timed-agent",
          title: "A tool-calling agent in 30 minutes",
          level: "Hard",
          task: [
            "Start a 30-minute timer. From memory, write an agent with two tools, `get_weather(city)` (fake data) and `convert_temp(celsius)`, a loop with a step cap, and a trace print. Ask: \"Is it warmer in Pune or Delhi right now, and what's the warmer one in Fahrenheit?\"",
          ],
          solution: `import json
from llm import client, CHAT_MODEL

WEATHER = {"pune": 29, "delhi": 34, "mumbai": 31}

def get_weather(city: str) -> dict:
    t = WEATHER.get(city.lower())
    return {"city": city, "celsius": t} if t is not None else {"error": f"no data for {city}"}

def convert_temp(celsius: float) -> dict:
    return {"fahrenheit": round(celsius * 9 / 5 + 32, 1)}

TOOLS = {"get_weather": get_weather, "convert_temp": convert_temp}
SPECS = [
    {"type": "function", "function": {"name": "get_weather", "description": "Current temperature (°C) for a city.",
     "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}},
    {"type": "function", "function": {"name": "convert_temp", "description": "Convert Celsius to Fahrenheit.",
     "parameters": {"type": "object", "properties": {"celsius": {"type": "number"}}, "required": ["celsius"]}}},
]

messages = [{"role": "user", "content": "Is it warmer in Pune or Delhi right now, and what's the warmer one in Fahrenheit?"}]
for step in range(6):
    msg = client.chat.completions.create(model=CHAT_MODEL, messages=messages, tools=SPECS).choices[0].message
    if not msg.tool_calls:
        print("answer:", msg.content)
        break
    messages.append(msg)
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)
        result = TOOLS[call.function.name](**args)
        print(f"step {step}: {call.function.name}({args}) → {result}")
        messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
else:
    print("stopped: step limit")`,
          explanation: [
            "The model should call `get_weather` twice (possibly in parallel in one step), then `convert_temp` for Delhi, then answer.",
            "`for ... else`: the `else` block runs only if the loop finished without `break`, which here means the step limit was hit.",
            "Must-remember details: append the assistant message with tool calls **before** the tool results, and match each result by `tool_call_id`.",
          ],
          concepts: [
            ["Parallel tool calls", "A model requesting several tools in one response."],
            ["`for ... else`", "The `else` runs when a loop ends without `break`."],
          ],
        },
      ],
    },
    {
      title: "Find the bugs",
      exercises: [
        {
          id: "debug-rag",
          title: "Find 5 bugs in this RAG code",
          level: "Hard",
          task: [
            "This code runs but gives wrong or unsafe results. Find all 5 bugs before opening the solution. Write down each bug and why it matters.",
          ],
          starter: `import numpy as np
from llm import chat, embed

def build_index(chunks, cache={}):                          # 1
    vecs = np.array(embed(chunks), dtype=np.float32)
    cache["m"] = vecs
    return vecs

def retrieve(query, chunks, matrix, k=3):
    q = np.array(embed([query])[0], dtype=np.float32)
    scores = matrix @ q                                        # 2
    top = np.argsort(scores)[:k]                               # 3
    return [chunks[i] for i in top]

def answer(query, chunks, matrix, user_docs_allowed):
    hits = retrieve(query, chunks, matrix)
    hits = [h for h in hits if h["doc"] in user_docs_allowed]  # 4
    ctx = "\\n".join(f"[{i}] {h['text']}" for i, h in enumerate(hits))   # 5
    return chat(f"{ctx}\\n\\nQ: {query}\\nAnswer with citations like [1].")`,
          solution: `import numpy as np
from llm import chat, embed

def normalise(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v, axis=-1, keepdims=True)

def build_index(chunks: list[dict]) -> np.ndarray:                     # fix 1: no mutable default cache
    return normalise(np.array(embed([c["text"] for c in chunks]), dtype=np.float32))

def retrieve(query, chunks, matrix, allowed_docs, k=3):
    q = normalise(np.array(embed([query])[0], dtype=np.float32))       # fix 2: normalise → cosine
    allowed = [i for i, c in enumerate(chunks) if c["doc"] in allowed_docs]   # fix 4: filter first
    scores = matrix[allowed] @ q
    top = np.argsort(-scores)[:k]                                      # fix 3: highest first
    return [chunks[allowed[j]] for j in top]

def answer(query, chunks, matrix, allowed_docs):
    hits = retrieve(query, chunks, matrix, allowed_docs)
    ctx = "\\n".join(f"[{i}] {h['text']}" for i, h in enumerate(hits, start=1))   # fix 5: number from 1
    return chat(f"{ctx}\\n\\nQ: {query}\\nAnswer with citations like [1]. "
                "If the context doesn't contain the answer, say you couldn't find it.")`,
          explanation: [
            "**1. Mutable default argument** (`cache={}`): shared across all calls, so one tenant's matrix can leak into another's. Never use `{}`/`[]` as defaults.",
            "**2. No normalisation:** `matrix @ q` is only cosine similarity if vectors are normalised; otherwise long vectors win regardless of meaning.",
            "**3. Wrong sort order:** `np.argsort(scores)` is ascending, so it returns the **least** similar chunks. Use `-scores`.",
            "**4. Filtering after top-k:** permissions applied after retrieval can leave zero allowed results (the top 3 were all forbidden), and in real systems it risks leaks. Filter before or during search.",
            "**5. Off-by-one citations:** `enumerate` starts at 0, but the prompt asks for `[1]`-style citations, so citations point at the wrong chunk. Use `start=1`. (Also added an \"I don't know\" rule.)",
          ],
          concepts: [
            ["Code review", "Reading code specifically to find correctness, security and quality problems."],
            ["Off-by-one error", "A mistake of exactly one in an index or count."],
          ],
        },
        {
          id: "debug-agent",
          title: "Find 4 bugs in this agent loop",
          level: "Hard",
          task: [
            "This agent sometimes loops forever, sometimes crashes with an API error, and has a security hole. Find all 4 problems.",
          ],
          starter: `import json
from llm import client, CHAT_MODEL

def run(goal, tools, specs):
    messages = [{"role": "user", "content": goal}]
    while True:                                                        # A
        msg = client.chat.completions.create(model=CHAT_MODEL, messages=messages,
                                             tools=specs).choices[0].message
        if not msg.tool_calls:
            return msg.content
        for call in msg.tool_calls:
            args = eval(call.function.arguments)                       # B
            result = tools[call.function.name](**args)                 # C
            messages.append({"role": "tool", "tool_call_id": call.id,
                             "content": json.dumps(result)})           # D`,
          solution: `import json
from llm import client, CHAT_MODEL

def run(goal, tools, specs, max_steps: int = 8):
    messages = [{"role": "user", "content": goal}]
    for _ in range(max_steps):                                         # A: bounded loop
        msg = client.chat.completions.create(model=CHAT_MODEL, messages=messages,
                                             tools=specs).choices[0].message
        if not msg.tool_calls:
            return msg.content
        messages.append(msg)                                           # D: assistant turn first
        for call in msg.tool_calls:
            try:
                args = json.loads(call.function.arguments)             # B: parse JSON, never eval
                fn = tools.get(call.function.name)
                result = fn(**args) if fn else {"error": f"unknown tool {call.function.name}"}
            except Exception as e:                                     # C: errors become observations
                result = {"error": f"{type(e).__name__}: {e}"}
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    return "Stopped: step limit reached."`,
          explanation: [
            "**A. Unbounded `while True`:** a confused model can call tools forever, burning money. Cap the steps (and ideally tokens and time).",
            "**B. `eval` on model output:** the arguments are text produced by a model that may have read attacker-controlled content. `eval` would run arbitrary Python. Use `json.loads`.",
            "**C. No error handling:** an unknown tool name or a tool exception crashes the whole request. Return the error as a tool result so the model can recover.",
            "**D. Missing assistant message:** tool results must follow the assistant message that requested them. Without `messages.append(msg)`, the API rejects the next request (tool message without a matching tool call).",
          ],
          concepts: [
            ["Code injection", "Running attacker-controlled text as code, e.g. through `eval`."],
            ["Bounded loop", "A loop with a guaranteed maximum number of iterations."],
          ],
        },
      ],
    },
    {
      title: "Interview practice tool",
      exercises: [
        {
          id: "mock-cli",
          title: "A mock interview CLI",
          level: "Medium",
          task: [
            "Build `mock.py`: it reads questions from `questions.json` (topic → list of questions), asks N random ones, times how long you speak before pressing Enter, asks you to rate your confidence 1–3, and appends results to `mock_log.csv`. At the end, print your weakest topics.",
          ],
          solution: `import csv, json, random, sys, time
from collections import defaultdict
from datetime import date
from pathlib import Path

# questions.json example: {"RAG": ["Explain RAG end to end.", "..."], "Agents": ["..."]}
bank = json.loads(Path("questions.json").read_text(encoding="utf-8"))
pool = [(topic, q) for topic, qs in bank.items() for q in qs]
n = int(sys.argv[1]) if len(sys.argv) > 1 else 5

scores = defaultdict(list)
log = Path("mock_log.csv")
new_file = not log.exists()
with log.open("a", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    if new_file:
        writer.writerow(["date", "topic", "question", "seconds", "confidence"])
    for topic, question in random.sample(pool, min(n, len(pool))):
        input(f"\\n[{topic}] {question}\\n  Press Enter and start answering out loud... ")
        start = time.perf_counter()
        input("  (press Enter when you finish speaking)")
        seconds = round(time.perf_counter() - start)
        conf = int(input("  Confidence 1 (shaky) - 3 (solid): ") or 1)
        scores[topic].append(conf)
        writer.writerow([date.today().isoformat(), topic, question, seconds, conf])

print("\\nweakest topics:")
for topic, vals in sorted(scores.items(), key=lambda kv: sum(kv[1]) / len(kv[1])):
    print(f"  {topic:<14} avg confidence {sum(vals) / len(vals):.1f}")`,
          explanation: [
            "`random.sample` picks questions without repeats; the CSV log lets you track progress across days (open it in Excel or pandas).",
            "Timing yourself trains the right length: aim for 60–120 seconds per concept answer.",
            "Fill `questions.json` from each lesson's interview questions, and revise the weakest topics' lessons and your notes next.",
          ],
          concepts: [
            ["`csv` module", "Reads and writes comma-separated files."],
            ["`random.sample()`", "Picks k unique items at random."],
            ["Spaced practice", "Revisiting weak topics repeatedly over days to remember them."],
          ],
        },
      ],
    },
  ],
};
