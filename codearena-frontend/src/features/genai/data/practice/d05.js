// Day 5 practice: prompts, structured output and output parsers. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import frameworks from "./frameworks.js";
import lcPrompts from "./langchain-prompts.js";
import llmApis from "./llm-apis.js";

export default {
  intro:
    "Exercises on the input and the output of an LLM. Prompts first: PromptTemplate and ChatPromptTemplate, a chatbot that remembers, MessagesPlaceholder, and prompt techniques you can measure (few-shot, chain-of-thought, prompt chains, self-critique, dynamic few-shot). Then output: with_structured_output with TypedDict, Pydantic and JSON Schema, the four output parsers, reliable JSON from the raw API, and attacking your own app with prompt injection. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day05 && cd ~/genai-practice/day05
uv init --no-readme .
uv add openai python-dotenv pydantic "pydantic[email]" langchain langchain-core langchain-openai streamlit
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py .`,
    },
    {
      note: "`llm.py` (Day 3) calls the model through the OpenAI SDK; `lc.py` (Day 4) gives you the same model as a LangChain chat model. Both read your `.env`, so OpenAI, Gemini and Ollama all work.",
    },
  ],
  groups: [
    ...lcPrompts.groups,
    groupNamed(llmApis, "Prompt techniques you can measure"),
    groupNamed(llmApis, "Prompt engineering in practice"),
    exerciseGroup("Structured output with LangChain", frameworks, ["lc-structured"]),
    groupNamed(llmApis, "Structured output"),
    groupNamed(llmApis, "Structured output, deeper"),
    groupNamed(llmApis, "Prompt injection"),
  ],
};
