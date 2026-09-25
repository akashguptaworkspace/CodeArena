// Practice exercises: MCP & multi-agent. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  {
    note: "In the copied `agent_graph.py`, move the demo question at the bottom under `if __name__ == \"__main__\":` so importing it doesn't run it. The MCP Inspector (`uv run mcp dev server.py`) opens in your browser and needs Node.js, which you already have from MERN work.",
  },
];

export default {
  groups: [
    {
      title: "Your first MCP server and client",
      exercises: [
        {
          id: "mcp-server",
          title: "A server with a tool, a resource and a prompt",
          level: "Easy",
          task: [
            "Write `server.py` with FastMCP: a tool `get_order_status(order_id: int)` (fake data), a resource `shop://policies/returns` returning a short policy text, and a prompt `summarise_ticket(ticket_text)`. Open the MCP Inspector and call each one.",
            { lang: "bash", code: `uv run mcp dev server.py` },
          ],
          solution: `# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("shop")
ORDERS = {4521: {"status": "shipped", "courier": "Delhivery", "eta": "27 Sep"},
          4522: {"status": "processing", "courier": None, "eta": "30 Sep"}}

@mcp.tool()
def get_order_status(order_id: int) -> dict:
    """Get the delivery status of an order by its numeric id."""
    return ORDERS.get(order_id, {"error": f"order {order_id} not found"})

@mcp.resource("shop://policies/returns")
def returns_policy() -> str:
    """The current returns policy."""
    return "Items can be returned within 30 days if unused. Electronics: 10 days."

@mcp.prompt()
def summarise_ticket(ticket_text: str) -> str:
    """Summarise a support ticket for a handoff."""
    return f"Summarise this ticket in 3 bullets (issue, customer request, urgency):\\n\\n{ticket_text}"

if __name__ == "__main__":
    mcp.run()          # stdio transport`,
          explanation: [
            "An MCP server exposes three kinds of things: **tools** the model can call, **resources** (read-only data an app can load, addressed by URI), and **prompts** (reusable templates users can pick).",
            "FastMCP builds each tool's JSON Schema from the type hints and uses the docstring as its description, much like FastAPI.",
            "`mcp.run()` defaults to stdio: the host starts the server as a subprocess and talks over stdin/stdout.",
          ],
          concepts: [
            ["MCP", "Model Context Protocol: a standard way for AI apps to use external tools and data."],
            ["MCP server", "A program that exposes tools, resources and prompts over MCP."],
            ["Resource URI", "An address like `shop://policies/returns` identifying a piece of data."],
            ["stdio transport", "Talking over a subprocess's standard input and output."],
          ],
        },
        {
          id: "mcp-client",
          title: "Call your server from a Python client",
          level: "Medium",
          task: [
            "Write `client.py` that starts `server.py` over stdio, lists its tools, calls `get_order_status` for 4521 and 9999, and reads the returns policy resource.",
          ],
          solution: `# client.py
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

params = StdioServerParameters(command="uv", args=["run", "python", "server.py"])

async def main():
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("tools:", [t.name for t in tools.tools])

            for order_id in [4521, 9999]:
                result = await session.call_tool("get_order_status", {"order_id": order_id})
                print(order_id, "→", result.content[0].text)

            policy = await session.read_resource("shop://policies/returns")
            print("policy:", policy.contents[0].text)

asyncio.run(main())`,
          explanation: [
            "This is what hosts like Claude Desktop or your agent do under the hood: start the server, `initialize` (exchange capabilities), `list_tools`, then `call_tool`.",
            "Tool results come back as a list of content items; text results are in `.text`.",
            "Nested `async with` blocks guarantee the connection and subprocess are closed properly.",
          ],
          concepts: [
            ["MCP client", "The part of a host app that connects to one MCP server."],
            ["`ClientSession`", "The Python SDK's MCP client connection."],
            ["Capability negotiation", "Client and server tell each other what they support during `initialize`."],
          ],
        },
      ],
    },
    {
      title: "Real data and remote servers",
      exercises: [
        {
          id: "db-server",
          title: "An MCP server over a read-only database",
          level: "Medium",
          task: [
            "Create `shop_data.py`: an MCP server exposing `list_tables()`, `describe_table(name)` (only allow-listed tables) and `run_select(sql)` using the read-only `sql_query` from Day 13. Try to break it in the Inspector with `DELETE`, an unknown table, and a huge query.",
          ],
          solution: `# shop_data.py
import sqlite3
from mcp.server.fastmcp import FastMCP
from sql_tool import sql_query

mcp = FastMCP("shop-data")
ALLOWED = {"customers", "orders"}

@mcp.tool()
def list_tables() -> list[str]:
    """Names of the tables you can query."""
    return sorted(ALLOWED)

@mcp.tool()
def describe_table(name: str) -> list[dict]:
    """Columns and types of a table. Call this before writing SQL."""
    if name not in ALLOWED:
        raise ValueError(f"Unknown table. Allowed: {sorted(ALLOWED)}")
    conn = sqlite3.connect("file:sales.db?mode=ro", uri=True)
    try:
        return [{"column": r[1], "type": r[2]} for r in conn.execute(f"PRAGMA table_info({name})")]
    finally:
        conn.close()

@mcp.tool()
def run_select(sql: str) -> dict:
    """Run a read-only SQLite SELECT. Returns at most 50 rows."""
    return sql_query(sql)

if __name__ == "__main__":
    mcp.run()`,
          explanation: [
            "Discovery tools (`list_tables`, `describe_table`) let any client learn the schema instead of hard-coding it in a prompt.",
            "The allow-list check matters because `name` is inserted into SQL text; never put unchecked input into SQL.",
            "The read-only connection inside `sql_query` is the real protection: `DELETE` fails whatever the model tries.",
            "Raising `ValueError` in a tool returns an error result to the client, which the model can read and recover from.",
          ],
          concepts: [
            ["Allow-list", "An explicit list of permitted values; everything else is rejected."],
            ["`PRAGMA table_info`", "SQLite command that lists a table's columns."],
            ["Least privilege", "Give a tool only the access it needs (here: read-only)."],
          ],
        },
        {
          id: "http-transport",
          title: "Serve over Streamable HTTP",
          level: "Medium",
          task: [
            "Run `shop_data.py` with `mcp.run(transport=\"streamable-http\")` and connect to `http://127.0.0.1:8000/mcp` from a client using `streamablehttp_client`. List tools and run one query.",
          ],
          solution: `# 1) in shop_data.py change the last line to:
#      mcp.run(transport="streamable-http")
#    and start it:  uv run python shop_data.py

# 2) http_client.py
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client("http://127.0.0.1:8000/mcp") as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print([t.name for t in (await session.list_tools()).tools])
            r = await session.call_tool("run_select", {"sql": "SELECT city, COUNT(*) FROM customers GROUP BY city"})
            print(r.content[0].text)

asyncio.run(main())`,
          explanation: [
            "stdio is for local, single-user servers the host launches. **Streamable HTTP** runs the server as a web service many clients can share, like your FastAPI apps.",
            "A remote server needs authentication in real use (the MCP spec standardises OAuth), plus rate limiting and logging.",
            "Same client code, different transport: that's the point of a protocol.",
          ],
          concepts: [
            ["Streamable HTTP transport", "MCP over normal HTTP requests with optional streaming responses."],
            ["Transport", "How protocol messages travel: stdio or HTTP."],
          ],
        },
        {
          id: "mcp-agent",
          title: "Give a LangGraph agent your MCP tools",
          level: "Hard",
          task: [
            "Load the tools from `shop_data.py` with `MultiServerMCPClient` and build a LangGraph agent with them (reuse the agent graph pattern from Day 14). Ask \"Which segment spent more in August 2026, retail or business?\" and print the tool calls.",
          ],
          solution: `import asyncio
from typing import Annotated, TypedDict
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from lc import llm

class State(TypedDict):
    messages: Annotated[list, add_messages]

async def main():
    client = MultiServerMCPClient({
        "shop": {"command": "uv", "args": ["run", "python", "shop_data.py"], "transport": "stdio"},
    })
    tools = await client.get_tools()
    print("loaded tools:", [t.name for t in tools])
    model = llm.bind_tools(tools)

    async def agent(state: State) -> dict:
        return {"messages": [await model.ainvoke(state["messages"])]}

    b = StateGraph(State)
    b.add_node("agent", agent)
    b.add_node("tools", ToolNode(tools))
    b.add_edge(START, "agent")
    b.add_conditional_edges("agent", tools_condition)
    b.add_edge("tools", "agent")
    graph = b.compile()

    result = await graph.ainvoke(
        {"messages": [("user", "Which segment spent more in August 2026, retail or business?")]},
        {"recursion_limit": 12})
    for m in result["messages"]:
        for call in getattr(m, "tool_calls", []) or []:
            print("tool:", call["name"], call["args"])
    print(result["messages"][-1].content)

asyncio.run(main())`,
          explanation: [
            "The agent no longer defines its own database tools; it loads them from the MCP server. Any other agent or host (Claude Desktop, IDEs) can reuse the same server.",
            "MCP tools are async, so the graph uses `ainvoke` and an async agent node.",
            "Change the connection to `{\"url\": \"http://127.0.0.1:8000/mcp\", \"transport\": \"streamable_http\"}` to use the HTTP server instead.",
          ],
          concepts: [
            ["`MultiServerMCPClient`", "Connects to one or more MCP servers and converts their tools into LangChain tools."],
            ["`ainvoke`", "The async version of `invoke`."],
            ["`getattr(obj, name, default)`", "Reads an attribute, returning `default` if it doesn't exist."],
          ],
        },
      ],
    },
    {
      title: "Multi-agent and A2A",
      exercises: [
        {
          id: "supervisor",
          title: "A supervisor with two specialist agents",
          level: "Hard",
          task: [
            "Create two specialists: a `data_analyst` (your SQL agent) and a `copywriter` (plain LLM that writes short marketing copy). Wrap each as a `@tool` and give both to a supervisor agent. Ask: \"Find our top city by August 2026 revenue and write a one-line thank-you banner for customers there.\"",
          ],
          solution: `from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from agent_graph import builder as analyst_builder    # the Day 14 SQL agent graph (copy agent_graph.py)
from lc import llm

analyst = analyst_builder.compile()

@tool
def data_analyst(question: str) -> str:
    """Answers questions about our sales data (customers, orders, revenue) using SQL."""
    out = analyst.invoke({"messages": [("user", question)]}, {"recursion_limit": 10})
    return out["messages"][-1].content

@tool
def copywriter(brief: str) -> str:
    """Writes short, friendly marketing copy from a brief. Returns only the copy."""
    return llm.invoke(f"Write one short line of marketing copy. Brief: {brief}").content

from typing import Annotated, TypedDict
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

class State(TypedDict):
    messages: Annotated[list, add_messages]

specialists = [data_analyst, copywriter]
boss = llm.bind_tools(specialists)
SYSTEM = ("You coordinate specialists. Use data_analyst for facts and copywriter for copy. "
          "Delegate, then combine their results into a final answer.")

def supervisor(state: State) -> dict:
    return {"messages": [boss.invoke([("system", SYSTEM), *state["messages"]])]}

g = StateGraph(State)
g.add_node("supervisor", supervisor)
g.add_node("tools", ToolNode(specialists))
g.add_edge(START, "supervisor")
g.add_conditional_edges("supervisor", tools_condition)
g.add_edge("tools", "supervisor")
graph = g.compile(checkpointer=InMemorySaver())

result = graph.invoke(
    {"messages": [("user", "Find our top city by August 2026 revenue and write a one-line "
                           "thank-you banner for customers there.")]},
    {"configurable": {"thread_id": "s1"}, "recursion_limit": 15})
print(result["messages"][-1].content)`,
          explanation: [
            "**Agents-as-tools** is the simplest multi-agent pattern: each specialist is wrapped as a tool, and one supervisor decides whom to call and combines the results.",
            "Each specialist keeps its own tools and prompt, so it stays focused and testable on its own.",
            "Multi-agent systems multiply LLM calls. Use them when tasks really split into different skills; otherwise one agent with good tools is cheaper and easier to debug.",
          ],
          concepts: [
            ["Supervisor pattern", "A coordinating agent that delegates to specialist agents."],
            ["Agents as tools", "Wrapping an agent in a tool so another agent can call it."],
          ],
        },
        {
          id: "agent-card",
          title: "Describe your agent with an A2A Agent Card",
          level: "Easy",
          task: [
            "Write an A2A Agent Card (JSON) for your shop data assistant with two skills: `sales_analytics` and `order_lookup`. Serve it from FastAPI at `/.well-known/agent.json` and fetch it with curl.",
          ],
          solution: `# card_api.py  →  uv add "fastapi[standard]"  →  uv run fastapi dev card_api.py
from fastapi import FastAPI

app = FastAPI()

AGENT_CARD = {
    "name": "Shop Data Assistant",
    "description": "Answers questions about the shop's customers, orders and revenue.",
    "url": "http://127.0.0.1:8000/a2a",
    "version": "0.1.0",
    "capabilities": {"streaming": True},
    "defaultInputModes": ["text"],
    "defaultOutputModes": ["text"],
    "skills": [
        {"id": "sales_analytics", "name": "Sales analytics",
         "description": "Revenue and order statistics by city, segment and month.",
         "examples": ["Which city had the most revenue in August?"]},
        {"id": "order_lookup", "name": "Order lookup",
         "description": "Status and details of a specific order.",
         "examples": ["Where is order 4521?"]},
    ],
}

@app.get("/.well-known/agent.json")
def agent_card():
    return AGENT_CARD

# curl http://127.0.0.1:8000/.well-known/agent.json`,
          explanation: [
            "In A2A, an **Agent Card** at a well-known URL tells other agents what this agent can do, where to reach it and how to authenticate, so agents from different vendors can discover each other.",
            "MCP connects an agent to **tools**; A2A connects an agent to **other agents**. They complement each other.",
            "Check the A2A spec for the full field list and the current well-known path; this card shows the core idea.",
          ],
          concepts: [
            ["A2A (Agent2Agent)", "An open protocol for agents to discover and delegate tasks to each other."],
            ["Agent Card", "A JSON description of an agent's skills, endpoint and auth."],
            ["Well-known URL", "A standard path (`/.well-known/...`) where clients look for metadata."],
          ],
        },
      ],
    },
  ],
};
