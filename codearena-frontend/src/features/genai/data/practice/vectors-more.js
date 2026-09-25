// Day 5 practice, part 2: keyword search, embedding models, retrieval metrics, Qdrant operations, quantisation.
// Merged into d05.js. Every solution was run (embedding ones against a fake embed function).

export const keywordGroup = {
  title: "Keyword search: the baseline",
  exercises: [
    {
      id: "inverted-index",
      title: "Build an inverted index",
      level: "Easy",
      task: [
        "Build an inverted index (term → set of document ids) for four short documents, then write `search_and(query)` (documents containing **all** terms) and `search_or(query)` (documents containing **any** term).",
        "Expected: `index['pune']` is `[2, 3]`; `AND 'delivery pune'` returns `[2, 3]`; `AND 'refund days'` returns nothing because \"refunds\" ≠ \"refund\".",
      ],
      hint: "`collections.defaultdict(set)`; AND is `set.intersection(*postings)`, OR is `set().union(*postings)`.",
      solution: `import re
from collections import defaultdict

DOCS = {
    1: "Refunds are processed within 7 days.",
    2: "Cash on delivery is available in Pune and Mumbai.",
    3: "Delivery to Pune takes 2 to 4 days.",
    4: "Reset your password from the Settings page.",
}

def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())

index: dict[str, set[int]] = defaultdict(set)
for doc_id, text in DOCS.items():
    for term in tokenize(text):
        index[term].add(doc_id)

def search_and(query: str) -> set[int]:
    postings = [index.get(t, set()) for t in tokenize(query)]
    return set.intersection(*postings) if postings else set()

def search_or(query: str) -> set[int]:
    return set().union(*(index.get(t, set()) for t in tokenize(query)))

print("index['pune'] =", sorted(index["pune"]))
print("AND 'delivery pune' ->", sorted(search_and("delivery pune")))
print("OR  'refund password' ->", sorted(search_or("refund password")))
print("AND 'refund days' ->", sorted(search_and("refund days")), "(no match: 'refunds' != 'refund')")`,
      explanation: [
        "This is the data structure behind Elasticsearch and every keyword search engine: look up posting lists instead of scanning documents.",
        "The failed \"refund days\" search shows why real engines normalise words (stemming, lemmatisation) before indexing.",
      ],
      concepts: [
        ["Inverted index", "A map from each term to the documents that contain it."],
        ["Posting list", "The list of documents for one term."],
        ["Set intersection / union", "Documents in all lists (AND) / in any list (OR)."],
      ],
    },
    {
      id: "bm25-stemming",
      title: "BM25 with and without stemming",
      level: "Medium",
      task: [
        "Rank six documents with `rank_bm25` for four queries, first with plain word tokens, then with a tiny stemmer that strips common suffixes (`ing`, `es`, `s`, `ed`, `ies`→`y`). Count top-1 hits for each.",
        "Expected: stemming fixes \"returning an item\" (plain tokens can't match \"Return\").",
      ],
      hint: "`BM25Okapi([tokens for each doc])`, then `bm25.get_scores(query_tokens).argmax()`.",
      solution: `import re
from rank_bm25 import BM25Okapi

DOCS = [
    "Refunds are processed within 7 days of receiving the returned item.",
    "Cash on delivery is available for orders below 5000 rupees.",
    "To reset your password, open Settings and tap Forgot password.",
    "Return items within 30 days for a full refund.",
    "Deliveries to Pune usually take 2 to 4 days.",
    "We are hiring delivery partners in Mumbai.",
]
QUERIES = {"refunds processed": {0}, "delivery pune": {4}, "returning an item": {3}, "reset passwords": {2}}

def plain(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())

def stem(word: str) -> str:
    for suffix in ("ing", "ies", "es", "s", "ed"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word

def stemmed(text: str) -> list[str]:
    return [stem(w) for w in plain(text)]

for name, tok in [("plain", plain), ("stemmed", stemmed)]:
    bm25 = BM25Okapi([tok(d) for d in DOCS])
    correct = 0
    for q, expected in QUERIES.items():
        scores = bm25.get_scores(tok(q))
        top = int(scores.argmax())
        correct += top in expected
        print(f"[{name}] {q!r:22} top={top} expected={expected} {'✓' if top in expected else '✗'}")
    print(f"{name}: {correct}/{len(QUERIES)} top-1 correct\\n")`,
      explanation: [
        "BM25 only matches identical tokens, so word forms (return/returning, password/passwords) need normalisation.",
        "A real project would use a proper stemmer (e.g. Snowball via NLTK) or lemmatiser, or a search engine's language analysers.",
        "Stemming can also hurt (\"news\" → \"new\"). Measure it with a labelled query set, like everything in retrieval.",
      ],
      concepts: [
        ["Stemming", "Cutting words to a crude root so different forms match."],
        ["`rank_bm25`", "A small Python library implementing BM25 for in-memory corpora."],
      ],
    },
    {
      id: "bm25-vs-dense",
      title: "BM25 vs embeddings: who wins where?",
      level: "Medium",
      task: [
        "On six support documents, compare BM25 and embedding search on eight queries: paraphrases (\"how do I get my money back\"), exact codes (\"E-4012\", \"SK-X200 tank size\"), Hinglish (\"paisa wapas kab milega\") and a synonym (\"UPI autopay stopped working\" for a mandate error). Report hit@3 for each and mark which queries each method gets right.",
      ],
      hint: "Keep hyphenated codes as single tokens with the regex `[a-z0-9]+(?:-[a-z0-9]+)*`.",
      solution: `import re
import numpy as np
from rank_bm25 import BM25Okapi
from llm import embed

DOCS = [
    "Refunds are credited to the original payment method within 7 days.",
    "Cash on delivery is available for orders below ₹5,000.",
    "Reset your password from Settings > Security > Forgot password.",
    "Error E-4012 means your UPI mandate has expired.",
    "Model SK-X200 water purifier: 7-stage RO, 8 litre tank.",
    "Delivery to Pune usually takes 2 to 4 working days.",
]
CASES = [("how do I get my money back", 0), ("pay when the parcel arrives", 1), ("I forgot my login", 2),
         ("E-4012", 3), ("SK-X200 tank size", 4), ("how long to ship to pune", 5),
         ("paisa wapas kab milega", 0), ("UPI autopay stopped working", 3)]

tok = lambda t: re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", t.lower())
bm25 = BM25Okapi([tok(d) for d in DOCS])
doc_vecs = np.array(embed(DOCS))

def bm25_top3(q):
    return list(np.argsort(-bm25.get_scores(tok(q)))[:3])

def dense_top3(q):
    return list(np.argsort(-(doc_vecs @ np.array(embed([q])[0])))[:3])

score = {"bm25": 0, "dense": 0}
for q, want in CASES:
    b, d = want in bm25_top3(q), want in dense_top3(q)
    score["bm25"] += b
    score["dense"] += d
    print(f"{q!r:32} bm25 {'✓' if b else '✗'}   dense {'✓' if d else '✗'}")
print({k: f"{v}/{len(CASES)}" for k, v in score.items()}, "hit@3")`,
      explanation: [
        "Typically BM25 wins on exact codes and model numbers, and embeddings win on paraphrases, synonyms and Hinglish.",
        "Where both fail or disagree is where hybrid search and rerankers (Day 8) pay off.",
        "Write down your actual results. \"On our data BM25 got 5/8 and embeddings 6/8, with different misses\" is a great interview answer.",
      ],
      concepts: [
        ["Lexical vs semantic", "Matching words vs matching meaning."],
        ["Hit@3", "Whether a relevant document is in the top 3."],
      ],
    },
  ],
};

