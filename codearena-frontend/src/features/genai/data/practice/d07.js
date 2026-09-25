// Day 7 practice: document loaders and text splitters. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup, groupNamed } from "../pick.js";
import frameworks from "./frameworks.js";
import ragLoaders from "./rag-loaders.js";
import ragScratch, { SETUP_EXTRAS as CORPUS } from "./rag-scratch.js";

export default {
  intro:
    "Exercises that get documents in and cut them into good chunks: LangChain loaders for text, PDFs, folders, web pages and CSV, lazy loading and a custom loader; then cleaning text, detecting scanned pages, turning tables into Markdown, and every splitting strategy (by length, recursive, code and Markdown aware, by headings, by tokens, contextual prefixes and semantic). The `chunks.py` you write here is reused on Days 9–11.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day07/docs && cd ~/genai-practice/day07
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken pypdf pydantic
uv add langchain langchain-core langchain-openai langchain-community langchain-text-splitters beautifulsoup4
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py .`,
    },
    ...CORPUS,
  ],
  groups: [
    ...ragLoaders.groups,
    exerciseGroup("Loading and splitting with LangChain", frameworks, ["load-split"]),
    groupNamed(ragScratch, "Loading and cleaning"),
    groupNamed(ragScratch, "Parsing deeper"),
    groupNamed(ragScratch, "Chunking"),
    groupNamed(ragScratch, "Chunking deeper"),
  ],
};
