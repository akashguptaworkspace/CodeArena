// Day 5 practice: embeddings & vector databases. Shape: see ./index.js
import { keywordGroup, metricGroup, modelGroup, qdrantGroup, quantGroup } from "./d05-more.js";

export default {
  intro:
    "Twenty-one exercises from keyword search to production vector databases: build an inverted index and BM25 baseline, compare BM25 with embeddings, check score distributions, Matryoshka truncation and Hindi/Hinglish retrieval, implement and apply retrieval metrics, use Chroma, Qdrant (with tenant-isolation tests and blue-green re-indexing) and pgvector, benchmark HNSW, and compress vectors with int8 and binary quantisation. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day05 && cd ~/genai-practice/day05
uv init --no-readme .
uv add openai python-dotenv numpy chromadb qdrant-client rank_bm25 "psycopg[binary]" pgvector hnswlib
cp ../day03/llm.py ../day03/.env .

# Postgres with pgvector (needs Docker Desktop running)
docker run -d --name pgv -e POSTGRES_PASSWORD=postgres -p 5433:5432 pgvector/pgvector:pg16`,
    },
    {
      lang: "python",
      code: `# faqs.py: shared sample data for today's exercises
FAQS = [
    {"id": "f1", "text": "How do I reset my password?", "category": "account"},
    {"id": "f2", "text": "How do I change my registered email?", "category": "account"},
    {"id": "f3", "text": "What payment methods do you accept? UPI, cards, net banking.", "category": "payments"},
    {"id": "f4", "text": "Is cash on delivery available?", "category": "payments"},
    {"id": "f5", "text": "Refunds are processed within 7 working days.", "category": "refunds"},
    {"id": "f6", "text": "Can I return an item after 30 days?", "category": "refunds"},
    {"id": "f7", "text": "Delivery to Pune takes 2-4 days.", "category": "delivery"},
    {"id": "f8", "text": "How do I track my order?", "category": "delivery"},
]`,
    },
  ],
  groups: [
    keywordGroup,
    {
      title: "Search without a database",
      exercises: [
        {
          id: "numpy-search",
          title: "A reusable top-k search function",
          level: "Easy",
          task: [
            "Embed all FAQ texts once. Write `search(query, k=3)` that returns the top-k `(score, id, text)` tuples. Try \"forgot my login\", \"pay with UPI\" and \"money back\".",
          ],
          solution: `import numpy as np
from faqs import FAQS
from llm import embed

def normalise(vectors) -> np.ndarray:
    v = np.array(vectors, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

MATRIX = normalise(embed([f["text"] for f in FAQS]))    # shape: (8, dimensions)

def search(query: str, k: int = 3) -> list[tuple[float, str, str]]:
    q = normalise(embed([query]))[0]
    scores = MATRIX @ q
    top = np.argsort(-scores)[:k]
    return [(round(float(scores[i]), 3), FAQS[i]["id"], FAQS[i]["text"]) for i in top]

for query in ["forgot my login", "pay with UPI", "money back"]:
    print(query)
    for hit in search(query):
        print("   ", hit)`,
          explanation: [
            "Embedding the documents happens once; each query needs only one embedding call plus one matrix multiplication.",
            "`np.argsort(-scores)` returns indexes sorted by score, highest first (negating flips the order).",
            "`MATRIX.shape` is (number of FAQs, embedding dimensions). Brute force like this is exact and fine up to about 100,000 vectors.",
          ],
          concepts: [
            ["`np.argsort()`", "Returns the indexes that would sort an array."],
            ["Top-k", "The k best results."],
            ["Brute-force (flat) search", "Comparing the query with every vector. Exact, slower at large scale."],
          ],
        },
        {
          id: "embed-cache",
          title: "Cache embeddings so you never pay twice",
          level: "Medium",
          task: [
            "Write `cached_embed(texts)` that stores vectors in `embed_cache.json` keyed by a SHA-256 hash of `model + text`. Only texts not in the cache are sent to the API, in one batch. Run it twice and print how many were fetched each time.",
          ],
          hint: "`hashlib.sha256(f\"{MODEL}::{text}\".encode()).hexdigest()` gives a stable key.",
          solution: `import hashlib
import json
from pathlib import Path
from llm import embed, EMBED_MODEL

CACHE = Path("embed_cache.json")

def key(text: str) -> str:
    return hashlib.sha256(f"{EMBED_MODEL}::{text}".encode()).hexdigest()

def cached_embed(texts: list[str]) -> list[list[float]]:
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    missing = [t for t in dict.fromkeys(texts) if key(t) not in cache]
    if missing:
        for text, vec in zip(missing, embed(missing)):
            cache[key(text)] = vec
        CACHE.write_text(json.dumps(cache))
    print(f"fetched {len(missing)}, cached {len(texts) - len(missing)}")
    return [cache[key(t)] for t in texts]

texts = ["hello world", "vector databases", "hello world"]
cached_embed(texts)      # fetched 2
cached_embed(texts)      # fetched 0`,
          explanation: [
            "Including the model name in the key matters: the same text embedded by a different model gives a different, incompatible vector.",
            "`dict.fromkeys(texts)` removes duplicates while keeping order, so \"hello world\" is only fetched once.",
            "Real systems store this cache in Redis or the database, but the idea is identical. Re-indexing unchanged documents becomes free.",
          ],
          concepts: [
            ["Hash (SHA-256)", "A fixed-length fingerprint of some text. Same text → same hash."],
            ["`.encode()`", "Converts a `str` into `bytes`, which hash functions need."],
            ["Cache", "Stored results reused to avoid repeating slow or costly work."],
          ],
        },
      ],
    },
    modelGroup,
    metricGroup,
    {
      title: "Chroma",
      exercises: [
        {
          id: "chroma-basics",
          title: "Store and query FAQs in Chroma with a filter",
          level: "Easy",
          task: [
            "Create a persistent Chroma collection, upsert the FAQs with their category as metadata (pass your own embeddings), and query \"how long for refund\" twice: without a filter and with `category = \"refunds\"`.",
          ],
          solution: `import chromadb
from faqs import FAQS
from llm import embed

client = chromadb.PersistentClient(path="./chroma_db")
col = client.get_or_create_collection("faqs", metadata={"hnsw:space": "cosine"})

col.upsert(
    ids=[f["id"] for f in FAQS],
    documents=[f["text"] for f in FAQS],
    metadatas=[{"category": f["category"]} for f in FAQS],
    embeddings=embed([f["text"] for f in FAQS]),
)

q = embed(["how long for refund"])
for where in [None, {"category": "refunds"}]:
    res = col.query(query_embeddings=q, n_results=3, where=where)
    print("filter:", where)
    for doc, dist in zip(res["documents"][0], res["distances"][0]):
        print(f"   {1 - dist:.2f}  {doc}")`,
          explanation: [
            "`upsert` inserts new ids and updates existing ones, so running the script twice doesn't create duplicates.",
            "Chroma returns **distances** (lower is closer). With cosine space, similarity = 1 − distance.",
            "`where` filters by metadata during the search. In real apps you filter by user or tenant this way for access control.",
            "`PersistentClient` saves data in `./chroma_db`, so it survives restarts.",
          ],
          concepts: [
            ["Vector database", "Stores vectors with metadata and finds nearest neighbours quickly."],
            ["Metadata filter", "Restricting search to records whose metadata matches, e.g. category or owner."],
            ["Upsert", "Insert or update by id."],
            ["Distance vs similarity", "Distance: lower = closer. Similarity: higher = closer."],
          ],
        },
        {
          id: "chroma-update",
          title: "Update and delete documents",
          level: "Easy",
          task: [
            "Change FAQ `f7` to \"Delivery to Pune takes 1-2 days.\" (re-embed it), delete `f4`, then print the collection count and query \"cash payment\" to confirm `f4` is gone.",
          ],
          solution: `import chromadb
from llm import embed

col = chromadb.PersistentClient(path="./chroma_db").get_collection("faqs")

new_text = "Delivery to Pune takes 1-2 days."
col.upsert(ids=["f7"], documents=[new_text], metadatas=[{"category": "delivery"}],
           embeddings=embed([new_text]))
col.delete(ids=["f4"])

print("count:", col.count())
res = col.query(query_embeddings=embed(["cash payment"]), n_results=2)
print(res["ids"][0], res["documents"][0])`,
          explanation: [
            "When a document's text changes, its vector must be recomputed; updating only the text would leave a stale embedding.",
            "Stable ids (like `f7`, or `file.pdf:p3:c2` in RAG) are what make updates and deletes possible.",
          ],
          concepts: [
            ["Stable id", "An id that stays the same for the same piece of content, so you can update or delete it."],
            ["Re-embedding", "Computing a new vector after the text changes."],
          ],
        },
      ],
    },
    qdrantGroup,
    {
      title: "Postgres + pgvector",
      exercises: [
        {
          id: "pgvector-basics",
          title: "Vectors in Postgres",
          level: "Medium",
          task: [
            "Connect to the Docker Postgres, enable the `vector` extension, create a `faqs` table with a `vector` column sized to your embedding model, insert the FAQs, create an HNSW index, and run a top-3 query with a category filter.",
          ],
          hint: "`register_vector(conn)` lets you pass NumPy arrays as parameters. Cosine distance is the `<=>` operator.",
          solution: `import numpy as np
import psycopg
from pgvector.psycopg import register_vector
from faqs import FAQS
from llm import embed

vectors = [np.array(v, dtype=np.float32) for v in embed([f["text"] for f in FAQS])]
dims = len(vectors[0])

conn = psycopg.connect("postgresql://postgres:postgres@localhost:5433/postgres", autocommit=True)
conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
register_vector(conn)
conn.execute("DROP TABLE IF EXISTS faqs")
conn.execute(f"CREATE TABLE faqs (id text PRIMARY KEY, text text, category text, embedding vector({dims}))")

with conn.cursor() as cur:
    for f, v in zip(FAQS, vectors):
        cur.execute("INSERT INTO faqs VALUES (%s, %s, %s, %s)", (f["id"], f["text"], f["category"], v))

conn.execute("CREATE INDEX ON faqs USING hnsw (embedding vector_cosine_ops)")

q = np.array(embed(["how do I pay"])[0], dtype=np.float32)
rows = conn.execute(
    """SELECT id, text, 1 - (embedding <=> %s) AS similarity
       FROM faqs WHERE category = %s
       ORDER BY embedding <=> %s LIMIT 3""",
    (q, "payments", q),
).fetchall()
for row in rows:
    print(row)`,
          explanation: [
            "`vector(1536)` (or your model's size) is a column type added by the pgvector extension.",
            "`<=>` is cosine distance; ordering by it ascending gives the most similar rows first. `1 - distance` converts to similarity for display.",
            "The HNSW index makes the ORDER BY fast on large tables. The `WHERE` clause filters in the same query, which is how you enforce per-user access.",
            "`%s` placeholders pass values safely (no SQL injection).",
          ],
          concepts: [
            ["pgvector", "A Postgres extension adding a vector type, distance operators and vector indexes."],
            ["`<=>`, `<->`, `<#>`", "Cosine distance, Euclidean distance and negative inner product."],
            ["HNSW index", "A fast approximate nearest-neighbour index."],
            ["Parameterised query", "SQL with placeholders filled in by the driver, preventing injection."],
          ],
        },
        {
          id: "distance-ops",
          title: "Compare the three distance operators",
          level: "Easy",
          task: [
            "In `psql` (or Python), compare cosine, Euclidean and inner product for two small vectors. Then explain why the ranking is the same for normalised vectors.",
            { lang: "bash", code: `docker exec -it pgv psql -U postgres` },
          ],
          solution: `-- inside psql
SELECT '[1,2,3]'::vector <=> '[2,4,6]'::vector AS cosine_distance,     -- 0: same direction
       '[1,2,3]'::vector <-> '[2,4,6]'::vector AS euclidean_distance,  -- 3.74: different lengths
       '[1,2,3]'::vector <#> '[2,4,6]'::vector AS neg_inner_product;   -- -28

-- normalised versions of the same two vectors
SELECT '[0.267,0.534,0.802]'::vector <-> '[0.267,0.534,0.802]'::vector AS euclidean_normalised;  -- 0`,
          explanation: [
            "`[1,2,3]` and `[2,4,6]` point in the same direction, so cosine distance is 0, but Euclidean distance isn't because their lengths differ.",
            "After normalising (length 1), all three measures rank results the same way. Most text embeddings are already normalised, so cosine is the usual choice.",
          ],
          concepts: [
            ["`psql`", "Postgres's command-line client."],
            ["`::vector`", "Casts a text literal to the vector type."],
            ["Normalised vector", "A vector scaled to length 1."],
          ],
        },
      ],
    },
    {
      title: "Approximate search and sizing",
      exercises: [
        {
          id: "hnsw-benchmark",
          title: "Brute force vs HNSW: speed and recall",
          level: "Hard",
          task: [
            "Generate 50,000 normalised 384-dimensional vectors that cluster around 500 \"topics\" (like real embeddings do). Time 100 brute-force top-10 queries vs an `hnswlib` index. Measure recall@10 (how many of the true top 10 HNSW found) at `ef` = 10, 50 and 200.",
          ],
          solution: `import time
import hnswlib
import numpy as np

rng = np.random.default_rng(0)
N, D, K = 50_000, 384, 10

def normalise(x):
    return (x / np.linalg.norm(x, axis=1, keepdims=True)).astype(np.float32)

topics = normalise(rng.standard_normal((500, D)))              # real embeddings cluster by topic
data = normalise(topics[rng.integers(0, 500, N)] + 0.075 * rng.standard_normal((N, D)))
queries = normalise(topics[rng.integers(0, 500, 100)] + 0.075 * rng.standard_normal((100, D)))

t = time.perf_counter()
truth = [np.argsort(-(data @ q))[:K] for q in queries]
print(f"brute force: {(time.perf_counter() - t) * 10:.1f} ms/query")

index = hnswlib.Index(space="cosine", dim=D)
index.init_index(max_elements=N, M=16, ef_construction=100)
t = time.perf_counter()
index.add_items(data)
print(f"index build: {time.perf_counter() - t:.1f}s")

for ef in [10, 50, 200]:
    index.set_ef(max(ef, K))
    t = time.perf_counter()
    labels, _ = index.knn_query(queries, k=K)
    ms = (time.perf_counter() - t) * 10
    recall = np.mean([len(set(l) & set(tr)) / K for l, tr in zip(labels, truth)])
    print(f"ef={ef:<4} {ms:.2f} ms/query  recall@10={recall:.2f}")`,
          explanation: [
            "Brute force compares each query with all 50,000 vectors. HNSW visits only a small part of its graph, so it's much faster.",
            "The data is clustered on purpose. With purely random vectors every point is almost equally far from every other, recall looks terrible, and the benchmark tells you nothing about real embeddings.",
            "`ef` is how many candidates HNSW keeps while searching: higher `ef` → better recall but slower queries. This is the main knob you tune in production.",
            "Recall@10 = overlap between HNSW's top 10 and the true top 10. 0.95+ is typical with sensible settings.",
            "(Time per query is total seconds × 1000 ms ÷ 100 queries, hence `* 10`.)",
          ],
          concepts: [
            ["ANN (approximate nearest neighbour)", "Search that trades a little accuracy for large speed-ups."],
            ["Recall@k", "Fraction of the true top-k results that the approximate search returned."],
            ["`M`, `ef_construction`, `ef`", "HNSW settings: links per node, build quality, and search breadth."],
          ],
        },
        {
          id: "size-estimate",
          title: "Estimate storage and embedding cost",
          level: "Easy",
          task: [
            "Write `estimate(docs, pages_per_doc, chunks_per_page, dims, tokens_per_chunk, price_per_m)` that prints the number of chunks, raw vector storage in GB (float32 = 4 bytes), storage with 50% index overhead, and the one-time embedding cost. Try 50,000 PDFs × 20 pages × 3 chunks at 1,536 and 512 dimensions, 400 tokens per chunk, $0.02 per million tokens (example price).",
          ],
          solution: `def estimate(docs, pages_per_doc, chunks_per_page, dims, tokens_per_chunk, price_per_m):
    chunks = docs * pages_per_doc * chunks_per_page
    raw_gb = chunks * dims * 4 / 1e9
    tokens = chunks * tokens_per_chunk
    print(f"{dims} dims: {chunks:,} chunks | raw {raw_gb:.1f} GB | with index ~{raw_gb * 1.5:.1f} GB "
          f"| embedding once ≈ \${tokens / 1e6 * price_per_m:,.0f}")

for dims in [1536, 512]:
    estimate(50_000, 20, 3, dims, 400, 0.02)`,
          explanation: [
            "Each float32 number takes 4 bytes, so a vector takes `dims × 4` bytes. 3 million chunks × 1,536 dims ≈ 18 GB before index overhead.",
            "Smaller dimensions (some models let you request them) cut storage and RAM roughly 3×, with some quality loss that you should measure.",
            "Embedding everything once is usually cheap. The bigger costs are RAM for the index and re-embedding when you change models.",
            "`50_000` is the same as `50000`; underscores make big numbers readable.",
          ],
          concepts: [
            ["float32", "A 32-bit (4-byte) decimal number; the usual format for stored vectors."],
            ["Back-of-envelope estimate", "A quick calculation to size a system before building it. Common in design interviews."],
            ["`1e9`", "1,000,000,000: bytes in a gigabyte (decimal)."],
          ],
        },
      ],
    },
    quantGroup,
  ],
};