export const modelGroup = {
  title: "Embedding models in practice",
  exercises: [
    {
      id: "score-distribution",
      title: "Relevant vs irrelevant similarity scores",
      level: "Easy",
      task: [
        "Compute cosine similarity for four relevant (query, answer) pairs and four irrelevant pairs. Print both lists, the lowest relevant score, the highest irrelevant score, and whether a single threshold separates them.",
      ],
      hint: "For normalised vectors, cosine similarity of paired rows is `(q * d).sum(axis=1)`.",
      solution: `import numpy as np
from llm import embed

RELEVANT = [("how do I return a product", "Return items within 30 days for a full refund."),
            ("forgot my password", "Reset your password from Settings > Security."),
            ("cash on delivery limit", "Cash on delivery is available for orders below ₹5,000."),
            ("delivery time to Pune", "Delivery to Pune takes 2 to 4 working days.")]
IRRELEVANT = [("how do I return a product", "Our office is open 9am to 6pm."),
              ("forgot my password", "Cash on delivery is available for orders below ₹5,000."),
              ("cash on delivery limit", "Reset your password from Settings > Security."),
              ("delivery time to Pune", "We are hiring engineers in Bengaluru.")]

def pair_scores(pairs):
    q = np.array(embed([a for a, _ in pairs]))
    d = np.array(embed([b for _, b in pairs]))
    return (q * d).sum(axis=1)

rel, irr = pair_scores(RELEVANT), pair_scores(IRRELEVANT)
print("relevant:  ", rel.round(3))
print("irrelevant:", irr.round(3))
gap = rel.min() - irr.max()
print(f"lowest relevant {rel.min():.3f} vs highest irrelevant {irr.max():.3f} → gap {gap:.3f}")
if gap > 0:
    print(f"a threshold around {(rel.min() + irr.max()) / 2:.3f} separates these pairs (verify on more data!)")
else:
    print("the distributions overlap: no single threshold works; use ranking or a reranker")`,
      explanation: [
        "Scores depend on the model: some put unrelated text at 0.1, others at 0.7. Never hard-code a threshold from a blog post.",
        "With more pairs the two distributions usually overlap, which is why thresholds are fragile and rerankers or \"I don't know\" prompting are used for relevance decisions.",
      ],
      concepts: [
        ["Score distribution", "The range of similarity values a model produces for a kind of pair."],
        ["Threshold", "A cut-off score below which results are treated as irrelevant."],
      ],
    },
    {
      id: "matryoshka",
      title: "How small can the vectors get?",
      level: "Medium",
      task: [
        "Embed 8 FAQs and 8 paraphrased queries once, then truncate both to 512, 256, 128 and 64 dimensions (re-normalising after truncation) and report top-1 accuracy and bytes per vector at each size.",
        { note: "Use a Matryoshka-trained model such as OpenAI `text-embedding-3-small` or `nomic-embed-text` v1.5 (Ollama). With other models, truncation degrades much faster; that's the point of the comparison." },
      ],
      hint: "`v[:, :dims]`, then divide by its norm. Accuracy = how often `argmax(q @ d.T)` is the right FAQ.",
      solution: `import numpy as np
from llm import embed

FAQS = ["How do I reset my password?", "What payment methods do you accept?", "Can I return an item after 30 days?",
        "How long does delivery to Pune take?", "Is cash on delivery available?", "How do I change my address?",
        "Why was my card declined?", "How do I cancel my order?"]
QUERIES = [("forgot my login", 0), ("do you take UPI", 1), ("return after a month", 2), ("shipping time pune", 3),
           ("pay at the door", 4), ("update delivery address", 5), ("card payment failed", 6), ("stop my order", 7)]

full_docs = np.array(embed(FAQS))
full_queries = np.array(embed([q for q, _ in QUERIES]))

def shorten(v: np.ndarray, dims: int) -> np.ndarray:
    v = v[:, :dims]
    return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)   # re-normalise

full = full_docs.shape[1]
for dims in [full] + [d for d in (512, 256, 128, 64) if d < full]:
    d, q = shorten(full_docs, dims), shorten(full_queries, dims)
    top1 = (q @ d.T).argmax(axis=1)
    correct = sum(int(t == want) for t, (_, want) in zip(top1, QUERIES))
    print(f"{dims:>5} dims: top-1 {correct}/{len(QUERIES)}   storage per vector {dims * 4} bytes")`,
      explanation: [
        "Matryoshka models keep most of their quality at a fraction of the size; accuracy falls off only at very small sizes.",
        "Always re-normalise: a truncated vector is shorter than 1, which breaks dot-product similarity.",
        "On real projects, pick the smallest size whose recall@k on your labelled set is within tolerance.",
      ],
      concepts: [
        ["Matryoshka embeddings", "Vectors whose leading dimensions hold the most information, so they can be truncated."],
        ["Re-normalisation", "Scaling a vector back to length 1."],
      ],
    },
    {
      id: "cross-lingual",
      title: "English, Hinglish and Hindi queries",
      level: "Medium",
      task: [
        "Ask the same four questions in English, Hinglish (Roman script) and Hindi (Devanagari) against four English documents. Report top-1 accuracy per language.",
      ],
      hint: "Group results in a dict by language tag.",
      solution: `import numpy as np
from llm import embed

DOCS = ["Refunds are credited within 7 days of pickup.", "Cash on delivery is available below ₹5,000.",
        "Delivery to Pune takes 2 to 4 days.", "Reset your password from Settings."]
CASES = [
    ("When will I get my refund?", 0, "english"), ("refund kab milega", 0, "hinglish"), ("रिफंड कब मिलेगा?", 0, "hindi"),
    ("Can I pay cash at delivery?", 1, "english"), ("cash on delivery hai kya", 1, "hinglish"), ("क्या कैश ऑन डिलीवरी है?", 1, "hindi"),
    ("How long to deliver in Pune?", 2, "english"), ("pune mein delivery kitne din", 2, "hinglish"), ("पुणे में डिलीवरी कितने दिन में?", 2, "hindi"),
    ("I forgot my password", 3, "english"), ("password bhool gaya", 3, "hinglish"), ("मैं पासवर्ड भूल गया", 3, "hindi"),
]

doc_vecs = np.array(embed(DOCS))
q_vecs = np.array(embed([q for q, _, _ in CASES]))
top1 = (q_vecs @ doc_vecs.T).argmax(axis=1)

by_lang: dict[str, list[int]] = {}
for (q, want, lang), got in zip(CASES, top1):
    by_lang.setdefault(lang, []).append(int(got == want))
    print(f"{lang:<9} {q:<34} → doc {got} {'✓' if got == want else '✗'}")
for lang, results in by_lang.items():
    print(f"{lang}: {sum(results)}/{len(results)} top-1 correct")`,
      explanation: [
        "English-focused models often handle Hinglish partly (shared words like \"refund\", \"password\") and Devanagari poorly; multilingual models (bge-m3, multilingual-e5, multilingual API models) close the gap.",
        "Per-language accuracy shows exactly where to invest: a multilingual model, query translation, or fine-tuning.",
      ],
      concepts: [
        ["Cross-lingual retrieval", "Queries in one language finding documents in another."],
        ["Code-mixing", "Mixing languages in one sentence, like Hinglish."],
      ],
    },
  ],
};

