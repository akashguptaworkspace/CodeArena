// Day 8 practice: advanced RAG. Shape: see ./index.js
export default {
  intro:
    "Eight exercises that upgrade retrieval and let you **measure** each upgrade: BM25 keyword search, Reciprocal Rank Fusion, a cross-encoder reranker, multi-query and HyDE, parent-document retrieval, access-control filters, and a retrieval evaluation script.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day08 && cd ~/genai-practice/day08
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken rank-bm25 sentence-transformers pydantic
cp ../day03/llm.py ../day03/.env . && cp -r ../day06/docs . && cp ../day06/chunks.py .`,
    },
    "Add a fourth document that contains exact codes, where keyword search shines:",
    {
      lang: "markdown",
      code: `<!-- docs/forms.md -->
# HR Forms
## Form F-12
Form F-12 is used to claim reimbursement for internet bills when working from home.
## Form F-27
Form F-27 is the request form for changing your bank account for salary credit.
## Form L-04
Form L-04 is used to apply for leave without pay (LWP) beyond 5 days.`,
    },
    "And save this shared vector search helper as `vec.py`:",
    {
      lang: "python",
      code: `# vec.py
import numpy as np
from chunks import ALL
from llm import embed

def _norm(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

MATRIX = _norm(embed([c["text"] for c in ALL]))

def vector_search(query: str, k: int = 10) -> list[str]:
    scores = MATRIX @ _norm(embed([query]))[0]
    return [ALL[i]["id"] for i in np.argsort(-scores)[:k]]

BY_ID = {c["id"]: c for c in ALL}`,
    },
  ],
  groups: [
    {
      title: "Hybrid search",
      exercises: [
        {
          id: "bm25",
          title: "Keyword search with BM25",
          level: "Easy",
          task: [
            "Build a BM25 index over all chunks and write `bm25_search(query, k)`. Compare vector search and BM25 for \"form F-27\" and \"money for home internet\". Which wins each time, and why?",
          ],
          solution: `import re
from rank_bm25 import BM25Okapi
from chunks import ALL
from vec import vector_search, BY_ID

def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", text.lower())

BM25 = BM25Okapi([tokenize(c["text"]) for c in ALL])

def bm25_search(query: str, k: int = 10) -> list[str]:
    scores = BM25.get_scores(tokenize(query))
    ranked = sorted(range(len(ALL)), key=lambda i: -scores[i])
    return [ALL[i]["id"] for i in ranked[:k] if scores[i] > 0]

for q in ["form F-27", "money for home internet"]:
    print(q)
    print("  vector:", [BY_ID[i]["heading_path"] for i in vector_search(q, 2)])
    print("  bm25:  ", [BY_ID[i]["heading_path"] for i in bm25_search(q, 2)])`,
          explanation: [
            "BM25 scores documents by how often the query's words appear, weighting rare words (like `f-27`) much more than common ones.",
            "Keyword search nails exact codes (\"F-27\") but misses paraphrases (\"money for home internet\" vs \"reimbursement for internet bills\"). Vector search is the opposite.",
            "The tokenizer keeps hyphenated codes like `f-27` together as one token.",
          ],
          concepts: [
            ["BM25", "A classic keyword ranking function used by search engines like Elasticsearch."],
            ["Keyword vs semantic search", "Keyword matches words; semantic matches meaning."],
          ],
        },
        {
          id: "rrf",
          title: "Merge rankings with Reciprocal Rank Fusion",
          level: "Medium",
          task: [
            "Write `rrf(lists, k=60)` that fuses several ranked id lists with score = Σ 1/(k + rank). Then write `hybrid_search(query)` that fuses vector and BM25 results. Check both earlier queries now return the right section first.",
          ],
          solution: `from collections import defaultdict
from vec import vector_search, BY_ID
from bm25_search import bm25_search      # previous exercise saved as bm25_search.py

def rrf(result_lists: list[list[str]], k: int = 60, top_n: int = 10) -> list[str]:
    scores: dict[str, float] = defaultdict(float)
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] += 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)[:top_n]

