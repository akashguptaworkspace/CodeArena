// Day 10 practice: advanced RAG and LlamaIndex. Picks exercises from topic files (see ../pick.js).
import { groupNamed } from "../pick.js";
import advancedRag, { SETUP_EXTRAS as VEC_SETUP } from "./advanced-rag.js";
import frameworks from "./frameworks.js";

export default {
  intro:
    "Exercises that upgrade retrieval and let you **measure** each upgrade: BM25 keyword search, Reciprocal Rank Fusion, a cross-encoder reranker, multi-query and HyDE, parent-document retrieval, access-control filters, and a retrieval evaluation script. Then the same kind of pipeline in LlamaIndex, including an ingestion pipeline that persists and skips unchanged documents.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day10 && cd ~/genai-practice/day10
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken rank-bm25 sentence-transformers pydantic llama-index-core
cp ../day03/llm.py ../day03/.env . && cp -r ../day07/docs . && cp ../day07/chunks.py .`,
    },
    ...VEC_SETUP,
  ],
  groups: [...advancedRag.groups, groupNamed(frameworks, "LlamaIndex"), groupNamed(frameworks, "LlamaIndex, deeper")],
};