export const metricGroup = {
  title: "Measuring retrieval",
  exercises: [
    {
      id: "metrics-fn",
      title: "Implement the retrieval metrics",
      level: "Easy",
      task: [
        "Write `hit_at_k`, `recall_at_k`, `precision_at_k`, `mrr` (over several queries) and `ndcg_at_k`, and check them against these expected values for `ranked = [c7, c2, c9, c4, c1]`, `relevant = {c2, c4, c8}`: hit@1 0, hit@3 1, recall@5 0.667, precision@5 0.4, nDCG@5 0.488 with gains `{c2: 3, c4: 1, c8: 2}`.",
      ],
      hint: "nDCG: DCG = Σ gain / log2(position + 1) with positions starting at 1; divide by the DCG of the ideal ordering.",
      solution: `import math

def hit_at_k(ranked, relevant, k):
    return float(any(d in relevant for d in ranked[:k]))

def recall_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & relevant) / len(relevant)

def precision_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & relevant) / k

def mrr(all_ranked, all_relevant):
    total = 0.0
    for ranked, relevant in zip(all_ranked, all_relevant):
        total += next((1 / r for r, d in enumerate(ranked, 1) if d in relevant), 0.0)
    return total / len(all_ranked)

def ndcg_at_k(ranked, gains, k):
    dcg = sum(gains.get(d, 0) / math.log2(i + 2) for i, d in enumerate(ranked[:k]))
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(sorted(gains.values(), reverse=True)[:k]))
    return dcg / idcg if idcg else 0.0

ranked = ["c7", "c2", "c9", "c4", "c1"]
relevant = {"c2", "c4", "c8"}
checks = {
    "hit@1": (hit_at_k(ranked, relevant, 1), 0.0),
    "hit@3": (hit_at_k(ranked, relevant, 3), 1.0),
    "recall@5": (recall_at_k(ranked, relevant, 5), 2 / 3),
    "precision@5": (precision_at_k(ranked, relevant, 5), 0.4),
    "mrr": (mrr([ranked, ["c8", "x"], ["x", "y"]], [relevant, relevant, relevant]), (0.5 + 1 + 0) / 3),
    "ndcg@5": (ndcg_at_k(ranked, {"c2": 3, "c4": 1, "c8": 2}, 5), 0.488),
}
for name, (got, want) in checks.items():
    ok = abs(got - want) < 0.001
    print(f"{name:<12} {got:.3f} (expected {want:.3f}) {'✓' if ok else '✗'}")`,
      explanation: [
        "Recall is about coverage of all relevant items; precision about noise in the top k; MRR about the first hit; nDCG about the whole ranking with graded relevance.",
        "Testing metric code with hand-computed values is worth it: a wrong metric silently misleads every experiment after it.",
      ],
      concepts: [
        ["MRR", "Mean of 1/rank of the first relevant result."],
        ["nDCG", "Ranking quality with graded relevance and position discounts, normalised to 0–1."],
      ],
    },
    {
      id: "eval-harness",
      title: "Compare two retrievers with a harness",
      level: "Medium",
      task: [
        "Write `evaluate(search, cases, k)` returning hit@k, MRR and the list of missed queries, then compare BM25 and embedding search on six labelled queries. Print a small results table.",
      ],
      hint: "Make both retrievers share the signature `search(query, k) -> list[id]` so the harness doesn't care which is which.",
      solution: `import re
from statistics import mean
import numpy as np
from rank_bm25 import BM25Okapi
from llm import embed

DOCS = {
    "refund-1": "Refunds are credited to the original payment method within 7 days.",
    "cod-1": "Cash on delivery is available for orders below ₹5,000.",
    "account-1": "Reset your password from Settings > Security > Forgot password.",
    "upi-1": "Error E-4012 means your UPI mandate has expired. Renew it in the app.",
    "ship-1": "Delivery to Pune usually takes 2 to 4 working days.",
    "ship-2": "Express delivery is available in Mumbai, Delhi and Bengaluru.",
}
CASES = [
    {"query": "money back timeline", "relevant": ["refund-1"]},
    {"query": "E-4012", "relevant": ["upi-1"]},
    {"query": "forgot login", "relevant": ["account-1"]},
    {"query": "fast shipping cities", "relevant": ["ship-2"]},
    {"query": "delivery days pune", "relevant": ["ship-1"]},
    {"query": "pay in cash", "relevant": ["cod-1"]},
]
ids = list(DOCS)
tok = lambda t: re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", t.lower())
bm25 = BM25Okapi([tok(DOCS[i]) for i in ids])
doc_vecs = np.array(embed([DOCS[i] for i in ids]))

def bm25_search(q, k):
    return [ids[i] for i in np.argsort(-bm25.get_scores(tok(q)))[:k]]

def dense_search(q, k):
    return [ids[i] for i in np.argsort(-(doc_vecs @ np.array(embed([q])[0])))[:k]]

def evaluate(search, cases, k=3):
    hits, rrs, misses = [], [], []
    for c in cases:
        got = search(c["query"], k)
        rank = next((r for r, d in enumerate(got, 1) if d in c["relevant"]), None)
        hits.append(1.0 if rank else 0.0)
        rrs.append(1 / rank if rank else 0.0)
        if not rank:
            misses.append(c["query"])
    return mean(hits), mean(rrs), misses

print(f"{'config':<8} {'hit@3':>6} {'MRR':>6}  misses")
for name, fn in [("bm25", bm25_search), ("dense", dense_search)]:
    hit, m, misses = evaluate(fn, CASES)
    print(f"{name:<8} {hit:>6.2f} {m:>6.2f}  {misses}")`,
      explanation: [
        "A shared interface makes every future experiment (new model, chunking, hybrid, reranker) a one-line comparison.",
        "The misses list is the most useful output: it tells you what to fix next.",
        "Grow the cases to 30+ before trusting differences; six queries is a demo.",
      ],
      concepts: [
        ["Evaluation harness", "Reusable code that scores any retriever on a labelled set."],
        ["Strategy pattern", "Passing interchangeable functions with the same signature."],
      ],
    },
  ],
};

