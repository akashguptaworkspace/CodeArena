// Day 5 interview bank, part 3: what to embed, hybrid search basics, design questions. Assembled in d05.js.

export const whatToEmbedQs = {
  title: "What to embed",
  questions: [
    {
      id: "chunk-vs-doc",
      q: "Should you embed whole documents or chunks?",
      level: "Basic",
      common: true,
      answer:
        "Usually chunks. A whole document's single vector averages many topics, so specific questions match poorly, and models truncate long inputs. Chunks of a few hundred tokens match specific questions and fit the LLM context. Document-level vectors (or summaries) are still useful for routing or coarse filtering before chunk search.",
    },
    {
      id: "title-context",
      q: "What text should you actually embed for each chunk?",
      level: "Intermediate",
      answer:
        "The chunk text plus the context a reader would need: document title, section heading, and sometimes a one-line summary of the document (the idea behind contextual retrieval). Remove boilerplate like headers, footers and navigation. Keep structured facts (price, date, category) as metadata for filtering rather than only in the text.",
    },
    {
      id: "product-embedding",
      q: "How would you embed e-commerce products for search?",
      level: "Intermediate",
      answer:
        "Build a text per product from the title, brand, key attributes (colour, size, material) and a trimmed description, embed that, and store price, category, stock, brand and ratings as filterable metadata. Keep model numbers searchable with keyword search, since embeddings handle them poorly.",
    },
    {
      id: "tables-images",
      q: "How do you make tables and images searchable?",
      level: "Advanced",
      answer:
        "For tables, convert rows or the whole table to text (Markdown or \"column: value\" sentences) with the caption and headers, or generate a summary with an LLM and embed that while keeping the original for the answer. For images, either embed them with a multimodal model such as CLIP-style embeddings, or generate captions or descriptions with a vision model and embed the text.",
    },
    {
      id: "dedup",
      q: "How can embeddings help deduplicate content?",
      level: "Basic",
      answer:
        "Near-duplicate texts get near-identical vectors, so you can flag pairs above a high similarity threshold (after exact duplicates are removed by hashing). This removes repeated FAQ entries, product listings or boilerplate before indexing, which improves retrieval diversity and saves storage.",
    },
    {
      id: "code-embeddings",
      q: "Would you use the same embedding model for code search?",
      level: "Intermediate",
      answer:
        "Not necessarily. General text models handle natural-language descriptions of code reasonably, but code-specific or code-trained embedding models perform better on code-to-code and question-to-code retrieval. Evaluate on your own queries, and chunk code by functions or classes with file paths as metadata.",
    },
  ],
};

export const hybridPreviewQs = {
  title: "Hybrid search basics",
  questions: [
    {
      id: "what-hybrid",
      q: "What is hybrid search?",
      level: "Basic",
      common: true,
      answer:
        "Combining keyword (BM25 or learned sparse) retrieval with dense vector retrieval and merging the result lists, so you get exact-term precision and semantic recall together. It's the default for serious RAG systems because the two methods fail on different queries.",
    },
    {
      id: "rrf",
      q: "How do you merge keyword and vector results?",
      level: "Intermediate",
      common: true,
      answer:
        "Reciprocal Rank Fusion is the common default: each document scores the sum of 1/(k + rank) across the result lists (k is often 60), which needs no score calibration. Alternatives are weighted combinations of normalised scores, which need tuning, or sending the union of candidates to a reranker.",
      detail: [
        {
          lang: "python",
          code: `def rrf(result_lists: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)`,
        },
      ],
    },
    {
      id: "hybrid-where",
      q: "Where can you run hybrid search?",
      level: "Intermediate",
      answer:
        "Elasticsearch and OpenSearch (BM25 plus vector fields), Qdrant and Weaviate (sparse plus dense vectors with fusion), Pinecone (sparse-dense), MongoDB Atlas (text and vector search combined), and Postgres (full-text search plus pgvector, merged with RRF in SQL or application code). For small corpora, rank_bm25 in memory plus any vector store works.",
    },
    {
      id: "rerank-preview",
      q: "What does a reranker add after retrieval?",
      level: "Intermediate",
      answer:
        "A cross-encoder (or an LLM or a rerank API) re-scores the top 20–100 candidates by reading the query and each document together, which is more accurate than vector similarity. It pushes the truly relevant chunks to the top, so you can send fewer, better chunks to the LLM. The cost is extra latency per query.",
    },
  ],
};

export const vecDesignQs = {
  title: "Design questions",
  questions: [
    {
      id: "design-kb-search",
      q: "Design the retrieval layer for an internal knowledge base of 2 million documents across 300 client companies.",
      level: "Advanced",
      common: true,
      answer:
        "An ingestion pipeline (queue + workers) parses, cleans, chunks with titles and headings, embeds in batches with a cache and upserts with deterministic, tenant-scoped ids. Store vectors in a scalable store (pgvector if the scale and team fit, otherwise Qdrant or a managed service) with tenant and ACL metadata, filtered search enforced in one data-access layer, int8 quantisation to control RAM, and hybrid search plus reranking. Blue-green re-indexing via aliases, per-tenant deletion, monitoring of latency, ingestion lag and recall, and a labelled eval set per major client domain.",
    },
    {
      id: "design-faq-bot",
      q: "Design the smallest reasonable retrieval setup for a 300-question FAQ bot.",
      level: "Basic",
      answer:
        "Don't over-engineer: embed the 300 Q&A pairs once, keep them in memory (NumPy) or in the app's Postgres with pgvector, add BM25 for exact terms, and return the top few matches to the LLM. Rebuild on FAQ changes. Evaluate with 30–50 real questions. A dedicated vector database adds nothing at this size.",
    },
    {
      id: "design-realtime",
      q: "News articles must be searchable within a minute of publishing. How do you design ingestion?",
      level: "Advanced",
      answer:
        "Publish events to a queue on each create or update; workers chunk and embed immediately (small batches, pre-warmed embedding service) and upsert to a store that supports real-time inserts into its ANN index (HNSW handles incremental inserts). Monitor ingestion lag as an SLO, add time as metadata for freshness filters and boosting, and reconcile periodically to catch missed events.",
    },
    {
      id: "design-cost",
      q: "Your vector database bill is too high. What levers do you have?",
      level: "Intermediate",
      answer:
        "Shrink vectors (fewer Matryoshka dimensions, int8 or binary quantisation with re-scoring, originals on disk), stop indexing boilerplate and duplicates, archive cold or old data to cheaper storage, right-size replicas, consolidate small tenants into shared collections, or move to pgvector in an existing Postgres if scale allows. Verify recall with the eval set after each change.",
    },
  ],
};
