// Day 15 practice: MCP and multi-agent systems. Exercises live in ./mcp.js.
import mcp, { SETUP_EXTRAS } from "./mcp.js";

export default {
  intro:
    "Seven exercises: build an MCP server with tools, a resource and a prompt; talk to it from your own Python client; put a real (read-only) database behind it; serve it over HTTP; plug it into a LangGraph agent; build a supervisor over two specialist agents; and describe your agent with an A2A Agent Card.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day15 && cd ~/genai-practice/day15
uv init --no-readme .
uv add "mcp[cli]" langgraph langchain-openai langchain-core langchain-mcp-adapters python-dotenv
cp ../day04/lc.py ../day03/.env . && cp ../day13/sales.db ../day13/sql_tool.py ../day14/agent_graph.py .`,
    },
    ...SETUP_EXTRAS,
  ],
  groups: mcp.groups,
};
