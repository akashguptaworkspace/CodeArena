// Day 5: the history of search (keyword → BM25 → dense) and embedding models in depth. Merged into d05.js. Shape: see ./index.js

export const searchHistory = {
  minutes: 80,
  level: "Beginner",
  intro:
    "Vector databases didn't replace search out of nowhere. For 50 years, search meant **keywords**: inverted indexes, TF-IDF and BM25, the engines behind Lucene, Elasticsearch and every site search you've used. Dense vector search arrived only around 2019–2020. Knowing both, and why each fails, is exactly what lets you design good RAG retrieval and answer \"BM25 vs embeddings?\" in interviews. You'll even build BM25 from scratch in 40 lines.",
  sections: [
    {
      h: "A short history of search",
      blocks: [
        {
          table: {
            head: ["When", "Milestone", "Why it matters"],
            rows: [
              ["1960s–70s", "Gerard Salton's SMART system and the **vector space model**: documents and queries as vectors of word weights", "The first time text search was treated as geometry"],
              ["1972", "Karen Spärck Jones introduces **IDF** (inverse document frequency)", "Rare words matter more than common ones: the core of TF-IDF"],
              ["1990s", "**BM25** (Okapi BM25, Robertson and colleagues)", "Still the default keyword ranking in Lucene, Elasticsearch and OpenSearch today"],
              ["1998", "Google's **PageRank**", "Ranking by link authority, not just text match"],
              ["1999–2010", "**Lucene** (1999), Solr, then **Elasticsearch** (2010)", "Open-source inverted-index search engines power most site search"],
              ["2013", "**word2vec**", "Words as dense vectors with meaning"],
              ["2016–17", "**HNSW** paper (Malkov & Yashunin); Facebook releases **FAISS**", "Fast approximate nearest-neighbour search over millions of vectors"],
              ["2019", "Google applies **BERT** to Search; Sentence-BERT", "Neural models understand queries; sentence embeddings become practical"],
              ["2020", "**Dense Passage Retrieval (DPR)**, **ColBERT**, and the **RAG** paper", "Learned embeddings beat BM25 on many question-answering benchmarks"],
              ["2019–21", "Dedicated vector databases: Milvus, Pinecone, Weaviate, Qdrant; **pgvector** for Postgres", "Vector search becomes a product category"],
              ["2023–today", "The RAG boom; vector search added to Postgres, MongoDB, Elasticsearch, Redis and more; **hybrid search** everywhere", "Vectors become a standard database feature, usually combined with BM25"],
            ],
          },
        },
      ],
    },
    {
      h: "The inverted index: how keyword search is fast",
      blocks: [
        "A book's index maps words to page numbers. An **inverted index** maps every term to the documents that contain it (a *posting list*), often with counts and positions. To answer a query, the engine looks up each query term and only scores documents in those lists, never scanning everything.",
        {
          lang: "text",
          code: `"refund"    → {d4: 1}
"delivery"  → {d2: 1, d5: 1}
"password"  → {d3: 2}
query "delivery pune" → candidates = postings("delivery") ∪ postings("pune") = {d2, d5}`,
        },
        "This is why Elasticsearch can search billions of documents in milliseconds, and it's what your SQL `LIKE '%refund%'` can't do (it scans every row).",
      ],
    },
    {
      h: "TF-IDF and BM25, intuitively",
      blocks: [
        {
          list: [
            "**TF (term frequency):** a document that mentions \"refund\" five times is probably more about refunds than one that mentions it once.",
            "**IDF (inverse document frequency):** \"the\" appears everywhere and tells you nothing; \"GSTIN\" appears in few documents and is very informative. Weight terms by how rare they are.",
            "**BM25** improves TF-IDF with two ideas: **saturation** (the 10th mention of a word adds little; controlled by `k1`) and **length normalisation** (long documents mention everything, so scale by document length; controlled by `b`).",
          ],
        },
        {
          lang: "text",
          code: `score(D, Q) = Σ over query terms t:  IDF(t) × tf(t,D) × (k1 + 1) / (tf(t,D) + k1 × (1 − b + b × |D| / avgdl))

k1 ≈ 1.2–2.0  (how fast repeated terms saturate)     b ≈ 0.75  (how much to penalise long documents)`,
        },
      ],
    },
    {
      h: "Build BM25 from scratch",
      blocks: [
        {
          lang: "python",
          code: `import math
import re
from collections import Counter, defaultdict

DOCS = {
    "d1": "Refunds are processed within 7 days of receiving the returned item.",
    "d2": "Cash on delivery is available for orders below 5000 rupees.",
    "d3": "To reset your password, open Settings and tap Forgot password.",
    "d4": "Return the item within 30 days for a full refund to your original payment method.",
    "d5": "Delivery to Pune usually takes 2 to 4 days.",
}

def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())

# 1. Inverted index: term -> {doc_id: term frequency}
index: dict[str, dict[str, int]] = defaultdict(dict)
doc_len: dict[str, int] = {}
for doc_id, text in DOCS.items():
    tokens = tokenize(text)
    doc_len[doc_id] = len(tokens)
    for term, tf in Counter(tokens).items():
        index[term][doc_id] = tf

N = len(DOCS)
avgdl = sum(doc_len.values()) / N

def bm25(query: str, k1: float = 1.5, b: float = 0.75) -> list[tuple[str, float]]:
    scores: dict[str, float] = defaultdict(float)
    for term in tokenize(query):
        postings = index.get(term, {})
        if not postings:
            continue
        df = len(postings)                                   # documents containing the term
        idf = math.log(1 + (N - df + 0.5) / (df + 0.5))      # rare terms matter more
        for doc_id, tf in postings.items():
            norm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * doc_len[doc_id] / avgdl))
            scores[doc_id] += idf * norm
    return sorted(scores.items(), key=lambda kv: -kv[1])

for q in ["refund days", "forgot password", "money back"]:
    print(q, "->", [(d, round(s, 2)) for d, s in bm25(q)])`,
        },
        {
          lang: "text",
          code: `refund days     -> [('d4', 1.65), ('d5', 0.59), ('d1', 0.54)]
forgot password -> [('d3', 3.49)]
money back      -> []`,
          caption: "Real output. Look closely at the first and last lines.",
        },
        {
          list: [
            "**\"refund days\"** ranks d1 (\"Refunds are processed within 7 days\") *last*, matching only on \"days\", because `refunds` ≠ `refund`. Real engines add **stemming/lemmatisation** (refunds → refund) and synonyms.",
            "**\"money back\"** returns nothing at all: no shared words. This is the **vocabulary mismatch** problem, and it's exactly what embeddings solve.",
          ],
        },
        {
          tip: "In projects, use a library: `rank_bm25` for small in-memory corpora, or Elasticsearch/OpenSearch, Postgres full-text search, or the BM25/sparse features of Qdrant and Weaviate at scale.",
        },
      ],
    },
    {
      h: "Dense retrieval: search by meaning",
      blocks: [
        "Dense retrieval embeds the query and every document with the same model and returns the nearest vectors. \"money back\" lands next to \"full refund\" because the model learned they mean the same thing. That's the leap from **lexical** to **semantic** search.",
        {
          table: {
            head: ["", "Keyword / BM25 (sparse)", "Embeddings (dense)"],
            rows: [
              ["Matches", "Exact terms (after stemming)", "Meaning, paraphrases, other languages"],
              ["Wins on", "Product codes, error ids, names, rare jargon, exact phrases", "Natural questions, synonyms, vague wording"],
              ["Fails on", "Synonyms, paraphrases, typos (without fuzzy matching)", "Exact ids and numbers, negation, unseen jargon"],
              ["Explainability", "Easy: you see which words matched", "Hard: a similarity score"],
              ["Cost", "Cheap: no model needed", "Embedding model + vector index"],
              ["Index", "Inverted index", "ANN index (HNSW, IVF)"],
            ],
          },
        },
        "The two fail in opposite ways, which is why production systems combine them in **hybrid search** (Day 8). A candidate who says \"embeddings replaced BM25\" in an interview loses points; one who says \"they're complementary, and I measure both\" gains them.",
      ],
    },
    {
      h: "Why vector databases appeared",
      blocks: [
        {
          list: [
            "Embeddings made semantic search possible, but finding nearest neighbours among millions of vectors needs special indexes (HNSW, IVF) that B-tree databases didn't have.",
            "Applications also needed metadata filters, updates, deletes, persistence, replication and APIs around those indexes: a database, not just a library like FAISS.",
            "The RAG boom (2023) turned this into a hot product category, and then mainstream databases added vector support, so today you choose between **dedicated vector DBs** and **vectors inside your existing database**.",
          ],
        },
      ],
    },
  ],
  revise: [
    "History: vector space model (1960s–70s) → IDF (1972) → BM25 (1990s) → Lucene/Elasticsearch → word2vec (2013) → HNSW/FAISS (2016–17) → BERT in search, DPR, ColBERT, RAG (2019–20) → vector DBs → hybrid everywhere.",
    "Inverted index: term → posting list of documents; only candidate documents are scored.",
    "TF: more mentions = more relevant; IDF: rare terms matter more; BM25 adds saturation (k1) and length normalisation (b).",
    "Lexical search fails on vocabulary mismatch and missing stemming; dense search fails on exact ids, numbers and negation.",
    "Sparse and dense are complementary → hybrid search.",
    "Vector DBs = ANN indexes + filters + CRUD + persistence + ops.",
  ],
  mistakes: [
    "Claiming embeddings make keyword search obsolete.",
    "Using SQL `LIKE '%term%'` as \"search\": it scans every row and ranks nothing.",
    "Forgetting stemming and synonyms when evaluating a keyword baseline.",
  ],
  interview: [
    {
      q: "Explain BM25.",
      a: "A keyword ranking function used by Lucene and Elasticsearch. For each query term it multiplies an IDF weight (rare terms count more) by a term-frequency component that saturates (controlled by k1, so repeated mentions add diminishing value) and is normalised by document length (controlled by b, so long documents don't win just by being long). Scores are summed over query terms.",
    },
    {
      q: "BM25 vs dense retrieval: when does each win?",
      a: "BM25 wins on exact terms: product codes, error ids, names, rare jargon and exact phrases, and it's cheap and explainable. Dense retrieval wins on meaning: paraphrases, synonyms, vague natural-language questions and cross-lingual queries, but it can miss exact identifiers and negation. They fail differently, so production RAG usually combines them with hybrid search and measures both on a labelled query set.",
    },
    {
      q: "What is an inverted index?",
      a: "A mapping from each term to the list of documents (and often positions and counts) that contain it. At query time the engine reads only the posting lists of the query's terms, so it scores a small candidate set instead of scanning every document. It's the core data structure of keyword search engines.",
    },
  ],
  practice: [
    "Add simple stemming (strip a trailing \"s\") to the BM25 tokenizer and check that d1 now ranks higher for \"refund days\".",
    "Find two queries where BM25 beats embeddings on your own data, and two where embeddings win.",
  ],
};

