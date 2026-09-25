// Day 6: extra depth appended to the original lessons in d06.js (loading, chunking, pipeline, citations, history).

export const deepLoading = {
  minutes: 30,
  sections: [
    {
      h: "Why PDFs are hard: a peek inside",
      blocks: [
        "A PDF page is a list of drawing instructions: \"put glyph 'R' at (72, 700) in font F1, 11pt\". There are no paragraphs, no reading order and no tables, only positioned characters and lines. Parsers reconstruct words and lines from positions, which is why two-column layouts get interleaved, table cells run together, and headers and footers appear in the middle of text.",
        {
          table: {
            head: ["Document type", "What goes wrong", "Approach"],
            rows: [
              ["Digital, single column", "Little; hyphenation and headers/footers", "pypdf or PyMuPDF + cleaning"],
              ["Two-column research papers", "Columns interleaved line by line", "Layout-aware parsers (PyMuPDF blocks, Docling, Unstructured)"],
              ["Tables (rate cards, fee structures)", "Cells flattened into a stream of numbers", "pdfplumber `extract_tables()`, Docling, or a vision model"],
              ["Scanned documents, photos", "No text layer at all", "OCR (Tesseract, cloud OCR) or a multimodal model"],
              ["Forms and invoices", "Key–value pairs lose their pairing", "Document AI services or vision models with a schema (Days 4–5)"],
              ["Indian-language PDFs", "Broken glyph mapping for Devanagari and other scripts in some PDFs", "Check extracted text; OCR with Indic language packs or a vision model if garbled"],
            ],
          },
        },
      ],
    },
    {
      h: "Detect scanned pages automatically",
      blocks: [
        {
          lang: "python",
          code: `from pypdf import PdfReader

def find_scanned_pages(path: str, min_chars: int = 30) -> list[int]:
    """Pages with (almost) no extractable text are probably images: send them to OCR."""
    reader = PdfReader(path)
    return [i for i, page in enumerate(reader.pages, start=1)
            if len((page.extract_text() or "").strip()) < min_chars]`,
        },
        "Route only those pages to OCR or a vision model, since those are slower and costlier than text extraction.",
      ],
    },
    {
      h: "Tables: extract them as structure",
      blocks: [
        {
          lang: "python",
          code: `# uv add pdfplumber
import pdfplumber

def table_chunks(path: str) -> list[dict]:
    chunks = []
    with pdfplumber.open(path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            for t_no, table in enumerate(page.extract_tables()):
                header, *rows = table
                md = "| " + " | ".join(h or "" for h in header) + " |\\n"
                md += "|" + "---|" * len(header) + "\\n"
                md += "\\n".join("| " + " | ".join(c or "" for c in row) + " |" for row in rows)
                chunks.append({"text": md, "page": page_no, "kind": "table", "id": f"p{page_no}-t{t_no}"})
    return chunks`,
          caption: "Keep each table as its own chunk (with its caption or heading) so rows stay together.",
        },
        {
          list: [
            "Large tables: repeat the header row in each chunk, or write each row as a sentence (\"Plan: Gold; Price: ₹999; Validity: 84 days\").",
            "For retrieval, an LLM-written summary of the table (\"Prepaid plan prices and validity by plan name\") often matches questions better; send the table itself to the answer step.",
          ],
        },
      ],
    },
    {
      h: "Modern parsing tools",
      blocks: [
        {
          table: {
            head: ["Tool", "What it does well"],
            rows: [
              ["PyMuPDF (`fitz`)", "Very fast text, blocks with coordinates, page images; AGPL licence"],
              ["pdfplumber", "Precise positions and table extraction for digital PDFs"],
              ["Docling (IBM, open source)", "Layout analysis, tables, reading order, exports to Markdown/JSON"],
              ["Unstructured", "Many file types → typed elements (Title, NarrativeText, Table)"],
              ["MarkItDown (Microsoft)", "Converts PDFs, Office files and more to Markdown"],
              ["LlamaParse, cloud document AI (AWS Textract, Google, Azure)", "Hosted, strong on complex layouts, forms and scans; paid"],
              ["Vision LLMs", "Read page images directly: charts, handwriting, messy layouts; highest cost per page"],
            ],
          },
        },
        {
          tip: "Evaluate parsers on 10 of *your* ugliest documents by reading the output. The best parser for bank statements may not be the best for research papers.",
        },
      ],
    },
  ],
  revise: [
    "PDFs are positioned glyphs, not paragraphs: columns, tables and headers break naive extraction.",
    "Detect scanned pages by low extracted-text length and route only them to OCR or vision models.",
    "Extract tables as Markdown/rows (pdfplumber, Docling); keep each table whole; consider an LLM summary for retrieval.",
    "Tools: PyMuPDF, pdfplumber, Docling, Unstructured, MarkItDown, LlamaParse/cloud document AI, vision LLMs. Choose by reading output on your documents.",
  ],
  interview: [
    {
      q: "Your RAG system gets many questions wrong about tables in PDFs. What do you do?",
      a: "Check the parsed text first: tables are usually flattened into a stream of numbers. Use a table-aware parser (pdfplumber, Docling, a document AI service or a vision model) to extract tables as Markdown or row-wise text, keep each table as one chunk with its caption and heading, repeat headers in large split tables, optionally embed an LLM summary of each table for retrieval, and add table questions to the eval set.",
    },
  ],
};

