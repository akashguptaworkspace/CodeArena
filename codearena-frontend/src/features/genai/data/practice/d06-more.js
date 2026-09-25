// Day 6 practice, part 2: parsing, chunking, context selection, grounding, debugging.
// Merged into d06.js. Every solution was run (LLM ones against a fake client).

export const parseGroup = {
  title: "Parsing deeper",
  exercises: [
    {
      id: "scan-detect",
      title: "Find pages that need OCR",
      level: "Easy",
      task: [
        "Write `page_report(path)` that prints, for every page of a PDF, how many characters of text it has and whether it needs OCR (fewer than 30 characters). Run it on your own PDFs; with no argument, generate a 2-page PDF with no text layer to test it.",
        "Expected on the generated file: both pages show `0 chars → OCR needed`.",
      ],
      hint: "`PdfReader(path).pages` and `page.extract_text()`; `PdfWriter().add_blank_page(...)` makes a test file.",
      solution: `import sys
from pypdf import PdfReader, PdfWriter


def page_report(path: str, min_chars: int = 30) -> list[tuple[int, int, str]]:
    report = []
    for i, page in enumerate(PdfReader(path).pages, start=1):
        chars = len((page.extract_text() or "").strip())
        report.append((i, chars, "OCR needed" if chars < min_chars else "text ok"))
    return report


if len(sys.argv) > 1:
    path = sys.argv[1]
else:                                            # no file given: make a 2-page PDF with no text layer
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    writer.add_blank_page(width=595, height=842)
    writer.write("scanned_like.pdf")
    path = "scanned_like.pdf"

for page, chars, verdict in page_report(path):
    print(f"page {page:>3}: {chars:>5} chars → {verdict}")`,
      explanation: [
        "Scanned PDFs are images, so text extraction returns nothing and those pages would silently vanish from your index.",
        "Checking per page lets you send only the scanned pages to (slower, costlier) OCR or a vision model.",
        "Log this per document at ingestion: \"12 of 40 pages needed OCR\" is valuable operational data.",
      ],
      concepts: [
        ["Text layer", "The extractable characters in a PDF; scans don't have one."],
        ["OCR", "Optical character recognition: reading text from images."],
      ],
    },
    {
      id: "table-markdown",
      title: "Tables into self-contained Markdown chunks",
      level: "Medium",
      task: [
        "Given a table as a list of rows (what pdfplumber's `extract_tables()` returns, with `None` for empty cells), write `table_to_chunks(rows, caption, rows_per_chunk)` that produces Markdown chunks, each repeating the caption and the header row.",
      ],
      hint: "Replace `None` with an empty string; the Markdown separator row is `|---|---|...`.",
      solution: `def table_to_chunks(rows: list[list[str | None]], caption: str, rows_per_chunk: int = 3) -> list[str]:
    """Turn an extracted table (list of rows, first row = header) into Markdown chunks,
    repeating the caption and header in every chunk so each one makes sense alone."""
    header, *body = [[(cell or "").strip() for cell in row] for row in rows]
    head = "| " + " | ".join(header) + " |\\n|" + "---|" * len(header)
    chunks = []
    for i in range(0, len(body), rows_per_chunk):
        lines = ["| " + " | ".join(r) + " |" for r in body[i:i + rows_per_chunk]]
        chunks.append(f"{caption}\\n\\n{head}\\n" + "\\n".join(lines))
    return chunks


rows = [  # what pdfplumber's page.extract_tables() gives you (None for empty cells)
    ["Plan", "Price (₹)", "Validity", "Data/day"],
    ["Basic", "199", "28 days", "1.5 GB"],
    ["Plus", "299", "28 days", "2 GB"],
    ["Pro", "719", "84 days", "2 GB"],
    ["Annual", "2999", "365 days", "2.5 GB"],
    ["Data add-on", "61", None, "6 GB total"],
]
for chunk in table_to_chunks(rows, "Table 3: Prepaid mobile plans (effective April 2026)"):
    print(chunk, end="\\n\\n")`,
      explanation: [
        "Without the header, a chunk like `| Pro | 719 | 84 days |` is meaningless; repeating it makes every chunk answerable alone.",
        "The caption carries the table's topic and date into the embedding, so \"What does the annual plan cost?\" can match it.",
        "LLMs read Markdown tables well, so the same chunk works for retrieval and for answering.",
      ],
      concepts: [
        ["Markdown table", "A text table using `|` separators and a `---` header row."],
        ["Self-contained chunk", "A chunk that makes sense without its neighbours."],
      ],
    },
  ],
};

