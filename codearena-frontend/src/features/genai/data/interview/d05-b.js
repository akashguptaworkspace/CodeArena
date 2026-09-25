// Day 5 interview bank, part 2: ANN indexes, filtering and tenancy, retrieval evaluation, operations, sizing, coding. Assembled in d05.js.

export const annQs = {
  title: "ANN indexes",
  questions: [
    {
      id: "exact-vs-ann",
      q: "Exact vs approximate nearest-neighbour search?",
      level: "Basic",
      common: true,
      answer:
        "Exact (flat) search compares the query with every vector, which is perfectly accurate but grows linearly with the collection. ANN indexes like HNSW and IVF search only a small part of the data using graphs or clusters, returning almost the same results (recall of 95–99%+) orders of magnitude faster. Flat search is fine up to roughly 100K vectors.",
    },
    {
      id: "hnsw",
      q: "What is HNSW, roughly?",
      level: "Intermediate",
      common: true,
      answer:
        "Hierarchical Navigable Small World is a layered proximity graph. Upper layers contain few nodes with long-range links; the bottom layer contains every vector linked to its near neighbours. A search starts at the top, greedily moves towards the query, and descends layer by layer, visiting a tiny fraction of vectors, so queries are roughly logarithmic in collection size.",
      followups: ["Which parameter would you raise first if recall is low?"],
    },
    {
      id: "hnsw-params",
      q: "Explain HNSW's M, ef_construction and ef_search.",
      level: "Intermediate",
      common: true,
      answer:
        "M is the number of links per node: higher improves recall but uses more memory and slows builds. ef_construction is the candidate list size while building: higher gives a better graph and slower builds. ef_search is the candidate list size per query: higher gives better recall and slower queries. Raise ef_search first because it needs no rebuild, and keep it at least k.",
    },
    {
      id: "ivf",
      q: "How does an IVF index work?",
      level: "Intermediate",
      answer:
        "It clusters vectors with k-means into lists (cells). At query time it finds the nearest few cluster centroids (probes / n_probe) and searches only vectors in those clusters. More probes means better recall and slower queries. It uses less memory than HNSW and builds faster, but needs representative data to train the clusters and may lose neighbours near cluster boundaries.",
    },
    {
      id: "recall",
      q: "What is recall in the context of ANN indexes, and how do you measure it?",
      level: "Basic",
      common: true,
      answer:
        "The fraction of the true top-k nearest neighbours (from exact search) that the ANN index returns. Measure it by running a sample of queries through both brute-force search and the index and comparing the top-k sets, at different parameter settings, alongside latency.",
    },
    {
      id: "quantisation",
      q: "What is vector quantisation?",
      level: "Intermediate",
      common: true,
      answer:
        "Compressing vectors to use less memory and compute: float16/halfvec (2×), int8 scalar quantisation (4×), binary quantisation (32×), or product quantisation with learned codebooks (much more). It costs some recall, usually recovered by oversampling candidates with the compressed vectors and re-scoring them with full-precision vectors.",
    },
    {
      id: "hnsw-memory",
      q: "Why does HNSW need a lot of RAM, and what can you do about it?",
      level: "Advanced",
      answer:
        "Graph traversal makes many random accesses to vectors and links, which is fast only when they're in memory. The index stores vectors plus link lists (roughly M links per node per layer). To reduce RAM: fewer dimensions, quantised vectors in RAM with originals on disk, smaller M, or sharding across nodes; IVF or disk-based indexes are alternatives for very large, cost-sensitive collections.",
    },
    {
      id: "why-ann-works",
      q: "Why does ANN search work so well on real embeddings but poorly on random vectors?",
      level: "Advanced",
      answer:
        "Real embeddings are clustered: documents about the same topic sit close together, so graph and cluster indexes quickly navigate to the right neighbourhood. In uniformly random high-dimensional data, distances concentrate and every point is almost equally far from every other, so there's no structure to exploit and benchmarks on random data understate real-world recall.",
    },
    {
      id: "index-updates",
      q: "How do ANN indexes handle inserts and deletes?",
      level: "Advanced",
      answer:
        "HNSW supports incremental inserts by linking new nodes into the graph; deletes are usually soft (tombstones) and cleaned up by background optimisation or rebuilds, and heavy churn can degrade quality until then. IVF assigns new vectors to existing clusters, which drift if data changes a lot, so it's periodically retrained. Vector databases handle this internally, but bulk loads are faster with the index built afterwards.",
    },
  ],
};