export const embedModels = {
  minutes: 90,
  level: "Intermediate",
  intro:
    "The embedding model decides what \"similar\" means in your system, so it quietly determines most of your retrieval quality. This lesson goes beyond calling an API: how embedding models are trained, bi-encoders vs cross-encoders, reading the MTEB leaderboard, the main model families, query/passage prefixes, Matryoshka dimensions, sparse and late-interaction models, multilingual and Hinglish retrieval, fine-tuning on your own data, and serving open models.",
  sections: [
    {
      h: "How embedding models are trained",
      blocks: [
        "Most text embedding models start from a pretrained transformer encoder and are trained with **contrastive learning** on huge numbers of (query, relevant passage) pairs: search logs, question–answer sites, title–abstract pairs, and increasingly synthetic pairs generated by LLMs.",
        {
          list: [
            "**In-batch negatives:** in a batch of 1,000 pairs, each query's own passage is the positive and the other 999 passages are negatives. The loss pulls the positive closer and pushes negatives away. Bigger batches = more negatives = better models.",
            "**Hard negatives:** passages that look relevant but aren't (same topic, wrong answer). Training on them teaches fine distinctions.",
            "**Instructions and prefixes:** many models are trained with prefixes like `query:` / `passage:` or task instructions, so they must be used the same way at inference time.",
          ],
        },
      ],
    },
    {
      h: "Bi-encoders vs cross-encoders",
      blocks: [
        {
          table: {
            head: ["", "Bi-encoder (embedding model)", "Cross-encoder (reranker)"],
            rows: [
              ["How", "Encodes query and document **separately** into vectors; compare with cosine", "Reads query and document **together** and outputs a relevance score"],
              ["Precompute documents?", "Yes: embed once, store in a vector DB", "No: must run for every (query, document) pair"],
              ["Speed", "Search millions in milliseconds", "Slow; practical for the top 20–100 candidates"],
              ["Accuracy", "Good", "Better: sees word-level interactions between query and document"],
              ["Role in RAG", "First-stage retrieval", "Second-stage reranking (Day 8)"],
            ],
          },
        },
        "This retrieve-then-rerank pattern (fast, broad bi-encoder → slow, precise cross-encoder) is the backbone of good RAG systems.",
      ],
    },
    {
      h: "Reading the MTEB leaderboard",
      blocks: [
        "The **Massive Text Embedding Benchmark (MTEB)** scores models across task types: retrieval, reranking, semantic similarity (STS), classification, clustering, pair classification and summarisation, in many languages (including multilingual and Indic subsets).",
        {
          list: [
            "For RAG, look at the **Retrieval** column (and your language), not the overall average.",
            "Check **model size, dimensions and max tokens**: a model 1% better but 10× larger may not be worth it.",
            "Check the **licence** for open models and whether scores were self-reported.",
            "Beware overfitting to the benchmark: some models are trained on data similar to MTEB tasks. Always confirm on your own queries.",
          ],
        },
      ],
    },
    {
      h: "Model families you'll meet",
      blocks: [
        {
          table: {
            head: ["Family", "Type", "Notes"],
            rows: [
              ["OpenAI `text-embedding-3-small` / `-large`", "API", "1,536 / 3,072 dims, shortenable via `dimensions`; 8K-token input; strong general choice"],
              ["Cohere Embed, Voyage, Google Gemini embeddings, Jina", "API", "Strong retrieval models; several are multilingual and some offer domain variants (code, finance, law)"],
              ["BGE (`bge-small/base/large-en-v1.5`, **`bge-m3`**)", "Open (BAAI)", "Very popular; bge-m3 is multilingual (100+ languages), long input (8K), and produces dense, sparse and multi-vector outputs"],
              ["E5 (`e5-*`, **`multilingual-e5-*`**)", "Open (Microsoft)", "Requires `query:` / `passage:` prefixes; multilingual variants handle Hindi"],
              ["GTE, Nomic Embed, mxbai, Snowflake Arctic Embed", "Open", "Strong small and mid-size models; Nomic works with Ollama (`nomic-embed-text`)"],
              ["`all-MiniLM-L6-v2`", "Open", "Tiny and fast (384 dims), older; fine for demos, weaker for serious retrieval"],
            ],
          },
        },
        {
          note: "Model names and rankings change every few months. Learn the selection *process*: shortlist from MTEB, test on your own labelled queries, then weigh cost, speed, privacy and languages.",
        },
      ],
    },
    {
      h: "Prefixes and instructions: the silent quality killer",
      blocks: [
        "Many models are **asymmetric**: queries are short questions, documents are long passages, and the model was trained to embed them differently. Use the prefixes from the model card:",
        {
          table: {
            head: ["Model", "Query", "Document"],
            rows: [
              ["E5 family", "`query: how do I get a refund`", "`passage: Refunds are processed within...`"],
              ["BGE v1.5 (English)", "`Represent this sentence for searching relevant passages: how do I...`", "No prefix"],
              ["Nomic Embed", "`search_query: ...`", "`search_document: ...`"],
              ["OpenAI text-embedding-3", "No prefix", "No prefix"],
            ],
          },
        },
        {
          lang: "python",
          code: `from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/multilingual-e5-small")
docs = model.encode([f"passage: {d}" for d in documents], normalize_embeddings=True)
q = model.encode([f"query: {question}"], normalize_embeddings=True)[0]
scores = docs @ q`,
        },
        {
          warn: "Forgetting prefixes doesn't raise an error. Retrieval just gets quietly worse. Wrap embedding in one function (`embed_query`, `embed_documents`) so prefixes can't be forgotten.",
        },
      ],
    },
    {
      h: "Matryoshka embeddings: choose your dimensions",
      blocks: [
        "Matryoshka-trained models pack the most important information into the first dimensions (like nested Russian dolls), so you can **truncate** vectors and re-normalise with a small quality loss. OpenAI's `text-embedding-3` models expose this through the `dimensions` parameter; for open Matryoshka models you truncate yourself.",
        {
          lang: "python",
          code: `import numpy as np

def shorten(vectors: np.ndarray, dims: int) -> np.ndarray:
    v = vectors[:, :dims]                                   # keep the first dims numbers
    return v / np.linalg.norm(v, axis=1, keepdims=True)     # re-normalise!

small = shorten(full_vectors, 256)                          # 6× less storage than 1,536`,
        },
        "Only do this with models trained for it, and measure the recall loss on your own query set before and after.",
      ],
    },
    {
      h: "Beyond single vectors: sparse and late-interaction models",
      blocks: [
        {
          table: {
            head: ["Type", "Examples", "Idea", "Trade-off"],
            rows: [
              ["Dense (single vector)", "OpenAI, BGE, E5", "One vector per text", "Simple, compact; loses fine detail"],
              ["**Learned sparse**", "SPLADE, bge-m3 sparse", "A weight per vocabulary term, learned (includes expansion terms like \"refund\" for \"money back\")", "Works with inverted indexes; keyword precision plus some semantics"],
              ["**Late interaction (multi-vector)**", "ColBERT, bge-m3 multi-vector", "One vector per token; score = sum of best token matches", "Very accurate; much more storage"],
            ],
          },
        },
        "You don't need these on day one, but know the names: they come up in advanced RAG discussions, and Qdrant, Vespa and others support them.",
      ],
    },
    {
      h: "Multilingual, Hindi and Hinglish retrieval",
      blocks: [
        {
          list: [
            "**Cross-lingual retrieval:** a multilingual model can match a Hindi question to an English policy document, because both land in a shared space.",
            "**Code-mixed and Roman-script Hindi** (\"refund kab milega\") is common in Indian apps and harder for models. Test it explicitly.",
            "Candidates to test: `bge-m3`, `multilingual-e5`, and multilingual API models. Measure recall per language, not just overall.",
            "If quality is poor, options include translating queries to English before retrieval, storing an English translation of documents, or fine-tuning on your own pairs.",
          ],
        },
      ],
    },
    {
      h: "Fine-tuning an embedding model on your data",
      blocks: [
        "When your domain has jargon (legal sections, medical terms, internal product names) or a language mix general models handle poorly, fine-tuning a small open model on a few thousand (query, relevant passage) pairs can beat much larger general models.",
        {
          lang: "python",
          code: `# uv add sentence-transformers datasets
from sentence_transformers import SentenceTransformer, losses, InputExample
from torch.utils.data import DataLoader

model = SentenceTransformer("BAAI/bge-small-en-v1.5")
pairs = [InputExample(texts=[q, passage]) for q, passage in load_pairs()]   # (query, relevant passage)
loader = DataLoader(pairs, shuffle=True, batch_size=32)
loss = losses.MultipleNegativesRankingLoss(model)       # in-batch negatives, as in pretraining

model.fit(train_objectives=[(loader, loss)], epochs=1, warmup_steps=50)
model.save("models/bge-small-shopkart")`,
          caption: "The classic fit API; newer Sentence Transformers versions also offer a Trainer-based API with the same losses.",
        },
        {
          list: [
            "Get pairs from search logs (query → clicked result), FAQ question → answer, or have an LLM generate questions for each chunk (**synthetic data**), then spot-check them.",
            "Hold out a test set and compare recall@k before and after; keep the original model if it doesn't clearly win.",
            "Remember: a new model means **re-embedding the whole corpus**.",
          ],
        },
      ],
    },
    {
      h: "Serving open embedding models",
      blocks: [
        {
          table: {
            head: ["Option", "When"],
            rows: [
              ["`sentence-transformers` in your Python process", "Prototypes and small workloads"],
              ["Ollama (`ollama pull nomic-embed-text`) via its OpenAI-compatible API", "Local development; no API key"],
              ["Hugging Face **Text Embeddings Inference (TEI)** server", "Production self-hosting with batching and GPU support"],
              ["Managed endpoints (cloud providers, Hugging Face)", "Open models without running servers"],
            ],
          },
        },
        "Embedding throughput is dominated by batching: send lists of texts, not one text per call, and use a GPU for large indexing jobs.",
      ],
    },
  ],
  revise: [
    "Embedding models: pretrained encoders + contrastive learning on (query, positive) pairs with in-batch and hard negatives.",
    "Bi-encoder: separate encodings, precomputable, fast (retrieval). Cross-encoder: joint scoring, slow, accurate (reranking).",
    "MTEB: look at Retrieval for your language, plus size, dims, max tokens, licence; confirm on your data.",
    "Families: OpenAI text-embedding-3, Cohere, Voyage, Gemini, Jina (API); BGE/bge-m3, E5/multilingual-e5, GTE, Nomic (open).",
    "Use model-card prefixes (E5 `query:`/`passage:`, BGE query instruction, Nomic `search_query:`); wrap them in functions.",
    "Matryoshka: truncate + re-normalise (or `dimensions=`); measure recall loss.",
    "Sparse (SPLADE) and late interaction (ColBERT) exist beyond single dense vectors.",
    "Test Hindi, Hinglish and cross-lingual queries separately; fine-tune on domain pairs with MultipleNegativesRankingLoss if needed.",
  ],
  mistakes: [
    "Forgetting query/passage prefixes.",
    "Truncating non-Matryoshka embeddings, or forgetting to re-normalise.",
    "Choosing by overall MTEB average instead of retrieval scores in your language.",
    "Fine-tuning without a held-out evaluation.",
  ],
  interview: [
    {
      q: "Bi-encoder vs cross-encoder?",
      a: "A bi-encoder embeds queries and documents independently, so document vectors are precomputed and searched with ANN in milliseconds; that's first-stage retrieval. A cross-encoder reads the query and a document together and outputs a relevance score, capturing fine interactions and giving better accuracy, but it must run per pair, so it's used to rerank the top candidates from the bi-encoder.",
    },
    {
      q: "How would you improve retrieval for domain-specific jargon?",
      a: "First measure on a labelled query set. Then try: hybrid search so exact terms match via BM25, a stronger or domain-specific embedding model, correct query/passage prefixes, better chunking with titles and context, a reranker, and if still weak, fine-tuning a small embedding model on domain (query, passage) pairs, from logs or LLM-generated questions, with a held-out evaluation.",
    },
    {
      q: "What are Matryoshka embeddings?",
      a: "Embeddings trained so that the leading dimensions carry the most information, allowing you to truncate a vector (say from 1,536 to 256 dimensions), re-normalise it, and still get good similarity with a modest quality loss. It trades a little recall for large savings in storage, memory and search time. OpenAI's text-embedding-3 exposes it through a dimensions parameter.",
    },
  ],
  practice: [
    "Embed 20 FAQs with an E5 model with and without `query:`/`passage:` prefixes and compare hit rate@3 on 10 queries.",
    "Test 10 Hinglish queries against English documents with two multilingual models and record which wins.",
  ],
};
