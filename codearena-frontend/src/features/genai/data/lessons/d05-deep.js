// Day 5: extra depth appended to the original lessons in d05.js (similarity, vector-dbs, hnsw, tradeoffs).

export const deepSimilarity = {
  minutes: 25,
  sections: [
    {
      h: "Similarity scores aren't probabilities: thresholds and \"no result\"",
      blocks: [
        "Embedding scores are **relative**. Many models squeeze all scores into a narrow band (for example 0.7–0.9 even for unrelated text), so \"0.8\" means nothing on its own. To decide when to say \"no relevant document\", look at the distributions:",
        {
          lang: "python",
          code: `import numpy as np

def score_report(pairs_relevant, pairs_irrelevant, embed):
    def scores(pairs):
        a = embed([q for q, _ in pairs])
        b = embed([d for _, d in pairs])
        return (a * b).sum(axis=1)                       # cosine for normalised vectors
    rel, irr = scores(pairs_relevant), scores(pairs_irrelevant)
    print(f"relevant   min {rel.min():.2f}  median {np.median(rel):.2f}")
    print(f"irrelevant max {irr.max():.2f}  median {np.median(irr):.2f}")
    # pick a threshold between the two, then check it on held-out pairs`,
        },
        {
          list: [
            "Choose thresholds **per model** (and re-check after changing models).",
            "Prefer ranking plus a reranker score (Day 8) for \"is this relevant?\" decisions; rerankers are better calibrated.",
            "For RAG, you usually still send the top-k and let the prompt's \"I don't know\" rule handle weak matches.",
          ],
        },
      ],
    },
    {
      h: "A batched, cached embedding function",
      blocks: [
        {
          lang: "python",
          code: `import hashlib, json, sqlite3
import numpy as np
from openai import OpenAI

client = OpenAI()
MODEL = "text-embedding-3-small"
db = sqlite3.connect("embedding_cache.db")
db.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, vec TEXT)")

def _key(text: str) -> str:
    return hashlib.sha256(f"{MODEL}::{text}".encode()).hexdigest()

def embed_documents(texts: list[str], batch: int = 128) -> np.ndarray:
    keys = [_key(t) for t in texts]
    found = dict(db.execute(f"SELECT key, vec FROM cache WHERE key IN ({','.join('?' * len(keys))})", keys))
    todo = [(k, t) for k, t in zip(keys, texts) if k not in found]
    for i in range(0, len(todo), batch):                      # one API call per batch, not per text
        part = todo[i:i + batch]
        resp = client.embeddings.create(model=MODEL, input=[t for _, t in part])
        rows = [(k, json.dumps(d.embedding)) for (k, _), d in zip(part, resp.data)]
        db.executemany("INSERT OR REPLACE INTO cache VALUES (?, ?)", rows)
        found.update(rows)
    db.commit()
    vecs = np.array([json.loads(found[k]) for k in keys], dtype=np.float32)
    return vecs / np.linalg.norm(vecs, axis=1, keepdims=True)`,
          caption: "For very large jobs, keep this key idea (hash of model + text) but use Postgres or Redis, and run batches concurrently under a rate-limit semaphore.",
        },
      ],
    },
  ],
  revise: [
    "Similarity scores are relative and model-specific; set thresholds from relevant vs irrelevant score distributions.",
    "Embed in batches with a cache keyed by hash(model + text).",
  ],
  interview: [
    {
      q: "How do you decide a similarity threshold for \"no relevant result\"?",
      a: "Scores are model-specific and often compressed into a narrow range, so there's no universal threshold. I compute the score distributions for labelled relevant and irrelevant query–document pairs, pick a threshold between them, validate it on held-out pairs, and revisit it whenever the model changes. Often a reranker score or the LLM's \"I don't know\" rule is a more reliable gate.",
    },
  ],
};