def hybrid_search(query: str, k: int = 5) -> list[str]:
    return rrf([vector_search(query, 20), bm25_search(query, 20)], top_n=k)

for q in ["form F-27", "money for home internet", "leave for interns"]:
    print(q, "→", BY_ID[hybrid_search(q)[0]]["heading_path"])`,
          explanation: [
            "RRF ignores raw scores (BM25 and cosine are on different scales) and uses only positions. Being near the top of either list helps; being high in both wins.",
            "`sorted(scores, key=scores.get, reverse=True)` sorts the dict's keys by their values.",
            "`k = 60` is the standard constant; it softens the gap between rank 1 and rank 2.",
          ],
          concepts: [
            ["Reciprocal Rank Fusion (RRF)", "Merges ranked lists: score = Σ 1/(k + rank)."],
            ["Hybrid search", "Running keyword and vector search and fusing the results."],
          ],
        },
        {
          id: "rerank",
          title: "Rerank with a cross-encoder",
          level: "Medium",
          task: [
            "Take the top 10 hybrid results for \"can interns take casual leave in the first month\" and rerank them with the `cross-encoder/ms-marco-MiniLM-L-6-v2` model. Print the order before and after with rerank scores.",
          ],
          hint: "`CrossEncoder(name).predict([(query, text), ...])` returns one relevance score per pair.",
          solution: `from sentence_transformers import CrossEncoder
from vec import BY_ID
from hybrid import hybrid_search       # previous exercise saved as hybrid.py

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")   # downloads once (~90 MB)

query = "can interns take casual leave in the first month"
candidates = [BY_ID[i] for i in hybrid_search(query, k=10)]
print("before:", [c["heading_path"] for c in candidates[:3]])

scores = reranker.predict([(query, c["text"]) for c in candidates])
ranked = sorted(zip(candidates, scores), key=lambda pair: -pair[1])
print("after:")
for c, s in ranked[:3]:
    print(f"  {s:6.2f}  {c['heading_path']}")`,
          explanation: [
            "A cross-encoder reads the question **and** the passage together, so it judges relevance much more precisely than comparing two separate embeddings.",
            "It's too slow to run on every chunk, so the standard pipeline is: fast retrieval of 20–50 candidates → rerank → keep the top 3–5.",
            "The first run downloads the model from Hugging Face; later runs load it from cache.",
          ],
          concepts: [
            ["Cross-encoder / reranker", "A model that scores (query, passage) pairs for relevance."],
            ["Two-stage retrieval", "Fast recall first, precise reranking second."],
            ["`zip()` + `sorted()`", "Pair items with scores, then sort the pairs by score."],
          ],
        },
      ],
    },
    {
      title: "Query transformation",
      exercises: [
        {
          id: "multi-query",
          title: "Multi-query retrieval",
          level: "Medium",
          task: [
            "Ask the LLM for 3 alternative phrasings of a vague question (\"wfh internet money?\"), search with each (hybrid), and fuse all results with RRF. Print the queries and the top result.",
          ],
          solution: `import json
from llm import client, CHAT_MODEL
from vec import BY_ID
from hybrid import hybrid_search, rrf

def rephrase(question: str) -> list[str]:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0.3, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": 'Write 3 different search queries for the question, '
                   'varying vocabulary. Reply as JSON: {"queries": ["...", "...", "..."]}'},
                  {"role": "user", "content": question}])
    return json.loads(r.choices[0].message.content)["queries"]

