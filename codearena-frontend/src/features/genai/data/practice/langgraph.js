// Day 11 practice: LangGraph. Shape: see ./index.js
export default {
  intro:
    "Seven exercises that take you from a tiny graph with no LLM to a persistent agent with human approval: state and reducers, conditional edges, a tool-calling agent, threads with checkpointers, interrupts, streaming, persistence across restarts, and subgraphs.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day11 && cd ~/genai-practice/day11
uv init --no-readme .
uv add langgraph langchain-openai langchain-core langgraph-checkpoint-sqlite python-dotenv
cp ../day07/lc.py ../day03/.env . && cp ../day10/sales.db ../day10/sql_tool.py .`,
    },
    { note: "For tool calling with Ollama, set `LLM_MODEL=qwen2.5` (or `llama3.1`) in `.env`." },
  ],
  groups: [
    {
      title: "Graph basics",
      exercises: [
        {
          id: "first-graph",
          title: "A graph without any LLM",
          level: "Easy",
          task: [
            "Build a graph that takes a number, routes to `even` or `odd` nodes with a conditional edge, and appends a log line at each node using a list reducer. Print the final state for 7 and 10.",
            { lang: "text", code: `{'n': 7, 'log': ['start: got 7', 'odd: 7 is odd']}` },
          ],
          hint: "State: `class State(TypedDict): n: int; log: Annotated[list[str], operator.add]`.",
          solution: `import operator
from typing import Annotated, TypedDict
from langgraph.graph import END, START, StateGraph

class State(TypedDict):
    n: int
    log: Annotated[list[str], operator.add]    # reducer: new lists are appended

def start(state: State) -> dict:
    return {"log": [f"start: got {state['n']}"]}

def even(state: State) -> dict:
    return {"log": [f"even: {state['n']} is even"]}

def odd(state: State) -> dict:
    return {"log": [f"odd: {state['n']} is odd"]}

builder = StateGraph(State)
builder.add_node("start", start)
builder.add_node("even", even)
builder.add_node("odd", odd)
builder.add_edge(START, "start")
builder.add_conditional_edges("start", lambda s: "even" if s["n"] % 2 == 0 else "odd")
builder.add_edge("even", END)
builder.add_edge("odd", END)
graph = builder.compile()

print(graph.invoke({"n": 7, "log": []}))
print(graph.invoke({"n": 10, "log": []}))
print(graph.get_graph().draw_mermaid())`,
          explanation: [
            "**State** is a typed dict shared by all nodes. Each node returns only the keys it wants to change.",
            "`Annotated[list[str], operator.add]` attaches a **reducer**: instead of replacing `log`, LangGraph adds the new list to the old one.",
            "`add_conditional_edges` takes a function that reads the state and returns the name of the next node.",
            "`draw_mermaid()` prints a diagram you can paste into a README (GitHub renders Mermaid).",
          ],
          concepts: [
            ["`StateGraph`", "Builder for a graph of nodes that share a state."],
            ["Node", "A function: state in, partial state update out."],
            ["Reducer", "Rule for merging a node's update into the state (default: replace)."],
            ["`START` / `END`", "The graph's entry and exit points."],
          ],
        },
        {
          id: "tool-agent-graph",
          title: "A tool-calling agent as a graph",
          level: "Medium",
          task: [
            "Wrap `sql_query` from Day 10 as a LangChain `@tool`, bind it to the model, and build the classic agent graph: `agent` node → `tools_condition` → `ToolNode` → back to `agent`. Ask \"How many orders came from Pune customers in August 2026?\" with `recursion_limit=10`, then print every message type in the result.",
          ],
          solution: `from typing import Annotated, TypedDict
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from lc import llm
from sql_tool import sql_query as run_sql

@tool
def sql_query(query: str) -> dict:
    """Run a read-only SQLite SELECT. Tables: customers(id, name, city, segment),
    orders(id, customer_id, amount_inr, created_at 'YYYY-MM-DD')."""
    return run_sql(query)

class State(TypedDict):
    messages: Annotated[list, add_messages]

tools = [sql_query]
model = llm.bind_tools(tools)
SYSTEM = SystemMessage("You answer questions about sales data using the sql_query tool. Never guess numbers.")

def agent(state: State) -> dict:
    return {"messages": [model.invoke([SYSTEM, *state["messages"]])]}

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)   # → "tools" or END
builder.add_edge("tools", "agent")
graph = builder.compile()

result = graph.invoke({"messages": [("user", "How many orders came from Pune customers in August 2026?")]},
                      config={"recursion_limit": 10})
