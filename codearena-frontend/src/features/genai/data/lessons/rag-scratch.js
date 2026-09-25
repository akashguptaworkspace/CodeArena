// Day 6: RAG from scratch. Shape: see ./index.js
import { grounding, ragFailures, ragWhy } from "./rag-scratch-concepts.js";
import { deepChunking, deepCitations, deepHistory, deepLoading, deepPipeline } from "./rag-scratch-deep.js";
import { chunkLab, ragTests } from "./rag-scratch-builds.js";

const base = {
  loading: {
    minutes: 50,
    level: "Beginner",
    intro:
      "RAG quality starts with loading. If text comes out of a PDF garbled, with headers mixed into sentences and tables flattened into nonsense, no embedding model or LLM can fix it. \"Garbage in, garbage out\" is literally true here.",
    sections: [
      {
        h: "The RAG pipeline, end to end",
        blocks: [
          {
            lang: "text",
            code: `INDEXING (offline, when documents change)
  load → clean → chunk → embed → store (vector DB + metadata)

QUERYING (online, per question)
  question → (rewrite) → embed → retrieve top-k → (rerank) → build prompt → LLM → answer + citations`,
          },
          "Today covers the whole pipeline in its simplest form. Day 10 adds the bracketed steps.",
        ],
      },
      {
        h: "PDFs",
        blocks: [
          "PDF is a page-layout format, not a text format: it stores characters at positions, so reading order, columns and tables have to be reconstructed.",
          {
            table: {
              head: ["Library", "Good for", "Notes"],
              rows: [
                ["`pypdf`", "Simple text PDFs", "Pure Python, easy; weak on layout"],
                ["`pymupdf` (fitz)", "Fast, better layout, page images", "Very fast; check its AGPL licence for commercial use"],
                ["`pdfplumber`", "Tables and positions", "Slower, precise"],
                ["Unstructured, Docling, LlamaParse, cloud document AI", "Complex layouts, tables, scanned PDFs", "Heavier or paid; much better on messy documents"],
              ],
            },
          },
          {
            lang: "python",
            code: `import fitz  # uv add pymupdf

def load_pdf(path: str) -> list[dict]:
    pages = []
    with fitz.open(path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text")
            if text.strip():
                pages.append({"text": text, "page": i, "source": path})
    return pages`,
            caption: "Keep the page number with the text from the start. It's what makes citations possible.",
          },
          {
            warn: "Scanned PDFs contain images, not text: `get_text()` returns nothing. Detect it (almost no text per page) and route those files to OCR (Tesseract, a cloud OCR service) or a multimodal model.",
          },
        ],
      },
      {
        h: "HTML and DOCX",
        blocks: [
          {
            lang: "python",
            code: `# HTML: keep the main content, drop navigation, scripts and footers
import httpx
from bs4 import BeautifulSoup          # uv add beautifulsoup4

def load_html(url: str) -> dict:
    html = httpx.get(url, timeout=20, follow_redirects=True).text
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    main = soup.find("main") or soup.body
    return {"text": main.get_text("\\n", strip=True), "source": url,
            "title": soup.title.string if soup.title else url}

# DOCX
from docx import Document               # uv add python-docx

def load_docx(path: str) -> dict:
    doc = Document(path)
    text = "\\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return {"text": text, "source": path}`,
          },
          {
            tip: "Converting everything to **Markdown** keeps headings, lists and tables readable for both chunking and the LLM. Tools like Docling, MarkItDown and markdownify do this.",
          },
        ],
      },
      {
        h: "Cleaning",
        blocks: [
          {
            list: [
              "Remove repeated headers and footers (\"Company Confidential — Page 3 of 40\").",
              "Fix hyphenation across line breaks (`manage-\\nment` → `management`) and join lines broken mid-sentence.",
              "Normalise whitespace and Unicode (`unicodedata.normalize(\"NFKC\", text)`).",
              "Drop empty pages, tables of contents and boilerplate that would pollute retrieval.",
              "Keep metadata: source, title, page, section heading, date, owner, access level.",
            ],
          },
          {
            lang: "python",
            code: `import re, unicodedata

def clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"(\\w)-\\n(\\w)", r"\\1\\2", text)       # de-hyphenate
    text = re.sub(r"(?<![.!?:])\\n(?!\\n)", " ", text)       # join broken lines
    text = re.sub(r"[ \\t]+", " ", text)
    return re.sub(r"\\n{3,}", "\\n\\n", text).strip()`,
          },
          "Always **look at the extracted text** for a few documents before building anything. Five minutes of reading output saves days of debugging retrieval.",
        ],
      },
    ],
    revise: [
      "Indexing: load → clean → chunk → embed → store. Querying: embed question → retrieve → prompt → answer with citations.",
      "PDFs are layouts: pypdf (simple), pymupdf (fast, better), pdfplumber (tables), document AI tools for complex or scanned files.",
      "Scanned PDFs need OCR or multimodal models.",
      "HTML: strip nav/scripts/footers; convert documents to Markdown to keep structure.",
      "Clean: headers/footers, hyphenation, broken lines, Unicode. Keep page and source metadata from the start.",
    ],
    mistakes: [
      "Never reading the extracted text.",
      "Losing page numbers during loading, making citations impossible.",
      "Indexing navigation menus and footers, which then match many queries.",
    ],
    interview: [
      {
        q: "How do you handle tables and images in PDFs for RAG?",
        a: "Use a layout-aware parser (pdfplumber, Docling, Unstructured or a document AI service) that extracts tables as structured rows or Markdown rather than flattened text; keep each table as its own chunk with its caption and surrounding heading; optionally add an LLM-written summary of the table for better retrieval. For images and charts, use OCR or a multimodal model to caption them, embed the description, and keep a reference to the original page image so a multimodal LLM can read it at answer time.",
      },
    ],
    practice: [
      "Extract text from 3 different PDFs (a simple one, a two-column paper, one with tables) using pypdf and pymupdf; compare the output.",
      "Write `clean()` and test it on the ugliest page you found.",
    ],
  },

  chunking: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "You can't embed a whole 40-page document as one vector: the meaning gets averaged into mush, and it wouldn't fit in the prompt anyway. **Chunking** splits documents into pieces that are small enough to be specific and large enough to make sense on their own. It's one of the biggest levers on RAG quality.",
    sections: [
      {
        h: "Why chunk size matters",
        blocks: [
          {
            table: {
              head: ["", "Small chunks (100–200 tokens)", "Large chunks (1,000+ tokens)"],
              rows: [
                ["Retrieval precision", "High: embedding is about one idea", "Low: embedding blends several topics"],
                ["Context for the answer", "May miss surrounding details", "Rich context"],
                ["Tokens per prompt", "Few", "Many (cost, lost in the middle)"],
                ["Typical failure", "Answer needs info from the next paragraph", "Right document found, but relevant sentence diluted"],
              ],
            },
          },
          "A common starting point is **300–800 tokens with 10–20% overlap**. Then measure on your eval set; the best size depends on your documents and questions.",
        ],
      },
      {
        h: "Fixed-size chunking",
        blocks: [
          "Split every N tokens (or characters), with an overlap so a sentence cut at a boundary appears whole in at least one chunk. Simple and predictable, but it ignores structure and can split mid-sentence.",
          {
            lang: "python",
            code: `import tiktoken
enc = tiktoken.get_encoding("o200k_base")

def fixed_chunks(text: str, size: int = 500, overlap: int = 75) -> list[str]:
    ids = enc.encode(text)
    step = size - overlap
    return [enc.decode(ids[i:i + size]) for i in range(0, max(len(ids) - overlap, 1), step)]`,
          },
        ],
      },
      {
        h: "Recursive chunking: the practical default",
        blocks: [
          "Try to split on the biggest natural boundary first (sections, then paragraphs, then sentences, then words), and only go smaller when a piece is still too big. Chunks end at natural breaks as often as possible. This is what LangChain's `RecursiveCharacterTextSplitter` does.",
          {
            lang: "python",
            code: `SEPARATORS = ["\\n## ", "\\n\\n", "\\n", ". ", " "]

def recursive_chunks(text: str, max_tokens: int = 500, seps=SEPARATORS) -> list[str]:
    if len(enc.encode(text)) <= max_tokens:
        return [text]
    if not seps:
        return fixed_chunks(text, max_tokens, 0)
    sep, rest = seps[0], seps[1:]
    parts, chunks, current = text.split(sep), [], ""
    for part in parts:
        candidate = f"{current}{sep}{part}" if current else part
        if len(enc.encode(candidate)) <= max_tokens:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(enc.encode(part)) > max_tokens:
                chunks.extend(recursive_chunks(part, max_tokens, rest))
                current = ""
            else:
                current = part
    if current:
        chunks.append(current)
    return chunks`,
            caption: "Written by hand to understand it; in practice you'll often use a library splitter.",
          },
        ],
      },
      {
        h: "Structure-aware and semantic chunking",
        blocks: [
          {
            list: [
              "**Structure-aware (Markdown/HTML headers):** split by headings and keep the heading path as metadata, e.g. `Leave Policy > Maternity Leave > Eligibility`. Prepend it to the chunk text before embedding; it adds a lot of meaning to short chunks.",
              "**Semantic chunking:** embed sentences and start a new chunk where the similarity between consecutive sentences drops (a topic shift). Can help unstructured text; costs more to index. Measure before adopting.",
              "**Special content:** keep tables whole with their caption; keep code blocks whole; for FAQs, one question + answer per chunk.",
              "**Parent–child:** index small chunks for precise retrieval but send their larger parent section to the LLM (Day 10).",
            ],
          },
          {
            lang: "python",
            code: `def with_context(chunk: str, meta: dict) -> str:
    """Text actually embedded: document title + heading path + chunk."""
    return f"{meta['title']}\\n{meta.get('heading_path', '')}\\n\\n{chunk}"`,
          },
        ],
      },
      {
        h: "Chunk metadata",
        blocks: [
          "Every chunk should carry what you need for filtering, citations and debugging:",
          {
            lang: "python",
            code: `{
    "id": "hr-policy.pdf:p12:c3",        # stable id: source + page + position
    "text": "...",
    "source": "hr-policy.pdf",
    "title": "HR Policy 2026",
    "page": 12,
    "heading_path": "Leave > Maternity",
    "chunk_index": 3,
    "tenant_id": "acme",
    "doc_version": "2026-04",
    "embedding_model": "text-embedding-3-small",
}`,
          },
          {
            tip: "Stable ids let you re-index a changed document by deleting its old chunks and inserting new ones, without duplicates.",
          },
        ],
      },
    ],
    revise: [
      "Small chunks = precise retrieval, less context; large chunks = more context, diluted embeddings, more tokens.",
      "Start at 300–800 tokens, 10–20% overlap, then tune with evals.",
      "Recursive splitting on natural boundaries is the practical default.",
      "Structure-aware: split by headings and prepend title + heading path before embedding.",
      "Keep tables, code blocks and FAQ pairs whole. Parent–child: retrieve small, send large.",
      "Rich metadata with stable ids enables filtering, citations and re-indexing.",
    ],
    mistakes: [
      "One chunk size copied from a tutorial without testing.",
      "Zero overlap with fixed-size splitting, cutting answers in half.",
      "Chunks that lose their context (\"It must be submitted within 7 days\"; what is \"it\"?). Prepend headings.",
      "Splitting tables across chunks.",
    ],
    interview: [
      {
        q: "How do you choose chunk size and overlap?",
        a: "Start from the document structure and question types: FAQs as one chunk per Q&A, policies by section, long prose around 300–800 tokens with 10–20% overlap using recursive splitting on headings and paragraphs. Then evaluate retrieval (hit rate, MRR) and answer faithfulness on a labelled set for a few sizes and pick the best. Techniques like prepending heading paths and parent-document retrieval reduce the trade-off between precision and context.",
      },
      {
        q: "What's the problem with very large chunks?",
        a: "The embedding represents an average of several topics, so similarity to a specific question drops and the right chunk may rank lower. Large chunks also use more of the context window, raise cost and latency, and can bury the relevant sentence in the middle where models attend less.",
      },
    ],
    practice: [
      "Chunk one policy PDF with fixed-size (500/0), fixed-size (500/75) and recursive (500). Print chunk counts and eyeball 3 chunks of each.",
      "Implement heading-path chunking for a Markdown file.",
    ],
  },

  pipeline: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Now put it together: retrieve the most relevant chunks for a question, place them in a prompt, and let the LLM answer from them. Writing it without a framework shows you every moving part, which is exactly what interviewers probe.",
    sections: [
      {
        h: "Indexing function",
        blocks: [
          {
            lang: "python",
            code: `def index_document(path: str, tenant: str) -> int:
    pages = load_pdf(path)
    records = []
    for p in pages:
        for i, chunk in enumerate(recursive_chunks(clean(p["text"]), max_tokens=500)):
            records.append({
                "id": f"{path}:p{p['page']}:c{i}",
                "text": chunk, "source": path, "page": p["page"], "tenant": tenant,
            })
    vectors = embed_batch([r["text"] for r in records])
    store.delete(source=path, tenant=tenant)          # re-index cleanly
    store.upsert(records, vectors)
    return len(records)`,
          },
        ],
      },
      {
        h: "Retrieve → prompt → generate",
        blocks: [
          {
            lang: "python",
            code: `SYSTEM = """You answer questions using only the provided documents.
- Cite sources after each claim like [1] or [2][3], using the document numbers.
- If the documents don't contain the answer, reply exactly: "I couldn't find this in the documents."
- Be concise: at most 5 sentences unless the user asks for detail."""

def build_context(chunks: list[dict]) -> str:
    return "\\n\\n".join(
        f'<document index="{i}" source="{c["source"]}" page="{c["page"]}">\\n{c["text"]}\\n</document>'
        for i, c in enumerate(chunks, start=1)
    )

def answer(question: str, tenant: str, k: int = 5) -> dict:
    qvec = embed_batch([question])[0]
    chunks = store.search(qvec, k=k, tenant=tenant)            # filtered by tenant
    user_msg = f"<documents>\\n{build_context(chunks)}\\n</documents>\\n\\nQuestion: {question}"
    r = llm.complete(system=SYSTEM, messages=[{"role": "user", "content": user_msg}], max_tokens=600)
    return {"answer": r.text, "sources": [
        {"n": i, "source": c["source"], "page": c["page"], "score": c["score"]}
        for i, c in enumerate(chunks, start=1)
    ]}`,
          },
          "That's a complete RAG system. Everything else (reranking, hybrid search, query rewriting, evals) improves one of these steps.",
        ],
      },
      {
        h: "Choosing k and ordering",
        blocks: [
          {
            list: [
              "**k = 3–8** is typical. More chunks raise recall but add cost, latency and noise.",
              "A **similarity threshold** can drop weak matches, but tune it per embedding model; scores aren't comparable across models.",
              "Order chunks from most to least relevant; some teams put the best chunk last (closest to the question) because of \"lost in the middle\". Test both.",
              "**Deduplicate** near-identical chunks (the same paragraph in two versions of a document).",
            ],
          },
        ],
      },
      {
        h: "Debugging a RAG answer",
        blocks: [
          "When an answer is wrong, find which stage failed. Log the retrieved chunks for every request so you can do this.",
          {
            table: {
              head: ["Symptom", "Likely stage", "Fix"],
              rows: [
                ["Right chunk not in top-k", "Retrieval", "Chunking, embedding model, hybrid search, query rewriting, higher k + reranking"],
                ["Right chunk retrieved but answer wrong", "Generation", "Prompt clarity, chunk order, better model, less noise"],
                ["Answer includes facts not in chunks", "Generation (hallucination)", "Stricter grounding instructions, citations, lower temperature, faithfulness checks"],
                ["Right info not in the index at all", "Loading / indexing", "Parsing failures, missing documents, stale index"],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "Index: load → clean → chunk → embed → upsert (delete old chunks of that source first).",
      "Query: embed question → search top-k with filters → numbered documents in XML → LLM with grounding rules → answer + sources.",
      "k ≈ 3–8; thresholds are model-specific; dedupe; test chunk ordering.",
      "Debug by stage: retrieval miss vs generation error vs indexing gap. Log retrieved chunks.",
    ],
    interview: [
      {
        q: "Explain RAG end to end.",
        a: "Offline, documents are loaded, cleaned, split into chunks with metadata, embedded, and stored in a vector index. At query time the question is embedded (optionally rewritten), the most similar chunks are retrieved with metadata filters such as the user's permissions, optionally reranked, and inserted into a prompt that instructs the LLM to answer only from them and cite sources. The answer is returned with citations. RAG gives the model current, private knowledge without retraining and reduces hallucination.",
      },
      {
        q: "Why RAG instead of just putting all documents in a long-context model?",
        a: "Cost and latency scale with input tokens on every request; quality drops for information buried in long contexts; corpora are often far bigger than any context window; and retrieval lets you enforce per-user access control and cite exact sources. Long context is complementary: useful for a handful of documents or for sending larger retrieved sections.",
      },
    ],
    practice: [
      "Index one real policy PDF and ask 10 questions; for each wrong answer, classify the failure using the table above.",
    ],
  },

  citations: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Citations let users verify answers and build trust, and \"I don't know\" behaviour prevents confident nonsense. Together they're what separates a demo from a system a company can actually deploy.",
    sections: [
      {
        h: "Citation formats",
        blocks: [
          {
            list: [
              "**Inline markers:** the model writes `[1]`, `[2]` referring to numbered documents; your UI turns them into links to the source and page. Simple and effective.",
              "**Structured output:** ask for `{\"answer\": ..., \"citations\": [{\"doc\": 1, \"quote\": \"...\"}]}` and validate that each quote actually appears in the cited chunk.",
              "**Provider-native citations:** some APIs (for example Anthropic's citations feature for documents) return exact cited spans automatically.",
            ],
          },
          {
            lang: "python",
            code: `import re

def validate_citations(answer: str, n_docs: int) -> list[int]:
    cited = sorted({int(n) for n in re.findall(r"\\[(\\d+)\\]", answer)})
    bad = [n for n in cited if not 1 <= n <= n_docs]
    if bad:
        raise ValueError(f"answer cites non-existent documents: {bad}")
    return cited`,
          },
          {
            tip: "Show only the sources that were actually cited, not all k retrieved chunks. Users trust a short, relevant source list more.",
          },
        ],
      },
      {
        h: "\"I don't know\" behaviour",
        blocks: [
          "Models are trained to be helpful, so without explicit permission they'll answer from general knowledge when your documents don't cover a question. You need both instructions and checks:",
          {
            list: [
              "**Instruction:** give an exact fallback sentence (\"I couldn't find this in the documents.\") so your code can detect it.",
              "**Retrieval signal:** if the best similarity score is below a tuned threshold, skip the LLM and return the fallback directly. It's cheaper and safer.",
              "**Structured flag:** ask for `answerable: bool` before the answer in structured output.",
              "**Product design:** offer next steps (contact support, rephrase, search suggestions) instead of a dead end.",
            ],
          },
          {
            lang: "python",
            code: `FALLBACK = "I couldn't find this in the documents."

def safe_answer(question: str, tenant: str) -> dict:
    chunks = retrieve(question, tenant)
    if not chunks or chunks[0]["score"] < MIN_SCORE:      # tune MIN_SCORE on your eval set
        return {"answer": FALLBACK, "sources": [], "answerable": False}
    result = generate(question, chunks)
    result["answerable"] = FALLBACK not in result["answer"]
    return result`,
          },
        ],
      },
      {
        h: "Measuring it",
        blocks: [
          "Your eval set should include **unanswerable questions** (things the documents don't cover). Track two numbers: how often the system correctly refuses unanswerable questions, and how often it wrongly refuses answerable ones. Tightening one usually loosens the other; pick the balance your product needs (a legal or medical bot should refuse more readily than a shopping assistant).",
        ],
      },
    ],
    revise: [
      "Inline `[n]` markers mapped to numbered documents; validate the numbers; show only cited sources.",
      "Structured citations with quotes can be verified against chunk text.",
      "Exact fallback sentence + retrieval score threshold + optional `answerable` flag.",
      "Eval both correct refusals and wrong refusals; tune for the domain's risk.",
    ],
    interview: [
      {
        q: "How do you make the model say \"I don't know\"?",
        a: "Explicitly instruct it to answer only from the provided context and give an exact fallback phrase when the answer isn't there; short-circuit before calling the LLM when retrieval scores are below a tuned threshold; optionally have the model output an answerable flag in structured output; and include unanswerable questions in the eval set to measure refusal accuracy and tune the balance.",
      },
      {
        q: "How do you verify citations are real?",
        a: "Number the retrieved chunks and parse the cited numbers to check they exist; for stronger guarantees, ask for supporting quotes and check each quote appears in the cited chunk (exact or fuzzy match), or use provider-native citation features that return exact spans. Answers with unsupported claims can be flagged, regenerated, or scored in evals with a faithfulness metric.",
      },
    ],
    practice: [
      "Add citation validation and the score-threshold fallback to your RAG function.",
      "Write 5 unanswerable questions for your document and check how often the system refuses correctly.",
    ],
  },

  history: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "In a chat, users ask follow-ups like \"what about for interns?\" or \"and the deadline?\". Embedding that alone retrieves nothing useful, because the meaning lives in the earlier conversation. **Query condensation** rewrites follow-ups into standalone questions before retrieval.",
    sections: [
      {
        h: "The follow-up problem",
        blocks: [
          {
            lang: "text",
            code: `User: How many casual leaves do employees get?
Bot:  12 casual leaves per year [1].
User: What about interns?          ← embedding this finds nothing about leave`,
          },
          "Retrieval needs: *\"How many casual leaves do interns get?\"*",
        ],
      },
      {
        h: "Condense, then retrieve",
        blocks: [
          {
            lang: "python",
            code: `CONDENSE = """Rewrite the user's last message as a standalone search query,
using the conversation for context. Return only the query.
If it's already standalone, return it unchanged."""

def condense(history: list[dict], question: str) -> str:
    if not history:
        return question
    convo = "\\n".join(f"{m['role']}: {m['content']}" for m in history[-6:])
    r = small_llm.complete(
        system=CONDENSE,
        messages=[{"role": "user", "content": f"<conversation>\\n{convo}\\n</conversation>\\n\\nLast message: {question}"}],
        max_tokens=100,
    )
    return r.text.strip()

def chat_turn(history, question, tenant):
    query = condense(history, question)             # used for retrieval only
    chunks = retrieve(query, tenant)
    messages = [*history[-6:], {"role": "user", "content": f"<documents>{build_context(chunks)}</documents>\\n\\n{question}"}]
    return llm.complete(system=SYSTEM, messages=messages)`,
          },
          {
            list: [
              "Use a **small, fast model** for condensation; it's a simple rewriting task and adds latency to every turn.",
              "Keep the **original question** for the final answer; use the rewritten one only for retrieval.",
              "Log the rewritten query. It's the first thing to check when follow-ups fail.",
            ],
          },
        ],
      },
      {
        h: "Managing history length",
        blocks: [
          {
            table: {
              head: ["Strategy", "How", "Trade-off"],
              rows: [
                ["Sliding window", "Keep the last N turns", "Simple; forgets early details"],
                ["Token budget", "Drop oldest turns until under a limit", "Predictable cost"],
                ["Summary + recent", "Summarise older turns into a running summary", "Keeps key facts; extra LLM call"],
                ["Don't resend old context", "Keep old retrieved documents out of history; store only question and answer", "Much smaller prompts"],
              ],
            },
          },
          {
            tip: "Don't store the retrieved document blocks in the saved conversation history. Store the plain question and answer; retrieve fresh documents each turn. Otherwise prompts balloon with stale context.",
          },
        ],
      },
    ],
    revise: [
      "Follow-up questions need rewriting into standalone queries before retrieval (query condensation).",
      "Use a small model for condensing; use the rewritten query for retrieval and the original for answering.",
      "History strategies: sliding window, token budget, summary + recent.",
      "Save plain Q&A in history, not old retrieved documents.",
    ],
    interview: [
      {
        q: "How do you handle follow-up questions in a RAG chatbot?",
        a: "Before retrieval, condense the follow-up and recent history into a standalone query using a fast LLM call, and retrieve with that. Answer with the original question plus trimmed recent history and freshly retrieved context. Keep history bounded with a window or summary, and avoid storing old retrieved documents in history.",
      },
    ],
    practice: [
      "Write 5 two-turn conversations with follow-ups and check that condensation produces good standalone queries.",
    ],
  },

  "docchat-v1": {
    minutes: 300,
    level: "Intermediate",
    intro:
      "Build **DocChat v1**: upload PDFs, ask questions, and get streamed answers with page citations. No LangChain: plain Python, FastAPI and your vector store. This is Project 1 of your portfolio; you'll improve it on Days 10–11 and deploy it.",
    sections: [
      {
        h: "Scope for today",
        blocks: [
          {
            list: [
              "`POST /documents` (multipart PDF) → save file, extract, chunk, embed, store. Return document id and chunk count.",
              "`GET /documents` → the user's documents with status.",
              "`POST /chat` → `{question, conversation_id?}` → streamed answer (SSE) + a final `sources` event with source, page and snippet.",
              "Per-user isolation: every chunk has `owner_id`; every search filters on it.",
              "Minimal UI: upload box, document list, chat window. Clicking a citation shows the source snippet.",
            ],
          },
        ],
      },
      {
        h: "Project layout",
        blocks: [
          {
            lang: "text",
            code: `docchat/
  app/
    main.py  config.py  deps.py
    routers/documents.py   routers/chat.py
    rag/
      loaders.py     # load_pdf, clean
      chunking.py    # recursive_chunks + metadata
      embeddings.py  # embed_batch (cached, batched)
      store.py       # VectorStore protocol + pgvector/Qdrant implementation
      prompts.py     # SYSTEM, build_context
      pipeline.py    # index_document(), retrieve(), answer_stream()
    services/llm/    # your adapter from Day 4
  web/               # React app
  tests/
  eval/questions.jsonl`,
          },
        ],
      },
      {
        h: "The streaming answer with sources",
        blocks: [
          {
            lang: "python",
            code: `# app/rag/pipeline.py
async def answer_stream(question: str, owner_id: int, history: list[dict]):
    query = await condense(history, question)
    chunks = await retrieve(query, owner_id=owner_id, k=5)
    if not chunks or chunks[0]["score"] < settings.min_score:
        yield {"type": "token", "text": FALLBACK}
        yield {"type": "sources", "sources": []}
        return
    messages = [*history[-6:], {"role": "user", "content": user_prompt(chunks, question)}]
    parts = []
    async for token in llm.stream(system=SYSTEM, messages=messages, max_tokens=700):
        parts.append(token)
        yield {"type": "token", "text": token}
    cited = validate_citations("".join(parts), len(chunks))
    yield {"type": "sources", "sources": [
        {"n": n, "source": chunks[n - 1]["source"], "page": chunks[n - 1]["page"],
         "snippet": chunks[n - 1]["text"][:300]} for n in cited
    ]}`,
          },
          "The router wraps these dicts as SSE `data:` lines, exactly like the Day 4 streaming chat.",
        ],
      },
      {
        h: "Indexing without blocking",
        blocks: [
          "Indexing a 100-page PDF takes seconds to minutes. Return `202 Accepted` with `status: processing`, index in a `BackgroundTask` for now (note in the README that production would use a queue), and have the UI poll `GET /documents` until the status is `ready` or `failed`.",
          {
            warn: "Validate uploads: allow only PDFs (check the content type and the `%PDF` magic bytes), cap the file size (e.g. 20 MB), and store files with generated names, never the user's filename as a path.",
          },
        ],
      },
      {
        h: "Definition of done",
        blocks: [
          {
            list: [
              "Upload 3 PDFs, ask 10 questions, and at least 7 answers are correct with valid citations.",
              "Unanswerable questions get the fallback sentence.",
              "User A can't retrieve user B's chunks (write a test).",
              "`eval/questions.jsonl` has 20 question → expected source/page pairs (you'll use it on Day 11).",
              "Commit and push. README: architecture diagram and the list of what's next (framework, hybrid search, evals).",
            ],
          },
        ],
      },
    ],
    revise: [
      "Upload → 202 + background indexing → status polling.",
      "Chat: condense → retrieve (owner filter) → threshold fallback → stream tokens → final sources event with validated citations.",
      "Validate uploads (type, magic bytes, size) and isolate users in every query.",
      "Start an eval file now: question + expected source/page.",
    ],
    practice: [
      "Add a \"Delete document\" endpoint that also deletes its chunks from the vector store.",
    ],
  },
};

// Append deeper sections (d06-deep.js) to the original lessons.
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
  "rag-why": ragWhy,
  loading: deepen(base.loading, deepLoading),
  chunking: deepen(base.chunking, deepChunking),
  pipeline: deepen(base.pipeline, deepPipeline),
  grounding,
  citations: deepen(base.citations, deepCitations),
  history: deepen(base.history, deepHistory),
  "rag-failures": ragFailures,
  "chunk-lab": chunkLab,
  "rag-tests": ragTests,
  "docchat-v1": base["docchat-v1"],
};