export const deepChunking = {
  minutes: 30,
  sections: [
    {
      h: "Semantic chunking, in code",
      blocks: [
        {
          lang: "python",
          code: `import re
import numpy as np

def semantic_chunks(text: str, embed, threshold: float = 0.25, max_sentences: int = 8) -> list[str]:
    """Start a new chunk where consecutive sentences stop being similar (a topic shift)."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\\s+", text) if s.strip()]
    if not sentences:
        return []
    vecs = np.array(embed(sentences))                  # normalised sentence embeddings
    chunks, current = [], [sentences[0]]
    for i in range(1, len(sentences)):
        similarity = float(vecs[i] @ vecs[i - 1])
        if similarity < threshold or len(current) >= max_sentences:
            chunks.append(" ".join(current))
            current = []
        current.append(sentences[i])
    chunks.append(" ".join(current))
    return chunks`,
        },
        "It costs one embedding call per sentence at indexing time and the threshold needs tuning per model. It can help long, unstructured text (transcripts, essays); for documents with headings, structure-aware chunking is usually as good and much cheaper. Decide with the chunking lab.",
      ],
    },
    {
      h: "Contextual chunk text",
      blocks: [
        "A chunk like \"It must be submitted within 7 days\" is meaningless alone. Add context to the **text you embed** (and optionally to what the LLM sees):",
        {
          table: {
            head: ["Technique", "What's added", "Cost"],
            rows: [
              ["Title + heading path", "\"HR Policy 2026 > Leave > Maternity\"", "Free"],
              ["Neighbouring sentences (window)", "The previous and next sentence", "Free; a bit more text"],
              ["LLM-written context (Contextual Retrieval)", "One or two sentences situating the chunk in the whole document", "One LLM call per chunk at indexing time (prompt caching makes it cheap)"],
            ],
          },
        },
        "Anthropic reported that adding LLM-written context to chunks (\"Contextual Retrieval\"), especially combined with BM25 and reranking, substantially reduced retrieval failures. You'll try it on Day 10.",
      ],
    },
    {
      h: "Chunking special content",
      blocks: [
        {
          table: {
            head: ["Content", "Chunk it by"],
            rows: [
              ["FAQs", "One question + answer per chunk"],
              ["Policies, manuals, docs with headings", "Sections by heading, split further only if too long; heading path as metadata"],
              ["Tables", "Whole table (or row groups with repeated headers)"],
              ["Code", "Functions or classes, with file path and signature"],
              ["Chat transcripts, call logs", "Conversation turns grouped by topic or time window"],
              ["Legal contracts", "Clauses and sub-clauses, keeping numbering (\"Clause 7.2\")"],
              ["Hindi and other Indic text", "Sentence boundaries include `।`; measure chunk size in tokens, not characters (Indic scripts use more tokens)"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Semantic chunking: split at similarity drops between consecutive sentences; costs embeddings, needs tuning; structure-aware is usually enough.",
    "Contextual chunk text: title/heading path (free), neighbour window, or LLM-written context (Contextual Retrieval).",
    "Chunk by content type: FAQ pairs, sections, whole tables, functions, transcript topics, contract clauses; for Indic text split on `।` and count tokens.",
  ],
  interview: [
    {
      q: "What is semantic chunking, and is it worth it?",
      a: "Splitting text where the meaning shifts, detected by drops in embedding similarity between consecutive sentences, instead of at fixed sizes. It can help long unstructured text, but costs extra embeddings and tuning, and for documents with clear headings structure-aware chunking is usually as good. I'd compare it with recursive and heading-based chunking on a retrieval eval set before adopting it.",
    },
  ],
};

export const deepPipeline = {
  minutes: 25,
  sections: [
    {
      h: "Diverse results with MMR",
      blocks: [
        "Top-k by similarity often returns near-duplicates (the same paragraph from two versions of a document), wasting context. **Maximal Marginal Relevance (MMR)** picks chunks that are relevant *and* different from those already chosen.",
        {
          lang: "python",
          code: `import numpy as np

def mmr(query_vec: np.ndarray, doc_vecs: np.ndarray, k: int = 5, lambda_: float = 0.7) -> list[int]:
    """Maximal Marginal Relevance: pick relevant chunks that aren't near-duplicates of ones already picked."""
    relevance = doc_vecs @ query_vec
    selected: list[int] = []
    candidates = list(range(len(doc_vecs)))
    while candidates and len(selected) < k:
        if selected:
            redundancy = np.max(doc_vecs[candidates] @ doc_vecs[selected].T, axis=1)
        else:
            redundancy = np.zeros(len(candidates))
        scores = lambda_ * relevance[candidates] - (1 - lambda_) * redundancy
        best = candidates[int(np.argmax(scores))]
        selected.append(best)
        candidates.remove(best)
    return selected`,
          caption: "Run it on the top 20–50 candidates from the vector search, not the whole index. lambda_ = 1 is plain similarity; lower values favour diversity.",
        },
      ],
    },
    {
      h: "An async pipeline with parallel steps",
      blocks: [
        "In a FastAPI app, keep the pipeline async and run independent steps concurrently:",
        {
          lang: "python",
          code: `import asyncio

async def answer(question: str, user, history: list[dict]) -> dict:
    query = await condense(history, question)                       # small, fast model
    vec_hits, kw_hits = await asyncio.gather(                        # independent: run together
        vector_search(query, owner_id=user.id, k=20),
        keyword_search(query, owner_id=user.id, k=20),               # Day 10: hybrid search
    )
    chunks = select_for_prompt(merge(vec_hits, kw_hits), token_budget=3000)
    if not chunks:
        return {"answer": FALLBACK, "sources": []}
    return await generate(question, chunks, history)`,
        },
      ],
    },
  ],
  revise: [
    "MMR balances relevance and diversity to avoid near-duplicate chunks; run it on the top candidates.",
    "Keep the pipeline async; run independent retrievals concurrently with asyncio.gather.",
  ],
  interview: [
    {
      q: "What is MMR and when would you use it in RAG?",
      a: "Maximal Marginal Relevance selects results that are relevant to the query but dissimilar to results already selected, controlled by a lambda between relevance and diversity. It helps when the top-k contains near-duplicates (repeated boilerplate, several versions of a document), so the limited context covers more distinct information.",
    },
  ],
};

export const deepCitations = {
  minutes: 20,
  sections: [
    {
      h: "Verifying quotes in code",
      blocks: [
        {
          lang: "python",
          code: `def normalise(s: str) -> str:
    return " ".join(s.split()).lower()

def quote_supported(quote: str, chunk_text: str) -> bool:
    return normalise(quote) in normalise(chunk_text)

# For light paraphrases, use fuzzy matching:
# from rapidfuzz import fuzz
# fuzz.partial_ratio(normalise(quote), normalise(chunk_text)) >= 90`,
        },
      ],
    },
    {
      h: "Provider-native citations (Claude)",
      blocks: [
        "Anthropic's API can cite source documents for you: pass documents as `document` content blocks with citations enabled, and text blocks in the response carry a list of citations with the exact cited text and location (page numbers for PDFs, character ranges for plain text).",
        {
          lang: "python",
          code: `import anthropic

client = anthropic.Anthropic()
docs = [{"type": "document", "title": c["title"],
         "source": {"type": "text", "media_type": "text/plain", "data": c["text"]},
         "citations": {"enabled": True}} for c in chunks]

r = client.messages.create(
    model="claude-opus-5", max_tokens=16000,
    messages=[{"role": "user", "content": [*docs, {"type": "text", "text": question}]}],
)
for block in r.content:
    if block.type == "text":
        print(block.text)
        for cit in block.citations or []:
            print("   ↳", cit.document_title, "|", cit.cited_text[:80])`,
          caption: "Citations are exact spans from your documents, so there's nothing to verify, at the cost of provider lock-in.",
        },
      ],
    },
  ],
  revise: [
    "Verify quotes by normalised substring match (or fuzzy match with rapidfuzz).",
    "Claude's document blocks with `citations: {enabled: true}` return exact cited spans in text blocks.",
  ],
  interview: [],
};

export const deepHistory = {
  minutes: 15,
  sections: [
    {
      h: "Test your condensation step",
      blocks: [
        "Query condensation silently fails more often than people expect. Give it its own mini test set:",
        {
          lang: "python",
          code: `CASES = [
    ([("user", "How many casual leaves do employees get?"), ("assistant", "12 per year [1].")],
     "What about interns?", ["intern", "casual leave"]),
    ([("user", "Is COD available in Pune?"), ("assistant", "Yes, below ₹5,000 [2].")],
     "and in Leh?", ["cash on delivery", "leh"]),
]

def test_condense():
    for turns, follow_up, must_contain in CASES:
        history = [{"role": r, "content": c} for r, c in turns]
        rewritten = condense(history, follow_up).lower()
        missing = [w for w in must_contain if w not in rewritten]
        assert not missing, f"{follow_up!r} → {rewritten!r} is missing {missing}"`,
        },
        {
          list: [
            "Also test that already-standalone questions come back unchanged.",
            "When a follow-up is truly ambiguous (\"what about the other one?\"), it's better to ask a clarifying question than to guess.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Unit-test condensation with (history, follow-up, must-contain words) cases; ask clarifying questions when follow-ups are ambiguous.",
  ],
  interview: [],
};