for m in result["messages"]:
    print(f"{m.type:>9}: {str(m.content)[:100] or m.tool_calls}")`,
          explanation: [
            "This is yesterday's hand-written loop as a graph: the agent node calls the model; `tools_condition` checks for tool calls; `ToolNode` runs them and adds tool messages; the edge loops back.",
            "The `@tool` decorator turns a function into a tool; its **docstring becomes the description** the model reads, so write it carefully.",
            "`add_messages` is a reducer that appends messages. `recursion_limit` caps the number of steps.",
          ],
          concepts: [
            ["`@tool`", "LangChain decorator that makes a function callable as an LLM tool."],
            ["`bind_tools()`", "Tells the chat model which tools it may call."],
            ["`ToolNode`", "Prebuilt node that executes the tool calls in the last message."],
            ["`tools_condition`", "Prebuilt router: go to tools if there are tool calls, otherwise end."],
          ],
        },
      ],
    },
    {
      title: "State that lasts",
      exercises: [
        {
          id: "threads",
          title: "Conversations with thread ids",
          level: "Easy",
          task: [
            "Compile the agent graph with `InMemorySaver`. In thread `\"t1\"`, ask about Pune orders, then ask \"And Mumbai?\" (sending only the new message). Then ask \"And Mumbai?\" in a new thread `\"t2\"` and compare.",
          ],
          solution: `from langgraph.checkpoint.memory import InMemorySaver
from agent_graph import builder          # previous exercise saved as agent_graph.py

graph = builder.compile(checkpointer=InMemorySaver())
t1 = {"configurable": {"thread_id": "t1"}, "recursion_limit": 10}
t2 = {"configurable": {"thread_id": "t2"}, "recursion_limit": 10}

ask = lambda text, cfg: graph.invoke({"messages": [("user", text)]}, cfg)["messages"][-1].content

print("t1:", ask("How many orders came from Pune customers in August 2026?", t1))
print("t1:", ask("And Mumbai?", t1))
print("t2:", ask("And Mumbai?", t2))
print("messages stored in t1:", len(graph.get_state(t1).values["messages"]))`,
          explanation: [
            "A checkpointer saves the state after every step, keyed by `thread_id`. Each call only sends the new message; the rest is restored automatically.",
            "Thread `t2` has no history, so \"And Mumbai?\" is ambiguous there.",
            "`graph.get_state(config)` lets you inspect a thread's saved state; useful for debugging and for reloading a chat UI.",
          ],
          concepts: [
            ["Checkpointer", "Saves graph state per thread after each step."],
            ["Thread id", "The key for one conversation's saved state."],
            ["`InMemorySaver`", "Checkpointer kept in memory; lost when the program ends."],
          ],
        },
        {
          id: "approval",
          title: "Pause for human approval",
          level: "Hard",
          task: [
            "Build a small graph: `propose` (decides a discount for an order) → `approve` (calls `interrupt()` with the proposal) → `apply` (prints \"applied\" or \"rejected\"). Run it until it pauses, print the interrupt payload, then resume with `Command(resume={\"approved\": True})`. Run again and reject.",
          ],
          solution: `from typing import TypedDict
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

class State(TypedDict, total=False):
    order_id: int
    percent: int
    approved: bool

def propose(state: State) -> dict:
    return {"percent": 10}                       # in a real app the LLM proposes this

def approve(state: State) -> dict:
    decision = interrupt({"action": "apply_discount", "order_id": state["order_id"],
                          "percent": state["percent"]})
    return {"approved": bool(decision.get("approved"))}

def apply(state: State) -> dict:
    if state["approved"]:
        print(f"✅ applied {state['percent']}% to order {state['order_id']}")
    else:
        print("❌ rejected, nothing changed")
    return {}

b = StateGraph(State)
for name, fn in [("propose", propose), ("approve", approve), ("apply", apply)]:
    b.add_node(name, fn)
b.add_edge(START, "propose"); b.add_edge("propose", "approve")
b.add_edge("approve", "apply"); b.add_edge("apply", END)
graph = b.compile(checkpointer=InMemorySaver())

for thread, decision in [("a", True), ("b", False)]:
    cfg = {"configurable": {"thread_id": thread}}
    paused = graph.invoke({"order_id": 4521}, cfg)
    print("waiting for approval:", paused["__interrupt__"][0].value)
    graph.invoke(Command(resume={"approved": decision}), cfg)`,
          explanation: [
            "`interrupt(payload)` pauses the graph and saves its state; the payload is what your UI shows the approver.",
            "`Command(resume=value)` continues the same thread. The paused node runs again from its start, and this time `interrupt()` returns `value`.",
            "Because the node re-runs, put side effects (the actual discount) **after** the interrupt, never before, or they'd happen twice.",
            "Interrupts need a checkpointer: the paused state must be stored somewhere while the human decides.",
          ],
          concepts: [
            ["`interrupt()`", "Pauses a LangGraph run to wait for outside input."],
            ["`Command(resume=...)`", "Resumes a paused thread with the human's decision."],
            ["Human-in-the-loop", "A person approves or edits an action before it happens."],
            ["`TypedDict, total=False`", "All keys are optional."],
          ],
        },
        {
          id: "sqlite-persistence",
          title: "Survive a restart with SqliteSaver",
          level: "Medium",
          task: [
            "Use `SqliteSaver` (file `checkpoints.db`) instead of `InMemorySaver`. Run a script that asks one question in thread `\"asha\"` and exits. Run a second script (or the same one again) that asks a follow-up in the same thread and confirm the history survived.",
          ],
          solution: `import sqlite3
import sys
from langgraph.checkpoint.sqlite import SqliteSaver
from agent_graph import builder

conn = sqlite3.connect("checkpoints.db", check_same_thread=False)
graph = builder.compile(checkpointer=SqliteSaver(conn))
cfg = {"configurable": {"thread_id": "asha"}, "recursion_limit": 10}

question = sys.argv[1] if len(sys.argv) > 1 else "How many customers are in Delhi?"
result = graph.invoke({"messages": [("user", question)]}, cfg)
print(result["messages"][-1].content)
print("messages in this thread so far:", len(result["messages"]))

# run 1: uv run python persist.py "How many customers are in Delhi?"
# run 2: uv run python persist.py "And how many are business customers?"`,
          explanation: [
            "With a database-backed checkpointer, conversations survive restarts and deployments, and several server processes can share them.",
            "In production you'd use the Postgres checkpointer (`langgraph-checkpoint-postgres`) with thread ids tied to users.",
            "The message count grows across runs, proving the state was loaded from disk.",
          ],
          concepts: [
            ["`SqliteSaver`", "A checkpointer that stores state in a SQLite file."],
            ["Persistence", "Keeping data after the program stops."],
          ],
        },
      ],
    },
    {
      title: "Streaming and composition",
      exercises: [
        {
          id: "stream-modes",
          title: "Stream steps and tokens",
          level: "Medium",
          task: [
            "Run the agent graph with `stream_mode=[\"updates\", \"messages\"]`. Print a line like `→ agent` / `→ tools` for each node update, and print the final answer's tokens as they arrive.",
          ],
          solution: `from agent_graph import builder

graph = builder.compile()
inputs = {"messages": [("user", "What was the total order value from Chennai customers in July 2026?")]}

for mode, chunk in graph.stream(inputs, {"recursion_limit": 10}, stream_mode=["updates", "messages"]):
    if mode == "updates":
        for node in chunk:
            print(f"\\n→ {node}")
    elif mode == "messages":
        token, meta = chunk
        if meta.get("langgraph_node") == "agent" and token.content:
            print(token.content, end="", flush=True)
print()`,
          explanation: [
            "`updates` emits after each node finishes: perfect for progress messages like \"Querying the database…\".",
            "`messages` emits LLM tokens as they're generated, with metadata saying which node produced them.",
            "In a web app you'd send both as SSE events so users see progress and the answer typing out.",
          ],
          concepts: [
            ["`stream_mode`", "What `graph.stream()` emits: `values`, `updates`, `messages`, `custom`."],
            ["Progress events", "Messages that tell users which step is running."],
          ],
        },
        {
          id: "subgraph",
          title: "Compose graphs with a subgraph",
          level: "Hard",
          task: [
            "Build a `research` subgraph (two nodes: `gather` collects 3 fake facts about a topic, `summarise` joins them) and use it as a node in a parent graph `research → write`, where `write` turns the summary into a one-line headline. Both graphs share a `topic`, `facts` and `summary` state.",
          ],
          solution: `import operator
from typing import Annotated, TypedDict
from langgraph.graph import END, START, StateGraph

class State(TypedDict, total=False):
    topic: str
    facts: Annotated[list[str], operator.add]
    summary: str
    headline: str

def gather(s: State) -> dict:
    return {"facts": [f"{s['topic']} fact {i}" for i in range(1, 4)]}

def summarise(s: State) -> dict:
    return {"summary": "; ".join(s["facts"])}

research = StateGraph(State)
research.add_node("gather", gather); research.add_node("summarise", summarise)
research.add_edge(START, "gather"); research.add_edge("gather", "summarise"); research.add_edge("summarise", END)
research_graph = research.compile()

def write(s: State) -> dict:
    return {"headline": f"Headline: {s['topic'].title()} in 3 facts"}

parent = StateGraph(State)
parent.add_node("research", research_graph)      # a compiled graph used as a node
parent.add_node("write", write)
parent.add_edge(START, "research"); parent.add_edge("research", "write"); parent.add_edge("write", END)

print(parent.compile().invoke({"topic": "vector databases", "facts": []}))`,
          explanation: [
            "A compiled graph can be a node in another graph. Large systems are built from small graphs you can test separately.",
            "Here both graphs share the same state keys. If a subgraph uses different keys, call it from inside a normal node and map the state in and out.",
            "This is the building block of multi-agent systems (Day 12): each specialist is its own subgraph.",
          ],
          concepts: [
            ["Subgraph", "A compiled graph used as a node inside another graph."],
            ["Composition", "Building bigger systems out of smaller, independent parts."],
          ],
        },
      ],
    },
  ],
};
