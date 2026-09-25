// Day 8 interview bank: embeddings, vector stores and retrievers. Picks questions from topic banks (see ../pick.js).
import { questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import ragRetrievers from "./rag-retrievers.js";
import vectors from "./vectors.js";

export default {
  title: "Embeddings, vector databases and retrievers interview questions",
  intro:
    "The retrieval round of GenAI interviews: keyword search and BM25, embedding models (bi- vs cross-encoders, prefixes, Matryoshka, multilingual, fine-tuning), similarity and thresholds, choosing a vector database, HNSW, IVF and quantisation, filtering and multi-tenancy, LangChain retrievers (MMR, multi-query, contextual compression, hybrid, custom), measuring retrieval, running vector search in production, sizing estimates, and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...vectors.groups.slice(0, 7),
    ...ragRetrievers.groups,
    questionGroup("Retrievers in LangChain", frameworks, ["retriever-vs-store", "mmr-lc", "hybrid-lc", "custom-retriever", "filters-lc"]),
    ...vectors.groups.slice(7),
  ],
};
