// Day 4 practice: LLM APIs, open models and LangChain models. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import { SETUP_EXTRAS as LC_SETUP } from "./frameworks.js";
import lcBasics from "./langchain-basics.js";
import llmApis, { SETUP_EXTRAS as API_SETUP } from "./llm-apis.js";

export default {
  intro:
    "Exercises that start with the raw API and end with LangChain: raw HTTP calls and error handling, a chat loop with memory (rolling summaries, a safe SQLite store), then the same model called through LangChain, a temperature experiment, OpenAI vs Claude vs Gemini behind one interface, an open-source model through Hugging Face and Ollama, embeddings and a document-similarity search, streaming, images and cost control. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day04 && cd ~/genai-practice/day04
uv init --no-readme .
uv add openai python-dotenv pydantic "fastapi[standard]" httpx tiktoken pillow numpy scikit-learn
uv add langchain langchain-core langchain-openai
cp ../day03/llm.py ../day03/.env .       # reuse Day 3's helper and settings`,
    },
    ...API_SETUP,
    ...LC_SETUP,
  ],
  groups: [
    groupNamed(llmApis, "Raw APIs, SDKs and errors"),
    groupNamed(llmApis, "Chat API basics"),
    groupNamed(llmApis, "Conversation memory"),
    ...lcBasics.groups,
    exerciseGroup("Streaming", llmApis, ["stream-terminal", "sse-endpoint"]),
    groupNamed(llmApis, "Multimodal"),
    groupNamed(llmApis, "Cost control in code"),
  ],
};
