// Day 5 interview bank: search, embeddings, vector databases, ANN indexes, retrieval evaluation. Shape: see ./index.js
import { searchQs, embeddingModelQs, similarityQs, vectorDbQs } from "./d05-a.js";
import { annQs, filterQs, evalQs, vecOpsQs, sizingQs, vecCodingQs } from "./d05-b.js";
import { whatToEmbedQs, hybridPreviewQs, vecDesignQs } from "./d05-c.js";

export default {
  title: "Embeddings and vector database interview questions",
  intro:
    "The retrieval round of GenAI interviews: keyword search and BM25, embedding models (bi- vs cross-encoders, prefixes, Matryoshka, multilingual, fine-tuning), similarity and thresholds, choosing a vector database, HNSW, IVF and quantisation, filtering and multi-tenancy, measuring retrieval, running vector search in production, sizing estimates, and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [searchQs, embeddingModelQs, similarityQs, whatToEmbedQs, vectorDbQs, annQs, filterQs, hybridPreviewQs, evalQs, vecOpsQs, sizingQs, vecDesignQs, vecCodingQs],
};