question = "wfh internet money?"
queries = [question, *rephrase(question)]
print(queries)
fused = rrf([hybrid_search(q, k=10) for q in queries], top_n=3)
print("top:", [BY_ID[i]["heading_path"] for i in fused])`,
          explanation: [
            "Short, vague or slangy questions often don't share words or phrasing with the documents. Several rephrasings raise the chance that one matches well.",
            "Fusing with RRF rewards chunks that show up for several phrasings.",
            "It costs one extra LLM call per question; keep it only if your evaluation shows a gain.",
          ],
          concepts: [
            ["Multi-query retrieval", "Search with several LLM-generated phrasings and merge the results."],
            ["`[question, *list]`", "A new list with `question` first, then the list's items."],
          ],
        },
        {
          id: "hyde",
          title: "HyDE: search with a hypothetical answer",
          level: "Medium",
          task: [
            "For \"Can I claim my broadband bill?\", ask the LLM to write a short fake policy paragraph that would answer it, then run vector search with that paragraph instead of the question. Compare the top results.",
          ],
          solution: `from llm import chat
from vec import vector_search, BY_ID

question = "Can I claim my broadband bill?"
fake_doc = chat(
    question,
    system="Write a short paragraph from a company HR policy that answers this question. "
           "It is only used for search, so plausible wording matters more than accuracy.",
    max_tokens=120,
)
print("hypothetical:", fake_doc, "\\n")
print("question search:", [BY_ID[i]["heading_path"] for i in vector_search(question, 2)])
print("HyDE search:    ", [BY_ID[i]["heading_path"] for i in vector_search(fake_doc, 2)])`,
          explanation: [
            "Questions and documents look different (short and asking vs long and stating). A hypothetical answer is phrased like the real documents, so its embedding lands closer to them.",
            "The fake text is used **only for search**, never shown as the answer.",
          ],
          concepts: [
            ["HyDE", "Hypothetical Document Embeddings: embed an LLM-written answer to search for real ones."],
          ],
        },
      ],
    },
    {
      title: "Structure and access control",
      exercises: [
        {
          id: "parent-child",
          title: "Search small, return big (parent-document retrieval)",
          level: "Hard",
          task: [
            "Split each **section** (parent) into sentence-sized children. Embed and search the children, but return the whole parent section, without duplicates. Compare the text returned for \"medical certificate\" with the plain chunk search.",
          ],
          solution: `import re
import numpy as np
from chunks import ALL
from llm import embed

parents = {c["id"]: c["text"] for c in ALL}
children = [
    {"parent_id": c["id"], "text": s.strip()}
    for c in ALL
    for s in re.split(r"(?<=[.!?])\\s+", c["text"]) if len(s.strip()) > 20
]

