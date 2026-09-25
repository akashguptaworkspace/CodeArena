// Day 14 practice: LangGraph. Exercises live in ./langgraph.js.
import langgraph, { SETUP_EXTRAS } from "./langgraph.js";

export default {
  intro:
    "Seven exercises that take you from a tiny graph with no LLM to a persistent agent with human approval: state and reducers, conditional edges, a tool-calling agent, threads with checkpointers, interrupts, streaming, persistence across restarts, and subgraphs.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day14 && cd ~/genai-practice/day14
uv init --no-readme .
uv add langgraph langchain-openai langchain-core langgraph-checkpoint-sqlite python-dotenv
cp ../day04/lc.py ../day03/.env . && cp ../day13/sales.db ../day13/sql_tool.py .`,
    },
    ...SETUP_EXTRAS,
  ],
  groups: langgraph.groups,
};
