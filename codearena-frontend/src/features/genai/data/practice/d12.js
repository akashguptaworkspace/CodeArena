// Day 12 practice: tools and tool calling. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import agentTools from "./agent-tools.js";
import frameworks from "./frameworks.js";
import llmApis from "./llm-apis.js";

export default {
  intro:
    "Exercises on the one skill every agent is built on: tools. Use built-in LangChain tools, write custom ones three ways (@tool, StructuredTool, BaseTool), inspect exactly what the model sees, then bind tools, read tool calls, execute them and send results back, including arguments the model must never fill. Finish with the same loop on the raw API: a tool loop, strict schemas and parallel calls.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day12 && cd ~/genai-practice/day12
uv init --no-readme .
uv add openai python-dotenv pydantic httpx langchain langchain-core langchain-openai langchain-community ddgs wikipedia
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py .`,
    },
    { note: "Tool calling needs a model that supports it. With Ollama, use `qwen2.5` or `llama3.1` (set `LLM_MODEL` in `.env`)." },
  ],
  groups: [
    ...agentTools.groups,
    exerciseGroup("A LangChain tool", frameworks, ["lc-tool"]),
    exerciseGroup("The raw tool loop", llmApis, ["tool-loop"]),
    groupNamed(llmApis, "Tools, deeper"),
  ],
};
