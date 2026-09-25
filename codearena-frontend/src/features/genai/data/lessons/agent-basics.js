// Day 10: Agent fundamentals. Shape: see ./index.js
export default {
  react: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "An **agent** is an LLM that decides, step by step, which tools to call to achieve a goal, observing each result before deciding the next step. Under the hood it's the tool-calling loop from Day 12 with the model in charge of how many steps to take. The classic pattern behind it is called **ReAct**.",
    sections: [
      {
        h: "ReAct: reason + act",
        blocks: [
          "ReAct (from a 2022 paper) interleaves **thoughts**, **actions** and **observations**:",
          {
            lang: "text",
            code: `Goal: "Which of our top 3 customers by revenue has an open support ticket?"

Thought:  I need the top customers first.
Action:   sql_query("SELECT name, SUM(amount) ... ORDER BY 2 DESC LIMIT 3")
Observation: [Acme, Globex, Initech]
Thought:  Now check open tickets for these three.
Action:   search_tickets(customers=["Acme","Globex","Initech"], status="open")
Observation: [{"customer": "Globex", "id": 812, "subject": "Invoice mismatch"}]
Thought:  I have the answer.
Answer:   Globex has an open ticket (#812, "Invoice mismatch").`,
          },
          "Modern models do this natively through tool calling: the \"thought\" may be hidden reasoning or short text, the \"action\" is a tool call, and the \"observation\" is the tool result you append. You rarely write ReAct-format prompts by hand any more, but the loop is the same.",
        ],
      },
      {
        h: "The agent loop by hand",
        blocks: [
          {
            lang: "python",
            code: `import json

def run_agent(goal: str, tools: dict, tool_specs: list, max_steps: int = 8) -> str:
    messages = [
        {"role": "system", "content": AGENT_SYSTEM},
        {"role": "user", "content": goal},
    ]
    for step in range(max_steps):
        r = client.chat.completions.create(model=MODEL, messages=messages, tools=tool_specs)
        msg = r.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:                         # the model decided it's done
            return msg.content
        for call in msg.tool_calls:
            name, args = call.function.name, json.loads(call.function.arguments)
            logger.info("step=%d tool=%s args=%s", step, name, args)
            try:
                result = tools[name](**args)
            except Exception as e:
                result = {"error": f"{type(e).__name__}: {e}"}
            messages.append({"role": "tool", "tool_call_id": call.id,
                             "content": json.dumps(result, default=str)[:4000]})   # cap size
    return "I couldn't finish within the step limit. Here's what I found so far: ..."`,
          },
          {
            list: [
              "**The model controls the loop:** it keeps calling tools until it answers without one.",
              "**You control the limits:** max steps, timeouts, output truncation, which tools exist.",
              "**Errors become observations**, so the model can adapt (try a different query, ask the user).",
              "**Everything is logged:** agents are hard to debug without a trace of each step.",
            ],
          },
        ],
      },
      {
        h: "The agent system prompt",
        blocks: [
          {
            lang: "text",
            code: `You are an operations assistant for Acme's sales team.
You can query the sales database and the ticket system using the tools provided.

How to work:
- Break the goal into steps. Use tools to get facts; never guess numbers or names.
- If a tool returns an error, read it and try a corrected call once. If it fails again, explain.
- When you have enough information, answer concisely with the key figures.
- If the request is ambiguous (e.g. which time period), ask one clarifying question instead of guessing.
- Never modify data. You only have read access.`,
          },
        ],
      },
    ],
    revise: [
      "Agent = LLM in a loop choosing tools, observing results, deciding the next step, until it answers.",
      "ReAct = thought → action → observation, repeated; native tool calling implements it today.",
      "You own the limits: max steps, timeouts, truncated tool output, tool set, logging.",
      "Tool errors are returned as observations so the model can recover.",
    ],
    interview: [
      {
        q: "What is an AI agent?",
        a: "A system where an LLM dynamically directs its own process: given a goal and a set of tools, it decides which tool to call, observes the result, and repeats until it can answer or complete the task. Unlike a fixed chain, the number and order of steps are decided by the model at runtime, within limits the developer sets.",
      },
      {
        q: "How does the ReAct pattern work?",
        a: "The model alternates reasoning about what to do next, taking an action through a tool, and observing the result, which is appended to its context for the next reasoning step. This grounds reasoning in real observations and lets the model adapt its plan. With modern function calling, actions are structured tool calls and observations are tool results in the message list.",
      },
    ],
    practice: [
      "Write `run_agent` with two toy tools (`add(a, b)` and `lookup_capital(country)`) and trace a goal that needs both.",
    ],
  },

  workflows: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "Not everything should be an agent. Anthropic's widely cited guide *\"Building effective agents\"* makes a key distinction: **workflows**, where your code defines the steps, and **agents**, where the model decides them. Most reliable production systems are workflows, with agents used only where flexibility is really needed.",
    sections: [
      {
        h: "Workflow patterns",
        blocks: [
          {
            table: {
              head: ["Pattern", "How it works", "Example"],
              rows: [
                ["**Prompt chaining**", "Fixed sequence of LLM calls, each using the previous output; optional checks between steps", "Extract facts → draft email → check tone"],
                ["**Routing**", "Classify the input, then send it to a specialised prompt, model or pipeline", "Billing questions → billing flow; tech issues → RAG over docs; easy → small model"],
                ["**Parallelisation**", "Run independent LLM calls at once (sectioning), or the same call several times and vote", "Check a contract for 5 risk types in parallel"],
                ["**Orchestrator–workers**", "An LLM breaks the task into subtasks dynamically, workers handle each, results combined", "Change code across several files"],
                ["**Evaluator–optimizer**", "One LLM generates, another critiques, loop until good enough", "Translation or report refinement"],
              ],
            },
          },
          {
            lang: "python",
            code: `# Routing: cheap classification decides the path
class Route(BaseModel):
    intent: Literal["order_status", "refund", "product_question", "other"]

async def handle(message: str, user):
    route = await small_llm.structured(ROUTER_PROMPT, message, Route)
    match route.intent:
        case "order_status":     return await order_status_flow(message, user)
        case "refund":           return await refund_flow(message, user)       # has approval steps
        case "product_question": return await rag_answer(message, user)
        case _:                  return await general_chat(message, user)`,
          },
        ],
      },
      {
        h: "When to use an agent",
        blocks: [
          {
            table: {
              head: ["Prefer a workflow when…", "Consider an agent when…"],
              rows: [
                ["The steps are known in advance", "The number and order of steps can't be predicted"],
                ["Predictability, cost and latency matter most", "Flexibility is worth extra cost and latency"],
                ["Mistakes are expensive and hard to reverse", "Errors can be detected and recovered (tests, reviews, undo)"],
                ["You need to explain exactly what happened", "The task is open-ended research, coding or investigation"],
              ],
            },
          },
          "Start with the simplest thing: one well-prompted LLM call with retrieval and tools. Move to a workflow when you need several steps, and to an agent only when the path truly varies. Many \"agents\" in production are really routers plus fixed flows, and that's fine.",
          {
            note: "Frameworks (LangGraph, CrewAI, agent SDKs) make it easy to build agents, but they don't make agents the right choice. In interviews, being able to argue for a *simpler* design is a strong signal.",
          },
        ],
      },
    ],
    revise: [
      "Workflow = code decides the steps; agent = model decides the steps.",
      "Patterns: prompt chaining, routing, parallelisation, orchestrator–workers, evaluator–optimizer.",
      "Use agents only when steps are unpredictable and errors are recoverable; otherwise workflows.",
      "Start simple: one call → workflow → agent.",
    ],
    interview: [
      {
        q: "Agent vs chain vs workflow?",
        a: "A chain is a fixed sequence of steps. A workflow is a broader code-defined orchestration of LLM calls and tools, including routing, parallel calls and loops with checks. An agent lets the LLM decide which tools to call and when to stop. Workflows are more predictable, cheaper and easier to debug; agents are more flexible for open-ended tasks. I'd choose the simplest structure that meets the requirement.",
      },
      {
        q: "When is an agent the wrong choice?",
        a: "When the steps are known and stable, when latency and cost must be tight and predictable, when actions are high-stakes or irreversible without review, or when you need a fully auditable, deterministic process. Examples: a fixed document-processing pipeline, form extraction, or a payments flow. A workflow with explicit steps and checks is better there.",
      },
    ],
    practice: [
      "Take a support-bot idea and design it as a router + 3 fixed flows. Write down which part, if any, needs an agent.",
    ],
  },

  planning: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "Beyond the basic loop, agents get better with **planning** (thinking ahead), **reflection** (checking their own work) and **memory** (remembering across steps and sessions). These ideas show up in every agent framework and interview.",
    sections: [
      {
        h: "Planning",
        blocks: [
          {
            list: [
              "**Plan-and-execute:** first ask the model for a numbered plan, then execute each step (with tools), re-planning if something unexpected happens. It keeps long tasks on track and makes progress visible to users.",
              "**Implicit planning:** reasoning models and extended thinking plan internally; you just give a clear goal and tools.",
              "**Task lists as state:** store the plan in the agent's state (a todo list) so it survives many steps and can be shown in the UI.",
            ],
          },
          {
            lang: "python",
            code: `class Plan(BaseModel):
    steps: list[str] = Field(description="3-7 concrete steps, each doable with one or two tool calls")

plan = llm.structured(PLANNER_PROMPT, goal, Plan)
results = []
for i, step in enumerate(plan.steps, 1):
    out = run_agent(f"Overall goal: {goal}\\nCompleted so far: {results}\\nNow do step {i}: {step}",
                    tools, tool_specs, max_steps=4)
    results.append({"step": step, "result": out})
final = llm.complete(system="Write the final answer from these step results.", messages=[...])`,
          },
        ],
      },
      {
        h: "Reflection",
        blocks: [
          "Ask the model (or a second model) to critique its output against the goal and fix problems: \"Check the answer: are all numbers from tool results? Does it answer every part of the question?\" It's the evaluator–optimizer pattern applied inside an agent. Cap the iterations; reflection can loop.",
        ],
      },
      {
        h: "Memory types",
        blocks: [
          {
            table: {
              head: ["Memory", "What", "Implementation"],
              rows: [
                ["**Short-term (working)**", "The current conversation and tool results", "The message list / agent state; trimmed or summarised"],
                ["**Long-term: semantic**", "Facts about the user or world (\"prefers Hindi\", \"works in finance\")", "A store of facts, retrieved by similarity or key"],
                ["**Long-term: episodic**", "Past interactions and how they went", "Summaries of past sessions, retrieved when relevant"],
                ["**Procedural**", "How to do things", "The system prompt, tool descriptions, learned instructions"],
              ],
            },
          },
          "Long-term memory is usually RAG over the user's own history: after a conversation, extract durable facts (with an LLM), store them with the user id, and retrieve relevant ones at the start of the next conversation. Libraries such as Mem0 and LangGraph's store provide this.",
          {
            warn: "Memory is personal data. Let users see and delete what's remembered, and don't store sensitive details without consent.",
          },
        ],
      },
    ],
    revise: [
      "Plan-and-execute: explicit plan, execute steps, re-plan; or rely on reasoning models' implicit planning.",
      "Reflection: critique against the goal and fix; cap iterations.",
      "Memory: short-term (messages/state), long-term semantic (facts), episodic (past sessions), procedural (instructions).",
      "Long-term memory = extract facts → store per user → retrieve like RAG; handle privacy.",
    ],
    interview: [
      {
        q: "Short-term vs long-term memory in agents?",
        a: "Short-term memory is the working context of the current task: messages, tool results and state, bounded by the context window and managed by trimming or summarisation. Long-term memory persists across sessions: facts about the user, past interaction summaries or learned preferences, stored externally (a database or vector store) and retrieved into context when relevant.",
      },
    ],
    practice: [
      "Add a planning step to your agent: print the plan, then execute it step by step.",
    ],
  },

  failures: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Agents fail in characteristic ways. Knowing them, and the guardrails for each, is what interviewers look for when they ask \"what could go wrong?\".",
    sections: [
      {
        h: "Failure modes and fixes",
        blocks: [
          {
            table: {
              head: ["Failure", "Looks like", "Guardrail"],
              rows: [
                ["**Infinite / long loops**", "Calls the same tool repeatedly, never finishes", "Max steps, detect repeated identical calls, time and token budgets"],
                ["**Wrong tool or arguments**", "Uses search when it should query SQL; invalid IDs", "Fewer, clearer tools; strict schemas; validate arguments; good error messages"],
                ["**Hallucinated results**", "Answers with numbers no tool returned", "Instructions + a final check that figures come from observations"],
                ["**Cost blow-ups**", "One request makes 40 LLM calls with growing context", "Per-request token/cost budgets; truncate tool outputs; summarise history"],
                ["**Context overflow**", "Huge tool outputs fill the context", "Truncate, paginate, or summarise tool results; return IDs not full documents"],
                ["**Unsafe actions**", "Deletes or sends something it shouldn't", "Read-only by default, permission checks, human approval (Day 14)"],
                ["**Prompt injection via tools**", "A web page or email tells the agent to do something else", "Treat tool outputs as data, limit tool powers, approval for side effects (Day 16)"],
                ["**Giving up or over-asking**", "Stops early or asks unnecessary questions", "Clear instructions on when to ask vs proceed; examples"],
              ],
            },
          },
        ],
      },
      {
        h: "Guardrails in code",
        blocks: [
          {
            lang: "python",
            code: `class Budget:
    def __init__(self, max_steps=10, max_tokens=50_000, max_seconds=60):
        self.max_steps, self.max_tokens, self.max_seconds = max_steps, max_tokens, max_seconds
        self.steps = self.tokens = 0
        self.start = time.monotonic()
        self.seen_calls: set[str] = set()

    def check(self, usage_tokens: int, call_signature: str | None = None):
        self.steps += 1
        self.tokens += usage_tokens
        if self.steps > self.max_steps:
            raise AgentStop("step limit reached")
        if self.tokens > self.max_tokens:
            raise AgentStop("token budget exceeded")
        if time.monotonic() - self.start > self.max_seconds:
            raise AgentStop("time limit reached")
        if call_signature and call_signature in self.seen_calls:
            raise AgentStop(f"repeated identical call: {call_signature}")
        if call_signature:
            self.seen_calls.add(call_signature)`,
          },
          "When a limit is hit, return a helpful partial answer (\"Here's what I found; I couldn't finish X\") instead of an error, and log the full trace for review.",
        ],
      },
    ],
    revise: [
      "Failure modes: loops, wrong tools/args, hallucinated results, cost blow-ups, context overflow, unsafe actions, injection, giving up.",
      "Guardrails: step/token/time budgets, repeated-call detection, strict schemas, truncated tool output, read-only defaults, approvals.",
      "On limits, return a partial answer and log the trace.",
    ],
    interview: [
      {
        q: "How do you stop an agent from looping forever?",
        a: "Enforce hard limits in the orchestration code: maximum steps, a token or cost budget and a wall-clock timeout; detect repeated identical tool calls; make tool errors informative so the model can change approach; and design clear stop conditions in the prompt. When a limit is hit, return a graceful partial result and log the trace to improve prompts and tools.",
      },
    ],
    practice: [
      "Add the `Budget` class to your agent and write a tool that always errors, to see the loop stop cleanly.",
    ],
  },

  "raw-agent": {
    minutes: 240,
    level: "Intermediate",
    intro:
      "Build a data assistant agent in plain Python (no framework) with three tools: web search, a calculator and a read-only SQL query tool. It answers questions like \"What's our revenue this month in dollars at today's exchange rate?\". Building it by hand makes LangGraph tomorrow easy to understand.",
    sections: [
      {
        h: "The tools",
        blocks: [
          {
            lang: "python",
            code: `import ast, operator, sqlite3, httpx

# 1) Calculator: safe arithmetic, never eval() on model output
OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
       ast.Div: operator.truediv, ast.Pow: operator.pow, ast.USub: operator.neg}

def calculator(expression: str) -> dict:
    def ev(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.operand))
        raise ValueError("unsupported expression")
    return {"result": ev(ast.parse(expression, mode="eval").body)}

# 2) Read-only SQL over a sample sales DB
def sql_query(query: str) -> dict:
    if not query.strip().lower().startswith("select"):
        return {"error": "Only SELECT queries are allowed"}
    conn = sqlite3.connect("file:sales.db?mode=ro", uri=True)      # read-only connection
    try:
        cur = conn.execute(query)
        cols = [c[0] for c in cur.description]
        rows = cur.fetchmany(50)                                     # cap rows
        return {"columns": cols, "rows": rows, "truncated": len(rows) == 50}
    finally:
        conn.close()

# 3) Web search via a search API (Tavily, Brave, SerpAPI...; most have free tiers)
def web_search(query: str) -> dict:
    r = httpx.post("https://api.tavily.com/search", timeout=20,
                   json={"api_key": TAVILY_KEY, "query": query, "max_results": 3})
    return {"results": [{"title": x["title"], "url": x["url"], "snippet": x["content"][:500]}
                        for x in r.json()["results"]]}`,
          },
          {
            warn: "Never `eval()` model output, and never give an agent a read-write database connection \"because the prompt says SELECT only\". Enforce safety in code: a read-only connection, a restricted DB user, row limits.",
          },
        ],
      },
      {
        h: "Tool specs",
        blocks: [
          {
            lang: "python",
            code: `SCHEMA_HINT = "Tables: orders(id, customer, amount_inr, created_at), customers(name, city, segment)"

TOOL_SPECS = [
    {"type": "function", "function": {
        "name": "sql_query",
        "description": f"Run a read-only SQLite SELECT on the sales database. {SCHEMA_HINT}. "
                       "Returns up to 50 rows. Use it for any question about our sales data.",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}},
                       "required": ["query"], "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "calculator",
        "description": "Evaluate an arithmetic expression like '125000 / 83.2'. Use for all maths.",
        "parameters": {"type": "object", "properties": {"expression": {"type": "string"}},
                       "required": ["expression"], "additionalProperties": False}}},
    {"type": "function", "function": {
        "name": "web_search",
        "description": "Search the web for current public information (exchange rates, news). Returns 3 results.",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}},
                       "required": ["query"], "additionalProperties": False}}},
]`,
          },
        ],
      },
      {
        h: "Run, trace and test",
        blocks: [
          {
            list: [
              "Create `sales.db` with a script that inserts ~200 fake orders.",
              "Plug the tools into `run_agent` with the `Budget` guardrails.",
              "Print a readable trace: step number, tool, arguments, a short result preview, tokens used.",
              "Test with 8 goals: single-tool, multi-tool, an impossible one, one needing a clarifying question, and one that tries to `DELETE` data.",
              "Save traces of 3 interesting runs in the repo README.",
            ],
            ordered: true,
          },
        ],
      },
    ],
    revise: [
      "Tools: safe calculator (AST, no eval), read-only SQL (read-only connection, row cap), web search API.",
      "Tool descriptions include schema hints and when to use each tool.",
      "Safety in code, not in the prompt.",
      "Trace every step; test multi-tool, impossible, ambiguous and malicious goals.",
    ],
    practice: [
      "Add a `list_tables` tool so the agent discovers the schema itself instead of reading it from the description.",
    ],
  },
};
