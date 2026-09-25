// Day 11: LangGraph. Shape: see ./index.js
export default {
  graph: {
    minutes: 70,
    level: "Intermediate",
    intro:
      "LangGraph models an agent or workflow as a **graph**: nodes are steps (LLM calls, tools, plain functions), edges decide what runs next, and a shared **state** flows through it. It gives you the flexibility of your hand-written loop plus persistence, human approval, streaming and visualisation. It's the agent framework most often requested in current job descriptions.",
    sections: [
      {
        h: "State, nodes, edges",
        blocks: [
          {
            table: {
              head: ["Concept", "What it is"],
              rows: [
                ["**State**", "A typed dict (or Pydantic model) shared by all nodes: messages, intermediate results, flags"],
                ["**Node**", "A function `state → partial state update`"],
                ["**Edge**", "Fixed transition: after node A, run node B"],
                ["**Conditional edge**", "A function reads the state and returns which node runs next"],
                ["**Reducer**", "How an update merges into the state (replace, or append for message lists)"],
                ["`START` / `END`", "Entry and exit points"],
              ],
            },
          },
          {
            lang: "python",
            code: `# uv add langgraph langchain-openai
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]   # reducer: append new messages instead of replacing
    intent: str

def classify(state: State) -> dict:
    last = state["messages"][-1].content
    intent = router_llm.invoke(f"Classify as 'data' or 'chat': {last}").content.strip()
    return {"intent": intent}

def answer_chat(state: State) -> dict:
    return {"messages": [llm.invoke(state["messages"])]}

def answer_data(state: State) -> dict:
    return {"messages": [data_agent.invoke(state["messages"])]}

builder = StateGraph(State)
builder.add_node("classify", classify)
builder.add_node("chat", answer_chat)
builder.add_node("data", answer_data)
builder.add_edge(START, "classify")
builder.add_conditional_edges("classify", lambda s: s["intent"], {"chat": "chat", "data": "data"})
builder.add_edge("chat", END)
builder.add_edge("data", END)
graph = builder.compile()

result = graph.invoke({"messages": [("user", "What was revenue last month?")]})`,
          },
          "Nodes return only the keys they change. The reducer on `messages` (`add_messages`) appends; other keys are replaced.",
        ],
      },
      {
        h: "A tool-calling agent as a graph",
        blocks: [
          "The agent loop from Day 13 becomes two nodes and a conditional edge:",
          {
            lang: "python",
            code: `from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode, tools_condition

@tool
def sql_query(query: str) -> str:
    """Run a read-only SELECT on the sales database. Tables: orders(...), customers(...)."""
    return run_readonly_sql(query)

@tool
def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression."""
    return str(safe_calc(expression))

tools = [sql_query, calculator]
model = llm.bind_tools(tools)

def agent(state: State) -> dict:
    return {"messages": [model.invoke([SYSTEM_MSG, *state["messages"]])]}

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode(tools))                 # runs the requested tool calls
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)     # → "tools" if tool calls, else END
builder.add_edge("tools", "agent")                          # loop back
graph = builder.compile()

graph.invoke({"messages": [("user", "Total revenue from Pune customers?")]},
             config={"recursion_limit": 12})               # hard cap on steps`,
          },
          {
            note: "LangChain also offers a prebuilt agent (`create_agent` in recent `langchain` versions, `create_react_agent` in older LangGraph versions) that builds this exact graph in one line. Build it by hand first, then use the prebuilt one where it fits.",
          },
          "`graph.get_graph().draw_mermaid()` gives a Mermaid diagram of your graph, which is great for READMEs.",
        ],
      },
      {
        h: "Why a graph instead of a while loop",
        blocks: [
          {
            list: [
              "**Explicit control flow:** routing, loops, parallel branches and retries are visible and testable.",
              "**Persistence** (checkpointers): pause, resume and continue conversations across requests and server restarts.",
              "**Human-in-the-loop:** interrupt before a node and wait for approval.",
              "**Streaming** of tokens, node updates and custom events.",
              "**Tracing** in LangSmith, and deployment tooling.",
            ],
          },
          "The trade-off is learning a framework and its abstractions. For a simple single-tool loop, plain code is fine.",
        ],
      },
    ],
    revise: [
      "State (TypedDict + reducers), nodes (functions returning partial updates), edges, conditional edges, START/END.",
      "`Annotated[list, add_messages]` appends messages; other keys are replaced.",
      "Agent graph: agent node (model with `bind_tools`) → `tools_condition` → `ToolNode` → back to agent.",
      "`recursion_limit` caps steps. Prebuilt agents exist; understand the manual graph first.",
      "Graph benefits: explicit flow, persistence, human-in-the-loop, streaming, tracing.",
    ],
    mistakes: [
      "Returning the whole state from a node and accidentally duplicating messages.",
      "No `recursion_limit` or step budget.",
      "Putting everything in one giant node, which loses the benefits of the graph.",
    ],
    interview: [
      {
        q: "Why model an agent as a graph?",
        a: "A graph makes control flow explicit: which steps exist, how routing and loops work, where humans approve, and where state is saved. That makes complex agents more predictable, testable and debuggable than an opaque loop, and frameworks like LangGraph build persistence, interrupts, streaming and tracing on that structure.",
      },
      {
        q: "What is a reducer in LangGraph?",
        a: "A function that defines how a node's update to a state key is merged with the existing value. By default values are overwritten; for message lists, the add_messages reducer appends new messages (and updates by id), so nodes can return just their new messages.",
      },
    ],
    practice: [
      "Rebuild yesterday's raw agent as a LangGraph graph with `ToolNode` and `tools_condition`.",
      "Print the Mermaid diagram of your graph.",
    ],
  },

  checkpoints: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "A **checkpointer** saves the graph's state after every step, keyed by a **thread id**. That gives you conversation memory, the ability to resume after a crash or a human approval, and \"time travel\" debugging. It's how LangGraph agents persist state across HTTP requests.",
    sections: [
      {
        h: "Threads and checkpoints",
        blocks: [
          {
            lang: "python",
            code: `from langgraph.checkpoint.memory import InMemorySaver

graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "user-42:conv-7"}}

graph.invoke({"messages": [("user", "Revenue from Pune last month?")]}, config)
graph.invoke({"messages": [("user", "And Mumbai?")]}, config)     # remembers the first turn

snapshot = graph.get_state(config)
print(snapshot.values["messages"][-1].content, snapshot.next)       # current state, next node`,
          },
          "You only send the **new** message each time; the checkpointer restores the rest of the state for that thread.",
        ],
      },
      {
        h: "Persistent checkpointers",
        blocks: [
          "`InMemorySaver` is lost on restart. In production use a database-backed saver, such as Postgres:",
          {
            lang: "python",
            code: `# uv add langgraph-checkpoint-postgres
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async with AsyncPostgresSaver.from_conn_string(DB_URI) as saver:
    await saver.setup()                          # creates tables once
    graph = builder.compile(checkpointer=saver)
    await graph.ainvoke({"messages": [("user", question)]},
                        {"configurable": {"thread_id": thread_id}})`,
          },
          {
            list: [
              "Thread ids should encode ownership (or be checked against it) so users can't load someone else's thread.",
              "State grows with every message; trim or summarise messages inside the graph (a summarisation node) for long threads.",
              "Checkpoints are also stored per step, enabling **time travel**: inspect history with `graph.get_state_history(config)` and replay or fork from an earlier checkpoint for debugging.",
            ],
          },
          {
            note: "Checkpointers hold per-thread state. For memory shared across threads (a user's preferences in every conversation), LangGraph has a separate **store** interface.",
          },
        ],
      },
    ],
    revise: [
      "Checkpointer saves state after each step, per `thread_id` in `config[\"configurable\"]`.",
      "Send only new messages; state is restored for the thread.",
      "`InMemorySaver` for dev; Postgres/Redis savers for production (`setup()` once).",
      "`get_state`, `get_state_history` for inspection and time travel.",
      "Tie thread ids to users; trim long threads; use the store for cross-thread memory.",
    ],
    interview: [
      {
        q: "How do you persist agent state across requests?",
        a: "Compile the LangGraph graph with a durable checkpointer (e.g. Postgres) and pass a thread id per conversation in the config. After every node the state is saved, so each request only sends the new user input and the graph resumes from the last checkpoint. It also enables resuming after human approval or failures, and step-by-step history for debugging. Thread ids are authorised against the user.",
      },
    ],
    practice: [
      "Add `InMemorySaver` to your graph and hold a 3-turn conversation using one thread id; then switch to a new thread and see it forget.",
    ],
  },

  hitl: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "Agents that change things (issue refunds, send emails, update records) need a human to approve risky steps. LangGraph's **interrupts** pause the graph, save the state, wait for a decision (seconds or days later), and resume exactly where they stopped.",
    sections: [
      {
        h: "interrupt() and Command(resume=...)",
        blocks: [
          {
            lang: "python",
            code: `from langgraph.types import interrupt, Command

def issue_refund(state: State) -> dict:
    refund = state["proposed_refund"]                 # e.g. {"order_id": 4521, "amount": 1299}
    decision = interrupt({                            # pauses here; payload goes to the caller
        "type": "approve_refund",
        "order_id": refund["order_id"],
        "amount": refund["amount"],
    })
    if decision.get("approved"):
        payments.refund(refund["order_id"], refund["amount"])
        return {"messages": [("assistant", f"Refund of ₹{refund['amount']} issued.")]}
    return {"messages": [("assistant", "The refund was not approved. A support agent will contact you.")]}

graph = builder.compile(checkpointer=saver)          # interrupts need a checkpointer
config = {"configurable": {"thread_id": "t-99"}}

result = graph.invoke({"messages": [("user", "Refund order 4521, it arrived broken")]}, config)
print(result["__interrupt__"])                       # the approval request payload

# ... later, when a manager clicks Approve in your admin UI:
graph.invoke(Command(resume={"approved": True}), config)`,
          },
          "When resumed, the node **re-runs from its start**, and `interrupt()` returns the resume value instead of pausing. So put side effects *after* the `interrupt()` call, never before it, or they'll run twice.",
        ],
      },
      {
        h: "Where to put approvals",
        blocks: [
          {
            table: {
              head: ["Action", "Approval?"],
              rows: [
                ["Read-only lookups, search", "No"],
                ["Drafting (email text, ticket reply)", "Show the draft; the user sends it"],
                ["Low-value reversible changes", "Maybe: allow within limits (e.g. refunds under ₹500), log everything"],
                ["Money, deletions, external messages, permission changes", "Yes, always"],
              ],
            },
          },
          {
            list: [
              "Show the human exactly what will happen (amount, recipient, record) plus the agent's reason.",
              "Allow **approve**, **reject**, and **edit** (change the arguments before running).",
              "Enforce limits in code too; approval is a second layer, not the only one.",
              "Record who approved what and when (audit log).",
            ],
          },
        ],
      },
    ],
    revise: [
      "`interrupt(payload)` pauses the graph and returns the payload to the caller; needs a checkpointer.",
      "Resume with `graph.invoke(Command(resume=value), config)`; the node re-runs and `interrupt()` returns the value.",
      "Side effects go after `interrupt()` so they don't run twice.",
      "Approve high-stakes actions; allow approve/reject/edit; limits in code; audit logs.",
    ],
    interview: [
      {
        q: "Where do you put human approval in an agent?",
        a: "Immediately before any side-effecting, high-stakes or irreversible action: payments, deletions, external communications, permission changes. The agent proposes the action with its arguments and reasoning; execution pauses (a LangGraph interrupt with persisted state); a human approves, edits or rejects in a UI; then the graph resumes. Read-only steps run freely, low-risk actions can be auto-approved within coded limits, and every decision is logged.",
      },
    ],
    practice: [
      "Add an approval interrupt before a `send_email` tool in your agent and resume it with both approve and reject.",
    ],
  },

  subgraphs: {
    minutes: 35,
    level: "Advanced",
    intro:
      "Users won't wait 30 seconds staring at nothing while an agent works. LangGraph's streaming modes let you show tokens and progress (\"Querying sales data…\"). **Subgraphs** let you compose big systems from smaller graphs that you can build and test separately.",
    sections: [
      {
        h: "Streaming modes",
        blocks: [
          {
            table: {
              head: ["`stream_mode`", "Emits", "Use for"],
              rows: [
                ["`\"values\"`", "Full state after each step", "Debugging"],
                ["`\"updates\"`", "Only what each node changed", "Progress: \"agent → tools → agent\""],
                ["`\"messages\"`", "LLM tokens as they're generated, with metadata", "Typing effect in the UI"],
                ["`\"custom\"`", "Your own events from inside nodes", "\"Searched 3 documents\", progress %"],
              ],
            },
          },
          {
            lang: "python",
            code: `async for mode, chunk in graph.astream(inputs, config, stream_mode=["updates", "messages"]):
    if mode == "messages":
        token, meta = chunk
        if meta["langgraph_node"] == "agent" and token.content:
            yield sse({"type": "token", "text": token.content})
    elif mode == "updates":
        for node, update in chunk.items():
            yield sse({"type": "step", "node": node})         # show "Running tools…" etc.`,
            caption: "Wrap this in your FastAPI SSE endpoint from Day 4.",
          },
        ],
      },
      {
        h: "Subgraphs",
        blocks: [
          "A compiled graph can be used as a node inside another graph. That's how you build multi-part systems: a `research` subgraph, a `write` subgraph, and a parent graph that routes between them. Each can be tested on its own.",
          {
            lang: "python",
            code: `research_graph = research_builder.compile()        # has its own nodes and loop

parent = StateGraph(State)
parent.add_node("research", research_graph)       # subgraph as a node (shares the State keys)
parent.add_node("write", write_report)
parent.add_edge(START, "research")
parent.add_edge("research", "write")
parent.add_edge("write", END)`,
          },
          "If the subgraph uses a different state shape, call it from inside a normal node function and map the state in and out. This pattern is the basis of multi-agent systems (Day 15).",
        ],
      },
    ],
    revise: [
      "Stream modes: values (full state), updates (per node), messages (tokens), custom (your events); combine them.",
      "Stream tokens + step updates to the UI through SSE.",
      "Subgraphs: compiled graphs as nodes; test parts separately; map state if shapes differ.",
    ],
    interview: [
      {
        q: "How do you give users feedback while an agent runs for 20 seconds?",
        a: "Stream: send step events (which node or tool is running, e.g. \"Searching orders\") and LLM tokens as they're generated, through SSE to the UI. In LangGraph, use stream modes such as updates and messages, plus custom events from inside nodes for fine-grained progress. Also show a plan or todo list if the agent makes one, and allow cancellation.",
      },
    ],
    practice: [
      "Stream your agent's steps and tokens to the terminal using `stream_mode=[\"updates\", \"messages\"]`.",
    ],
  },

  "agent-v1": {
    minutes: 300,
    level: "Advanced",
    intro:
      "Start **Project 2: an agentic business assistant**. It answers business questions from your own Postgres (or MongoDB) data, remembers conversations, streams progress, and asks for approval before any write. It's a direct showcase for LangGraph, the most requested agent skill.",
    sections: [
      {
        h: "The product",
        blocks: [
          "A small shop's data: `customers`, `products`, `orders`, `support_tickets`. The assistant can:",
          {
            list: [
              "Answer analytics questions: \"Top 5 products by revenue this quarter in Maharashtra\".",
              "Look up records: \"Show open tickets for Globex\".",
              "Propose changes that need approval: \"Mark ticket 812 as resolved\", \"Apply a 10% discount to order 4521\".",
            ],
          },
        ],
      },
      {
        h: "Graph design",
        blocks: [
          {
            lang: "text",
            code: `START → agent ──(tool calls?)──▶ read_tools ──▶ agent
          │                 └──▶ write_tools → [interrupt: approval] → agent
          └──(no tool calls)──▶ END`,
          },
          {
            list: [
              "**Read tools:** `list_tables`, `describe_table`, `run_select` (read-only DB user, row limit, 5-second statement timeout).",
              "**Write tools:** `update_ticket_status`, `apply_discount`: validated arguments, business limits in code, approval interrupt before executing.",
              "**Routing:** a conditional edge sends write-tool calls to the approval path and read-tool calls straight to execution.",
              "**Persistence:** Postgres checkpointer with thread ids tied to the user.",
              "**Limits:** `recursion_limit`, token budget, truncated tool outputs.",
            ],
          },
        ],
      },
      {
        h: "API",
        blocks: [
          {
            list: [
              "`POST /agent/threads` → new thread id.",
              "`POST /agent/threads/{id}/messages` → SSE stream of `step`, `token`, `approval_required` and `done` events.",
              "`POST /agent/threads/{id}/approve` with `{approved: bool, edits?: {...}}` → resumes with `Command(resume=...)` and streams the rest.",
              "`GET /agent/threads/{id}` → messages and any pending approval, for page reloads.",
            ],
          },
          "In the UI, render an approval card with the proposed action, its arguments and Approve / Reject buttons.",
        ],
      },
      {
        h: "Today's milestone",
        blocks: [
          {
            list: [
              "Graph with read tools works end to end through the API, with streaming.",
              "Conversations persist across server restarts (Postgres checkpointer).",
              "One write tool with a working approval flow (approve and reject both tested).",
              "10 test questions saved in `eval/agent_cases.jsonl` with expected answers.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Read tools execute freely (read-only user, limits); write tools pause for approval.",
      "Conditional routing separates read and write paths.",
      "Postgres checkpointer + user-scoped thread ids; SSE events for steps, tokens and approvals.",
    ],
    practice: [
      "Add an \"edit before approve\" option that changes the discount percentage before resuming.",
    ],
  },
};