export const qdrantGroup = {
  title: "Qdrant operations (no Docker needed)",
  exercises: [
    {
      id: "qdrant-local",
      title: "Qdrant in local mode with filters",
      level: "Easy",
      task: [
        "Using `QdrantClient(\":memory:\")`, create a collection, upsert four FAQs with a `category` payload, and search \"forgot login\" with and without a `category=billing` filter. Print scores, categories and the collection count.",
        { note: "`uv add qdrant-client`. Local mode runs inside Python, perfect for learning and tests; the same code works against a Qdrant server by changing the client URL." },
      ],
      hint: "`models.Filter(must=[models.FieldCondition(key=\"category\", match=models.MatchValue(value=...))])`.",
      solution: `from qdrant_client import QdrantClient, models
from llm import embed

FAQS = [("How do I reset my password?", "account"), ("Refunds take 7 days.", "billing"),
        ("UPI and cards are accepted.", "billing"), ("Change your address in Settings.", "account")]

qc = QdrantClient(":memory:")                     # no server needed; use url="http://localhost:6333" for Docker
vectors = embed([text for text, _ in FAQS])
qc.create_collection("faqs", vectors_config=models.VectorParams(size=len(vectors[0]), distance=models.Distance.COSINE))
qc.upsert("faqs", points=[models.PointStruct(id=i, vector=v, payload={"text": t, "category": c})
                          for i, ((t, c), v) in enumerate(zip(FAQS, vectors))])

def search(q: str, category: str | None = None, k: int = 2):
    flt = models.Filter(must=[models.FieldCondition(key="category", match=models.MatchValue(value=category))]) if category else None
    return qc.query_points("faqs", query=embed([q])[0], limit=k, query_filter=flt).points

for p in search("forgot login"):
    print(f"{p.score:.3f} [{p.payload['category']}] {p.payload['text']}")
print("--- billing only ---")
for p in search("forgot login", category="billing"):
    print(f"{p.score:.3f} [{p.payload['category']}] {p.payload['text']}")
print("count:", qc.count("faqs").count)`,
      explanation: [
        "The filter is applied inside the search, so you still get results from the allowed category even when they score low.",
        "Payload (text, category) is returned with each hit, which is how you build citations later.",
      ],
      concepts: [
        ["Payload", "Qdrant's name for metadata stored with a vector."],
        ["Local mode", "An in-process Qdrant for tests and prototypes."],
      ],
    },
    {
      id: "tenant-isolation",
      title: "Prove tenant isolation with tests",
      level: "Medium",
      task: [
        "Two companies (acme, globex) each upload a document with the same id, \"policy\". Write `index_document(tenant, doc_id, chunks)` (deleting that tenant's old chunks, then upserting with deterministic ids) and `search(tenant, q)`. Re-index acme's policy and assert: acme sees only its new text, and globex's document is untouched.",
      ],
      hint: "Scope the delete filter by **both** tenant and doc_id, and build ids with `uuid.uuid5` from `tenant/doc_id#n`.",
      solution: `import uuid
from qdrant_client import QdrantClient, models
from llm import embed

qc = QdrantClient(":memory:")
DIM = len(embed(["x"])[0])
qc.create_collection("docs", vectors_config=models.VectorParams(size=DIM, distance=models.Distance.COSINE))

def match(key, value):
    return models.FieldCondition(key=key, match=models.MatchValue(value=value))

def index_document(tenant: str, doc_id: str, chunks: list[str]) -> None:
    qc.delete("docs", points_selector=models.FilterSelector(
        filter=models.Filter(must=[match("tenant", tenant), match("doc_id", doc_id)])))
    vecs = embed(chunks)
    qc.upsert("docs", points=[
        models.PointStruct(id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{tenant}/{doc_id}#{i}")), vector=v,
                           payload={"tenant": tenant, "doc_id": doc_id, "text": c})
        for i, (c, v) in enumerate(zip(chunks, vecs))])

def search(tenant: str, q: str, k: int = 5) -> list[dict]:
    pts = qc.query_points("docs", query=embed([q])[0], limit=k,
                          query_filter=models.Filter(must=[match("tenant", tenant)])).points
    return [p.payload for p in pts]

index_document("acme", "policy", ["Acme refunds take 7 days.", "Acme ships in 3 days."])
index_document("globex", "policy", ["Globex refunds take 30 days."])
index_document("acme", "policy", ["Acme refunds now take 5 days."])        # re-index acme's policy

acme, globex = search("acme", "refund"), search("globex", "refund")
assert all(r["tenant"] == "acme" for r in acme), "acme saw another tenant's data"
assert [r["text"] for r in acme] == ["Acme refunds now take 5 days."], acme      # old chunks replaced
assert [r["text"] for r in globex] == ["Globex refunds take 30 days."], globex   # untouched
print("acme:", [r["text"] for r in acme])
print("globex:", [r["text"] for r in globex])
print("isolation and re-indexing checks passed")`,
      explanation: [
        "Deleting by `doc_id` alone would wipe globex's policy too, the exact bug described in the vector-ops lesson.",
        "`uuid5` ids are deterministic, so re-upserting the same chunk replaces it rather than duplicating it.",
        "Assertions turn \"I think it's isolated\" into a test you can run in CI.",
      ],
      concepts: [
        ["Multi-tenancy", "Many customers sharing one system with strictly separated data."],
        ["`uuid.uuid5`", "A deterministic UUID derived from a namespace and a name."],
      ],
    },
    {
      id: "alias-reindex",
      title: "Blue-green re-indexing with an alias",
      level: "Hard",
      task: [
        "Build collection `docs_v1`, point alias `docs` at it, and make the app search only `docs`. Build `docs_v2` with re-chunked content, switch the alias atomically, then roll back to v1. Print which version answers each time.",
      ],
      hint: "`update_collection_aliases` accepts a list of operations applied together: delete the old alias and create the new one in one call.",
      solution: `from qdrant_client import QdrantClient, models
from llm import embed

qc = QdrantClient(":memory:")
TEXTS = ["Refunds take 7 days to reach your bank.", "Cash on delivery below ₹5,000.", "Reset your password in Settings."]

def build(name: str, texts: list[str], version: str) -> None:
    vecs = embed(texts)
    qc.create_collection(name, vectors_config=models.VectorParams(size=len(vecs[0]), distance=models.Distance.COSINE))
    qc.upsert(name, points=[models.PointStruct(id=i, vector=v, payload={"text": t, "index_version": version})
                            for i, (t, v) in enumerate(zip(texts, vecs))])

def point_alias(alias: str, collection: str) -> None:
    ops = [models.CreateAliasOperation(create_alias=models.CreateAlias(collection_name=collection, alias_name=alias))]
    if any(a.alias_name == alias for a in qc.get_aliases().aliases):
        ops.insert(0, models.DeleteAliasOperation(delete_alias=models.DeleteAlias(alias_name=alias)))
    qc.update_collection_aliases(change_aliases_operations=ops)     # applied together

def app_search(q: str):                                              # the app only knows the alias
    p = qc.query_points("docs", query=embed([q])[0], limit=1).points[0]
    return p.payload["index_version"], p.payload["text"]

build("docs_v1", TEXTS, "v1")
point_alias("docs", "docs_v1")
print("before:", app_search("refund"))

build("docs_v2", [t + " (re-chunked)" for t in TEXTS], "v2")        # built in the background
point_alias("docs", "docs_v2")                                       # atomic switch
print("after: ", app_search("refund"))

point_alias("docs", "docs_v1")                                       # instant rollback
print("rolled back:", app_search("refund"))`,
      explanation: [
        "The app never changes: it always queries `docs`. Operations switch what `docs` points to.",
        "Switching and rollback are instant and atomic, so users never see a half-built index.",
        "In real life you'd run the retrieval eval on `docs_v2` before switching.",
      ],
      concepts: [
        ["Alias", "A stable name pointing to a real collection."],
        ["Blue-green deployment", "Build the new version beside the old one, then switch traffic."],
      ],
    },
  ],
};