export const deepVectorDbs = {
  minutes: 25,
  sections: [
    {
      h: "Pinecone in code (fully managed)",
      blocks: [
        {
          lang: "python",
          code: `# uv add pinecone
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone()                                   # reads PINECONE_API_KEY
if not pc.has_index("docs"):
    pc.create_index("docs", dimension=1536, metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"))
index = pc.Index("docs")

index.upsert(vectors=[{"id": "policy#p4#c2", "values": vec,
                       "metadata": {"source": "policy.pdf", "page": 4, "text": text}}],
             namespace="acme")                    # one namespace per tenant
res = index.query(vector=qvec, top_k=5, include_metadata=True, namespace="acme",
                  filter={"source": {"$eq": "policy.pdf"}})
for m in res.matches:
    print(m.score, m.metadata["page"])`,
        },
      ],
    },
    {
      h: "pgvector with SQLAlchemy (your Day 2 stack)",
      blocks: [
        {
          lang: "python",
          code: `# uv add pgvector "sqlalchemy[asyncio]" asyncpg
from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, ForeignKey, Index, Integer, Text, select
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"))
    owner_id: Mapped[int] = mapped_column(BigInteger, index=True)
    page: Mapped[int | None] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))

    __table_args__ = (
        Index("ix_chunks_embedding", "embedding", postgresql_using="hnsw",
              postgresql_ops={"embedding": "vector_cosine_ops"}),
    )

async def search(session, owner_id: int, qvec: list[float], k: int = 5):
    distance = Chunk.embedding.cosine_distance(qvec)
    stmt = (select(Chunk, (1 - distance).label("similarity"))
            .where(Chunk.owner_id == owner_id)
            .order_by(distance).limit(k))
    return (await session.execute(stmt)).all()`,
          caption: "Enable the extension in an Alembic migration with `op.execute(\"CREATE EXTENSION IF NOT EXISTS vector\")` before creating the table.",
        },
        "Your chunks now live next to users, documents and permissions, so one SQL query can filter by ownership, join to document titles and respect transactions. That's pgvector's biggest advantage.",
      ],
    },
    {
      h: "A decision guide",
      blocks: [
        {
          table: {
            head: ["If...", "Consider"],
            rows: [
              ["You're prototyping in a notebook", "Chroma (or plain NumPy)"],
              ["Your app already uses Postgres and you have up to a few million vectors", "**pgvector**"],
              ["Your app is on MongoDB Atlas (MERN)", "Atlas Vector Search"],
              ["You need tens of millions+ vectors, rich filtering, hybrid/sparse vectors, quantisation, self-hosting", "Qdrant, Milvus or Weaviate"],
              ["You want zero infrastructure and serverless pricing", "Pinecone (or managed Qdrant/Weaviate)"],
              ["You already run Elasticsearch/OpenSearch for keyword search", "Their vector features, keeping hybrid search in one place"],
            ],
          },
        },
        "In interviews, justify the choice with scale, existing stack, filtering and multi-tenancy needs, ops capacity and cost, and mention that you'd benchmark recall and latency on your own data.",
      ],
    },
  ],
  revise: [
    "Pinecone: serverless index, namespaces per tenant, metadata filters with `$eq`-style operators.",
    "pgvector + SQLAlchemy: `Vector(dim)` column, HNSW index with `vector_cosine_ops`, `order_by(col.cosine_distance(q))`, filters and joins in the same query.",
    "Choose by scale, existing stack, filtering/tenancy needs, ops capacity and cost; benchmark on your data.",
  ],
  interview: [
    {
      q: "pgvector vs a dedicated vector database?",
      a: "pgvector keeps vectors next to relational data: one system, SQL filters and joins, transactions, existing backups and managed hosting like RDS, which is ideal up to a few million vectors when you already use Postgres. Dedicated vector databases like Qdrant, Milvus or Pinecone offer better performance at very large scale, advanced filtering, sparse/hybrid vectors, quantisation options and horizontal scaling, at the cost of another system to run and keep in sync.",
    },
  ],
};