export const chunkGroup2 = {
  title: "Chunking deeper",
  exercises: [
    {
      id: "token-vs-char",
      title: "Why chunk by tokens, not characters",
      level: "Easy",
      task: [
        "Split an English paragraph and its Hindi translation into 500-character chunks and into 120-token chunks, and print the token range per chunk for each method.",
        "Expected: 500-character Hindi chunks contain roughly twice as many tokens as English ones, while token-based chunks are consistent.",
      ],
      hint: "Count with `len(enc.encode(chunk))` using tiktoken's `o200k_base`.",
      solution: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")
english = "Employees receive twelve days of casual leave every calendar year. " * 20
hindi = "कर्मचारियों को हर कैलेंडर वर्ष में बारह दिन की आकस्मिक छुट्टी मिलती है। " * 20


def char_chunks(text: str, size: int = 500) -> list[str]:
    return [text[i:i + size] for i in range(0, len(text), size)]


def token_chunks(text: str, size: int = 120) -> list[str]:
    ids = enc.encode(text)
    return [enc.decode(ids[i:i + size]) for i in range(0, len(ids), size)]


for name, text in [("English", english), ("Hindi", hindi)]:
    by_chars = [len(enc.encode(c)) for c in char_chunks(text)]
    by_tokens = [len(enc.encode(c)) for c in token_chunks(text)]
    print(f"{name:<8} 500-char chunks → tokens {min(by_chars)}–{max(by_chars)} | "
          f"120-token chunks → tokens {min(by_tokens)}–{max(by_tokens)}")`,
      explanation: [
        "Devanagari and other Indic scripts use more tokens per character, so character-based chunks blow token budgets unpredictably.",
        "Token-based sizes keep chunk costs, context budgets and embedding limits predictable across languages.",
      ],
      concepts: [
        ["Token budget", "A size limit measured in model tokens."],
        ["`o200k_base`", "The tiktoken encoding used by recent OpenAI models."],
      ],
    },
    {
      id: "contextual-prefix",
      title: "Does adding headings help retrieval?",
      level: "Medium",
      task: [
        "Five short handbook sections have bodies that don't name their topic (\"10 paid days per year...\"). Measure top-1 retrieval hit rate for six questions with plain chunk bodies, then with `title + heading path` prefixed to each chunk.",
      ],
      hint: "Build two lists of chunk texts and reuse one `hit_rate(chunk_texts)` function.",
      solution: `import numpy as np
from llm import embed

TITLE = "Acme India Employee Handbook"
SECTIONS = [
    ("Leave > Casual leave", "Full-time employees get 12 days per year. Interns get 6 days."),
    ("Leave > Sick leave", "10 paid days per year. A certificate is needed after 2 days."),
    ("Reimbursement > Travel", "Hotels up to ₹5,000 per night in metros."),
    ("Reimbursement > Internet", "₹1,000 per month on submission of the bill."),
    ("Exit > Notice period", "60 days in the first year, 90 days after that."),
]
QUESTIONS = [("casual leave for interns", 0), ("how many sick days", 1), ("hotel reimbursement limit", 2),
             ("wifi bill claim", 3), ("notice period duration", 4), ("leave for being unwell", 1)]


def hit_rate(chunk_texts: list[str]) -> float:
    c = np.array(embed(chunk_texts))
    q = np.array(embed([question for question, _ in QUESTIONS]))
    top1 = (q @ c.T).argmax(axis=1)
    return float(np.mean([t == want for t, (_, want) in zip(top1, QUESTIONS)]))


plain = [body for _, body in SECTIONS]
with_context = [f"{TITLE}\\n{path}\\n\\n{body}" for path, body in SECTIONS]
print(f"top-1 hit rate, plain chunks:         {hit_rate(plain):.2f}")
print(f"top-1 hit rate, title + heading path: {hit_rate(with_context):.2f}")`,
      explanation: [
        "A body like \"10 paid days per year\" never says \"sick\"; the heading path adds the missing topic words and meaning.",
        "It costs nothing at query time and a few tokens at indexing time: one of the highest-value, lowest-effort RAG improvements.",
        "LLM-written context per chunk (Contextual Retrieval) goes further, at an indexing cost.",
      ],
      concepts: [
        ["Heading path", "The chain of headings above a chunk, e.g. Leave > Sick leave."],
        ["Contextual chunk text", "Chunk text enriched with information about where it sits in the document."],
      ],
    },
    {
      id: "semantic-chunker",
      title: "Chunk a call transcript by topic",
      level: "Medium",
      task: [
        "A customer call covers three topics (refund, delivery address, login). Implement `semantic_chunks(text, threshold)` that starts a new chunk when consecutive sentences' embeddings become dissimilar, and compare thresholds 0.1 and 0.3.",
      ],
      hint: "Split sentences with a regex on `.`, `!`, `?` and `।`; compare `vecs[i] @ vecs[i - 1]` with the threshold.",
      solution: `import re
import numpy as np
from llm import embed


def semantic_chunks(text: str, threshold: float = 0.3, max_sentences: int = 6) -> list[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?।])\\s+", text) if s.strip()]
    if not sentences:
        return []
    vecs = np.array(embed(sentences))
    chunks, current = [], [sentences[0]]
    for i in range(1, len(sentences)):
        if float(vecs[i] @ vecs[i - 1]) < threshold or len(current) >= max_sentences:
            chunks.append(" ".join(current))
            current = []
        current.append(sentences[i])
    chunks.append(" ".join(current))
    return chunks


TRANSCRIPT = ("Hi, I'm calling about my refund. The refund for order 4521 hasn't arrived. "
              "It has been ten days since the refund was approved. "
              "Also, my delivery address needs to change. The new delivery address is in Pune. "
              "Can the delivery come on Saturday? "
              "One more thing, the app login keeps failing. The login OTP never arrives.")
for threshold in (0.1, 0.3):
    print(f"threshold {threshold}:")
    for c in semantic_chunks(TRANSCRIPT, threshold):
        print("  -", c)`,
      explanation: [
        "Transcripts have no headings, so topic shifts are the natural boundaries; that's where semantic chunking can beat fixed sizes.",
        "The threshold controls granularity: too low merges topics, too high splits every sentence. Tune it on your data and model.",
        "It costs one embedding per sentence at indexing time; measure whether retrieval actually improves before adopting it.",
      ],
      concepts: [
        ["Semantic chunking", "Splitting where meaning shifts, detected with embeddings."],
        ["Threshold tuning", "Choosing a cut-off by testing on real data."],
      ],
    },
  ],
};

export const contextGroup = {
  title: "Choosing what goes into the prompt",
  exercises: [
    {
      id: "mmr-select",
      title: "Remove near-duplicates with MMR",
      level: "Medium",
      task: [
        "Six candidate chunks include three copies of the same refund sentence. Show the plain top-3 by similarity, then the top-3 chosen by MMR with lambda 0.5.",
        "Expected: plain top-3 is three copies of the same fact; MMR returns three different facts about refunds.",
      ],
      hint: "MMR score = λ × relevance − (1 − λ) × (max similarity to already-chosen chunks).",
      solution: `import numpy as np
from llm import embed

QUESTION = "What is the refund timeline?"
CANDIDATES = [
    "Refunds are processed within 7 working days of receiving the item.",
    "Refunds are processed within 7 working days of receiving the item. (2025 version)",
    "Refunds are processed within 7 working days of receiving the item. (FAQ copy)",
    "UPI refunds reach your bank 1-2 days after processing.",
    "Card refunds may take up to 10 days to appear on your statement.",
    "Delivery to Pune takes 3 days.",
]


def mmr(q: np.ndarray, docs: np.ndarray, k: int, lambda_: float) -> list[int]:
    relevance, chosen, pool = docs @ q, [], list(range(len(docs)))
    while pool and len(chosen) < k:
        redundancy = np.max(docs[pool] @ docs[chosen].T, axis=1) if chosen else np.zeros(len(pool))
        best = pool[int(np.argmax(lambda_ * relevance[pool] - (1 - lambda_) * redundancy))]
        chosen.append(best)
        pool.remove(best)
    return chosen


q = np.array(embed([QUESTION])[0])
d = np.array(embed(CANDIDATES))
print("plain top-3:")
for i in np.argsort(-(d @ q))[:3]:
    print("  ", CANDIDATES[i])
print("MMR top-3 (lambda 0.5):")
for i in mmr(q, d, k=3, lambda_=0.5):
    print("  ", CANDIDATES[i])`,
      explanation: [
        "Duplicates waste context and can make one source look more authoritative than it is.",
        "MMR keeps relevance but penalises redundancy, so the prompt covers more distinct information (UPI and card timelines).",
        "Deduplicating at ingestion (hashing, near-duplicate detection) removes the problem at the source.",
      ],
      concepts: [
        ["MMR", "Maximal Marginal Relevance: relevance minus redundancy."],
        ["λ (lambda)", "The balance between relevance (1.0) and diversity (lower)."],
      ],
    },
    {
      id: "token-budget-context",
      title: "Fit chunks into a token budget",
      level: "Easy",
      task: [
        "Given best-first retrieval hits, select chunks until a 120-token budget is used (skipping any chunk that doesn't fit), then sort the chosen chunks by document and position so adjacent text reads naturally.",
        "Expected: the long FAQ chunk is skipped, and the three HR chunks come out in positions 6, 7, 8.",
      ],
      hint: "Keep a running `used` token count; `continue` past chunks that would exceed the budget.",
      solution: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")


def select_for_prompt(hits: list[dict], budget: int) -> list[dict]:
    """hits are sorted best-first. Take them in order while they fit, then restore reading order
    for chunks from the same document so the LLM reads adjacent text naturally."""
    chosen, used = [], 0
    for h in hits:
        cost = len(enc.encode(h["text"]))
        if used + cost > budget:
            continue                                    # skip, a smaller later chunk may still fit
        chosen.append(h)
        used += cost
    return sorted(chosen, key=lambda h: (h["doc"], h["position"]))


hits = [
    {"doc": "hr", "position": 7, "score": 0.82, "text": "Interns receive 6 days of casual leave. " * 3},
    {"doc": "hr", "position": 6, "score": 0.79, "text": "Full-time employees receive 12 days of casual leave. " * 3},
    {"doc": "faq", "position": 2, "score": 0.71, "text": "Casual leave cannot be encashed. " * 30},
    {"doc": "hr", "position": 8, "score": 0.66, "text": "Leave requests need 7 days notice. " * 2},
]
for h in select_for_prompt(hits, budget=120):
    print(h["doc"], h["position"], h["score"], len(enc.encode(h["text"])), "tokens")`,
      explanation: [
        "A fixed context budget keeps cost and latency predictable regardless of how long retrieved chunks are.",
        "Skipping (not stopping at) an oversized chunk lets smaller relevant chunks still fit.",
        "Restoring document order for adjacent chunks helps the model read them as continuous text.",
      ],
      concepts: [
        ["Context budget", "The maximum tokens you allow for retrieved sources."],
        ["Greedy packing", "Taking items in priority order while they fit."],
      ],
    },
  ],
};