export const filterQs = {
  title: "Filtering and multi-tenancy",
  questions: [
    {
      id: "post-filter",
      q: "Your filtered vector search returns 1 result when you asked for 10. Why?",
      level: "Intermediate",
      common: true,
      answer:
        "Probably post-filtering: the index returned the top candidates by similarity and the metadata filter then removed most of them. Fix it with the database's filtered (in-index) search, larger candidate lists (ef_search, numCandidates), payload indexes on filter fields, iterative scans (pgvector 0.8+), or partitioning by the filter value (e.g. per-tenant namespaces).",
    },
    {
      id: "filter-strategies",
      q: "Pre-filtering vs post-filtering vs filtered search?",
      level: "Intermediate",
      answer:
        "Post-filtering searches first and drops non-matching results, which can return too few. Pre-filtering selects matching records first and searches only those, which can be slow without an index for that subset. Filtered search applies the filter during index traversal, which most modern vector databases support and which is usually the best option.",
    },
    {
      id: "multi-tenancy",
      q: "How do you implement multi-tenancy in a vector database?",
      level: "Intermediate",
      common: true,
      answer:
        "Options: a shared collection with a tenant id in every payload and an indexed filter on every query; namespaces or partitions per tenant; a collection per tenant for a few large or regulated customers; or Postgres with pgvector and row-level security. Enforce the tenant filter in one data-access layer and write tests proving one tenant can never retrieve another's data.",
    },
    {
      id: "acl-retrieval",
      q: "How do you make sure RAG never shows a user documents they're not allowed to see?",
      level: "Intermediate",
      common: true,
      answer:
        "Store access metadata (tenant, owner, groups or document ACL ids) with each chunk and apply the permission filter inside the vector query, derived from the authenticated user on the server, never from the prompt. Keep permissions in sync when they change, cover it with isolation tests, and remember caches and conversation history must respect the same rules.",
    },
    {
      id: "tenant-bug",
      q: "Give an example of a subtle multi-tenant bug in a vector store.",
      level: "Advanced",
      answer:
        "Re-indexing a document by deleting chunks where doc_id equals \"policy\" without also filtering by tenant: if another tenant also has a document with that id, their chunks get deleted too. Similar bugs come from chunk ids built without the tenant, or caches keyed without the tenant. Every read, write, delete and cache key must include the tenant.",
    },
  ],
};

export const evalQs = {
  title: "Evaluating retrieval",
  questions: [
    {
      id: "measure-retrieval",
      q: "How do you measure retrieval quality?",
      level: "Intermediate",
      common: true,
      answer:
        "Build a labelled set of realistic queries with their relevant chunks or documents, covering paraphrases, exact ids, other languages and unanswerable questions. Run each retrieval configuration and compute hit rate and recall at the k you send to the LLM, plus MRR or nDCG for ranking. Slice by query type, read the misses, and keep a held-out set to avoid overfitting.",
    },
    {
      id: "metrics-diff",
      q: "Recall@k vs precision@k vs MRR vs nDCG?",
      level: "Intermediate",
      common: true,
      answer:
        "Recall@k: fraction of all relevant items found in the top k, the key RAG metric because missing evidence can't be recovered. Precision@k: fraction of the top k that is relevant, which matters for prompt noise. MRR: average of 1/rank of the first relevant result, for when the top result matters most. nDCG: ranking quality with graded relevance and position discounts.",
    },
    {
      id: "build-eval-set",
      q: "How would you build a retrieval test set quickly?",
      level: "Intermediate",
      answer:
        "Start with real user queries from logs or support tickets, add questions from domain experts, and generate more with an LLM per chunk, then rewrite some so they don't copy the chunk's wording. Label relevant documents at a level that survives re-chunking (document and page, or answer text), include unanswerable queries, and grow it with every production failure.",
    },
    {
      id: "synthetic-bias",
      q: "What's the risk of evaluating retrieval with LLM-generated questions?",
      level: "Advanced",
      answer:
        "Generated questions often reuse the exact words of the source chunk, which makes retrieval (especially BM25) look better than it will on real users' vaguer, misspelled or code-mixed queries. They can also be unanswerable or ambiguous. Mix in real queries, paraphrase generated ones, spot-check them, and report results separately by source.",
    },
    {
      id: "retrieval-vs-generation",
      q: "A RAG answer is wrong. How do you tell whether retrieval or generation failed?",
      level: "Intermediate",
      common: true,
      answer:
        "Look at what was retrieved for that question. If the relevant chunk isn't in the retrieved set, it's a retrieval failure: work on chunking, embeddings, hybrid search, filters or query rewriting. If it was retrieved but the answer is wrong, it's generation: prompt grounding, context ordering, model choice. Tracing retrieved chunk ids per request makes this quick.",
    },
    {
      id: "online-signals",
      q: "What production signals tell you retrieval is degrading?",
      level: "Intermediate",
      answer:
        "Rising \"I don't know\" or no-result rates, lower thumbs-up or click-through, more follow-up rephrasings, lower top similarity or reranker scores on average, and falling recall on a scheduled offline eval. Also watch ingestion failures and index freshness, since stale indexes look like bad retrieval.",
    },
  ],
};