export const quantGroup = {
  title: "Quantisation",
  exercises: [
    {
      id: "quantize-int8",
      title: "int8 scalar quantisation with re-scoring",
      level: "Hard",
      task: [
        "Quantise 20,000 normalised 384-d vectors to int8, search with the int8 copy, and measure recall@10 against exact float32 search. Then oversample 4× candidates with int8 and re-score them with float32, and measure again. Print memory for both.",
      ],
      hint: "`scale = abs(data).max() / 127`; `q8 = round(data / scale).astype(int8)`; approximate scores are `queries @ (q8 * scale).T`.",
      solution: `import numpy as np

rng = np.random.default_rng(0)
N, DIM, K = 20_000, 384, 10
topics = rng.normal(size=(300, DIM))
data = topics[rng.integers(0, 300, N)] + 0.6 * rng.normal(size=(N, DIM))
data = (data / np.linalg.norm(data, axis=1, keepdims=True)).astype(np.float32)
queries = data[rng.choice(N, 100, replace=False)] + 0.02 * rng.normal(size=(100, DIM)).astype(np.float32)

# scalar quantisation: map each value in [-max, max] to an int8 in [-127, 127]
scale = np.abs(data).max() / 127
q8 = np.round(data / scale).astype(np.int8)

truth = np.argsort(-(queries @ data.T), axis=1)[:, :K]
approx_scores = queries @ (q8.astype(np.float32) * scale).T

def recall(pred):
    return np.mean([len(set(p) & set(t)) / K for p, t in zip(pred, truth)])

int8_only = np.argsort(-approx_scores, axis=1)[:, :K]
# oversample 4×K candidates with int8, then re-score them with the float32 vectors
cands = np.argsort(-approx_scores, axis=1)[:, : 4 * K]
rescored = np.array([c[np.argsort(-(data[c] @ q))[:K]] for c, q in zip(cands, queries)])

print(f"float32: {data.nbytes / 1e6:.1f} MB   int8: {q8.nbytes / 1e6:.1f} MB ({data.nbytes / q8.nbytes:.0f}× smaller)")
print(f"recall@{K} int8 only:          {recall(int8_only):.3f}")
print(f"recall@{K} int8 + re-scoring:  {recall(rescored):.3f}")`,
      explanation: [
        "int8 uses 4× less memory and loses very little recall on its own; re-scoring a few extra candidates recovers the rest.",
        "This is what `ScalarQuantization` in Qdrant and `halfvec`/int8 options elsewhere do internally.",
      ],
      concepts: [
        ["Scalar quantisation", "Mapping each float to a small integer range."],
        ["Oversampling + re-scoring", "Fetch more candidates cheaply, then rank them precisely."],
      ],
    },
    {
      id: "binary-quant",
      title: "Binary quantisation and Hamming distance",
      level: "Medium",
      task: [
        "Keep only the sign of each dimension (`np.packbits(data > 0)`), rank by Hamming distance, then re-score the top K × oversample candidates with the full vectors. Report memory saved and recall@10 at oversampling 1×, 4× and 10×.",
      ],
      hint: "Hamming distance = number of differing bits: `unpackbits(bitwise_xor(a, b)).sum()`.",
      solution: `import numpy as np

rng = np.random.default_rng(1)
N, DIM, K = 20_000, 384, 10
topics = rng.normal(size=(300, DIM))
data = topics[rng.integers(0, 300, N)] + 0.6 * rng.normal(size=(N, DIM))
data = (data / np.linalg.norm(data, axis=1, keepdims=True)).astype(np.float32)
queries = data[rng.choice(N, 100, replace=False)] + 0.02 * rng.normal(size=(100, DIM)).astype(np.float32)

bits = np.packbits(data > 0, axis=1)                  # 1 bit per dimension: 384 dims → 48 bytes
qbits = np.packbits(queries > 0, axis=1)

def hamming(q: np.ndarray) -> np.ndarray:             # number of differing bits (lower = closer)
    return np.unpackbits(np.bitwise_xor(bits, q), axis=1).sum(axis=1)

truth = np.argsort(-(queries @ data.T), axis=1)[:, :K]
print(f"float32 {data.nbytes / 1e6:.1f} MB vs binary {bits.nbytes / 1e6:.2f} MB ({data.nbytes // bits.nbytes}× smaller)")
for oversample in (1, 4, 10):
    got = []
    for q, qb in zip(queries, qbits):
        cand = np.argsort(hamming(qb))[: K * oversample]
        got.append(cand[np.argsort(-(data[cand] @ q))[:K]])       # re-score with full vectors
    r = np.mean([len(set(g) & set(t)) / K for g, t in zip(got, truth)])
    print(f"oversample {oversample:>2}× → recall@{K} = {r:.3f}")`,
      explanation: [
        "Binary vectors are 32× smaller and Hamming distance is extremely fast, but on their own they lose a lot of recall.",
        "Oversampling and re-scoring with full vectors brings recall back up, the standard way binary quantisation is used in practice.",
        "pgvector's `binary_quantize` and Qdrant's binary quantisation follow the same idea.",
      ],
      concepts: [
        ["Binary quantisation", "Storing 1 bit (the sign) per dimension."],
        ["Hamming distance", "The number of positions where two bit strings differ."],
      ],
    },
  ],
};