export const groundGroup = {
  title: "Grounding and verification",
  exercises: [
    {
      id: "conflict-rule",
      title: "Old and new versions of a policy",
      level: "Medium",
      task: [
        "Chunks include a 2024 and a 2026 version of the intern leave policy. First, filter with metadata to keep only the latest effective version of each document (ignoring future-dated ones). Then compare the model's answer with filtered chunks and with all chunks under a prompt that tells it to prefer the latest effective date.",
      ],
      hint: "Group by `doc`, find the maximum `effective` date not after today, and keep chunks with that date.",
      solution: `from datetime import date
from llm import chat

CHUNKS = [
    {"text": "Interns receive 4 days of casual leave.", "doc": "hr-policy", "version": "2024", "effective": "2024-04-01"},
    {"text": "Interns receive 6 days of casual leave.", "doc": "hr-policy", "version": "2026", "effective": "2026-04-01"},
    {"text": "Full-time staff receive 12 days of casual leave.", "doc": "hr-policy", "version": "2026", "effective": "2026-04-01"},
]


def latest_versions(chunks: list[dict], today: date) -> list[dict]:
    """Keep only the newest effective version of each document (and nothing from the future)."""
    live = [c for c in chunks if date.fromisoformat(c["effective"]) <= today]
    newest = {}
    for c in live:
        newest[c["doc"]] = max(newest.get(c["doc"], c["effective"]), c["effective"])
    return [c for c in live if c["effective"] == newest[c["doc"]]]


SYSTEM = """Answer only from the documents. Cite like [1].
If documents conflict, prefer the latest effective date and mention the conflict."""


def ask(chunks: list[dict], question: str) -> str:
    docs = "\\n".join(f'<document index="{i}" effective="{c["effective"]}">{c["text"]}</document>'
                     for i, c in enumerate(chunks, 1))
    return chat(f"<documents>\\n{docs}\\n</documents>\\n\\nQuestion: {question}", system=SYSTEM, temperature=0)


question = "How many casual leaves do interns get?"
print("filtered by metadata:", [c["text"] for c in latest_versions(CHUNKS, date(2026, 9, 1))])
print("answer (filtered):   ", ask(latest_versions(CHUNKS, date(2026, 9, 1)), question))
print("answer (unfiltered): ", ask(CHUNKS, question))`,
      explanation: [
        "Filtering by metadata is deterministic and cheap: the outdated chunk never reaches the model.",
        "The prompt rule is a safety net for conflicts you couldn't filter, such as undated documents.",
        "Store `version` and `effective` dates at ingestion; without them, neither fix is possible.",
      ],
      concepts: [
        ["Effective date", "The date a document version starts to apply."],
        ["Metadata filtering", "Excluding chunks by structured fields before or during retrieval."],
      ],
    },
    {
      id: "quote-verify",
      title: "Verify every claim's quote",
      level: "Medium",
      task: [
        "Ask for a structured answer where every claim has a source index and an exact supporting quote. Verify each quote appears (whitespace- and case-normalised) in the cited chunk, and mark unsupported claims.",
      ],
      hint: "Compare `\" \".join(s.split()).lower()` of the quote and the chunk text.",
      solution: `from pydantic import BaseModel, Field
from llm import client, CHAT_MODEL

CHUNKS = [
    "Interns receive 6 days of casual leave for a twelve-month internship. Casual leave cannot be carried forward.",
    "Full-time employees receive 12 days of casual leave per calendar year.",
]


class Claim(BaseModel):
    text: str
    source: int = Field(description="Index of the supporting document, starting at 1")
    quote: str = Field(description="Exact words copied from that document")


class GroundedAnswer(BaseModel):
    answerable: bool
    claims: list[Claim]


def normalise(s: str) -> str:
    return " ".join(s.split()).lower()


def verify(answer: GroundedAnswer, chunks: list[str]) -> list[tuple[Claim, bool]]:
    results = []
    for c in answer.claims:
        ok = 1 <= c.source <= len(chunks) and normalise(c.quote) in normalise(chunks[c.source - 1])
        results.append((c, ok))
    return results


docs = "\\n".join(f'<document index="{i}">{t}</document>' for i, t in enumerate(CHUNKS, 1))
r = client.chat.completions.parse(
    model=CHAT_MODEL, response_format=GroundedAnswer,
    messages=[{"role": "system", "content": "Answer only from the documents. For every claim, copy an exact supporting quote."},
              {"role": "user", "content": f"{docs}\\n\\nQuestion: How much casual leave do interns get, and can it be carried forward?"}],
)
for claim, ok in verify(r.choices[0].message.parsed, CHUNKS):
    print(f"{'✓' if ok else '✗ UNSUPPORTED'}  {claim.text}  [quote: {claim.quote!r}]")`,
      explanation: [
        "Structured claims make citations machine-checkable: an invented quote fails verification even when the answer sounds right.",
        "Unsupported claims can be dropped, regenerated or shown with a warning, depending on the product's risk.",
        "Use fuzzy matching (e.g. rapidfuzz) if the model paraphrases slightly.",
      ],
      concepts: [
        ["Faithfulness", "Whether every claim is supported by the sources."],
        ["Quote verification", "Checking cited text really exists in the source."],
      ],
    },
  ],
};

