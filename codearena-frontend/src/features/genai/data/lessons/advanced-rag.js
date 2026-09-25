// Day 8: Advanced RAG. Shape: see ./index.js
export default {
  hybrid: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "Vector search understands meaning but is weak on exact terms: product codes, error IDs, names, acronyms. Keyword search is the opposite. **Hybrid search** runs both and merges the results. It's one of the most reliable upgrades to any RAG system.",
    sections: [
      {
        h: "Where each one fails",
        blocks: [
          {
            table: {
              head: ["Query", "Vector search", "Keyword (BM25)"],
              rows: [
                ["\"how do I get my money back\"", "Finds the refund policy", "Misses it (no shared words)"],
                ["\"error E-4012\"", "Returns generic error docs", "Finds the exact error page"],
                ["\"iPhone 15 Pro Max 256GB\"", "Similar phones, maybe the wrong model", "Exact model"],
                ["\"Section 80C deduction\"", "Tax content in general", "The exact section"],
              ],
            },
          },
        ],
      },
      {
        h: "BM25 in one paragraph",
        blocks: [
          "**BM25** is the classic keyword ranking function behind Elasticsearch and OpenSearch. A document scores higher when it contains the query's terms often (with diminishing returns), when those terms are **rare** across the collection (\"E-4012\" matters more than \"the\"), and it's normalised so long documents don't win just by being long. It's fast, needs no model, and is excellent at exact matches.",
          {
            lang: "python",
            code: `# uv add rank-bm25
from rank_bm25 import BM25Okapi
import re

def tokenize(t: str) -> list[str]:
    return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", t.lower())

corpus = [c["text"] for c in chunks]
bm25 = BM25Okapi([tokenize(t) for t in corpus])
scores = bm25.get_scores(tokenize("error E-4012 on login"))
top = sorted(range(len(scores)), key=lambda i: -scores[i])[:20]`,
          },
        ],
      },
      {
        h: "Merging results with Reciprocal Rank Fusion",
        blocks: [
          "BM25 scores and cosine similarities are on different scales, so you can't just add them. **Reciprocal Rank Fusion (RRF)** ignores the raw scores and uses only the **rank** in each list:",
          {
            lang: "text",
            code: `RRF_score(doc) = Σ over result lists  1 / (k + rank_in_that_list)      (k is usually 60)`,
          },
          {
            lang: "python",
            code: `from collections import defaultdict

def rrf(result_lists: list[list[str]], k: int = 60, top_n: int = 10) -> list[str]:
    scores: dict[str, float] = defaultdict(float)
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] += 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)[:top_n]

fused = rrf([vector_ids, bm25_ids])`,
          },
          "A document ranked highly by both lists wins; a document that's first in just one list still does well. It's simple, robust and needs no tuning, which is why it's the default fusion method in many systems.",
          {
            note: "The alternative is a weighted sum of normalised scores (e.g. 0.7 × vector + 0.3 × keyword). It can be tuned more finely but needs normalisation and tuning per dataset.",
          },
        ],
      },
      {
        h: "Hybrid search in practice",
        blocks: [
          {
            list: [
              "**Qdrant:** store dense and sparse vectors on the same point and query both with built-in fusion.",
              "**Postgres:** pgvector for vectors plus full-text search (`tsvector`, `ts_rank`) for keywords, merged with RRF in SQL or Python.",
              "**Elasticsearch / OpenSearch:** BM25 is native; add a vector field; hybrid queries are supported.",
              "**Pinecone, Weaviate, MongoDB Atlas:** have hybrid options.",
              "**LangChain:** `EnsembleRetriever([bm25_retriever, vector_retriever], weights=[0.4, 0.6])` (import it from `langchain_classic.retrievers` in LangChain 1.x; `BM25Retriever` is in `langchain_community.retrievers`).",
            ],
          },
          {
            tip: "Run the two searches concurrently (`asyncio.gather`) and fetch more than you need from each (e.g. 20–50), then fuse and rerank down to 5.",
          },
        ],
      },
    ],
    revise: [
      "Vector = meaning (paraphrases); BM25 = exact terms (codes, names, acronyms). Hybrid = both.",
      "BM25: term frequency with saturation, rarer terms weigh more, length normalisation.",
      "RRF: score = Σ 1/(60 + rank); merges lists without comparing raw scores.",
      "Retrieve 20–50 from each concurrently → fuse → rerank to top 5.",
    ],
    interview: [
      {
        q: "Hybrid search: why and when?",
        a: "Dense embeddings capture semantic similarity but can miss exact tokens like product codes, IDs, names and rare jargon; BM25 keyword search nails those but misses paraphrases. Running both and fusing with Reciprocal Rank Fusion improves recall across query types. It's worth it whenever users search with specific identifiers or domain terms, which is most enterprise and e-commerce search.",
      },
      {
        q: "What is Reciprocal Rank Fusion?",
        a: "A way to combine ranked lists using only positions: each document gets the sum of 1/(k + rank) over the lists it appears in, with k around 60. It avoids normalising incompatible scores, rewards documents that rank well in several lists, and works well without tuning.",
      },
    ],
    practice: [
      "Add BM25 to your semantic search from Day 8 and fuse with RRF; re-run the 3 queries that failed there.",
    ],
  },

  rerank: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "First-stage retrieval (vectors, BM25) is fast but approximate. A **reranker** takes the top 20–50 candidates and scores each one against the query with a much more accurate model, then keeps the best few. It's often the single biggest quality gain in a RAG pipeline.",
    sections: [
      {
        h: "Bi-encoders vs cross-encoders",
        blocks: [
          {
            table: {
              head: ["", "Bi-encoder (embeddings)", "Cross-encoder (reranker)"],
              rows: [
                ["How", "Query and document embedded separately; compare vectors", "Query and document read **together** by one model, which outputs a relevance score"],
                ["Precomputation", "Documents embedded once, ahead of time", "Nothing can be precomputed"],
                ["Speed", "Search millions in milliseconds", "Tens to hundreds of pairs per request"],
                ["Accuracy", "Good", "Much better: sees how each word in the query relates to the document"],
                ["Role", "Stage 1: recall", "Stage 2: precision"],
              ],
            },
          },
          "Because a cross-encoder reads the query and passage together, it catches things embeddings blur, such as negation (\"refund **not** allowed\"), which entity a number refers to, or whether a passage actually answers the question versus just mentioning its topic.",
        ],
      },
      {
        h: "Using a reranker",
        blocks: [
          {
            lang: "python",
            code: `# Option 1: open-source cross-encoder, runs locally
# uv add sentence-transformers
from sentence_transformers import CrossEncoder
reranker = CrossEncoder("BAAI/bge-reranker-base")        # or cross-encoder/ms-marco-MiniLM-L-6-v2

def rerank(query: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    scores = reranker.predict([(query, c["text"]) for c in chunks])
    ranked = sorted(zip(chunks, scores), key=lambda x: -x[1])
    return [{**c, "rerank_score": float(s)} for c, s in ranked[:top_n]]`,
          },
          {
            lang: "python",
            code: `# Option 2: hosted reranker API (e.g. Cohere Rerank; Voyage and Jina have similar APIs)
import cohere
co = cohere.ClientV2()
resp = co.rerank(model="rerank-v3.5", query=query, documents=[c["text"] for c in chunks], top_n=5)
reranked = [chunks[r.index] for r in resp.results]`,
            caption: "Check the provider's docs for the current model name.",
          },
          {
            lang: "text",
            code: `question → hybrid retrieve 40 candidates → rerank → top 5 → LLM`,
          },
        ],
      },
      {
        h: "Costs and tuning",
        blocks: [
          {
            list: [
              "Reranking adds latency (roughly 50–500 ms depending on model, hardware and candidate count). Rerank 20–50 candidates, not hundreds.",
              "A local cross-encoder on CPU is slow for long passages; use a GPU or a hosted API in production.",
              "Rerank scores are a good signal for \"I don't know\": if the best rerank score is low, the answer probably isn't in the documents.",
              "An **LLM as reranker** (asking a model to score or order passages) works too, but it's slower and pricier; use it when you need reasoning about relevance.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Two stages: fast retrieval for recall (bi-encoder/BM25), then reranking for precision (cross-encoder).",
      "Cross-encoders read query + passage together → more accurate, can't precompute, slower.",
      "Retrieve 20–50 → rerank → top 3–8 to the LLM.",
      "Options: open-source (BGE reranker, MiniLM cross-encoder), APIs (Cohere, Voyage, Jina), or an LLM.",
      "Low top rerank score is a useful \"not answerable\" signal.",
    ],
    interview: [
      {
        q: "What does a reranker fix that embeddings can't?",
        a: "Embeddings compress the query and document independently into vectors, so fine-grained relationships are lost: negation, whether a passage actually answers the question, which entity a detail belongs to. A cross-encoder reranker processes the query and passage together with full attention between them, giving a much more accurate relevance score. It's too slow for the whole corpus, so it reorders the top candidates from the first-stage retriever.",
      },
    ],
    practice: [
      "Add a cross-encoder reranker to DocChat and measure hit rate@5 before and after on your 20 questions.",
    ],
  },

  "query-rewrite": {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Users write short, vague or oddly phrased questions. **Query transformation** uses an LLM to turn the user's question into better search queries before retrieval. Three techniques cover most needs: rewriting, multi-query and HyDE.",
    sections: [
      {
        h: "Query rewriting",
        blocks: [
          "Clean up the question: expand abbreviations, fix typos, add the domain, remove chit-chat. Condensing follow-ups (Day 9) is a special case.",
          {
            lang: "text",
            code: `"wfh rules for new joinees??"  →  "work from home policy for new employees during probation"`,
          },
        ],
      },
      {
        h: "Multi-query",
        blocks: [
          "Generate several different phrasings of the question, retrieve for each, and fuse the results with RRF. It improves recall when the vocabulary of the question and the documents differ.",
          {
            lang: "python",
            code: `from pydantic import BaseModel

class Queries(BaseModel):
    queries: list[str]

MULTI = """Generate 3 different search queries that would help find documents answering the question.
Vary vocabulary and angle (e.g. policy name, process steps, eligibility)."""

async def multi_query_retrieve(question: str, owner_id: int) -> list[dict]:
    qs = (await small_llm.structured(MULTI, question, Queries)).queries + [question]
    results = await asyncio.gather(*(retrieve(q, owner_id, k=20) for q in qs))
    fused_ids = rrf([[c["id"] for c in r] for r in results])
    by_id = {c["id"]: c for r in results for c in r}
    return [by_id[i] for i in fused_ids]`,
          },
        ],
      },
      {
        h: "HyDE: Hypothetical Document Embeddings",
        blocks: [
          "Questions and answers look different. \"Can interns take casual leave?\" is short and interrogative, while the policy text is long and declarative. **HyDE** asks the LLM to write a hypothetical answer passage (which may be factually wrong), embeds that, and searches with it. The fake answer sits closer to real answer passages in embedding space.",
          {
            lang: "python",
            code: `async def hyde_retrieve(question: str, owner_id: int):
    fake = await small_llm.complete(
        system="Write a short passage from a company policy document that answers the question. "
               "It's used only for search, so plausible wording matters more than accuracy.",
        messages=[{"role": "user", "content": question}], max_tokens=150)
    return await retrieve(fake.text, owner_id, k=20)`,
          },
          {
            warn: "HyDE adds an LLM call to every query and can drift when the model knows nothing about your domain. Use the hypothetical text only for retrieval, never as the answer, and measure it before keeping it.",
          },
        ],
      },
      {
        h: "Choosing",
        blocks: [
          {
            table: {
              head: ["Technique", "Helps when", "Cost"],
              rows: [
                ["Rewrite / condense", "Vague, chatty, follow-up questions", "One small LLM call"],
                ["Multi-query", "Vocabulary mismatch, broad questions", "One LLM call + several searches"],
                ["HyDE", "Short questions vs long formal documents", "One LLM call"],
                ["Query decomposition", "Multi-part questions (\"compare A and B\")", "LLM call + a search per sub-question"],
              ],
            },
          },
          "Every transformation adds latency. Add one only if your eval set shows a gain.",
        ],
      },
    ],
    revise: [
      "Rewrite: clean, expand, standalone queries.",
      "Multi-query: several phrasings → retrieve each → RRF.",
      "HyDE: embed a hypothetical answer passage instead of the question; use it only for search.",
      "Decomposition for multi-part questions.",
      "Each adds latency and cost; keep only what the eval shows helps.",
    ],
    interview: [
      {
        q: "How do you handle multi-hop questions?",
        a: "Decompose the question into sub-questions with an LLM, retrieve for each (possibly sequentially, where the answer to one informs the next query), then synthesise a final answer from all retrieved evidence. For complex cases this becomes an agentic RAG loop where the model decides when it has enough information. Knowledge graphs (GraphRAG) can also help when answers depend on relationships between entities.",
      },
      {
        q: "What is HyDE?",
        a: "Hypothetical Document Embeddings: the LLM writes a plausible answer passage for the query, and that passage is embedded and used for vector search instead of the raw question. It works because a hypothetical answer is phrased like the real documents, so its embedding lands closer to them. It costs an extra LLM call and can mislead if the model's guess is off-domain.",
      },
    ],
    practice: [
      "Implement multi-query retrieval and compare hit rate@5 against plain retrieval on your eval set.",
    ],
  },

  "parent-doc": {
    minutes: 40,
    level: "Advanced",
    intro:
      "Small chunks retrieve precisely; big chunks give the LLM enough context. **Parent-document retrieval** and **contextual retrieval** get you both, and they're simple to implement once you understand the idea.",
    sections: [
      {
        h: "Parent-document retrieval (small-to-big)",
        blocks: [
          "Split each document into **parents** (e.g. sections of ~1,500 tokens) and each parent into **children** (~200–300 tokens). Embed and search the children; when a child matches, send its **parent** to the LLM.",
          {
            lang: "python",
            code: `def index_small_to_big(doc_text: str, doc_id: str):
    for p_idx, parent in enumerate(recursive_chunks(doc_text, max_tokens=1500)):
        parent_id = f"{doc_id}:P{p_idx}"
        parent_store.put(parent_id, parent)                        # key-value / SQL table
        children = recursive_chunks(parent, max_tokens=250)
        vecs = embed_batch(children)
        vector_store.upsert([
            {"id": f"{parent_id}:c{i}", "text": c, "parent_id": parent_id}
            for i, c in enumerate(children)], vecs)

def retrieve_parents(query: str, k: int = 4) -> list[str]:
    hits = vector_store.search(embed(query), k=k * 3)
    parent_ids = list(dict.fromkeys(h["parent_id"] for h in hits))[:k]   # dedupe, keep order
    return [parent_store.get(pid) for pid in parent_ids]`,
          },
          "Variants: **sentence window** (retrieve a sentence, send it with a few neighbouring sentences) and **auto-merging** (if several children of the same parent match, send the parent).",
        ],
      },
      {
        h: "Contextual retrieval",
        blocks: [
          "Chunks often lose their context: \"The limit is increased to ₹50,000\" (what limit? which year?). **Contextual retrieval**, popularised by Anthropic, fixes this at indexing time: for each chunk, an LLM writes one or two sentences situating it within the whole document, and that context is prepended before embedding and before BM25 indexing.",
          {
            lang: "python",
            code: `CONTEXT_PROMPT = """<document>
{document}
</document>
Here is a chunk from the document:
<chunk>
{chunk}
</chunk>
Write 1-2 sentences that situate this chunk within the overall document, to improve search retrieval.
Answer only with the context."""

def contextualize(document: str, chunk: str) -> str:
    ctx = small_llm.complete(system="", messages=[{"role": "user",
          "content": CONTEXT_PROMPT.format(document=document, chunk=chunk)}], max_tokens=100).text
    return f"{ctx.strip()}\\n\\n{chunk}"
# e.g. "From Acme's 2026 Travel Policy, section on international trips, describing per-diem limits." + chunk`,
          },
          {
            list: [
              "It sends the whole document once per chunk, so use a cheap model and **prompt caching** (the document part is identical across that document's chunks), or it gets expensive.",
              "Combined with hybrid search and reranking, it substantially reduces retrieval failures in Anthropic's published experiments.",
              "Cheaper cousin: prepend the document title and heading path (Day 7). Always do that; add LLM context if evals justify the cost.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Parent-document: search small children, send big parents. Variants: sentence window, auto-merging.",
      "Contextual retrieval: LLM-written situating context prepended to each chunk before embedding and BM25.",
      "Contextual retrieval costs an LLM call per chunk; use a small model + prompt caching.",
      "Always prepend title + heading path at minimum.",
    ],
    interview: [
      {
        q: "Small chunks retrieve well but the LLM lacks context. What do you do?",
        a: "Decouple the retrieval unit from the generation unit: parent-document retrieval indexes small child chunks and returns their larger parent sections to the LLM, or sentence-window retrieval returns neighbouring sentences. Also enrich chunks with document title and heading path, or LLM-generated contextual summaries, so the embedded text carries its context.",
      },
    ],
    practice: [
      "Implement parent-document retrieval for one long PDF and compare 5 answers with plain chunking.",
    ],
  },

  multimodal: {
    minutes: 45,
    level: "Advanced",
    intro:
      "Real company documents aren't clean text: invoices, slide decks, scanned forms, charts, spreadsheets. This lesson covers how to handle tables and images, plus GraphRAG, which you should be able to discuss in interviews.",
    sections: [
      {
        h: "Tables",
        blocks: [
          {
            list: [
              "**Extract structure:** use a layout-aware parser (pdfplumber, Docling, Unstructured, cloud document AI) that returns tables as rows, not flattened text.",
              "**Store as Markdown or HTML** in one chunk with its caption and section heading. LLMs read Markdown tables well.",
              "**Add a summary for retrieval:** an LLM-written description (\"Table of 2026 leave entitlements by employee grade\") improves matching, while the full table goes to the LLM.",
              "**Big tables or numeric questions:** load them into a real database and answer with SQL (text-to-SQL) instead of RAG. \"What's the total of column X\" is a query, not a retrieval problem.",
            ],
          },
        ],
      },
      {
        h: "Images, charts and scanned pages",
        blocks: [
          {
            table: {
              head: ["Approach", "How", "Trade-off"],
              rows: [
                ["OCR", "Extract text from images (Tesseract, cloud OCR)", "Loses layout and chart meaning"],
                ["Caption with a vision model", "A multimodal LLM describes each image or chart; embed the description", "Good retrieval; caption cost at indexing"],
                ["Multimodal embeddings", "Embed page images directly (CLIP-style or ColPali-style models)", "No parsing; newer and heavier infrastructure"],
                ["Send page images at answer time", "Retrieve the page, send its image to a vision-capable LLM", "Most faithful for charts and forms; more tokens"],
              ],
            },
          },
          "A practical pattern: caption images and embed the captions for retrieval, keep a link to the page image, and send the image to a multimodal model when that page is retrieved.",
          {
            lang: "python",
            code: `# sending a page image to a vision-capable model (OpenAI format)
import base64
img_b64 = base64.b64encode(open("page_12.png", "rb").read()).decode()
r = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": [
    {"type": "text", "text": "What was Q3 revenue according to this chart?"},
    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}},
]}])`,
          },
        ],
      },
      {
        h: "GraphRAG (awareness)",
        blocks: [
          "Vector RAG retrieves passages similar to the question. It struggles with questions about **relationships across many documents** (\"Which suppliers are linked to delayed projects in the North region?\") and **global questions** (\"What are the main themes across all 2,000 customer complaints?\").",
          "**GraphRAG** uses an LLM to extract entities and relationships from documents into a knowledge graph, often clusters it into communities with summaries, and then answers by traversing the graph or using those summaries. Microsoft's GraphRAG project popularised it; graph databases like Neo4j are common backends.",
          {
            table: {
              head: ["", "Vector RAG", "GraphRAG"],
              rows: [
                ["Best for", "Specific facts in passages", "Relationships, multi-hop, global summaries"],
                ["Indexing cost", "Low", "High (many LLM calls to extract the graph)"],
                ["Maturity", "Standard", "Growing; more complex to run"],
              ],
            },
          },
          "In interviews: explain when you'd consider it, and that you'd start with vector + hybrid RAG and add a graph only when evals show relationship questions failing.",
        ],
      },
    ],
    revise: [
      "Tables: layout-aware parsing, Markdown in one chunk + caption, LLM summary for retrieval; numeric questions → SQL.",
      "Images: OCR, vision-model captions (embed captions), multimodal embeddings, or send page images to a multimodal LLM at answer time.",
      "GraphRAG: LLM-extracted entity graph for relationship and global questions; expensive indexing; add only when needed.",
    ],
    interview: [
      {
        q: "When would you use GraphRAG instead of vector RAG?",
        a: "When questions depend on relationships between entities across many documents, require multi-hop reasoning, or ask for global summaries of a whole corpus, which chunk similarity search handles poorly. It costs much more to build and maintain, so I'd start with hybrid vector RAG, and add a knowledge graph when evaluation shows those question types failing.",
      },
    ],
    practice: [
      "Take a PDF with a table; extract it with pdfplumber into Markdown and compare answers to 3 table questions before and after.",
    ],
  },

  acl: {
    minutes: 35,
    level: "Intermediate",
    intro:
      "In an enterprise RAG system, an intern must never get an answer built from the CEO's salary sheet. **Access control** is a security requirement, and interviewers for enterprise GenAI roles always probe it.",
    sections: [
      {
        h: "The rule: filter at retrieval time",
        blocks: [
          "The LLM can't \"un-see\" a document. If a restricted chunk reaches the prompt, it can leak into the answer no matter what the instructions say. So permissions must be enforced **before** the prompt is built, in the retrieval query itself.",
          {
            lang: "python",
            code: `def allowed_filter(user) -> dict:
    return {"$or": [
        {"visibility": "public"},
        {"owner_id": user.id},
        {"group_ids": {"$in": user.group_ids}},     # e.g. "hr", "finance", "all-employees"
    ], "tenant_id": user.tenant_id}                 # hard tenant boundary

chunks = store.search(query_vec, k=40, filter=allowed_filter(current_user))`,
            caption: "Filter syntax varies by vector database; the principle doesn't.",
          },
        ],
      },
      {
        h: "Design details",
        blocks: [
          {
            list: [
              "**Copy permissions onto every chunk** at indexing time (tenant, owner, groups, classification level).",
              "**Keep them in sync:** when document permissions change in the source system (SharePoint, Drive, Confluence), update the chunks' metadata. Stale permissions are a real leak risk.",
              "**Get the user's identity from your auth system**, never from the prompt (\"I'm the HR manager\" means nothing).",
              "**Multi-tenancy:** a hard filter on `tenant_id` in every query, or separate collections/namespaces per tenant for stronger isolation.",
              "**Caches too:** a semantic cache must be keyed by user or permission set, or it can serve one user's answer to another.",
              "**Test it:** automated tests asserting user A can't retrieve user B's chunks, and a check that answers only cite allowed documents.",
              "**Audit logs:** record who asked what and which documents were used.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Enforce permissions in the retrieval query, before the prompt. The LLM can't be trusted to hide what it has seen.",
      "Permissions on every chunk; keep them in sync with the source system.",
      "Identity from auth, never from the prompt. Hard tenant filters or per-tenant collections.",
      "Key caches by permissions; test isolation; keep audit logs.",
    ],
    interview: [
      {
        q: "Design access control for a company-wide document Q&A bot.",
        a: "Ingest documents with their ACLs from the source systems (tenant, groups, owners) and store them as metadata on every chunk; sync permission changes. At query time, resolve the user's identity and groups from SSO, and apply a metadata filter in the vector and keyword search so only permitted chunks are ever retrieved. Isolate tenants with hard filters or separate indexes, key any caches by permission set, log which documents fed each answer, and have automated tests that verify users can't retrieve restricted content.",
      },
    ],
    practice: [
      "Add `group_ids` to DocChat chunks and a filter based on the logged-in user's groups; write a test proving isolation.",
    ],
  },

  "hybrid-rerank": {
    minutes: 180,
    level: "Advanced",
    intro:
      "Upgrade DocChat's retrieval: hybrid search (vector + BM25 with RRF) followed by a cross-encoder reranker. Keep the old path behind a setting so you can compare on your eval set.",
    sections: [
      {
        h: "Target pipeline",
        blocks: [
          {
            lang: "text",
            code: `question → condense → [vector top 30 ‖ keyword top 30] → RRF → top 30 → rerank → top 5 → LLM`,
          },
        ],
      },
      {
        h: "Keyword search in Postgres",
        blocks: [
          "If DocChat uses pgvector, add Postgres full-text search to the same table instead of a separate BM25 library. It persists, filters and scales with your data.",
          {
            lang: "sql",
            code: `ALTER TABLE chunks ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX chunks_tsv_idx ON chunks USING gin (tsv);

-- keyword top 30 for one owner
SELECT id, ts_rank_cd(tsv, websearch_to_tsquery('english', $1)) AS rank
FROM chunks
WHERE owner_id = $2 AND tsv @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 30;`,
          },
          {
            note: "Postgres `ts_rank` isn't exactly BM25, but it's a solid keyword ranker. Extensions such as ParadeDB's `pg_search` add true BM25 if you need it.",
          },
        ],
      },
      {
        h: "Wiring it together",
        blocks: [
          {
            lang: "python",
            code: `async def retrieve_v2(query: str, owner_id: int, k: int = 5) -> list[dict]:
    qvec = await embed_one(query)
    vec_hits, kw_hits = await asyncio.gather(
        repo.vector_search(qvec, owner_id, limit=30),
        repo.keyword_search(query, owner_id, limit=30),
    )
    by_id = {h["id"]: h for h in [*vec_hits, *kw_hits]}
    fused = rrf([[h["id"] for h in vec_hits], [h["id"] for h in kw_hits]], top_n=30)
    candidates = [by_id[i] for i in fused]
    return await asyncio.to_thread(rerank, query, candidates, k)   # CPU-bound model off the event loop`,
          },
          "Add `RETRIEVAL_MODE=vector|hybrid|hybrid_rerank` to settings and log the mode with each request.",
        ],
      },
      {
        h: "Measure",
        blocks: [
          {
            table: {
              head: ["Mode", "Hit rate@5", "MRR", "p50 retrieval latency"],
              rows: [
                ["vector", "…", "…", "…"],
                ["hybrid", "…", "…", "…"],
                ["hybrid + rerank", "…", "…", "…"],
              ],
            },
          },
          "Fill this in with your numbers (the next task builds the test set and metrics). A table like this in your README, showing each improvement with evidence, is exactly what impresses interviewers.",
        ],
      },
    ],
    revise: [
      "Vector and keyword searches run concurrently, fused with RRF, then reranked.",
      "Postgres full-text search (tsvector + GIN) gives keyword search inside the same DB.",
      "Run CPU-bound rerankers off the event loop.",
      "Keep modes switchable and measure each.",
    ],
    practice: [
      "Try reranking the top 20 vs top 50 candidates and record the quality/latency trade-off.",
    ],
  },

  "test-set": {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Build a 30-question test set with known correct sources, and a script that computes retrieval metrics. After today, every retrieval change you make is measured instead of guessed. That habit is what makes someone a GenAI engineer rather than a prompt tinkerer.",
    sections: [
      {
        h: "Writing good test questions",
        blocks: [
          {
            list: [
              "**30 questions** over your DocChat documents, with the chunk ids (or source + page) that contain the answer.",
              "**Mix of types:** exact facts, paraphrased questions, questions using codes or names, multi-part questions, and 5 unanswerable ones.",
              "**Realistic wording:** short, informal, some typos, some Hinglish if your users would write that way.",
              "You can have an LLM draft questions from chunks, but **review every one**. Generated questions tend to copy the document's wording, which makes retrieval look better than it is.",
            ],
          },
          {
            lang: "json",
            code: `{"id": "q07", "question": "can interns take casual leave in first month?", "relevant": ["hr.pdf:p12:c3"], "type": "paraphrase"}
{"id": "q19", "question": "what is form F-12 used for", "relevant": ["forms.pdf:p3:c1"], "type": "exact-term"}
{"id": "q27", "question": "what's the office wifi password", "relevant": [], "type": "unanswerable"}`,
          },
        ],
      },
      {
        h: "Retrieval metrics",
        blocks: [
          {
            table: {
              head: ["Metric", "Meaning", "Formula idea"],
              rows: [
                ["**Hit rate@k** (recall@k)", "Did any relevant chunk appear in the top k?", "hits / answerable questions"],
                ["**MRR**", "How high was the first relevant chunk?", "Average of 1/rank of the first hit (0 if none)"],
                ["**Precision@k**", "What fraction of the top k were relevant?", "relevant in top k / k"],
                ["nDCG@k", "Ranking quality with graded relevance", "Rewards relevant items near the top"],
              ],
            },
          },
          {
            lang: "python",
            code: `import json, statistics

def evaluate(retrieve_fn, path="eval/questions.jsonl", k=5) -> dict:
    cases = [json.loads(l) for l in open(path, encoding="utf-8")]
    answerable = [c for c in cases if c["relevant"]]
    hits, rr = 0, []
    for c in answerable:
        ids = [r["id"] for r in retrieve_fn(c["question"], k=k)]
        ranks = [i for i, rid in enumerate(ids, 1) if rid in c["relevant"]]
        hits += bool(ranks)
        rr.append(1 / ranks[0] if ranks else 0)
    return {"hit_rate@k": round(hits / len(answerable), 3),
            "mrr": round(statistics.mean(rr), 3), "n": len(answerable)}

for mode in ["vector", "hybrid", "hybrid_rerank"]:
    print(mode, evaluate(lambda q, k: retrieve(q, mode=mode, k=k)))`,
          },
        ],
      },
      {
        h: "Using it well",
        blocks: [
          {
            list: [
              "Run it on every retrieval change (chunk size, embedding model, k, hybrid weights, reranker) and record results in a table with the date and configuration.",
              "Look at the **failures**, not just the average. Each failed question tells you which technique to try next.",
              "Keep the set growing: add real user questions that failed in production.",
              "30 questions is small; treat differences of one or two questions as noise.",
            ],
          },
        ],
      },
    ],
    revise: [
      "30 reviewed questions with relevant chunk ids; mix of types including unanswerable ones.",
      "Hit rate@k, MRR, precision@k, nDCG.",
      "Run on every change, inspect failures, grow the set from real traffic, beware noise on small sets.",
    ],
    practice: [
      "Try chunk sizes 300, 500 and 800 and record hit rate@5 and MRR for each.",
    ],
  },
};
