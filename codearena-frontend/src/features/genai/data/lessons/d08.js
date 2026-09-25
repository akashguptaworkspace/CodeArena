// Day 8 lessons: RAG 2: embeddings, vector stores and retrievers. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import vectors from "./vectors.js";
import frameworks from "./frameworks.js";
import ragRetrievers from "./rag-retrievers.js";

export default {
  ...pickLessons(vectors, ["search-history", "similarity", "embed-models", "vector-dbs", "hnsw", "retrieval-metrics", "vector-ops", "tradeoffs", "mini-vectordb", "semantic-search", "compare-dbs"]),
  ...pickLessons(frameworks, ["retrievers"]),
  ...ragRetrievers,
};
