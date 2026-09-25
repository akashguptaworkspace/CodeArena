// Day 5: retrieval metrics and vector DBs in production. Merged into d05.js. Shape: see ./index.js

export const retrievalMetrics = {
  minutes: 75,
  level: "Intermediate",
  intro:
    "If the right chunk never reaches the LLM, no prompt can save the answer. So you measure retrieval **on its own**, with a labelled set of queries and standard metrics: hit rate, recall@k, precision@k, MRR and nDCG. These numbers let you compare embedding models, chunking, hybrid search and rerankers with evidence, and they're the backbone of RAG evaluation (Day 11). Interviewers love candidates who say \"recall@5 went from 0.71 to 0.89\".",
  sections: [
    {
      h: "Why evaluate retrieval separately",
      blocks: [
        {
          lang: "text",
          code: `question → [ RETRIEVE top-k chunks ] → [ LLM writes answer from them ] → answer
                  ▲ measured with recall@k, MRR…     ▲ measured with faithfulness, correctness (Day 11)`,
        },
        "When a RAG answer is wrong, the first question is: **was the right information retrieved?** If not, fix retrieval (chunking, embeddings, hybrid search, filters). If yes, fix generation (prompt, model). Separate metrics tell you which half to work on.",
      ],
    },
    {
      h: "Building a labelled query set",
      blocks: [
        {
          list: [
            "**Size:** start with 30–50 queries; grow to 100–300 as you find failures. Small sets are noisy: one query is 2–3% of the score.",
            "**Sources:** real user questions from logs (best), questions from domain experts, and LLM-generated questions per chunk (fast, but often too easy because they copy the chunk's wording; rewrite some).",
            "**Coverage:** paraphrases, short keyword queries, exact ids and codes, typos, Hindi/Hinglish, multi-part questions, and **unanswerable** questions (no relevant document).",
            "**Labels:** the ids of the relevant chunks or documents for each query. Some queries have several relevant items.",
          ],
        },
        {
          lang: "json",
          code: `{"query": "paisa wapas kab aayega", "relevant": ["refund-policy#p1#c2"], "tags": ["hinglish"]}
{"query": "COD limit", "relevant": ["payments#p2#c1", "payments#p2#c2"], "tags": ["keyword"]}
{"query": "Do you deliver to Leh?", "relevant": [], "tags": ["unanswerable"]}`,
        },
        {
          warn: "Chunk ids change when you change chunking. Label at a level that survives re-chunking, such as document + page, or store the answer text and count a chunk as relevant if it contains that text.",
        },
      ],
    },
    {
      h: "The metrics",
      blocks: [
        {
          table: {
            head: ["Metric", "Question it answers", "Formula (per query, then averaged)"],
            rows: [
              ["**Hit rate@k**", "Did at least one relevant item appear in the top k?", "1 if any relevant in top k, else 0"],
              ["**Recall@k**", "What fraction of all relevant items did we retrieve?", "|relevant ∩ top k| / |relevant|"],
              ["**Precision@k**", "What fraction of the top k is relevant?", "|relevant ∩ top k| / k"],
              ["**MRR** (mean reciprocal rank)", "How high is the first relevant item?", "1 / rank of first relevant (0 if none)"],
              ["**nDCG@k**", "Are the most relevant items ranked highest? (graded relevance)", "DCG / ideal DCG, with log-discounted positions"],
            ],
          },
        },
        {
          lang: "python",
          code: `import math

def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    return len(set(retrieved[:k]) & relevant) / len(relevant)

def precision_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    return len(set(retrieved[:k]) & relevant) / k

def hit_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    return float(any(d in relevant for d in retrieved[:k]))

def reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
    for rank, d in enumerate(retrieved, start=1):
        if d in relevant:
            return 1 / rank
    return 0.0

def ndcg_at_k(retrieved: list[str], gains: dict[str, int], k: int) -> float:
    dcg = sum(gains.get(d, 0) / math.log2(i + 2) for i, d in enumerate(retrieved[:k]))
    ideal = sorted(gains.values(), reverse=True)[:k]
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(ideal))
    return dcg / idcg if idcg else 0.0

retrieved = ["c7", "c2", "c9", "c4", "c1"]
relevant = {"c2", "c4", "c8"}
print(recall_at_k(retrieved, relevant, 5))       # 0.667  (found c2, c4; missed c8)
print(precision_at_k(retrieved, relevant, 5))    # 0.4    (2 of 5 relevant)
print(hit_at_k(retrieved, relevant, 1))          # 0.0    (top-1 is c7)
print(reciprocal_rank(retrieved, relevant))      # 0.5    (first relevant at rank 2)
print(ndcg_at_k(retrieved, {"c2": 3, "c4": 1, "c8": 2}, 5))   # 0.488`,
        },
      ],
    },
    {
      h: "Which metric for which decision?",
      blocks: [
        {
          table: {
            head: ["Situation", "Watch"],
            rows: [
              ["You send the top 5 chunks to the LLM", "**Recall@5** (and hit@5): is the evidence in the context at all?"],
              ["You rerank the top 50", "**Recall@50** of the first stage, then MRR/nDCG after reranking"],
              ["One answer shown to users (search box, FAQ bot)", "**MRR** or hit@1"],
              ["Graded relevance (perfect / partial / irrelevant)", "**nDCG**"],
              ["You worry about noise in the prompt", "**Precision@k**: too many irrelevant chunks distract the LLM"],
            ],
          },
        },
        "For RAG, recall at the number of chunks you actually pass to the model is usually the headline metric.",
      ],
    },
    {
      h: "An evaluation harness you can reuse",
      blocks: [
        {
          lang: "python",
          code: `import json
from statistics import mean

def evaluate(search, cases: list[dict], k: int = 5) -> dict:
    """search(query, k) -> ranked list of ids. cases: [{"query": ..., "relevant": [ids]}]."""
    hits, recalls, rrs = [], [], []
    misses = []
    for case in cases:
        got = search(case["query"], k)
        relevant = set(case["relevant"])
        found = [i for i, d in enumerate(got, start=1) if d in relevant]
        hits.append(1.0 if found else 0.0)
        recalls.append(len(set(got) & relevant) / len(relevant))
        rrs.append(1 / found[0] if found else 0.0)
        if not found:
            misses.append(case["query"])
    return {"n": len(cases), f"hit@{k}": round(mean(hits), 3), f"recall@{k}": round(mean(recalls), 3),
            "mrr": round(mean(rrs), 3), "misses": misses}

cases = [json.loads(line) for line in open("eval/queries.jsonl") if line.strip()]
cases = [c for c in cases if c["relevant"]]          # score unanswerable ones separately
print(evaluate(bm25_search, cases), evaluate(vector_search, cases), sep="\\n")`,
        },
        {
          lang: "text",
          code: `config                         hit@5   recall@5   MRR
BM25                           0.72    0.64       0.55
text-embedding-3-small         0.84    0.78       0.66
+ Hinglish queries only        0.61    0.55       0.43   ← where to improve next`,
          caption: "Report results as a table per configuration, and slice by tags (language, query type).",
        },
        {
          tip: "Always print the **misses**. Reading ten failed queries teaches you more than the average score.",
        },
      ],
    },
    {
      h: "Pitfalls",
      blocks: [
        {
          list: [
            "**Tuning on the test set:** keep a held-out set you only check occasionally.",
            "**Synthetic queries that copy the chunk's words** make every method look great, especially BM25.",
            "**Ignoring unanswerable queries:** a good system should return low scores (or nothing) for them; track this separately.",
            "**Comparing tiny differences:** 0.82 vs 0.84 on 50 queries is probably noise. Look for consistent wins across slices.",
            "**Measuring only offline:** also log production signals such as clicks, thumbs up/down and \"no answer\" rates.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Measure retrieval separately: if the evidence isn't retrieved, generation can't fix it.",
    "Labelled set: 30–300 queries from logs/experts/LLM; paraphrases, ids, typos, Hinglish, multi-part, unanswerable; labels that survive re-chunking.",
    "Hit@k (any relevant), recall@k (fraction of relevant found), precision@k (fraction of top k relevant), MRR (1/rank of first relevant), nDCG (graded, position-discounted).",
    "RAG headline: recall@k at the k you send to the LLM; first-stage recall@50 when reranking.",
    "Report per configuration and per slice; always read the misses; keep a held-out set.",
  ],
  mistakes: [
    "Evaluating only end-to-end answers, so you can't tell retrieval failures from generation failures.",
    "Labels tied to chunk ids that change after re-chunking.",
    "Declaring a winner from tiny score differences on a small set.",
  ],
  interview: [
    {
      q: "How do you measure retrieval quality?",
      a: "Build a labelled set of realistic queries with their relevant chunks or documents, including paraphrases, exact ids, other languages and unanswerable questions. Run each retrieval configuration and compute hit rate and recall at the k you pass to the LLM, plus MRR or nDCG for ranking quality. Slice results by query type, read the misses, and keep a held-out set to avoid overfitting.",
    },
    {
      q: "Recall@k vs precision@k vs MRR?",
      a: "Recall@k is the fraction of all relevant items found in the top k, which matters most for RAG because missing evidence can't be recovered. Precision@k is the fraction of the top k that is relevant, which matters for prompt noise. MRR averages 1/rank of the first relevant result, which matters when users or the model rely mostly on the top result.",
    },
  ],
  practice: [
    "Write 30 labelled queries for your semantic-search project and compute hit@5, recall@5 and MRR for BM25 and for embeddings.",
  ],
};

export const vectorOps = {
  minutes: 85,
  level: "Advanced",
  intro:
    "Demos insert vectors once and query them. Production systems have documents that change, get deleted, belong to different customers, and must be re-indexed when you switch models or chunking, all without downtime or data leaks. This lesson covers the operations side that interviews for backend-heavy GenAI roles probe: ingestion pipelines, stable ids, updates and deletes, zero-downtime re-indexing, multi-tenancy, consistency with your source of truth, scaling, monitoring and data-protection duties.",
  sections: [
    {
      h: "The ingestion pipeline",
      blocks: [
        {
          lang: "text",
          code: `source (upload, S3, CMS, DB) ─▶ parse ─▶ clean ─▶ chunk ─▶ embed (batched, cached) ─▶ upsert ─▶ verify
                                  │                                                    │
                                  └── store document + status in Postgres (source of truth) ◀──┘`,
        },
        {
          list: [
            "Run ingestion as a **background job** (queue + worker), not inside the upload request (Day 2).",
            "Track status per document: `pending → parsing → embedding → indexed` or `failed` with the error.",
            "Treat the vector index as a **derived, rebuildable** copy: the originals and metadata live in your database or object storage.",
          ],
        },
      ],
    },
    {
      h: "Stable ids, updates and deletes",
      blocks: [
        "Give every chunk a **deterministic id** derived from tenant, document and position, so re-indexing a document replaces its chunks instead of duplicating them. To handle a document that shrinks (10 chunks → 7), delete the document's old chunks first.",
        {
          lang: "python",
          code: `import hashlib, uuid
from qdrant_client import QdrantClient, models

qc = QdrantClient(url="http://localhost:6333")      # QdrantClient(":memory:") for tests

def chunk_id(tenant: str, doc_id: str, n: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{tenant}/{doc_id}#{n}"))   # stable: re-upserting replaces

def index_document(col, tenant, doc_id, chunks):
    qc.delete(col, points_selector=models.FilterSelector(filter=models.Filter(must=[    # old chunks of THIS
        models.FieldCondition(key="tenant_id", match=models.MatchValue(value=tenant)),     # tenant's document
        models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))])))
    vecs = embed(chunks)
    qc.upsert(col, points=[models.PointStruct(id=chunk_id(tenant, doc_id, i), vector=v.tolist(),
              payload={"tenant_id": tenant, "doc_id": doc_id, "chunk": i, "text": c,
                       "hash": hashlib.sha256(c.encode()).hexdigest()})
              for i, (c, v) in enumerate(zip(chunks, vecs))])`,
        },
        {
          warn: "A real bug found while testing this lesson: the first version deleted by `doc_id` only. Two customers each had a document called \"policy\", so re-indexing one customer's policy **deleted the other customer's chunks**. Every write, delete and query in a multi-tenant index must be scoped by tenant.",
        },
        {
          list: [
            "Store a **content hash** per chunk: when a document is re-uploaded, re-embed only chunks whose hash changed (saves cost).",
            "**Deletes must propagate:** when a user deletes a file, delete its vectors too, or deleted content keeps appearing in answers.",
          ],
        },
      ],
    },
    {
      h: "Zero-downtime re-indexing",
      blocks: [
        "Changing the embedding model, dimensions or chunking means rebuilding the whole index. Do it **blue-green**: build a new collection alongside the old one, validate it with your retrieval eval set, then switch an **alias** atomically. Roll back by switching the alias back.",
        {
          lang: "python",
          code: `# the app always queries the alias "docs", never a versioned name
qc.update_collection_aliases(change_aliases_operations=[
    models.DeleteAliasOperation(delete_alias=models.DeleteAlias(alias_name="docs")),
    models.CreateAliasOperation(create_alias=models.CreateAlias(collection_name="docs_v2", alias_name="docs")),
])`,
        },
        "With pgvector, the same idea is a new table (or column) filled in the background, then a switch in configuration or a view. Record the embedding model and version on every row either way.",
      ],
    },
    {
      h: "Multi-tenancy patterns",
      blocks: [
        {
          table: {
            head: ["Pattern", "How", "Good for", "Watch out"],
            rows: [
              ["Shared collection + tenant filter", "`tenant_id` in every payload; filter in every query; index the field (Qdrant can mark it as a tenant key)", "Many small tenants", "One missing filter = data leak; test isolation"],
              ["Namespace / partition per tenant", "Pinecone namespaces, partitions", "Medium number of tenants", "Cross-tenant queries are harder"],
              ["Collection / index per tenant", "Separate collection per customer", "Few large or regulated tenants", "Overhead grows with tenant count"],
              ["Postgres + pgvector + row-level security", "RLS policies enforce `tenant_id = current_setting(...)`", "Apps already on Postgres", "Set the tenant on every connection/transaction"],
            ],
          },
        },
        {
          tip: "Put the tenant filter in one repository function that every query goes through, and write a test that searches as tenant A and asserts no tenant B results ever appear.",
        },
      ],
    },
    {
      h: "Scaling and performance",
      blocks: [
        {
          list: [
            "**Memory first:** HNSW wants vectors (or quantised copies) in RAM. Use scalar/binary quantisation or on-disk originals with in-RAM quantised vectors to fit more.",
            "**Replicas** increase query throughput and availability; **shards** split very large collections across nodes.",
            "**Batch writes:** upsert in batches of hundreds; bulk-load then build indexes for initial imports (e.g. `COPY` then `CREATE INDEX` in Postgres).",
            "**Payload indexes** on every field you filter by.",
            "**Serverless / managed** options (Pinecone serverless, Qdrant Cloud, managed Postgres) trade control for less ops.",
          ],
        },
        {
          lang: "python",
          code: `qc.create_collection(
    "docs_v2",
    vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE, on_disk=True),
    quantization_config=models.ScalarQuantization(          # int8 copy kept in RAM for fast search
        scalar=models.ScalarQuantizationConfig(type=models.ScalarType.INT8, always_ram=True)),
)`,
        },
      ],
    },
    {
      h: "Monitoring, backups and data protection",
      blocks: [
        {
          table: {
            head: ["Area", "What to do"],
            rows: [
              ["Monitoring", "Query p50/p95 latency, error rate, index size and memory, ingestion lag and failures, and a scheduled retrieval eval (recall@k on your labelled set) to catch drift"],
              ["Recall check", "Periodically compare ANN results with exact brute-force results on a sample of queries"],
              ["Backups", "Qdrant snapshots, `pg_dump` for pgvector, provider backups for managed services; and remember you can always rebuild from source documents"],
              ["Security", "Tenant isolation tests, encryption at rest, network access limited to your backend, no raw PII in payloads unless needed"],
              ["Right to erasure", "India's DPDP Act gives people rights over their personal data: deleting a user must delete their documents, chunks and vectors, and caches"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Ingestion = background job: parse → clean → chunk → embed (batched, cached) → upsert → verify; status per document; the vector index is derived and rebuildable.",
    "Deterministic chunk ids (uuid5 of tenant/doc/position); delete a document's old chunks before re-upserting; content hashes to skip unchanged chunks.",
    "Scope every write, delete and query by tenant (the doc_id-only delete bug).",
    "Blue-green re-index: new collection → eval → switch alias; roll back by switching back.",
    "Multi-tenancy: shared + tenant filter, namespaces, collection per tenant, or Postgres RLS; test isolation.",
    "Scale: quantisation, on-disk vectors, replicas, shards, payload indexes, batch writes.",
    "Monitor latency, memory, ingestion lag and recall; backups; deletion propagates to vectors (DPDP).",
  ],
  mistakes: [
    "Random chunk ids, so re-indexing duplicates content.",
    "Deleting or querying without the tenant filter.",
    "Rebuilding the index in place and taking search down, instead of blue-green with an alias.",
    "Deleting a file from the app but not its vectors.",
  ],
  interview: [
    {
      q: "How do you keep a vector index in sync with changing documents?",
      a: "Treat the database or object store as the source of truth and the vector index as derived. An ingestion worker processes create/update/delete events: parse and chunk, compute content hashes, re-embed only changed chunks, delete the document's stale chunks, and upsert with deterministic ids scoped by tenant and document. Track per-document status and ingestion lag, and periodically reconcile counts between the database and the index.",
    },
    {
      q: "How would you switch embedding models without downtime?",
      a: "Build a new collection or table with the new model in the background, re-embedding all chunks with batching and rate limits. Run the retrieval eval set against both; if the new one wins, atomically switch an alias or configuration flag the app reads, keep the old index for rollback, and delete it later. Record the model version with every vector.",
    },
    {
      q: "How do you implement multi-tenancy in a vector database?",
      a: "Common options are a shared collection with a tenant id in every payload plus an indexed filter on every query, namespaces or partitions per tenant, or a collection per tenant for a few large or regulated customers; with Postgres, pgvector plus row-level security. Whatever the pattern, enforce the tenant filter in one data-access layer and test that one tenant can never retrieve another's data.",
    },
  ],
  practice: [
    "Run Qdrant in local mode (`QdrantClient(\":memory:\")`), index two tenants that both have a document called \"policy\", and write a test proving re-indexing one doesn't touch the other.",
  ],
};
