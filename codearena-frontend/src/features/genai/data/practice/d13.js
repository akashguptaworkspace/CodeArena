// Day 13 practice: AI agents. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup } from "../pick.js";
import agentBasics, { SETUP_EXTRAS as SALES_DB } from "./agent-basics.js";
import agentsReact from "./agents-react.js";
import frameworks from "./frameworks.js";

export default {
  intro:
    "Exercises that build agents two ways. With LangChain: a ReAct-style agent with create_agent, reading its reasoning trace, memory with a checkpointer and middleware. In plain Python: a traced tool loop, a safe read-only SQL tool, a multi-step data agent, routing and prompt-chaining workflows, plan-and-execute, guardrails that stop runaway loops, and simple long-term memory.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day13 && cd ~/genai-practice/day13
uv init --no-readme .
uv add openai python-dotenv pydantic langchain langchain-core langchain-openai langgraph ddgs
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py .`,
    },
    ...SALES_DB,
  ],
  groups: [
    ...agentsReact.groups,
    exerciseGroup("Agents in LangChain 1.x", frameworks, ["create-agent", "agent-memory", "agent-middleware"]),
    ...agentBasics.groups,
  ],
};
