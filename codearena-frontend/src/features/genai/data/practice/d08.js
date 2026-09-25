// Day 8 practice: embeddings, vector stores and retrievers. Picks exercises from topic files (see ../pick.js).
import { exerciseGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import ragRetrievers from "./rag-retrievers.js";
import vectors, { SETUP_EXTRAS as FAQS } from "./vectors.js";

export default {
  intro:
    "Exercises from keyword search to production vector databases, then LangChain retrievers: build an inverted index and a BM25 baseline, compare BM25 with embeddings, check score distributions, Matryoshka truncation and Hindi/Hinglish retrieval, implement retrieval metrics, use Chroma, Qdrant (with tenant isolation and zero-downtime re-indexing) and pgvector, benchmark HNSW, quantise vectors, and finally wrap it all as retrievers: similarity, MMR, multi-query, contextual compression, custom and hybrid. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day08 && cd ~/genai-practice/day08
uv init --no-readme .
uv add openai python-dotenv numpy chromadb qdrant-client rank_bm25 "psycopg[binary]" pgvector hnswlib
uv add langchain langchain-core langchain-openai langchain-community langchain-classic langchain-text-splitters wikipedia
cp ../day03/llm.py ../day03/.env . && cp ../day04/lc.py . && cp -r ../day07/docs .

# Postgres with pgvector (needs Docker Desktop running)
docker run -d --name pgv -e POSTGRES_PASSWORD=postgres -p 5433:5432 pgvector/pgvector:pg16`,
    },
    ...FAQS,
  ],
  groups: [
    ...vectors.groups,
    ...ragRetrievers.groups,
    exerciseGroup("Retrievers in depth", frameworks, ["retriever", "custom-retriever", "hybrid-lc"]),
  ],
};
