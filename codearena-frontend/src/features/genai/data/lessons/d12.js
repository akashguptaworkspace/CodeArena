// Day 12: MCP & multi-agent systems. Shape: see ./index.js
export default {
  mcp: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "The **Model Context Protocol (MCP)** is an open standard, introduced by Anthropic in late 2024 and now supported across the industry, for connecting AI applications to tools and data. Instead of writing custom tool integrations for every app and every model, you build an MCP server once and any MCP-capable client can use it. Think of it as \"USB-C for AI tools\".",
    sections: [
      {
        h: "The problem MCP solves",
        blocks: [
          "Without a standard, every AI app (a chatbot, an IDE assistant, a desktop app, your agent) needs its own integration for every system (GitHub, Postgres, Jira, Slack…): M apps × N systems = M×N integrations. With MCP, each system exposes one **MCP server** and each app implements one **MCP client**: M + N.",
        ],
      },
      {
        h: "Architecture",
        blocks: [
          {
            table: {
              head: ["Part", "Role", "Examples"],
              rows: [
                ["**Host**", "The AI application the user interacts with", "Claude Desktop, Claude Code, Cursor, VS Code, ChatGPT, your own agent"],
                ["**Client**", "A connector inside the host; one per server connection", "Created by the host"],
                ["**Server**", "A program exposing capabilities over MCP", "GitHub server, Postgres server, your company's server"],
              ],
            },
          },
          "Messages use **JSON-RPC 2.0**. On connection, client and server exchange capabilities, then the client can list and call what the server offers.",
        ],
      },
      {
        h: "What a server exposes",
        blocks: [
          {
            table: {
              head: ["Primitive", "Controlled by", "What it is", "Example"],
              rows: [
                ["**Tools**", "The model", "Functions the LLM can call", "`create_issue`, `run_query`"],
                ["**Resources**", "The application", "Read-only data the app can load into context, addressed by URI", "`file:///README.md`, `db://schema`"],
                ["**Prompts**", "The user", "Reusable prompt templates, often shown as slash commands", "`/summarise-ticket`"],
              ],
            },
          },
          "Servers can also use client features, such as **sampling** (asking the host's LLM to generate text) and **elicitation** (asking the user for input), but tools are by far the most used primitive.",
        ],
      },
      {
        h: "A minimal server in Python",
        blocks: [
          {
            lang: "python",
            code: `# uv add "mcp[cli]"
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("shop")

@mcp.tool()
def get_order_status(order_id: int) -> dict:
    """Get the status and delivery estimate of an order by its numeric id."""
    return {"order_id": order_id, "status": "shipped", "eta": "2026-09-27"}

@mcp.resource("shop://policies/returns")
def returns_policy() -> str:
    """The current returns policy text."""
    return open("policies/returns.md", encoding="utf-8").read()

@mcp.prompt()
def summarise_ticket(ticket_text: str) -> str:
    """Summarise a customer ticket for an agent handoff."""
    return f"Summarise this ticket in 3 bullets (issue, customer ask, urgency):\\n\\n{ticket_text}"

if __name__ == "__main__":
    mcp.run()          # stdio transport by default`,
            caption: "FastMCP builds the tool schemas from your type hints and docstrings, just like FastAPI.",
          },
          {
            lang: "bash",
            code: `uv run mcp dev server.py      # opens the MCP Inspector to try tools in a browser`,
          },
        ],
      },
    ],
    revise: [
      "MCP = open standard connecting AI apps to tools and data; turns M×N integrations into M+N.",
      "Host (the AI app) → client (one per connection) → server (exposes capabilities). JSON-RPC 2.0.",
      "Primitives: tools (model-controlled), resources (app-controlled data by URI), prompts (user-invoked templates).",
      "Python: `FastMCP`, `@mcp.tool()`, `@mcp.resource(uri)`, `@mcp.prompt()`, `mcp.run()`; test with the MCP Inspector.",
    ],
    interview: [
      {
        q: "What is MCP, and how is it different from plain tool calling?",
        a: "Tool calling is the model-level ability to request a function call with JSON arguments; the application defines and executes those tools itself. MCP is a protocol that standardises how applications discover and invoke tools, resources and prompts provided by separate servers. So you write an integration once as an MCP server and any MCP-capable host (Claude Desktop, IDEs, your agent) can use it, with capability negotiation and standard transports. Under the hood, the host still exposes MCP tools to the model through normal tool calling.",
      },
    ],
    practice: [
      "Write the `shop` server above and try each primitive in the MCP Inspector.",
    ],
  },

  transports: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "MCP servers run either as a local process that the host starts (stdio) or as a remote web service (Streamable HTTP). Choosing between them, and securing the remote kind, is where MCP meets your backend experience.",
    sections: [
      {
        h: "stdio vs Streamable HTTP",
        blocks: [
          {
            table: {
              head: ["", "stdio", "Streamable HTTP"],
              rows: [
                ["How", "Host launches the server as a subprocess; messages over stdin/stdout", "Server is a web service; client sends HTTP POSTs, server can stream responses (SSE)"],
                ["Runs", "On the user's machine", "Anywhere: your cloud, a SaaS vendor"],
                ["Users", "One", "Many"],
                ["Auth", "Inherits the local environment (env vars, files)", "Needed: OAuth 2.1 per the MCP spec, or API keys / tokens"],
                ["Use for", "Local tools: files, local DBs, dev tools", "Shared company tools, SaaS integrations"],
              ],
            },
          },
          {
            lang: "python",
            code: `# serve the same FastMCP server over HTTP
if __name__ == "__main__":
    mcp.run(transport="streamable-http")      # default path /mcp`,
          },
          {
            note: "Older servers and docs mention an \"HTTP + SSE\" transport. It was replaced by Streamable HTTP in the 2025 spec revisions; prefer Streamable HTTP for new remote servers.",
          },
        ],
      },
      {
        h: "Securing an MCP server",
        blocks: [
          {
            list: [
              "**Authenticate every request** to remote servers. The MCP spec standardises OAuth 2.1 for this; many internal servers use gateway-issued tokens.",
              "**Authorise per user:** tools act with the permissions of the real user, not a super-user service account. Pass identity from auth, never from tool arguments.",
              "**Least privilege:** expose only the tools needed; read-only by default; separate servers for read and write if helpful.",
              "**Validate inputs** as for any API; the arguments come from a model that may have read malicious text.",
              "**Protect against prompt injection:** tool results and resources flow into the model's context. Content from emails, web pages or tickets may contain instructions.",
              "**Trust:** only install servers from sources you trust. A malicious server's tool descriptions can themselves contain injected instructions (\"tool poisoning\").",
              "**Rate limit, log and audit** tool calls.",
            ],
          },
        ],
      },
    ],
    revise: [
      "stdio: local subprocess, single user, inherits the local environment.",
      "Streamable HTTP: remote, multi-user, needs auth (OAuth 2.1 in the spec). Replaces the older HTTP+SSE transport.",
      "Security: authenticate, authorise as the real user, least privilege, validate inputs, beware prompt injection and untrusted servers, rate limit and audit.",
    ],
    interview: [
      {
        q: "What are the security risks of an MCP server?",
        a: "Over-privileged tools that let a model read or change more than the user should; missing authentication on remote servers; trusting identity or IDs passed in tool arguments; prompt injection through tool results or resources that contain attacker text; malicious or compromised third-party servers whose tool descriptions manipulate the model; and data exfiltration through tools that make network requests. Mitigate with OAuth-based auth, per-user authorisation, least-privilege read-only defaults, input validation, human approval for sensitive actions, vetted servers, and logging.",
      },
    ],
    practice: [
      "Run your server with `transport=\"streamable-http\"` and connect to it from the MCP Inspector over HTTP.",
    ],
  },

  "multi-agent": {
    minutes: 50,
    level: "Advanced",
    intro:
      "**Multi-agent systems** split work across several specialised agents: a researcher, a coder, a reviewer, coordinated by a supervisor or by handing off to each other. They can handle bigger tasks, but they multiply cost and failure points. Know the patterns and, just as important, when not to use them.",
    sections: [
      {
        h: "Patterns",
        blocks: [
          {
            table: {
              head: ["Pattern", "How it works", "Good for"],
              rows: [
                ["**Supervisor**", "A coordinator agent decides which specialist runs next and combines results", "Clear division of labour; central control"],
                ["**Handoffs (swarm)**", "An agent transfers the conversation to another agent directly", "Customer service: triage → billing agent → tech agent"],
                ["**Hierarchical**", "Supervisors of supervisors", "Very large tasks (rarely needed)"],
                ["**Parallel workers**", "Split a task into independent parts, run sub-agents concurrently, merge", "Research across many sources; per-file work"],
                ["**Agents as tools**", "A specialist agent is wrapped as a tool the main agent can call", "Simple, keeps one agent in control"],
              ],
            },
          },
          {
            lang: "python",
            code: `# Agents-as-tools: the simplest multi-agent pattern in LangGraph / LangChain
@tool
def research(topic: str) -> str:
    """Research a topic on the web and return a concise summary with sources."""
    result = research_agent.invoke({"messages": [("user", topic)]})
    return result["messages"][-1].content

@tool
def analyse_sales(question: str) -> str:
    """Answer a question using the company's sales database."""
    result = sql_agent.invoke({"messages": [("user", question)]})
    return result["messages"][-1].content

supervisor = build_agent(tools=[research, analyse_sales],
                         system="You coordinate specialists. Delegate, then combine their findings.")`,
          },
        ],
      },
      {
        h: "Frameworks you'll hear about",
        blocks: [
          {
            table: {
              head: ["Framework", "Style"],
              rows: [
                ["LangGraph", "Build any pattern explicitly as graphs and subgraphs; prebuilt supervisor and swarm helpers"],
                ["OpenAI Agents SDK", "Agents with tools, handoffs, guardrails and tracing; lightweight"],
                ["CrewAI", "Role-based \"crews\" of agents with tasks; quick to prototype"],
                ["AutoGen / Microsoft Agent Framework", "Conversational multi-agent systems"],
                ["Google ADK", "Google's agent development kit"],
                ["Claude Agent SDK", "The agent harness behind Claude Code, as a library"],
              ],
            },
          },
          "Pick one (LangGraph is the safest bet for Indian job descriptions), learn it well, and be able to describe the patterns independent of any framework.",
        ],
      },
      {
        h: "When multi-agent is worth it",
        blocks: [
          {
            list: [
              "**Worth it:** tasks that split into independent parts (parallel research), tasks needing different tools or permissions per role, or when one agent's context would overflow with everything.",
              "**Not worth it:** when one agent with good tools can do the job. Each extra agent adds LLM calls (cost, latency), coordination errors and harder debugging.",
              "Multi-agent systems can use many times the tokens of a single agent, so the task value must justify it.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Patterns: supervisor, handoffs/swarm, hierarchical, parallel workers, agents-as-tools.",
      "Agents-as-tools is the simplest: specialists wrapped as tools of one coordinator.",
      "Frameworks: LangGraph, OpenAI Agents SDK, CrewAI, AutoGen, Google ADK, Claude Agent SDK.",
      "Use multi-agent for parallelisable tasks, distinct tools/permissions, or context overflow; otherwise one agent.",
    ],
    interview: [
      {
        q: "When is multi-agent worth the complexity?",
        a: "When the work naturally decomposes into parallel, independent subtasks (e.g. researching many sources), when roles need different tools or permissions, or when one agent's context would be overwhelmed. Otherwise a single well-tooled agent or a workflow is cheaper, faster and easier to debug. Multi-agent setups multiply token usage and add coordination failure modes, so I'd prove the need with evals first.",
      },
      {
        q: "Supervisor vs handoff patterns?",
        a: "In a supervisor pattern, a central agent routes work to specialists and aggregates their outputs, keeping control and a single place for decisions. In handoffs, agents transfer control directly to each other along with the conversation, like a triage agent passing a customer to billing, which is natural for conversational flows but gives less central oversight.",
      },
    ],
    practice: [
      "Wrap your SQL agent and a web-search agent as tools of a supervisor agent, and ask a question that needs both.",
    ],
  },

  a2a: {
    minutes: 20,
    level: "Intermediate",
    intro:
      "**A2A (Agent2Agent)** is an open protocol, started by Google in 2025 and now under the Linux Foundation, for agents built by different vendors to discover each other and collaborate. You need awareness, not depth: what it is and how it relates to MCP.",
    sections: [
      {
        h: "What A2A does",
        blocks: [
          {
            list: [
              "**Agent Cards:** a JSON document (at a well-known URL) describing an agent: its skills, endpoint and auth requirements, so other agents can discover it.",
              "**Tasks:** a client agent sends a task to a remote agent; the task has a lifecycle (submitted, working, input-required, completed) and can be long-running.",
              "**Messages and artifacts:** agents exchange messages with parts (text, files, data) and return artifacts as results, with streaming and push notifications for updates.",
              "Built on standard web tech: HTTP, JSON-RPC, SSE.",
            ],
          },
        ],
      },
      {
        h: "MCP vs A2A",
        blocks: [
          {
            table: {
              head: ["", "MCP", "A2A"],
              rows: [
                ["Connects", "An agent/app to **tools and data**", "An agent to **other agents**"],
                ["The other side is", "A tool server (deterministic functions, resources)", "An autonomous agent with its own reasoning"],
                ["Typical interaction", "Call a tool, get a result", "Delegate a task, which may take time and ask questions"],
              ],
            },
          },
          "They're complementary: an agent might use MCP to reach its tools and A2A to delegate work to another company's agent.",
        ],
      },
    ],
    revise: [
      "A2A = open protocol for agent-to-agent collaboration across vendors.",
      "Agent Cards for discovery; tasks with lifecycles; messages and artifacts; HTTP/JSON-RPC/SSE.",
      "MCP = agent ↔ tools/data; A2A = agent ↔ agent. Complementary.",
    ],
    interview: [
      {
        q: "MCP vs A2A?",
        a: "MCP standardises how an AI application connects to tools, data and prompts exposed by servers. A2A standardises how independent agents discover each other (Agent Cards) and collaborate on tasks that may be long-running and interactive. An agent can use MCP for its own tools and A2A to delegate to external agents.",
      },
    ],
    practice: [
      "Write an Agent Card JSON for your Project 2 assistant describing two skills.",
    ],
  },

  "mcp-server": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Build an MCP server for Project 2's shop database: read tools for analytics and two business actions. Once it exists, any MCP host can use your business data, including your own LangGraph agent and Claude Desktop.",
    sections: [
      {
        h: "Tools to expose",
        blocks: [
          {
            table: {
              head: ["Tool", "Type", "Notes"],
              rows: [
                ["`list_tables()`", "Read", "Table names with one-line descriptions"],
                ["`describe_table(name)`", "Read", "Columns and types; only allow-listed tables"],
                ["`run_select(sql)`", "Read", "Read-only DB role, `statement_timeout`, 100-row limit"],
                ["`get_customer(customer_id)`", "Read", "Typed lookup, better than free SQL for common questions"],
                ["`update_ticket_status(ticket_id, status)`", "Write", "`status` limited to an enum"],
                ["`apply_discount(order_id, percent)`", "Write", "`percent` limited to 1–15 in code"],
              ],
            },
          },
        ],
      },
      {
        h: "Implementation",
        blocks: [
          {
            lang: "python",
            code: `# shop_mcp/server.py
from typing import Literal
from mcp.server.fastmcp import FastMCP
from pydantic import Field
from shop_mcp import db

mcp = FastMCP("shop-data")
ALLOWED = {"customers", "products", "orders", "support_tickets"}

@mcp.tool()
def describe_table(name: str) -> list[dict]:
    """Columns and types of a table. Call before writing SQL."""
    if name not in ALLOWED:
        raise ValueError(f"Unknown table. Allowed: {sorted(ALLOWED)}")
    return db.columns(name)

@mcp.tool()
def run_select(sql: str) -> dict:
    """Run a read-only SELECT (PostgreSQL). Returns at most 100 rows."""
    if not sql.lstrip().lower().startswith(("select", "with")):
        raise ValueError("Only SELECT queries are allowed")
    return db.readonly_query(sql, limit=100, timeout_ms=5000)   # executed as a read-only DB role

@mcp.tool()
def update_ticket_status(ticket_id: int,
                         status: Literal["open", "pending", "resolved"]) -> dict:
    """Change a support ticket's status. This modifies data."""
    return db.update_ticket(ticket_id, status)

@mcp.tool()
def apply_discount(order_id: int, percent: int = Field(ge=1, le=15)) -> dict:
    """Apply a percentage discount (1-15) to an unpaid order. This modifies data."""
    return db.apply_discount(order_id, percent)

if __name__ == "__main__":
    mcp.run()`,
          },
          {
            warn: "The `SELECT` prefix check is only a convenience. The real protection is the **read-only database role** used by `readonly_query`: a query like `SELECT ...; DROP TABLE` must fail because the role has no write permission.",
          },
          {
            lang: "sql",
            code: `CREATE ROLE mcp_reader LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE shop TO mcp_reader;
GRANT USAGE ON SCHEMA public TO mcp_reader;
GRANT SELECT ON customers, products, orders, support_tickets TO mcp_reader;
ALTER ROLE mcp_reader SET statement_timeout = '5s';`,
          },
        ],
      },
      {
        h: "Test it",
        blocks: [
          {
            list: [
              "`uv run mcp dev shop_mcp/server.py` and call every tool from the Inspector.",
              "Try to break it: a `DELETE`, a query with a semicolon, a discount of 50, an unknown table.",
              "Unit-test the `db` functions directly with pytest.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Allow-listed tables, typed arguments (enums, bounded ints), clear docstrings.",
      "Real safety: a read-only DB role with statement timeouts, not string checks.",
      "Write tools mark themselves as modifying data; limits enforced in code.",
      "Test with the Inspector and adversarial inputs.",
    ],
    practice: [
      "Add a resource `shop://schema` returning the full schema, so hosts can load it into context.",
    ],
  },

  "mcp-connect": {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Connect your MCP server to two hosts: your own LangGraph agent (via LangChain's MCP adapters) and Claude Desktop. Seeing the same server work in both is the best demonstration of why MCP matters.",
    sections: [
      {
        h: "In your LangGraph agent",
        blocks: [
          {
            lang: "python",
            code: `# uv add langchain-mcp-adapters
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "shop": {"command": "uv", "args": ["run", "python", "-m", "shop_mcp.server"], "transport": "stdio"},
    # a remote server would be: {"url": "https://tools.example.com/mcp", "transport": "streamable_http"}
})
tools = await client.get_tools()            # MCP tools converted into LangChain tools
print([t.name for t in tools])

READ = {"list_tables", "describe_table", "run_select", "get_customer"}
read_tools = [t for t in tools if t.name in READ]
write_tools = [t for t in tools if t.name not in READ]
# Wire read_tools into ToolNode, and write_tools behind the approval interrupt from Day 11.`,
          },
          "Your agent no longer defines its own database tools; it loads them from the MCP server. The server can now be reused by any other agent in the company.",
        ],
      },
      {
        h: "In Claude Desktop",
        blocks: [
          "Claude Desktop reads MCP servers from its config file (Settings → Developer → Edit Config opens it). Add your server with an absolute path:",
          {
            lang: "json",
            code: `{
  "mcpServers": {
    "shop-data": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/project2", "run", "python", "-m", "shop_mcp.server"],
      "env": { "DATABASE_URL": "postgresql://mcp_reader:...@localhost/shop" }
    }
  }
}`,
          },
          "Restart Claude Desktop, then ask: \"Which 3 products had the most revenue last month?\". You'll see it call `describe_table` and `run_select`, and ask your permission before running tools. Other hosts, such as Claude Code (`claude mcp add ...`), Cursor and VS Code, use similar configuration.",
          {
            tip: "Record a short screen capture of Claude Desktop using your server. \"I built an MCP server for our data that works in Claude Desktop and in our LangGraph agent\" is a strong interview line in 2026.",
          },
        ],
      },
    ],
    revise: [
      "`MultiServerMCPClient` loads MCP tools as LangChain tools (stdio or streamable HTTP).",
      "Split read and write tools; keep approvals for writes in your graph.",
      "Claude Desktop: `mcpServers` in its config with command, args (absolute path) and env; restart to load.",
    ],
    practice: [
      "Run the server over Streamable HTTP and connect your agent to it by URL instead of stdio.",
    ],
  },
};