export const vecOpsQs = {
  title: "Operations and production",
  questions: [
    {
      id: "sync-index",
      q: "How do you keep a vector index in sync with changing documents?",
      level: "Intermediate",
      common: true,
      answer:
        "Keep the database or object store as the source of truth and treat the index as derived. A background worker handles create, update and delete events: parse and chunk, compare content hashes, re-embed only changed chunks, delete stale chunks for that tenant's document, and upsert with deterministic ids. Track per-document status and ingestion lag and periodically reconcile counts.",
    },
    {
      id: "switch-model",
      q: "How would you switch embedding models without downtime?",
      level: "Intermediate",
      common: true,
      answer:
        "Build a new collection or table with the new model in the background, re-embedding with batching and rate limits. Evaluate both on the retrieval test set; if the new one wins, atomically switch an alias or config flag the app reads, keep the old index for rollback, then delete it. Record the model version with every vector.",
    },
    {
      id: "deterministic-ids",
      q: "Why use deterministic chunk ids?",
      level: "Basic",
      answer:
        "Ids derived from tenant, document and chunk position (e.g. uuid5) make re-indexing idempotent: upserting the same chunk replaces it instead of creating a duplicate. Random ids cause duplicates on every re-index and make targeted deletes hard.",
    },
    {
      id: "deletes-compliance",
      q: "A user deletes their account. What must happen in your RAG system?",
      level: "Intermediate",
      answer:
        "Delete their source documents, all chunks and vectors (including in every index version and replica), cached answers and embeddings, and conversation history, per retention policy and laws like India's DPDP Act. Deletion should be a tested pipeline, with backups aged out or handled according to policy.",
    },
    {
      id: "scale-vectors",
      q: "How would you scale a vector database to hundreds of millions of vectors?",
      level: "Advanced",
      answer:
        "Reduce per-vector size (fewer dimensions, int8 or binary quantisation with re-scoring, originals on disk), shard the collection across nodes and add replicas for query throughput, index payload fields used in filters, partition by tenant or time where queries allow, bulk-load then build indexes, and monitor memory, latency and recall. Managed or distributed databases (Milvus, Qdrant clusters, Pinecone) help.",
    },
    {
      id: "monitor-vectordb",
      q: "What would you monitor for a vector database in production?",
      level: "Intermediate",
      answer:
        "Query latency p50/p95 and error rate, throughput, memory and disk usage, index size and build status, ingestion lag and failures, the number of stale or orphaned vectors, and a scheduled recall check against brute force plus the retrieval eval set to catch quality drift.",
    },
    {
      id: "rebuild-from-source",
      q: "Do you need to back up a vector database if you can re-embed everything?",
      level: "Intermediate",
      answer:
        "Usually yes. Rebuilding is possible because the index is derived, but re-embedding millions of chunks takes time and money, and the rebuild window is downtime or degraded search. Use snapshots or backups for fast recovery, and keep the ability to rebuild from source for disasters, migrations and model changes.",
    },
  ],
};

