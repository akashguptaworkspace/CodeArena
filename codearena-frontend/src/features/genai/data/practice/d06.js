// Day 6 practice: chains, runnables and LCEL. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import frameworks from "./frameworks.js";
import lcChains from "./langchain-chains.js";

export default {
  intro:
    "Exercises that make chains second nature: build a mini runnable system from scratch so you know what LangChain does underneath, then sequential, parallel and conditional chains, every runnable primitive, invoke / batch / stream, routing, streaming intermediate events, chat history, callback logging and offline tests with fake models.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day06 && cd ~/genai-practice/day06
uv init --no-readme .
uv add langchain langchain-core langchain-openai python-dotenv pydantic pytest
cp ../day03/.env . && cp ../day04/lc.py .`,
    },
    { note: "The from-scratch exercises need no API key at all. Everything else uses the model from `lc.py`." },
  ],
  groups: [
    ...lcChains.groups,
    exerciseGroup("LCEL essentials", frameworks, ["first-chain", "parallel"]),
    groupNamed(frameworks, "LangChain 1.x essentials"),
    exerciseGroup("Chat history", frameworks, ["history"]),
    groupNamed(frameworks, "Testing and observability"),
  ],
};