export const deepHnsw = {
  minutes: 30,
  sections: [
    {
      h: "Benchmark HNSW yourself",
      blocks: [
        "Numbers you measure beat numbers you memorise. This script compares brute force with HNSW at different `ef_search` values on 50,000 clustered 384-dimensional vectors:",
        {
          lang: "python",
          code: `# uv add hnswlib numpy
import time
import hnswlib
import numpy as np

rng = np.random.default_rng(0)
N, DIM, K = 50_000, 384, 10

def normalise(x):
    return (x / np.linalg.norm(x, axis=1, keepdims=True)).astype(np.float32)

# clustered synthetic "embeddings": real ones cluster by topic (pure random noise is a worst case)
topics = normalise(rng.normal(size=(500, DIM)))
data = normalise(topics[rng.integers(0, 500, N)] + 0.075 * rng.normal(size=(N, DIM)))
queries = normalise(topics[rng.integers(0, 500, 200)] + 0.075 * rng.normal(size=(200, DIM)))

# exact answers by brute force
t = time.perf_counter()
truth = np.argsort(-(queries @ data.T), axis=1)[:, :K]
flat_ms = (time.perf_counter() - t) / len(queries) * 1000

index = hnswlib.Index(space="cosine", dim=DIM)
t = time.perf_counter()
index.init_index(max_elements=N, M=16, ef_construction=100)
index.add_items(data, np.arange(N))
print(f"flat {flat_ms:.2f} ms/query | HNSW build {time.perf_counter() - t:.1f}s")

for ef in (10, 20, 50, 100, 200):
    index.set_ef(ef)                                  # ef_search: candidates explored per query
    t = time.perf_counter()
    labels, _ = index.knn_query(queries, k=K)
    ms = (time.perf_counter() - t) / len(queries) * 1000
    recall = np.mean([len(set(l) & set(tr)) / K for l, tr in zip(labels, truth)])
    print(f"ef_search={ef:>3}: recall@{K} = {recall:.3f}, {ms:.3f} ms/query")`,
        },
        {
          lang: "text",
          code: `flat 2.61 ms/query | HNSW build 4.5s
ef_search= 10: recall@10 = 0.804, 0.016 ms/query
ef_search= 20: recall@10 = 0.968, 0.021 ms/query
ef_search= 50: recall@10 = 1.000, 0.033 ms/query
ef_search=100: recall@10 = 1.000, 0.055 ms/query
ef_search=200: recall@10 = 1.000, 0.134 ms/query`,
          caption: "Real output on a laptop. Note: ef_search below k (here 10) hurts recall badly; HNSW is ~100× faster than brute force at full recall.",
        },
        {
          tip: "Try the same script with purely random vectors (no topics): recall drops sharply, because in random high-dimensional data every point is almost equally far from every other. Real embeddings are clustered, which is why ANN works so well on them.",
        },
      ],
    },
    {
      h: "Quantisation, intuitively",
      blocks: [
        {
          table: {
            head: ["Technique", "Idea", "Size for 1,536 dims", "Typical use"],
            rows: [
              ["float32 (none)", "Full precision", "6,144 bytes", "Baseline"],
              ["float16 / `halfvec`", "Half-precision floats", "3,072 bytes", "Almost free quality-wise"],
              ["Scalar (int8)", "Each number mapped to 256 levels", "1,536 bytes", "Common default for large indexes"],
              ["Binary", "Keep only the sign of each number (1 bit)", "192 bytes", "Huge candidate sets, then re-score with full vectors"],
              ["Product quantisation (PQ)", "Split the vector into sub-vectors, replace each with the nearest of 256 learned codes", "Tens of bytes", "Billion-scale (FAISS IVF-PQ)"],
            ],
          },
        },
        "The standard pattern is **search on the compressed vectors, then re-score the top candidates with full-precision vectors** (oversampling), which recovers most of the lost recall.",
        {
          lang: "sql",
          code: `-- pgvector: index a half-precision copy (smaller index, near-identical recall)
CREATE INDEX ON chunks USING hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops);

-- binary quantisation index for very large tables, then re-rank with the full vectors
CREATE INDEX ON chunks USING hnsw ((binary_quantize(embedding)::bit(1536)) bit_hamming_ops);

-- selective filters: let HNSW keep scanning until enough rows pass the WHERE clause (pgvector 0.8+)
SET hnsw.iterative_scan = relaxed_order;`,
        },
      ],
    },
  ],
  revise: [
    "Measure recall@k vs brute force at several ef_search values; keep ef_search ≥ k.",
    "ANN works because real embeddings are clustered; random vectors are a worst case.",
    "Quantisation: halfvec (2×), int8 (4×), binary (32×), PQ (much more); search compressed, re-score with full vectors.",
    "pgvector: halfvec and binary_quantize expression indexes; iterative scans for selective filters.",
  ],
  interview: [
    {
      q: "What is vector quantisation and what's the trade-off?",
      a: "Storing vectors in fewer bits: float16, int8 scalar quantisation, 1-bit binary, or product quantisation with learned codebooks. It cuts memory and speeds up search, sometimes by 4–32× or more, at the cost of some recall. The usual mitigation is to search with the quantised vectors, oversample candidates, and re-score them with full-precision vectors.",
    },
  ],
};

export const deepTradeoffs = {
  minutes: 20,
  sections: [
    {
      h: "A sizing worksheet in code",
      blocks: [
        {
          lang: "python",
          code: `def size_index(docs: int, pages_per_doc: int, chunks_per_page: float, dims: int,
               bytes_per_dim: float = 4, index_overhead: float = 0.5,
               tokens_per_chunk: int = 400, price_per_m_tokens: float = 0.02) -> dict:
    chunks = int(docs * pages_per_doc * chunks_per_page)
    raw_gb = chunks * dims * bytes_per_dim / 1e9
    return {
        "chunks": chunks,
        "raw_vectors_gb": round(raw_gb, 1),
        "ram_with_index_gb": round(raw_gb * (1 + index_overhead), 1),
        "embed_cost_usd": round(chunks * tokens_per_chunk / 1e6 * price_per_m_tokens, 2),
    }

print(size_index(50_000, 20, 3, 1536))                      # float32
print(size_index(50_000, 20, 3, 1536, bytes_per_dim=1))     # int8 quantised
print(size_index(50_000, 20, 3, 512))                       # Matryoshka 512 dims
# {'chunks': 3000000, 'raw_vectors_gb': 18.4, 'ram_with_index_gb': 27.6, 'embed_cost_usd': 24.0}
# {'chunks': 3000000, 'raw_vectors_gb': 4.6, 'ram_with_index_gb': 6.9, 'embed_cost_usd': 24.0}
# {'chunks': 3000000, 'raw_vectors_gb': 6.1, 'ram_with_index_gb': 9.2, 'embed_cost_usd': 24.0}`,
          caption: "Example prices; plug in current ones. State your assumptions out loud in interviews.",
        },
        {
          list: [
            "Don't forget **payload storage** (the chunk text and metadata), which can rival the vectors in size.",
            "Plan for **growth** and for a second copy during blue-green re-indexing.",
            "Embedding cost is one-off per re-index; RAM is a monthly cost. Optimise the one that dominates.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Chunks = docs × pages × chunks/page; RAM ≈ chunks × dims × bytes × (1 + overhead); add payload text and a second copy for re-indexing.",
  ],
  interview: [],
};
