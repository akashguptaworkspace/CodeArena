// Day 5: Embeddings & vector databases. Shape: see ./index.js
import { embedModels, searchHistory } from "./vectors-search.js";
import { retrievalMetrics, vectorOps } from "./vectors-ops.js";
import { deepHnsw, deepSimilarity, deepTradeoffs, deepVectorDbs } from "./vectors-deep.js";
import { miniVectorDb } from "./vectors-builds.js";

const base = {
  similarity: {
    minutes: 50,
    level: "Beginner",
    intro:
      "Day 3 gave you the intuition for embeddings. Today you use them as an engineer: the similarity maths, why normalisation matters, how to embed thousands of texts efficiently, and how to choose an embedding model.",
    sections: [
      {
        h: "Three ways to compare vectors",
        blocks: [
          {
            table: {
              head: ["Metric", "Formula (idea)", "Range", "Higher means"],
              rows: [
                ["**Cosine similarity**", "a·b / (‖a‖‖b‖): the angle only", "−1 to 1", "More similar"],
                ["**Dot product**", "a·b: angle and length", "Unbounded", "More similar"],
                ["**Euclidean (L2) distance**", "‖a − b‖: straight-line distance", "0 to ∞", "Less similar (it's a distance)"],
              ],
            },
          },
          "Most text embedding models return **normalised** vectors (length 1). For normalised vectors, cosine similarity equals the dot product, and Euclidean distance ranks results in exactly the same order. So in practice: use cosine (or dot product on normalised vectors), and make sure the vector database is configured with the metric the model was trained for.",
          {
            lang: "python",
            code: `import numpy as np

a = np.array([0.2, 0.9, 0.1])
b = np.array([0.25, 0.85, 0.05])

cos = a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
a_n, b_n = a / np.linalg.norm(a), b / np.linalg.norm(b)
print(cos, a_n @ b_n)             # identical once normalised`,
          },
        ],
      },
      {
        h: "Brute-force search in NumPy",
        blocks: [
          "Before any database, here is semantic search in a few lines. With normalised vectors it's one matrix multiplication.",
          {
            lang: "python",
            code: `from openai import OpenAI
import numpy as np

client = OpenAI()
EMBED_MODEL = "text-embedding-3-small"

def embed(texts: list[str]) -> np.ndarray:
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    vecs = np.array([d.embedding for d in resp.data], dtype=np.float32)
    return vecs / np.linalg.norm(vecs, axis=1, keepdims=True)      # normalise

faqs = ["How do I reset my password?", "What payment methods do you accept?",
        "Can I get a refund after 30 days?", "How long does delivery take to Pune?"]
faq_vecs = embed(faqs)                     # (4, 1536) - compute once, store

def search(query: str, k: int = 2):
    q = embed([query])[0]
    scores = faq_vecs @ q                  # cosine similarity with every FAQ
    top = np.argsort(-scores)[:k]
    return [(faqs[i], float(scores[i])) for i in top]

search("I forgot my login")                # password reset comes first`,
          },
          "This is exact (every vector is compared) and fast for up to roughly 100K vectors. Beyond that, or with filters and persistence needs, you want a vector index (next lessons).",
        ],
      },
      {
        h: "Embedding at scale",
        blocks: [
          {
            list: [
              "**Batch:** embedding APIs accept many inputs per request (hundreds). One request for 100 texts is far faster than 100 requests.",
              "**Respect limits:** each input has a maximum token length (often 8K tokens); chunk long documents first (Day 7).",
              "**Concurrency with a cap:** run batches concurrently with a semaphore (Day 2).",
              "**Cache by content hash:** store `sha256(text + model)` → vector, so re-indexing unchanged text costs nothing.",
              "**Store the model name** with every vector. Changing models means re-embedding everything.",
            ],
          },
          {
            lang: "python",
            code: `import hashlib

def cache_key(text: str, model: str) -> str:
    return hashlib.sha256(f"{model}::{text}".encode()).hexdigest()`,
          },
        ],
      },
      {
        h: "Choosing an embedding model",
        blocks: [
          {
            table: {
              head: ["Factor", "What to check"],
              rows: [
                ["Quality on your data", "Build 20–50 query → correct document pairs and measure hit rate. Public leaderboards (MTEB) are only a starting point."],
                ["Language", "Hindi, Hinglish or regional languages need a multilingual model (e.g. multilingual E5 or BGE-M3, or a strong API model). Test it."],
                ["Dimensions", "Bigger vectors can be more accurate but cost more storage and search time (see the trade-offs lesson)."],
                ["Max input length", "Must fit your chunk size."],
                ["Hosting and privacy", "API models send text to the provider; open models (BGE, E5, GTE, Nomic) run on your own infrastructure."],
                ["Cost", "API embedding is cheap per token, but re-embedding millions of chunks adds up."],
              ],
            },
          },
          {
            lang: "python",
            code: `# Open-source embeddings locally with sentence-transformers
# uv add sentence-transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-small-en-v1.5")
vecs = model.encode(["How do I reset my password?"], normalize_embeddings=True)`,
          },
          {
            note: "Some models (E5, BGE and others) expect prefixes such as `query: ` and `passage: `, or a separate instruction for queries. Read the model card; skipping it quietly lowers quality.",
          },
        ],
      },
    ],
    revise: [
      "Cosine = angle; dot = angle + length; L2 = distance. On normalised vectors, cosine = dot product, and L2 gives the same ranking.",
      "Normalise vectors and use the metric the model expects.",
      "Brute force (`matrix @ query`) is exact and fine up to ~100K vectors.",
      "Batch embedding calls, cap concurrency, cache by content hash, store the model name.",
      "Choose models on your own query→document test set; check language, dimensions, max length, hosting, cost; follow model-card prefixes.",
    ],
    mistakes: [
      "Mixing vectors from two different embedding models in one index.",
      "One API call per text instead of batching.",
      "Ignoring query/passage prefixes required by the model.",
      "Choosing a model from a leaderboard without testing on your own data.",
    ],
    interview: [
      {
        q: "Cosine similarity vs dot product vs Euclidean distance?",
        a: "Cosine measures only the angle between vectors; dot product includes magnitude; Euclidean is the straight-line distance. For normalised embeddings, cosine equals dot product and Euclidean distance produces the same ranking, so the choice mostly matters for unnormalised vectors. Use the metric the embedding model was trained with, typically cosine.",
      },
      {
        q: "How do you choose an embedding model for a RAG system?",
        a: "Create a small labelled set of real queries and their relevant documents, then compare candidate models on retrieval metrics like hit rate and MRR. Also weigh language coverage (multilingual needs), max input length versus chunk size, dimensions and storage cost, latency, data privacy (API vs self-hosted), and price for the total corpus. Leaderboards like MTEB help shortlist.",
      },
    ],
    practice: [
      "Implement the NumPy search over 30 FAQs you write, and test 10 paraphrased queries.",
      "Compare `text-embedding-3-small` with a local BGE model on the same 10 queries; count how many top-1 results are correct for each.",
    ],
  },

  "vector-dbs": {
    minutes: 60,
    level: "Intermediate",
    intro:
      "A **vector database** stores embeddings with their text and metadata, builds an index for fast nearest-neighbour search, and supports filters, updates and persistence. There are many options; this lesson shows how they compare and the core operations they all share.",
    sections: [
      {
        h: "What a vector DB stores",
        blocks: [
          "Each record (called a point, row or document) has:",
          {
            list: [
              "**id:** stable identifier, e.g. `policy.pdf#p4#c2`.",
              "**vector:** the embedding.",
              "**payload / metadata:** text, source, page, owner, tenant, created date, tags. Used for filtering and for citations.",
            ],
          },
          "Core operations: **upsert** (insert or update), **query** (nearest neighbours, optionally filtered), **delete**, and **index configuration** (metric, index type).",
        ],
      },
      {
        h: "The options",
        blocks: [
          {
            table: {
              head: ["Option", "Type", "Strengths", "When to pick"],
              rows: [
                ["**Chroma**", "Embedded / local server", "Zero setup, Python-first", "Prototypes, notebooks, learning"],
                ["**Qdrant**", "Open-source server + cloud", "Fast, rich filtering, hybrid search, Docker", "Self-hosted production"],
                ["**Pinecone**", "Fully managed SaaS", "No ops, scales, serverless pricing", "Teams wanting zero infrastructure"],
                ["**pgvector**", "Postgres extension", "One DB for app data + vectors, SQL joins, transactions, works on RDS", "You already use Postgres; up to millions of vectors"],
                ["**MongoDB Atlas Vector Search**", "Managed Mongo feature", "Vectors next to your Mongo documents", "Existing Atlas/MERN stack"],
                ["Others", "Weaviate, Milvus, Elasticsearch/OpenSearch, Redis", "Various", "Existing infra or special needs"],
              ],
            },
          },
          {
            tip: "For your portfolio: Chroma or Qdrant to learn, pgvector for the deployed project. \"Postgres + pgvector\" appears in many Indian GenAI job descriptions, and it fits AWS RDS for Day 18.",
          },
        ],
      },
      {
        h: "Chroma: fastest start",
        blocks: [
          {
            lang: "python",
            code: `# uv add chromadb
import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./chroma_db")
ef = embedding_functions.OpenAIEmbeddingFunction(model_name="text-embedding-3-small")
col = client.get_or_create_collection("faqs", embedding_function=ef,
                                      metadata={"hnsw:space": "cosine"})

col.upsert(
    ids=["faq-1", "faq-2"],
    documents=["How do I reset my password?", "Refunds are allowed within 30 days."],
    metadatas=[{"category": "account"}, {"category": "billing"}],
)
res = col.query(query_texts=["forgot login"], n_results=2, where={"category": "account"})
print(res["documents"], res["distances"])`,
          },
        ],
      },
      {
        h: "Qdrant: production-grade and self-hostable",
        blocks: [
          {
            lang: "bash",
            code: `docker run -p 6333:6333 -v $(pwd)/qdrant_data:/qdrant/storage qdrant/qdrant`,
          },
          {
            lang: "python",
            code: `# uv add qdrant-client
from qdrant_client import QdrantClient, models

qc = QdrantClient(url="http://localhost:6333")
qc.create_collection("docs", vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE))

qc.upsert("docs", points=[
    models.PointStruct(id=1, vector=vec, payload={"text": text, "source": "policy.pdf", "page": 4, "tenant": "acme"}),
])

hits = qc.query_points(
    "docs", query=query_vec, limit=5,
    query_filter=models.Filter(must=[models.FieldCondition(key="tenant", match=models.MatchValue(value="acme"))]),
).points
for h in hits:
    print(h.score, h.payload["source"], h.payload["page"])`,
          },
        ],
      },
      {
        h: "pgvector: vectors inside Postgres",
        blocks: [
          {
            lang: "sql",
            code: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  document_id bigint REFERENCES documents(id) ON DELETE CASCADE,
  owner_id    bigint NOT NULL,
  content     text NOT NULL,
  page        int,
  embedding   vector(1536) NOT NULL
);

-- approximate index for cosine distance
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

-- top 5 for one user; <=> is cosine distance (lower = closer)
SELECT id, content, page, 1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE owner_id = $2
ORDER BY embedding <=> $1
LIMIT 5;`,
          },
          {
            table: {
              head: ["Operator", "Meaning"],
              rows: [
                ["`<=>`", "Cosine distance (1 − cosine similarity)"],
                ["`<->`", "Euclidean (L2) distance"],
                ["`<#>`", "Negative inner product"],
              ],
            },
          },
          "In Python, the `pgvector` package adds a SQLAlchemy `Vector(1536)` column type, so you can query with `select(Chunk).order_by(Chunk.embedding.cosine_distance(q)).limit(5)`.",
        ],
      },
      {
        h: "MongoDB Atlas Vector Search",
        blocks: [
          "If your app is already on MongoDB Atlas, define a vector search index on a field and query with an aggregation stage. It keeps your MERN-style stack.",
          {
            lang: "javascript",
            code: `db.chunks.aggregate([
  { $vectorSearch: {
      index: "chunks_vector_index",
      path: "embedding",
      queryVector: queryVec,
      numCandidates: 100,
      limit: 5,
      filter: { ownerId: userId }
  } },
  { $project: { content: 1, page: 1, score: { $meta: "vectorSearchScore" } } }
])`,
          },
        ],
      },
    ],
    revise: [
      "A record = id + vector + metadata (text, source, page, owner/tenant).",
      "Operations: upsert, query (k nearest + filter), delete, index config (metric).",
      "Chroma = prototypes; Qdrant = self-hosted production; Pinecone = managed; pgvector = Postgres; Atlas = MongoDB.",
      "pgvector: `vector(n)` column, HNSW index with `vector_cosine_ops`, `ORDER BY embedding <=> $1`.",
      "Always filter by user/tenant in the query itself for access control.",
    ],
    mistakes: [
      "Configuring the collection with a different distance metric than the model expects.",
      "Storing vectors without the text and source metadata needed for citations.",
      "Filtering permissions after retrieval in Python (you may get zero allowed results); filter inside the query.",
      "Dimension mismatch between the collection and the embedding model.",
    ],
    interview: [
      {
        q: "Why can't a normal database index do semantic search?",
        a: "B-tree and hash indexes answer exact or range lookups on scalar values. Semantic search asks for the nearest vectors in a high-dimensional space, and that has no natural ordering a B-tree can use. It needs specialised approximate nearest-neighbour indexes like HNSW or IVF, which is what vector databases, or extensions like pgvector, provide.",
      },
      {
        q: "Which vector database would you choose and why?",
        a: "It depends on scale and existing stack. If we already run Postgres and have up to a few million vectors, pgvector keeps one system with SQL filters, joins and transactions. If we need very large scale, advanced hybrid search or multi-tenancy features with low ops, a dedicated store like Qdrant or managed Pinecone fits. For prototypes, Chroma. I'd benchmark recall and latency with our own data and filters before deciding.",
      },
    ],
    practice: [
      "Load your 30 FAQs into Chroma with categories, and query with a category filter.",
      "Run Qdrant in Docker, create a collection and repeat the same queries.",
    ],
  },

  hnsw: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "Comparing a query against every vector is exact but slow at millions of vectors. **Approximate nearest neighbour (ANN)** indexes find almost the same results thousands of times faster. HNSW is the most common one. You need the intuition and the tuning knobs, not the maths.",
    sections: [
      {
        h: "Exact vs approximate",
        blocks: [
          "Brute force (flat) search compares the query with all N vectors: O(N). With 10 million vectors of 1,536 dimensions, that's roughly 15 billion multiplications per query. ANN indexes trade a little accuracy for huge speed, returning maybe 95–99% of the true top results.",
          "That accuracy is called **recall**: of the true top-k neighbours, what fraction did the index return? Tuning an ANN index is about balancing recall, latency and memory.",
        ],
      },
      {
        h: "HNSW intuition",
        blocks: [
          "**HNSW (Hierarchical Navigable Small World)** builds a layered graph where each vector is linked to some of its neighbours. Think of how you'd find a house in an unfamiliar city:",
          {
            list: [
              "**Top layer (few nodes, long links):** like a national highway map. Jump quickly to the right region.",
              "**Middle layers:** state and city roads. Get closer.",
              "**Bottom layer (every vector, short links):** local streets. Walk greedily to the nearest neighbours.",
            ],
            ordered: true,
          },
          "At each layer, the search moves to whichever linked node is closer to the query until it can't improve, then drops down a layer. It visits a tiny fraction of the vectors, so search is roughly logarithmic in N.",
          {
            table: {
              head: ["Parameter", "Meaning", "Higher value →"],
              rows: [
                ["`M`", "Links per node", "Better recall, more memory, slower build"],
                ["`ef_construction`", "Candidates considered while building", "Better graph quality, slower build"],
                ["`ef_search` (`ef`)", "Candidates considered per query", "Better recall, slower queries"],
              ],
            },
          },
          "Defaults are good to start with. If recall is too low, raise `ef_search` first, because it's a query-time setting that needs no rebuild.",
          {
            lang: "sql",
            code: `-- pgvector
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 100;      -- per session / query`,
          },
        ],
      },
      {
        h: "Other index types",
        blocks: [
          {
            table: {
              head: ["Index", "Idea", "Trade-off"],
              rows: [
                ["Flat", "Compare with everything", "Exact, slow at scale"],
                ["**HNSW**", "Layered neighbour graph", "Fast and accurate; uses more memory; the usual default"],
                ["IVF (e.g. pgvector `ivfflat`)", "Cluster vectors; search only the nearest clusters (`lists`, `probes`)", "Less memory, faster build; needs data to train clusters; lower recall if probes is small"],
                ["Quantisation (PQ, scalar, binary)", "Compress vectors", "Much less memory; some accuracy loss; often combined with re-scoring"],
              ],
            },
          },
        ],
      },
      {
        h: "Metadata filtering",
        blocks: [
          "Real queries have filters: this user's documents, this product category, documents after a date. There are three strategies:",
          {
            table: {
              head: ["Strategy", "How", "Risk"],
              rows: [
                ["Post-filter", "Get top-k by vector, then drop the ones that fail the filter", "Can return fewer than k, or zero, when the filter is selective"],
                ["Pre-filter", "Filter first, then search only matching vectors", "Can be slow if the filter leaves many vectors and no index applies"],
                ["**Filtered (in-index) search**", "The index respects the filter during graph traversal", "Best; supported by Qdrant, Pinecone, recent pgvector and others"],
              ],
            },
          },
          {
            list: [
              "Index your filter fields (payload indexes in Qdrant, normal B-tree indexes in Postgres).",
              "For multi-tenant apps, filter by tenant or user **inside the query**, or use one collection or namespace per tenant.",
              "With pgvector and a selective `WHERE`, check the results count. Recent versions support iterative index scans to avoid returning too few results.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Exact search is O(N); ANN trades a little recall for big speed.",
      "Recall = fraction of true top-k returned; tune recall vs latency vs memory.",
      "HNSW = layered graph, coarse to fine, greedy search. Knobs: `M`, `ef_construction`, `ef_search` (raise `ef_search` first).",
      "IVF clusters vectors (`lists`/`probes`); quantisation compresses vectors.",
      "Filtering: post-filter can return too few; prefer in-index filtered search; index the filter fields; tenant filters inside the query.",
    ],
    interview: [
      {
        q: "What is HNSW, roughly?",
        a: "Hierarchical Navigable Small World is a graph-based approximate nearest-neighbour index. Vectors are nodes connected to nearby vectors across several layers: upper layers are sparse with long-range links, the bottom layer contains all vectors. A search starts at the top, greedily moves toward the query, and descends layer by layer, visiting only a small fraction of vectors. M, ef_construction and ef_search trade memory and speed against recall.",
      },
      {
        q: "Your filtered vector search sometimes returns only 1 result when you asked for 10. Why?",
        a: "Probably post-filtering: the index fetched the top candidates by similarity and then the metadata filter removed most of them. Fixes: use the database's filtered search so the filter applies during traversal, increase candidate counts (ef_search, numCandidates), add indexes on filter fields, enable iterative scans where supported, or partition data by tenant.",
      },
    ],
    practice: [
      "Generate 200K clustered normalised vectors with NumPy (random noise around a few hundred topic vectors, like real embeddings); time brute-force search vs an HNSW index (the `hnswlib` package, or pgvector).",
      "Measure recall@10 of the HNSW index against brute force at `ef_search` 10, 40 and 100.",
    ],
  },

  tradeoffs: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Design interviews for GenAI roles often include \"estimate the storage and cost of indexing X documents\". This lesson gives you the numbers and levers to answer confidently and make sensible choices.",
    sections: [
      {
        h: "Storage maths",
        blocks: [
          "A float32 number is 4 bytes. So one vector takes **dimensions × 4 bytes**, plus index overhead (HNSW adds the graph links, often another 20–100%).",
          {
            table: {
              head: ["Dimensions", "Per vector", "1M vectors (raw)", "10M vectors (raw)"],
              rows: [
                ["384", "1.5 KB", "~1.5 GB", "~15 GB"],
                ["768", "3 KB", "~3 GB", "~30 GB"],
                ["1,536", "6 KB", "~6 GB", "~60 GB"],
                ["3,072", "12 KB", "~12 GB", "~120 GB"],
              ],
            },
          },
          "HNSW works best when the index fits in RAM, so this translates directly into instance size and cost.",
          {
            lang: "text",
            code: `Example: 50,000 PDFs × 20 pages × 3 chunks/page = 3M chunks
3M × 1,536 dims × 4 bytes ≈ 18 GB raw + ~50% index ≈ 27 GB RAM
Same with 512 dims ≈ 6 GB raw + index ≈ 9 GB RAM`,
          },
        ],
      },
      {
        h: "Levers to reduce size and cost",
        blocks: [
          {
            list: [
              "**Smaller dimensions:** some models (OpenAI's text-embedding-3 family and other Matryoshka-trained models) let you request shorter vectors (e.g. 512 instead of 1,536) with modest quality loss. Test on your eval set.",
              "**Quantisation:** store int8 (4× smaller) or binary (32× smaller) vectors, then re-score top candidates with full precision. Supported by Qdrant, pgvector (`halfvec`, `bit`), and others.",
              "**Fewer, better chunks:** don't embed boilerplate (headers, footers, navigation); deduplicate.",
              "**Tiering:** keep hot or recent data in the fast index, archive the rest.",
            ],
          },
          {
            lang: "python",
            code: `resp = client.embeddings.create(model="text-embedding-3-small", input=texts, dimensions=512)`,
          },
        ],
      },
      {
        h: "Latency budget",
        blocks: [
          "A typical RAG request, and where the time goes:",
          {
            table: {
              head: ["Step", "Typical time"],
              rows: [
                ["Embed the query (API)", "50–300 ms"],
                ["Vector search (HNSW, in RAM)", "5–50 ms"],
                ["Rerank top 20–50 (API or model)", "100–500 ms"],
                ["LLM time to first token", "300 ms–2 s"],
                ["LLM full answer (300 tokens)", "2–8 s"],
              ],
            },
          },
          "The LLM dominates. Vector search is rarely the bottleneck unless the index doesn't fit in memory or filters are slow. Optimise in order: stream the answer, use a faster model, cache, rerank fewer candidates, and only then tune the index.",
        ],
      },
      {
        h: "Cost of embedding",
        blocks: [
          {
            lang: "text",
            code: `3M chunks × 400 tokens = 1.2B tokens
At an example price of $0.02 per 1M tokens → about $24 to embed everything once.`,
          },
          "Embedding is usually cheap compared to LLM generation. The real costs are re-embedding when you change model or chunking (so version and cache), and the RAM for the index.",
        ],
      },
    ],
    revise: [
      "Vector size = dims × 4 bytes (float32) + index overhead; HNSW wants RAM.",
      "Levers: fewer dimensions (Matryoshka models), quantisation with re-scoring, fewer and better chunks, tiering.",
      "RAG latency is dominated by the LLM; vector search is usually 5–50 ms.",
      "Embedding cost is small; re-embedding and RAM are the real costs.",
    ],
    interview: [
      {
        q: "Estimate the memory needed to index 10 million chunks with 1,536-dimensional embeddings.",
        a: "10M × 1,536 × 4 bytes ≈ 61 GB for raw float32 vectors, plus HNSW graph and metadata overhead, so roughly 80–120 GB of RAM. To reduce it: request 512–768 dimensions if the model supports it (after checking quality), use int8 or binary quantisation with full-precision re-scoring, or shard across nodes.",
      },
      {
        q: "Your RAG endpoint takes 6 seconds. Where do you look first?",
        a: "Measure each stage with tracing. Usually the LLM generation dominates, so stream to cut perceived latency, reduce output length, use a faster model, and trim the prompt. Then check reranking and embedding calls (batch or cache them), and finally the vector search (index in RAM, efficient filters).",
      },
    ],
    practice: [
      "Estimate RAM and one-time embedding cost for your college's entire syllabus PDFs (make reasonable assumptions and write them down).",
      "Embed your FAQ set at 1,536 and 512 dimensions and compare top-1 accuracy.",
    ],
  },

  "semantic-search": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Build a semantic search service over ~500 product descriptions or FAQs, with a FastAPI endpoint and a tiny search UI. It's your first retrieval system, and the retrieval half of DocChat.",
    sections: [
      {
        h: "Get data",
        blocks: [
          {
            list: [
              "Use a public dataset: an e-commerce products CSV or FAQ dataset from Kaggle or Hugging Face Datasets.",
              "Or generate: ask an LLM for 500 realistic product descriptions in 10 categories, save as JSONL. (Say in your README that the data is synthetic.)",
              "Each record: `id`, `title`, `description`, `category`, `price`.",
            ],
          },
        ],
      },
      {
        h: "Indexing script",
        blocks: [
          {
            lang: "python",
            code: `# scripts/index.py
import json
from qdrant_client import QdrantClient, models
from app.embeddings import embed_batch          # batches of 100, normalised

qc = QdrantClient(url="http://localhost:6333")
COL = "products"

def main():
    rows = [json.loads(l) for l in open("data/products.jsonl", encoding="utf-8")]
    if not qc.collection_exists(COL):
        qc.create_collection(COL, vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE))
        qc.create_payload_index(COL, "category", models.PayloadSchemaType.KEYWORD)
    texts = [f"{r['title']}. {r['description']}" for r in rows]    # embed title + description
    vectors = embed_batch(texts)
    qc.upsert(COL, points=[
        models.PointStruct(id=i, vector=v, payload=r) for i, (r, v) in enumerate(zip(rows, vectors))
    ])
    print(f"indexed {len(rows)} products")

if __name__ == "__main__":
    main()`,
          },
        ],
      },
      {
        h: "Search API",
        blocks: [
          {
            lang: "python",
            code: `@router.get("/search", response_model=list[Hit])
async def search(q: str = Query(min_length=2), category: str | None = None, k: int = Query(10, le=50)):
    qvec = (await embed_batch_async([q]))[0]
    flt = None
    if category:
        flt = models.Filter(must=[models.FieldCondition(key="category", match=models.MatchValue(value=category))])
    points = qc.query_points("products", query=qvec, limit=k, query_filter=flt).points
    return [Hit(score=p.score, **p.payload) for p in points]`,
          },
          "The UI: a React search box with debounce, a category dropdown, and results showing the score. Showing scores teaches you (and your interviewer) how similarity behaves.",
        ],
      },
      {
        h: "Evaluate retrieval",
        blocks: [
          "Write 20 test queries, each with the product id(s) that should appear. Include paraphrases (\"something to keep tea hot\" → thermos), typos and a few Hinglish queries.",
          {
            lang: "python",
            code: `def hit_rate_at_k(cases, k=5) -> float:
    hits = 0
    for case in cases:
        results = [p.payload["id"] for p in search_raw(case["query"], k)]
        hits += any(r in case["relevant"] for r in results)
    return hits / len(cases)`,
          },
          "Record the number in your README (\"hit rate@5 = 0.85 on 20 queries\"). You'll improve on it on Day 10.",
        ],
      },
    ],
    revise: [
      "Embed a meaningful text per record (title + description), store the full record as payload.",
      "Create payload indexes for filter fields.",
      "Evaluate with labelled queries and hit rate@k before and after changes.",
    ],
    practice: [
      "Find 3 queries where semantic search fails (exact model numbers, for example) and note them for hybrid search on Day 10.",
    ],
  },

  "compare-dbs": {
    minutes: 90,
    level: "Intermediate",
    intro:
      "Run the same search on Chroma and pgvector, compare results and speed, and write it up. The goal is evidence-based opinions you can defend in interviews, instead of repeating blog posts.",
    sections: [
      {
        h: "Setup",
        blocks: [
          {
            lang: "bash",
            code: `docker run -d --name pgv -e POSTGRES_PASSWORD=postgres -p 5433:5432 pgvector/pgvector:pg16
uv add chromadb "psycopg[binary]" pgvector numpy`,
          },
          "Reuse the same embeddings for both (compute once, save to `vectors.npy`), so you compare databases, not models.",
        ],
      },
      {
        h: "pgvector loader and query",
        blocks: [
          {
            lang: "python",
            code: `import numpy as np, psycopg
from pgvector.psycopg import register_vector

conn = psycopg.connect("postgresql://postgres:postgres@localhost:5433/postgres", autocommit=True)
conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
register_vector(conn)
conn.execute("DROP TABLE IF EXISTS products")
conn.execute("CREATE TABLE products (id int PRIMARY KEY, title text, category text, embedding vector(1536))")

with conn.cursor().copy("COPY products (id, title, category, embedding) FROM STDIN WITH (FORMAT BINARY)") as copy:
    copy.set_types(["int4", "text", "text", "vector"])
    for r, v in zip(rows, vectors):
        copy.write_row([r["id"], r["title"], r["category"], v])

conn.execute("CREATE INDEX ON products USING hnsw (embedding vector_cosine_ops)")

def pg_search(qvec, k=5):
    return conn.execute(
        "SELECT id, title, 1 - (embedding <=> %s) AS sim FROM products ORDER BY embedding <=> %s LIMIT %s",
        (qvec, qvec, k)).fetchall()`,
          },
        ],
      },
      {
        h: "What to measure and write up",
        blocks: [
          {
            table: {
              head: ["Measure", "How"],
              rows: [
                ["Top-5 overlap", "For each test query, how many of the same ids do both return?"],
                ["Hit rate@5", "Using your labelled queries from the previous task"],
                ["p50 / p95 query latency", "Time 200 queries with `time.perf_counter()`"],
                ["Indexing time", "Time to load and index everything"],
                ["Developer experience", "Setup effort, filtering, ops, backups"],
              ],
            },
          },
          "Write a short README section: a results table and a recommendation like \"Chroma for prototyping; pgvector for the deployed app because we already need Postgres and it runs on RDS.\" This small study is excellent interview material.",
        ],
      },
    ],
    revise: [
      "Compare databases with identical embeddings.",
      "Measure overlap, hit rate, p50/p95 latency and indexing time.",
      "Turn measurements into a recommendation with reasons.",
    ],
    practice: [
      "Add Qdrant as a third column in your comparison.",
    ],
  },
};

// Append deeper sections (d05-deep.js) to the original lessons.
function deepen(lesson, extra) {
  return {
    ...lesson,
    minutes: lesson.minutes + extra.minutes,
    sections: [...lesson.sections, ...extra.sections],
    revise: [...lesson.revise, ...extra.revise],
    interview: [...(lesson.interview ?? []), ...(extra.interview ?? [])],
  };
}

export default {
  "search-history": searchHistory,
  similarity: deepen(base.similarity, deepSimilarity),
  "embed-models": embedModels,
  "vector-dbs": deepen(base["vector-dbs"], deepVectorDbs),
  hnsw: deepen(base.hnsw, deepHnsw),
  "retrieval-metrics": retrievalMetrics,
  "vector-ops": vectorOps,
  tradeoffs: deepen(base.tradeoffs, deepTradeoffs),
  "mini-vectordb": miniVectorDb,
  "semantic-search": base["semantic-search"],
  "compare-dbs": base["compare-dbs"],
};