def norm(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

CHILD_MATRIX = norm(embed([ch["text"] for ch in children]))

def retrieve_parents(query: str, k: int = 2) -> list[str]:
    scores = CHILD_MATRIX @ norm(embed([query]))[0]
    parent_ids = []
    for i in np.argsort(-scores):
        pid = children[i]["parent_id"]
        if pid not in parent_ids:
            parent_ids.append(pid)
        if len(parent_ids) == k:
            break
    return [parents[pid] for pid in parent_ids]

for text in retrieve_parents("medical certificate"):
    print("---\\n" + text)`,
          explanation: [
            "Small chunks (single sentences) give precise matches; big chunks give the LLM enough context. Parent-document retrieval gets both.",
            "The regex `(?<=[.!?])\\s+` splits after sentence-ending punctuation.",
            "Several children of the same parent may match; we keep each parent once, in order of its best child.",
          ],
          concepts: [
            ["Parent-document retrieval", "Index small child chunks; send their larger parent section to the LLM."],
            ["Deduplication", "Keeping only the first occurrence of each item."],
          ],
        },
        {
          id: "acl-filter",
          title: "Filter results by user permissions",
          level: "Medium",
          task: [
            "Give each chunk an `allowed_groups` list (`forms.md` → `[\"hr\"]`, others → `[\"all\"]`). Write `search_for_user(query, user_groups)` that filters **before** ranking so a user never gets chunks they can't see. Show that an employee without `hr` can't retrieve Form F-27 content.",
          ],
          solution: `import numpy as np
from chunks import ALL
from llm import embed

for c in ALL:
    c["allowed_groups"] = ["hr"] if c["source"] == "forms.md" else ["all"]

def norm(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

MATRIX = norm(embed([c["text"] for c in ALL]))

def search_for_user(query: str, user_groups: set[str], k: int = 3) -> list[str]:
    allowed = [i for i, c in enumerate(ALL) if set(c["allowed_groups"]) & (user_groups | {"all"})]
    if not allowed:
        return []
    scores = MATRIX[allowed] @ norm(embed([query]))[0]
    return [ALL[allowed[j]]["heading_path"] for j in np.argsort(-scores)[:k]]

print("employee:", search_for_user("change salary bank account", {"engineering"}))
print("hr:      ", search_for_user("change salary bank account", {"hr"}))`,
          explanation: [
            "Permissions are checked **before** similarity ranking, so restricted chunks never reach the prompt. Once text is in the prompt, the model can leak it no matter what you instruct.",
            "`MATRIX[allowed]` selects only the permitted rows (NumPy fancy indexing).",
            "In a real vector DB you pass the same rule as a metadata filter in the query.",
          ],
          concepts: [
            ["Access control list (ACL)", "Who is allowed to see a piece of data."],
            ["Pre-filtering", "Applying filters before (or during) search instead of after."],
            ["Fancy indexing", "`array[list_of_indexes]` selects those rows in NumPy."],
          ],
        },
      ],
    },
    {
      title: "Measure it",
      exercises: [
        {
          id: "retrieval-eval",
          title: "Hit rate and MRR for three retrieval modes",
          level: "Hard",
          task: [
            "Write 10 test questions with the id of the chunk that answers each (look at `chunks.py` output for ids). Compute hit rate@3 and MRR for vector, BM25 and hybrid search, and print a comparison table.",
          ],
          solution: `import statistics
from vec import vector_search
from bm25_search import bm25_search
from hybrid import hybrid_search

CASES = [   # (question, id of the chunk that answers it) - adjust ids to your chunks.py output
    ("how many casual leaves for interns", "leave_policy.md#0"),
    ("medical certificate needed when", "leave_policy.md#1"),
    ("maternity leave weeks", "leave_policy.md#2"),
    ("can I fly economy", "travel_policy.md#0"),
    ("daily allowance in metro city", "travel_policy.md#1"),
    ("deadline for travel claims", "travel_policy.md#2"),
    ("lost my laptop", "it_policy.md#0"),
    ("password rules", "it_policy.md#1"),
    ("form F-27", "forms.md#1"),
    ("unpaid leave form", "forms.md#2"),
]

def evaluate(search, k: int = 3) -> tuple[float, float]:
    hits, rr = 0, []
    for question, relevant in CASES:
        results = search(question, k)
        rank = results.index(relevant) + 1 if relevant in results else None
        hits += rank is not None
        rr.append(1 / rank if rank else 0)
    return hits / len(CASES), statistics.mean(rr)

print(f"{'mode':<8} {'hit@3':>6} {'MRR':>6}")
for name, fn in [("vector", vector_search), ("bm25", bm25_search), ("hybrid", hybrid_search)]:
    hit, mrr = evaluate(fn)
    print(f"{name:<8} {hit:>6.2f} {mrr:>6.2f}")`,
          explanation: [
            "**Hit rate@k**: in how many questions did the right chunk appear in the top k? **MRR**: on average, how high was it (1 for first place, ½ for second, ⅓ for third, 0 if missing)?",
            "This tiny eval turns \"hybrid feels better\" into numbers. Run it after every retrieval change: chunk size, embedding model, reranker.",
            "Write questions the way real users would, including paraphrases and exact codes. With only 10 questions, differences of one question are noise.",
          ],
          concepts: [
            ["Hit rate@k (recall@k)", "Fraction of questions whose relevant chunk is in the top k."],
            ["MRR", "Mean Reciprocal Rank: average of 1/rank of the first relevant result."],
            ["`list.index(x)`", "Position of `x` in a list (error if absent, so check `in` first)."],
          ],
        },
      ],
    },
  ],
};
