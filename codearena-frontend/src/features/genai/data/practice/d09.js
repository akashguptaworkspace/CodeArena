// Day 9 practice: RAG end to end. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import frameworks from "./frameworks.js";
import ragEndToEnd from "./rag-end-to-end.js";
import ragScratch from "./rag-scratch.js";

export default {
  intro:
    "Exercises that build RAG end to end, twice. First with LangChain: the four RAG steps by hand, then as one chain, with sources. Then with no framework, so you see what LangChain was doing: retrieve, remove duplicates with MMR, fit a token budget, answer with citations and verified quotes, handle outdated documents, refuse when unsure, handle follow-ups, diagnose failures, and serve it over an API. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day09 && cd ~/genai-practice/day09
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken pydantic "fastapi[standard]"
uv add langchain langchain-core langchain-openai langchain-community langchain-text-splitters youtube-transcript-api
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py . && cp -r ../day07/docs ../day07/chunks.py .`,
    },
    {
      note: "`chunks.py` is the heading chunker you saved on Day 7 (it builds `ALL`, a list of chunks with `id`, `source` and `text`). The from-scratch pipeline you build here is saved as `rag.py` and `safe.py`; Day 11 evaluates them.",
    },
  ],
  groups: [
    ...ragEndToEnd.groups,
    exerciseGroup("RAG chain with sources (LangChain)", frameworks, ["rag-chain"]),
    groupNamed(ragScratch, "The RAG pipeline"),
    groupNamed(ragScratch, "Choosing what goes into the prompt"),
    groupNamed(ragScratch, "Grounding and verification"),
    groupNamed(ragScratch, "Debugging and testing RAG"),
    groupNamed(ragScratch, "Serve it"),
  ],
};