export const sizingQs = {
  title: "Sizing and scenario questions",
  questions: [
    {
      id: "memory-10m",
      q: "Estimate the memory needed to index 10 million chunks with 1,536-dimensional embeddings.",
      level: "Intermediate",
      common: true,
      answer:
        "10M × 1,536 × 4 bytes ≈ 61 GB of raw float32 vectors, plus HNSW links and metadata, so roughly 80–120 GB of RAM, plus chunk text payloads. To reduce it: 512–768 dimensions if the model supports it, int8 (4×) or binary (32×) quantisation with re-scoring, originals on disk, or sharding.",
    },
    {
      id: "embed-cost",
      q: "Estimate the cost of embedding 50,000 PDFs.",
      level: "Intermediate",
      answer:
        "Assume 20 pages per PDF and 3 chunks of about 400 tokens per page: 50,000 × 20 × 3 = 3M chunks, about 1.2B tokens. At an example price of $0.02 per million tokens that's about $24, so embedding is cheap; the bigger costs are RAM for the index and re-embedding when you change model or chunking. State assumptions and check current prices.",
    },
    {
      id: "slow-search",
      q: "Vector search latency jumped from 20 ms to 800 ms. What could cause it?",
      level: "Advanced",
      answer:
        "The index no longer fits in RAM and is hitting disk; a new selective filter without a payload index forces slow scans; ef_search or candidate counts were raised; the index was dropped or never built after a bulk load; heavy concurrent ingestion; or noisy neighbours on shared hardware. Check memory, query plans (EXPLAIN in pgvector), index status and recent config changes.",
    },
    {
      id: "results-irrelevant",
      q: "Users say semantic search returns irrelevant results for product codes. How do you fix it?",
      level: "Intermediate",
      common: true,
      answer:
        "Embeddings are weak at exact identifiers. Add keyword search (BM25) and combine it with vectors in hybrid search, index codes as metadata for exact-match filters or boosting, detect code-like queries and route them to keyword search, and add a reranker. Measure on a labelled set that includes code queries.",
    },
    {
      id: "design-semantic-search",
      q: "Design semantic search for 5 lakh products on an Indian e-commerce site.",
      level: "Advanced",
      common: true,
      answer:
        "Embed title plus key attributes and description with a multilingual model (Hindi and Hinglish queries), store vectors with category, brand, price and stock metadata in a vector-capable store, and combine BM25 (for brands, model numbers, sizes) with vector search in hybrid retrieval, filtered by category and availability, then rerank the top 50. Index updates stream from the catalogue; cache popular queries; evaluate with labelled queries and click-through; target p95 under ~200 ms for retrieval.",
    },
    {
      id: "chroma-to-pgvector",
      q: "You prototyped with Chroma. How do you move to pgvector for production?",
      level: "Intermediate",
      answer:
        "Design the table (id, document and tenant ids, text, metadata columns, vector(dim), model version) with an HNSW index and B-tree indexes on filter columns, add it via an Alembic migration, bulk-load with COPY using the same embeddings (or re-embed), verify with the retrieval eval set and a sample of identical queries, then switch the app behind a repository interface so the rest of the code doesn't change.",
    },
  ],
};

