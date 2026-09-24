// Day 10 practice: agent fundamentals. Shape: see ./index.js
export default {
  intro:
    "Seven exercises that build agents and workflows in plain Python: a traced tool loop, a safe read-only SQL tool, a multi-step data agent, routing and prompt chaining workflows, plan-and-execute, guardrails that stop runaway loops, and simple long-term memory.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day10 && cd ~/genai-practice/day10
uv init --no-readme .
uv add openai python-dotenv pydantic
cp ../day03/llm.py ../day03/.env .`,
    },
    "Create a small sales database with this script (`make_db.py`), then run it once:",
    {
      lang: "python",
      code: `# make_db.py
import random, sqlite3
from datetime import date, timedelta

random.seed(7)
db = sqlite3.connect("sales.db")
db.executescript("""
DROP TABLE IF EXISTS customers; DROP TABLE IF EXISTS orders;
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT, segment TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount_inr REAL, created_at TEXT);
""")
cities = ["Pune", "Mumbai", "Delhi", "Bengaluru", "Chennai"]
for i in range(1, 31):
    db.execute("INSERT INTO customers VALUES (?, ?, ?, ?)",
               (i, f"Customer {i}", random.choice(cities), random.choice(["retail", "business"])))
for i in range(1, 301):
    day = date(2026, 6, 1) + timedelta(days=random.randint(0, 110))
    db.execute("INSERT INTO orders VALUES (?, ?, ?, ?)",
               (i, random.randint(1, 30), round(random.uniform(200, 20000), 2), day.isoformat()))
db.commit()
print("sales.db ready")`,
    },
    { note: "Tool calling needs a model that supports it. With Ollama, use `qwen2.5` or `llama3.1` (set `LLM_MODEL` in `.env`)." },
  ],
  groups: [
    {
      title: "The agent loop",
      exercises: [
        {
          id: "sql-tool",
          title: "A safe, read-only SQL tool",
          level: "Medium",
          task: [
            "Write `sql_query(query)` that runs a SELECT on `sales.db` through a **read-only** connection, returns at most 50 rows as `{columns, rows, truncated}`, and returns `{\"error\": ...}` instead of raising. Test with a valid SELECT, a typo, and `DELETE FROM orders`.",
          ],
          hint: "Open with `sqlite3.connect(\"file:sales.db?mode=ro\", uri=True)`. Column names are in `cursor.description`.",
          solution: `import sqlite3

def sql_query(query: str) -> dict:
    conn = sqlite3.connect("file:sales.db?mode=ro", uri=True)   # the database can't be changed
    try:
        cur = conn.execute(query)
        columns = [c[0] for c in cur.description or []]
        rows = cur.fetchmany(51)
        return {"columns": columns, "rows": rows[:50], "truncated": len(rows) > 50}
    except sqlite3.Error as e:
        return {"error": f"{type(e).__name__}: {e}"}
    finally:
        conn.close()

print(sql_query("SELECT city, COUNT(*) FROM customers GROUP BY city"))
print(sql_query("SELEC * FROM orders"))
print(sql_query("DELETE FROM orders"))`,
          explanation: [
            "Safety comes from the **read-only connection**, not from telling the model \"only use SELECT\". Even a cleverly written destructive query fails.",
            "Returning errors as data (instead of raising) lets the agent read the error and try a corrected query.",
            "Capping rows keeps huge results from flooding the model's context window.",
            "`finally` always runs, so the connection is closed even after an error.",
          ],
          concepts: [
            ["Read-only connection", "A database connection that can't modify data."],
            ["`try` / `except` / `finally`", "`finally` runs whether or not an error happened."],
            ["`cursor.description`", "Metadata about the result columns of a query."],
          ],
        },
        {
          id: "traced-agent",
          title: "A traced agent that answers multi-step questions",
          level: "Hard",
          task: [
            "Build `run_agent(goal)` with the `sql_query` tool and a `calculator` tool. Print a trace line for every step (tool, arguments, short result). Ask: \"Which city had the highest total order value in July 2026, and what is that total in US dollars at 83.5 INR per USD?\"",
          ],
          solution: `import ast, json, operator
from llm import client, CHAT_MODEL
from sql_tool import sql_query          # previous exercise saved as sql_tool.py

OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
       ast.Div: operator.truediv, ast.USub: operator.neg}

def calculator(expression: str) -> dict:
    def ev(n):
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)): return n.value
        if isinstance(n, ast.BinOp) and type(n.op) in OPS: return OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in OPS: return OPS[type(n.op)](ev(n.operand))
        raise ValueError("only numbers and + - * / are allowed")
    try:
        return {"result": round(ev(ast.parse(expression, mode="eval").body), 4)}
    except (ValueError, SyntaxError, ZeroDivisionError) as e:
        return {"error": str(e)}

TOOLS = {"sql_query": sql_query, "calculator": calculator}
SPECS = [
    {"type": "function", "function": {"name": "sql_query",
        "description": "Run a read-only SQLite SELECT. Tables: customers(id, name, city, segment), "
                       "orders(id, customer_id, amount_inr, created_at 'YYYY-MM-DD').",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "calculator",
        "description": "Evaluate arithmetic. Use it for every calculation.",
        "parameters": {"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]}}},
]
SYSTEM = ("You are a data assistant. Use tools to get facts; never guess numbers. "
          "If a tool returns an error, fix your call and try again once. Answer concisely.")

def run_agent(goal: str, max_steps: int = 8) -> str:
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": goal}]
    for step in range(1, max_steps + 1):
        msg = client.chat.completions.create(model=CHAT_MODEL, messages=messages, tools=SPECS).choices[0].message
        if not msg.tool_calls:
            return msg.content
        messages.append(msg)
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            result = TOOLS[call.function.name](**args)
            print(f"step {step}: {call.function.name}({args}) → {str(result)[:90]}")
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    return "Stopped: step limit reached."

print(run_agent("Which city had the highest total order value in July 2026, and what is that "
                "total in US dollars at 83.5 INR per USD?"))`,
          explanation: [
            "The model decides the steps: first a SQL query (join, filter July, group by city), then the calculator for the conversion, then the answer.",
            "The tool description includes the schema, so the model can write correct SQL without guessing column names.",
            "The trace is your debugging tool: when an answer is wrong you can see exactly which step went wrong.",
            "The calculator parses the expression into a tree with `ast` and evaluates only numbers and + − × ÷. Never pass model output to `eval()`.",
          ],
          concepts: [
            ["Agent", "An LLM in a loop that chooses tools, observes results and decides the next step."],
            ["Trace", "A log of every step an agent took."],
            ["`ast`", "Python's module for parsing code into a tree you can inspect without running it."],
          ],
        },
      ],
    },
    {
      title: "Workflows",
      exercises: [
        {
          id: "router",
          title: "Route requests to the right flow",
          level: "Medium",
          task: [
            "Write a router that classifies a message as `sales_question`, `smalltalk` or `out_of_scope` (JSON output), then dispatches: sales questions go to `run_agent`, smalltalk gets a short friendly reply, out-of-scope gets a polite refusal. Test with 4 messages.",
          ],
          solution: `import json
from llm import client, CHAT_MODEL, chat
from agent import run_agent              # previous exercise saved as agent.py

ROUTER = ('Classify the message. Reply as JSON {"intent": "sales_question" | "smalltalk" | "out_of_scope"}. '
          "sales_question = anything about our customers, orders or revenue.")

def route(message: str) -> str:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": ROUTER}, {"role": "user", "content": message}])
    return json.loads(r.choices[0].message.content).get("intent", "out_of_scope")

def handle(message: str) -> str:
    intent = route(message)
    print(f"[{intent}]", message)
    if intent == "sales_question":
        return run_agent(message)
    if intent == "smalltalk":
        return chat(message, system="Reply warmly in one short sentence.", max_tokens=40)
    return "Sorry, I can only help with questions about our sales data."

for m in ["How many customers are in Pune?", "hi there!", "Write me a poem about rain", "Total revenue in August?"]:
    print("→", handle(m), "\\n")`,
          explanation: [
            "Routing is a **workflow**: your code decides the path after one cheap classification. It's predictable, testable and cheap compared with sending everything to an agent.",
            "Many production \"agents\" are really a router plus a few fixed flows.",
            "`.get(\"intent\", \"out_of_scope\")` defaults to the safest route if the model returns something unexpected.",
          ],
          concepts: [
            ["Routing", "Classifying input and sending it to a specialised handler."],
            ["Workflow vs agent", "In a workflow your code decides the steps; in an agent the model does."],
          ],
        },
        {
          id: "chaining",
          title: "Prompt chaining with a check step",
          level: "Medium",
          task: [
            "Turn a messy customer complaint into a reply in 3 steps: (1) extract the facts as JSON, (2) draft a polite reply using only those facts, (3) check the draft against a rule list (no promises of refunds, under 80 words) and fix it if needed. Print each step's output.",
          ],
          solution: `import json
from llm import chat, client, CHAT_MODEL

complaint = ("ordered a pressure cooker #7781 on 2 sept, came with broken whistle!! "
             "i want replacement asap, very disappointed. - Kavita")

facts = json.loads(client.chat.completions.create(
    model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
    messages=[{"role": "system", "content": 'Extract JSON: {"name", "order_id", "product", "problem", "request"}'},
              {"role": "user", "content": complaint}]).choices[0].message.content)
print("1. facts:", facts)

draft = chat(f"Write a polite support reply using only these facts: {json.dumps(facts)}",
             system="You are a support agent for an Indian kitchenware brand.", temperature=0.3)
print("2. draft:", draft)

RULES = "- Never promise a refund or a delivery date.\\n- Under 80 words.\\n- Address the customer by name."
final = chat(f"Rules:\\n{RULES}\\n\\nDraft:\\n{draft}\\n\\nIf the draft breaks any rule, rewrite it. "
             "Otherwise return it unchanged. Return only the reply text.", temperature=0)
print("3. final:", final, f"({len(final.split())} words)")`,
          explanation: [
            "Each step does one simple job, which is more reliable than one giant prompt doing everything.",
            "Structured facts in the middle make the draft step easy to check and debug.",
            "The check step is a mini evaluator. For hard rules like word count, a code check (`len(final.split()) < 80`) is even more reliable than asking the model.",
          ],
          concepts: [
            ["Prompt chaining", "Several LLM calls in a fixed sequence, each using the previous output."],
            ["Evaluator step", "A call (or code check) that verifies output against rules."],
          ],
        },
        {
          id: "plan-execute",
          title: "Plan first, then execute",
          level: "Hard",
          task: [
            "For a goal like \"Compare July and August 2026 revenue, find the best customer segment in August, and summarise in 3 bullets\", ask the model for a plan of 2–5 steps (JSON), print it, run each step with `run_agent` (passing results so far), and then write a final summary.",
          ],
          solution: `import json
from llm import client, CHAT_MODEL, chat
from agent import run_agent

goal = ("Compare July and August 2026 revenue, find the best customer segment in August, "
        "and summarise in 3 bullets.")

plan = json.loads(client.chat.completions.create(
    model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
    messages=[{"role": "system", "content": 'Break the goal into 2-5 concrete data steps. Reply as JSON {"steps": [...]}'},
              {"role": "user", "content": goal}]).choices[0].message.content)["steps"]
for i, step in enumerate(plan, 1):
    print(f"plan {i}. {step}")

results = []
for i, step in enumerate(plan, 1):
    out = run_agent(f"Overall goal: {goal}\\nResults so far: {results}\\nDo only step {i}: {step}", max_steps=5)
    results.append({"step": step, "result": out})

print("\\nFINAL:\\n" + chat(f"Goal: {goal}\\nStep results: {json.dumps(results)}\\nWrite the final answer."))`,
          explanation: [
            "An explicit plan keeps long tasks on track and makes progress visible to users (\"Step 2 of 4\").",
            "Passing earlier results into each step gives the agent the context it needs without resending the whole history.",
            "Reasoning models often plan internally; explicit planning is still useful when you want to show or check the plan.",
          ],
          concepts: [
            ["Plan-and-execute", "Generate a step list first, then run the steps one by one."],
          ],
        },
      ],
    },
    {
      title: "Guardrails and memory",
      exercises: [
        {
          id: "budget",
          title: "Stop runaway agents",
          level: "Medium",
          task: [
            "Write a `Budget` class that raises `AgentStop` when steps exceed a limit, total tokens exceed a budget, or the same tool is called with the same arguments twice. Plug it into your agent and test with a tool that always returns an error.",
          ],
          solution: `import json

class AgentStop(Exception):
    pass

class Budget:
    def __init__(self, max_steps: int = 6, max_tokens: int = 20_000):
        self.max_steps, self.max_tokens = max_steps, max_tokens
        self.steps = self.tokens = 0
        self.seen: set[str] = set()

    def step(self, usage_tokens: int) -> None:
        self.steps += 1
        self.tokens += usage_tokens
        if self.steps > self.max_steps:
            raise AgentStop("step limit reached")
        if self.tokens > self.max_tokens:
            raise AgentStop("token budget exceeded")

    def tool_call(self, name: str, args: dict) -> None:
        signature = f"{name}:{json.dumps(args, sort_keys=True)}"
        if signature in self.seen:
            raise AgentStop(f"repeated identical call {signature}")
        self.seen.add(signature)

# In run_agent:
#   budget = Budget()
#   r = client.chat.completions.create(...)
#   budget.step(r.usage.total_tokens if r.usage else 0)
#   for call in msg.tool_calls: budget.tool_call(call.function.name, args); ...
#   wrap the loop in try/except AgentStop as e: return f"I had to stop ({e}). Partial findings: ..."

b = Budget(max_steps=3)
try:
    for _ in range(5):
        b.step(1000)
        b.tool_call("broken_tool", {"x": 1})
except AgentStop as e:
    print("stopped:", e)`,
          explanation: [
            "Agents can loop: calling the same failing tool, or burning tokens as the context grows. Hard limits in **your** code are the fix, not instructions in the prompt.",
            "`json.dumps(args, sort_keys=True)` gives the same text for the same arguments regardless of key order, so repeated calls are detected reliably.",
            "A custom exception class (`class AgentStop(Exception)`) lets you catch exactly this situation and return a graceful partial answer.",
          ],
          concepts: [
            ["Custom exception", "Your own error type, created by subclassing `Exception`."],
            ["Budget / limit", "A hard cap on steps, tokens or time that stops an agent."],
            ["`sort_keys=True`", "Makes JSON output deterministic by sorting dict keys."],
          ],
        },
        {
          id: "memory",
          title: "Remember facts across sessions",
          level: "Medium",
          task: [
            "After a conversation, ask the LLM to extract durable facts about the user as a JSON list and save them to `memory_<user>.json` (merged, no duplicates). At the start of the next session, load them into the system prompt. Show that a new session knows the user prefers Hindi and works in finance.",
          ],
          solution: `import json
from pathlib import Path
from llm import client, CHAT_MODEL, chat

def memory_file(user: str) -> Path:
    return Path(f"memory_{user}.json")

def load_memory(user: str) -> list[str]:
    f = memory_file(user)
    return json.loads(f.read_text()) if f.exists() else []

def save_facts(user: str, conversation: str) -> None:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": 'Extract lasting facts and preferences about the user '
                   '(not one-off questions). Reply as JSON {"facts": ["..."]}'},
                  {"role": "user", "content": conversation}])
    facts = json.loads(r.choices[0].message.content)["facts"]
    merged = list(dict.fromkeys(load_memory(user) + facts))
    memory_file(user).write_text(json.dumps(merged, indent=2, ensure_ascii=False))

# session 1
save_facts("asha", "User: I work in the finance team. Please reply in Hindi from now on. "
                   "Also what's our Q2 revenue?")
print("saved:", load_memory("asha"))

# session 2 (a new conversation)
facts = "\\n".join(f"- {f}" for f in load_memory("asha"))
print(chat("Suggest one report I might find useful this week.",
           system=f"You are a company assistant. Known facts about this user:\\n{facts}"))`,
          explanation: [
            "Short-term memory is the message list. **Long-term** memory is facts saved outside the conversation and loaded into later ones.",
            "Extract durable facts (role, preferences), not one-off questions. Real systems store them per user in a database and retrieve relevant ones like RAG.",
            "Memory is personal data: let users see and delete it.",
          ],
          concepts: [
            ["Long-term memory", "Information kept across conversations, stored outside the model."],
            ["`dict.fromkeys(list)`", "Removes duplicates while keeping order."],
          ],
        },
      ],
    },
  ],
};