export const debugGroup = {
  title: "Debugging and testing RAG",
  exercises: [
    {
      id: "rag-trace",
      title: "Diagnose which stage failed",
      level: "Medium",
      task: [
        "Write `diagnose(question, answer_phrase, rewritten=None, prompt_k=2)` that walks the pipeline and reports the first stage that loses the answer: missing content, retrieval (never retrieved), not in context (retrieved below the prompt cut-off), or retrieval OK. Try a vague follow-up (\"What about interns?\"), the full question, and a question the documents can't answer.",
      ],
      hint: "Find which chunks contain the answer phrase first; then find the rank of the first such chunk in the retrieval results.",
      solution: `import json
import numpy as np
from llm import embed

PAGES = {
    "hr:p1": "Full-time employees receive 12 days of casual leave per year.",
    "hr:p2": "Interns receive 6 days of casual leave for a twelve month internship.",
    "hr:p3": "Hotel stays are reimbursed up to 5,000 rupees per night in metros.",
    "hr:p4": "Notice period is 60 days in the first year and 90 days after that.",
}
ids = list(PAGES)
vecs = np.array(embed([PAGES[i] for i in ids]))


def retrieve(query: str, k: int = 10) -> list[tuple[str, float]]:
    scores = vecs @ np.array(embed([query])[0])
    return [(ids[i], float(scores[i])) for i in np.argsort(-scores)[:k]]


def diagnose(question: str, answer_phrase: str, rewritten: str | None = None, prompt_k: int = 2) -> dict:
    """Walk the pipeline and report the first stage that loses the answer."""
    query = rewritten or question
    trace = {"question": question, "query": query}
    holders = [i for i in ids if answer_phrase.lower() in PAGES[i].lower()]
    if not holders:
        return trace | {"stage": "missing content: the answer isn't in the indexed data"}
    ranked = retrieve(query)
    trace["retrieved"] = [(i, round(s, 3)) for i, s in ranked]
    rank = next((r for r, (i, _) in enumerate(ranked, 1) if i in holders), None)
    trace["answer_chunk_rank"] = rank
    if rank is None:
        return trace | {"stage": "retrieval: the answer chunk was never retrieved"}
    if rank > prompt_k:
        return trace | {"stage": f"not in context: ranked {rank}, but only the top {prompt_k} reach the prompt"}
    return trace | {"stage": "retrieval OK: if the answer is still wrong, it's generation (prompt/model)"}


print(json.dumps(diagnose("What about interns?", "6 days of casual leave"), indent=2))
print(json.dumps(diagnose("How many casual leaves do interns get?", "6 days of casual leave"), indent=2))
print(json.dumps(diagnose("What is the gym membership benefit?", "gym"), indent=2))`,
      explanation: [
        "This mirrors the debugging method from the failures lesson: data → retrieval → context → generation.",
        "The vague follow-up typically ranks the answer lower than the full question, which is exactly why query condensation exists.",
        "In a real app you'd compute these facts from logged traces instead of re-running the pipeline.",
      ],
      concepts: [
        ["Trace", "A record of each pipeline step's inputs and outputs for one request."],
        ["Failure point", "The first stage where the correct information is lost."],
      ],
    },
    {
      id: "condense-tests",
      title: "Test your query condensation",
      level: "Easy",
      task: [
        "Write three test cases for `condense(history, follow_up)`: two follow-ups whose rewrites must contain specific words (\"intern\", \"casual leave\"; \"leh\"), and one standalone question that must come back essentially unchanged. Print PASS/FAIL per case.",
      ],
      hint: "Lower-case the rewritten query and check each required word is a substring.",
      solution: `from llm import chat

CONDENSE = """Rewrite the user's last message as a standalone search query, using the conversation
for context. Return only the query. If it's already standalone, return it unchanged."""


def condense(history: list[tuple[str, str]], question: str) -> str:
    if not history:
        return question
    convo = "\\n".join(f"{role}: {text}" for role, text in history[-6:])
    return chat(f"<conversation>\\n{convo}\\n</conversation>\\n\\nLast message: {question}",
                system=CONDENSE, temperature=0).strip()


CASES = [
    ([("user", "How many casual leaves do employees get?"), ("assistant", "12 per year [1].")],
     "What about interns?", ["intern", "casual leave"]),
    ([("user", "Is cash on delivery available in Pune?"), ("assistant", "Yes, below ₹5,000 [2].")],
     "and in Leh?", ["leh"]),
    ([], "What is the notice period after one year?", ["notice period"]),
]

passed = 0
for history, follow_up, must_contain in CASES:
    rewritten = condense(history, follow_up)
    missing = [w for w in must_contain if w not in rewritten.lower()]
    passed += not missing
    print(f"{'PASS' if not missing else 'FAIL'}  {follow_up!r} → {rewritten!r}" + (f"  missing {missing}" if missing else ""))
print(f"{passed}/{len(CASES)} passed")`,
      explanation: [
        "Condensation fails silently: the rewrite looks plausible but drops the key entity, and retrieval quietly degrades.",
        "Must-contain checks are simple, robust tests for a non-deterministic step.",
        "Add every real follow-up failure from production as a new case.",
      ],
      concepts: [
        ["Query condensation", "Rewriting a follow-up into a standalone search query."],
        ["Regression test", "A test that keeps a fixed bug from coming back."],
      ],
    },
  ],
};