export const vecCodingQs = {
  title: "Live coding questions",
  questions: [
    {
      id: "lc-topk-numpy",
      q: "Implement top-k cosine similarity search over a matrix of embeddings.",
      level: "Basic",
      common: true,
      answer: "Normalise document vectors once and the query per call; compute all scores with one matrix–vector product; use argpartition for the top k and sort just those.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def build(docs: np.ndarray) -> np.ndarray:
    return docs / np.linalg.norm(docs, axis=1, keepdims=True)

def top_k(index: np.ndarray, query: np.ndarray, k: int = 5) -> list[tuple[int, float]]:
    q = query / np.linalg.norm(query)
    scores = index @ q
    k = min(k, len(scores))
    idx = np.argpartition(-scores, k - 1)[:k]
    idx = idx[np.argsort(-scores[idx])]
    return [(int(i), float(scores[i])) for i in idx]`,
        },
      ],
    },
    {
      id: "lc-bm25",
      q: "Implement BM25 scoring for a small corpus.",
      level: "Intermediate",
      common: true,
      answer: "Build an inverted index of term frequencies and document lengths; for each query term compute IDF from document frequency and add IDF × saturated, length-normalised TF to each posting's score.",
      detail: [
        {
          lang: "python",
          code: `import math, re
from collections import Counter, defaultdict

def bm25_index(docs: list[str]):
    tf, lengths = defaultdict(dict), []
    for i, d in enumerate(docs):
        toks = re.findall(r"[a-z0-9]+", d.lower())
        lengths.append(len(toks))
        for t, c in Counter(toks).items():
            tf[t][i] = c
    return tf, lengths

def bm25_search(query, tf, lengths, k1=1.5, b=0.75):
    n, avgdl = len(lengths), sum(lengths) / len(lengths)
    scores = defaultdict(float)
    for t in re.findall(r"[a-z0-9]+", query.lower()):
        postings = tf.get(t, {})
        idf = math.log(1 + (n - len(postings) + 0.5) / (len(postings) + 0.5))
        for i, c in postings.items():
            scores[i] += idf * c * (k1 + 1) / (c + k1 * (1 - b + b * lengths[i] / avgdl))
    return sorted(scores.items(), key=lambda kv: -kv[1])`,
        },
      ],
    },
    {
      id: "lc-recall",
      q: "Write recall@k and MRR for a batch of queries.",
      level: "Basic",
      common: true,
      answer: "For each query, intersect the top-k results with the relevant set for recall, and find the rank of the first relevant result for reciprocal rank; average both.",
      detail: [
        {
          lang: "python",
          code: `def recall_at_k(results: list[list[str]], relevant: list[set[str]], k: int) -> float:
    return sum(len(set(r[:k]) & rel) / len(rel) for r, rel in zip(results, relevant)) / len(results)

def mrr(results: list[list[str]], relevant: list[set[str]]) -> float:
    total = 0.0
    for r, rel in zip(results, relevant):
        total += next((1 / i for i, d in enumerate(r, 1) if d in rel), 0.0)
    return total / len(results)`,
        },
      ],
    },
    {
      id: "lc-ann-recall",
      q: "Measure an ANN index's recall@10 against brute force.",
      level: "Intermediate",
      answer: "Compute exact top-10 for a sample of queries with a matrix multiply, query the ANN index for the same queries, and average the overlap fraction.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def ann_recall(data: np.ndarray, queries: np.ndarray, ann_search, k: int = 10) -> float:
    truth = np.argsort(-(queries @ data.T), axis=1)[:, :k]
    found = [ann_search(q, k) for q in queries]              # list of id arrays
    return float(np.mean([len(set(f) & set(t)) / k for f, t in zip(found, truth)]))`,
        },
      ],
    },
    {
      id: "lc-pgvector-query",
      q: "Write a pgvector query for the top 5 chunks of one user, with similarity scores.",
      level: "Basic",
      common: true,
      answer: "Filter by owner in the WHERE clause, order by cosine distance to the query vector, limit 5, and compute similarity as 1 minus the distance.",
      detail: [
        {
          lang: "sql",
          code: `SELECT id, document_id, page, content,
       1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE owner_id = $2
ORDER BY embedding <=> $1
LIMIT 5;`,
        },
      ],
    },
    {
      id: "lc-batch-embed",
      q: "Write a batched, cached embedding function.",
      level: "Intermediate",
      answer: "Key a cache by a hash of model plus text, look up all keys, embed only the misses in batches (one API call per batch), store the new vectors, and return vectors in the original order.",
      detail: [
        {
          lang: "python",
          code: `import hashlib

def embed_cached(texts: list[str], cache: dict, embed_batch, model: str, batch: int = 128):
    keys = [hashlib.sha256(f"{model}::{t}".encode()).hexdigest() for t in texts]
    missing = [(k, t) for k, t in zip(keys, texts) if k not in cache]
    for i in range(0, len(missing), batch):
        part = missing[i:i + batch]
        for (k, _), vec in zip(part, embed_batch([t for _, t in part])):
            cache[k] = vec
    return [cache[k] for k in keys]`,
        },
      ],
    },
  ],
};
