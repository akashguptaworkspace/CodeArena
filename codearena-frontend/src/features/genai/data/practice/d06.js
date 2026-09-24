// Day 6 practice: RAG from scratch. Shape: see ./index.js
export default {
  intro:
    "Nine exercises that build a complete RAG pipeline piece by piece, with no framework: load, clean, chunk, retrieve, answer with citations, refuse when unsure, handle follow-ups, and serve it over an API. Each piece is small enough to understand fully.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day06/docs && cd ~/genai-practice/day06
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken pypdf "fastapi[standard]"
cp ../day03/llm.py ../day03/.env .`,
    },
    "Create these three small policy files in `docs/`. They're your test corpus (you can add real PDFs later).",
    {
      lang: "markdown",
      code: `<!-- docs/leave_policy.md -->
# Leave Policy 2026
## Casual leave
Full-time employees get 12 casual leaves per year. Interns get 6 casual leaves per year.
Casual leave must be applied at least 2 days in advance, except in emergencies.
## Sick leave
Employees get 10 paid sick leaves per year. A medical certificate is required for more than 2 consecutive days.
## Maternity leave
Eligible employees get 26 weeks of paid maternity leave after 80 days of service.`,
    },
    {
      lang: "markdown",
      code: `<!-- docs/travel_policy.md -->
# Travel Policy 2026
## Domestic travel
Economy class flights are allowed for trips over 500 km. Trains (3AC or above) for shorter trips.
## Per diem
Per diem for metro cities is ₹2,500 per day and ₹1,800 per day for other cities.
## Claims
Submit travel claims within 15 days of return with original receipts.`,
    },
    {
      lang: "markdown",
      code: `<!-- docs/it_policy.md -->
# IT Policy
## Laptops
New joiners receive a laptop on day one. Lost laptops must be reported to IT within 24 hours.
## Passwords
Passwords must be at least 12 characters and changed every 90 days. Use the company password manager.
## VPN
VPN is mandatory when accessing internal systems from outside the office.`,
    },
  ],
  groups: [
    {
      title: "Loading and cleaning",
      exercises: [
        {
          id: "load-pdf",
          title: "Extract text from a PDF, page by page",
          level: "Easy",
          task: [
            "Pick any text-based PDF from your laptop (a bank statement template, a college notice, a product manual). Extract its text page by page with `pypdf` into a list of `{\"page\": n, \"text\": ...}` dicts. Print the number of pages and the first 300 characters of page 1. Flag pages with almost no text (likely scanned images).",
          ],
          solution: `import sys
from pypdf import PdfReader

def load_pdf(path: str) -> list[dict]:
    pages = []
    for number, page in enumerate(PdfReader(path).pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page": number, "text": text, "source": path})
    return pages

pages = load_pdf(sys.argv[1] if len(sys.argv) > 1 else "sample.pdf")
print(f"{len(pages)} pages")
print(pages[0]["text"][:300])
for p in pages:
    if len(p["text"].strip()) < 50:
        print(f"page {p['page']} has almost no text: probably a scanned image (needs OCR)")`,
          explanation: [
            "Run it as `uv run python ex01.py path/to/file.pdf`; `sys.argv` holds command-line arguments (`sys.argv[1]` is the first).",
            "Keeping the page number with the text from the very start is what makes citations like \"page 12\" possible later.",
            "`extract_text()` can return `None` for image-only pages, hence `or \"\"`.",
          ],
          concepts: [
            ["`sys.argv`", "List of command-line arguments; index 0 is the script name."],
            ["`pypdf.PdfReader`", "Reads PDF files; `.pages` is a list of page objects with `.extract_text()`."],
            ["OCR", "Optical character recognition: reading text from images."],
          ],
        },
        {
          id: "clean-text",
          title: "Clean extracted text",
          level: "Medium",
          task: [
            "Write `clean(text)` that joins words hyphenated across lines (`manage-\\nment` → `management`), joins lines broken mid-sentence, collapses repeated spaces, and removes lines like `Page 3 of 40`. Test it on the sample below.",
            {
              lang: "python",
              code: `raw = """Company Confidential
The leave manage-
ment policy applies to all
full-time   employees.
Page 3 of 40

New section starts here."""`,
            },
          ],
          hint: "Use `re.sub` with patterns: `r\"(\\w)-\\n(\\w)\"`, `r\"(?m)^Page \\d+ of \\d+$\"`, and `r\"(?<![.!?:])\\n(?!\\n)\"`.",
          solution: `import re

def clean(text: str) -> str:
    text = re.sub(r"(?m)^\\s*(Page \\d+ of \\d+|Company Confidential)\\s*$", "", text)  # boilerplate lines
    text = re.sub(r"(\\w)-\\n(\\w)", r"\\1\\2", text)          # de-hyphenate
    text = re.sub(r"(?<![.!?:\\n])\\n(?!\\n)", " ", text)      # join lines broken mid-sentence
    text = re.sub(r"[ \\t]+", " ", text)                       # collapse spaces
    text = re.sub(r"\\n{3,}", "\\n\\n", text)                   # at most one blank line
    return text.strip()

raw = """Company Confidential
The leave manage-
ment policy applies to all
full-time   employees.
Page 3 of 40

New section starts here."""
print(clean(raw))
# The leave management policy applies to all full-time employees.
#
# New section starts here.`,
          explanation: [
            "`(?m)` makes `^` and `$` match at the start and end of every line, so whole boilerplate lines can be removed.",
            "`r\"\\1\\2\"` in the replacement puts back the two captured letters without the hyphen and newline.",
            "`(?<![.!?:\\n])\\n(?!\\n)` means \"a single newline not preceded by sentence-ending punctuation\": those are line breaks inside a sentence.",
            "Always print cleaned output for a few real documents; every PDF source has its own quirks.",
          ],
          concepts: [
            ["`re.sub(pattern, repl, text)`", "Replaces every match of a regex."],
            ["Raw string `r\"...\"`", "Backslashes are kept literally, which regexes need."],
            ["Lookbehind `(?<!...)` / lookahead `(?!...)`", "Check what comes before/after without including it in the match."],
          ],
        },
      ],
    },
    {
      title: "Chunking",
      exercises: [
        {
          id: "paragraph-chunker",
          title: "Paragraph chunker with a token limit",
          level: "Medium",
          task: [
            "Write `chunk_paragraphs(text, max_tokens=120)` that groups whole paragraphs (split on blank lines) into chunks up to `max_tokens`, starting a new chunk when adding the next paragraph would exceed the limit. Paragraphs longer than the limit become their own chunk. Test on `docs/leave_policy.md`.",
          ],
          solution: `from pathlib import Path
import tiktoken

enc = tiktoken.get_encoding("o200k_base")
tokens = lambda s: len(enc.encode(s))

def chunk_paragraphs(text: str, max_tokens: int = 120) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\\n\\n") if p.strip()]
    chunks, current = [], ""
    for p in paragraphs:
        candidate = f"{current}\\n\\n{p}" if current else p
        if tokens(candidate) <= max_tokens:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = p                      # oversize paragraphs stay whole in their own chunk
    if current:
        chunks.append(current)
    return chunks

text = Path("docs/leave_policy.md").read_text(encoding="utf-8").replace("\\n## ", "\\n\\n## ")
for i, c in enumerate(chunk_paragraphs(text, 60)):
    print(f"--- chunk {i} ({tokens(c)} tokens)\\n{c}")`,
          explanation: [
            "Splitting on paragraph boundaries keeps ideas together, which gives cleaner embeddings than cutting every N characters mid-sentence.",
            "The `candidate` pattern tries adding the next piece and only commits if it fits.",
            "This is a simplified version of the recursive splitter used by LangChain: try big boundaries first, then smaller ones.",
          ],
          concepts: [
            ["Chunk", "A piece of a document that gets its own embedding and can be retrieved on its own."],
            ["`lambda` assigned to a name", "A quick one-line function; `def` is preferred for anything longer."],
          ],
        },
        {
          id: "heading-chunker",
          title: "Heading-aware chunks with metadata",
          level: "Medium",
          task: [
            "Write `chunk_markdown(path)` that splits a Markdown file at `##` headings and returns dicts `{id, source, heading_path, text}` where `heading_path` is like `Leave Policy 2026 > Casual leave` and `text` starts with that path. Run it over all files in `docs/` and print the ids.",
          ],
          solution: `from pathlib import Path

def chunk_markdown(path: Path) -> list[dict]:
    title, section, lines, chunks = path.stem, None, [], []

    def flush():
        body = "\\n".join(lines).strip()
        if section and body:
            heading_path = f"{title} > {section}"
            chunks.append({
                "id": f"{path.name}#{len(chunks)}",
                "source": path.name,
                "heading_path": heading_path,
                "text": f"{heading_path}\\n{body}",
            })

    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            flush()
            section, lines = line[3:].strip(), []
        elif not line.startswith("<!--"):
            lines.append(line)
    flush()
    return chunks

ALL = [c for p in sorted(Path("docs").glob("*.md")) for c in chunk_markdown(p)]
for c in ALL:
    print(c["id"], "|", c["heading_path"])`,
          explanation: [
            "Prepending the heading path gives short chunks their context: \"Interns get 6\" becomes clearly about casual leave.",
            "`flush()` is a nested function that saves the section collected so far; it's called at each new heading and once at the end.",
            "Stable ids (`file#index`) let you replace a document's chunks when it changes.",
            "The nested list comprehension `[c for p in paths for c in chunk_markdown(p)]` flattens all files' chunks into one list.",
          ],
          concepts: [
            ["Metadata", "Extra fields stored with each chunk (source, heading, page) for citations and filters."],
            ["Nested function", "A function defined inside another; it can read the outer function's variables."],
            ["`Path.stem` / `.name`", "File name without / with extension."],
          ],
        },
      ],
    },
    {
      title: "The RAG pipeline",
      exercises: [
        {
          id: "mini-rag",
          title: "Answer questions with citations",
          level: "Medium",
          task: [
            "Using the heading chunks from the previous exercise (save that code as `chunks.py`), embed all chunks, retrieve the top 3 for a question, and ask the LLM to answer only from them, citing like `[1]`. Print the answer and the sources. Try: \"How many casual leaves do interns get?\" and \"What is the per diem in Mumbai?\".",
          ],
          solution: `import numpy as np
from chunks import ALL
from llm import chat, embed

def normalise(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

MATRIX = normalise(embed([c["text"] for c in ALL]))

SYSTEM = """Answer using only the numbered documents.
Cite sources after each claim like [1]. If the documents don't contain the answer,
reply exactly: I couldn't find this in the documents."""

def retrieve(question: str, k: int = 3) -> list[dict]:
    scores = MATRIX @ normalise(embed([question]))[0]
    return [{**ALL[i], "score": float(scores[i])} for i in np.argsort(-scores)[:k]]

def answer(question: str) -> dict:
    chunks = retrieve(question)
    context = "\\n\\n".join(f'<document index="{i}">\\n{c["text"]}\\n</document>'
                           for i, c in enumerate(chunks, start=1))
    text = chat(f"<documents>\\n{context}\\n</documents>\\n\\nQuestion: {question}",
                system=SYSTEM, temperature=0)
    return {"answer": text, "sources": [(i, c["heading_path"], round(c["score"], 2))
                                        for i, c in enumerate(chunks, start=1)]}

for q in ["How many casual leaves do interns get?", "What is the per diem in Mumbai?"]:
    result = answer(q)
    print(q, "\\n", result["answer"])
    for s in result["sources"]:
        print("   ", s)`,
          explanation: [
            "That's a complete RAG system: embed documents once → embed the question → take the most similar chunks → give them to the LLM with strict instructions.",
            "Numbering documents inside XML tags makes citations easy for the model and easy for you to verify.",
            "\"Mumbai\" isn't in the documents, but \"metro cities\" is. A good answer connects them and cites the travel policy.",
            "`{**ALL[i], \"score\": ...}` copies the chunk dict and adds a score without modifying the original.",
          ],
          concepts: [
            ["RAG", "Retrieval-Augmented Generation: retrieve relevant text, then generate an answer grounded in it."],
            ["Grounding", "Making the model answer from provided sources instead of its memory."],
            ["Citation", "A marker linking a claim to the document that supports it."],
          ],
        },
        {
          id: "dont-know",
          title: "Refuse when the answer isn't there",
          level: "Medium",
          task: [
            "Extend `answer()` so that if the best retrieval score is below a threshold, it returns the fallback sentence **without calling the LLM**. Find a threshold by printing the top score for 3 answerable and 3 unanswerable questions (e.g. \"What is the office Wi-Fi password?\", \"Who is the CEO?\").",
          ],
          solution: `from rag import retrieve, answer     # the previous exercise saved as rag.py

FALLBACK = "I couldn't find this in the documents."

answerable = ["How many sick leaves do I get?", "When must travel claims be submitted?",
              "How long must passwords be?"]
unanswerable = ["What is the office Wi-Fi password?", "Who is the CEO?", "Is there a gym?"]

for q in answerable + unanswerable:
    print(f"{retrieve(q, k=1)[0]['score']:.3f}  {q}")

MIN_SCORE = 0.45          # choose from the printout: between the two groups

def safe_answer(question: str) -> dict:
    top = retrieve(question, k=1)[0]
    if top["score"] < MIN_SCORE:
        return {"answer": FALLBACK, "sources": [], "answerable": False}
    result = answer(question)
    result["answerable"] = FALLBACK not in result["answer"]
    return result

print(safe_answer("Who is the CEO?"))`,
          explanation: [
            "Checking the retrieval score first is cheaper (no LLM call) and safer (the model never sees irrelevant context to improvise from).",
            "The right threshold depends on your embedding model and data. Always set it from real examples like this, never copy a number from a blog.",
            "Keep both layers: the score check and the \"say you couldn't find it\" instruction, because some unanswerable questions still retrieve high-scoring but wrong chunks.",
          ],
          concepts: [
            ["Threshold", "A cut-off value used to make a yes/no decision from a score."],
            ["Fallback", "A safe default response when the system can't answer reliably."],
          ],
        },
        {
          id: "validate-citations",
          title: "Validate citations",
          level: "Easy",
          task: [
            "Write `check_citations(answer, n_docs)` that finds all `[n]` markers with a regex, returns the sorted unique cited numbers, and raises `ValueError` if any number is outside 1..n_docs.",
            { lang: "python", code: `check_citations("Interns get 6 [1][3]. Apply early [1].", 3)   # [1, 3]\ncheck_citations("See [5].", 3)                                  # ValueError` },
          ],
          solution: `import re

def check_citations(answer: str, n_docs: int) -> list[int]:
    cited = sorted({int(n) for n in re.findall(r"\\[(\\d+)\\]", answer)})
    bad = [n for n in cited if not 1 <= n <= n_docs]
    if bad:
        raise ValueError(f"cites documents that don't exist: {bad}")
    return cited

print(check_citations("Interns get 6 [1][3]. Apply early [1].", 3))
try:
    check_citations("See [5].", 3)
except ValueError as e:
    print(e)`,
          explanation: [
            "`re.findall(r\"\\[(\\d+)\\]\", text)` returns the digits inside every `[...]`. The backslashes escape the square brackets, which otherwise mean something special in regex.",
            "The set comprehension `{int(n) for n in ...}` removes duplicates; `sorted` turns it into an ordered list.",
            "In a real UI you'd show only the cited sources, as clickable chips.",
          ],
          concepts: [
            ["`re.findall()`", "Returns all matches of a pattern (or of its captured group)."],
            ["Set comprehension", "`{expr for x in items}` builds a set."],
          ],
        },
        {
          id: "condense",
          title: "Rewrite follow-up questions",
          level: "Medium",
          task: [
            "Write `condense(history, question)` that asks the LLM to rewrite a follow-up into a standalone question. Test: history = [\"How many casual leaves do employees get?\", \"12 per year [1].\"], question = \"What about interns?\" → should become something like \"How many casual leaves do interns get?\". Then retrieve with the rewritten question.",
          ],
          solution: `from llm import chat
from rag import retrieve

CONDENSE = ("Rewrite the user's last message as a standalone search query using the conversation "
            "for context. Return only the query. If it's already standalone, return it unchanged.")

def condense(history: list[tuple[str, str]], question: str) -> str:
    if not history:
        return question
    convo = "\\n".join(f"{role}: {text}" for role, text in history[-6:])
    return chat(f"<conversation>\\n{convo}\\n</conversation>\\nLast message: {question}",
                system=CONDENSE, temperature=0, max_tokens=60).strip()

history = [("user", "How many casual leaves do employees get?"), ("assistant", "12 per year [1].")]
standalone = condense(history, "What about interns?")
print("rewritten:", standalone)
print("top chunk:", retrieve(standalone, k=1)[0]["heading_path"])
print("without rewrite:", retrieve("What about interns?", k=1)[0]["heading_path"])`,
          explanation: [
            "\"What about interns?\" alone has no topic, so retrieval may return anything. The rewritten question carries the topic from the conversation.",
            "Use the rewritten question only for retrieval; answer with the user's original wording and history.",
            "A small, fast model is enough for this step because it runs on every turn.",
          ],
          concepts: [
            ["Query condensation", "Turning a follow-up plus history into a standalone search query."],
            ["`history[-6:]`", "The last 6 turns, to keep the rewrite prompt short."],
          ],
        },
      ],
    },
    {
      title: "Serve it",
      exercises: [
        {
          id: "rag-api",
          title: "Wrap the pipeline in a FastAPI endpoint",
          level: "Medium",
          task: [
            "Create `POST /ask` taking `{\"question\": str}` (3–500 characters) and returning `{answer, sources, answerable}` using `safe_answer`. Add `GET /documents` listing sources and chunk counts. Try it in `/docs`.",
          ],
          solution: `# api.py  →  uv run fastapi dev api.py
from collections import Counter
from fastapi import FastAPI
from pydantic import BaseModel, Field
from chunks import ALL
from safe import safe_answer          # the "refuse when unsure" exercise saved as safe.py

app = FastAPI(title="Policy RAG")

class AskIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)

class AskOut(BaseModel):
    answer: str
    sources: list[tuple[int, str, float]]
    answerable: bool

@app.post("/ask", response_model=AskOut)
def ask(body: AskIn):
    return safe_answer(body.question)

@app.get("/documents")
def documents():
    return [{"source": s, "chunks": n} for s, n in Counter(c["source"] for c in ALL).items()]`,
          explanation: [
            "Your RAG code stays in plain modules; the API layer only validates input and calls it. The same code can power a CLI, tests or a background job.",
            "The embeddings are computed once when the module is imported (at server start), not per request.",
            "Next steps (Days 7–9): a real vector store, hybrid search, reranking, streaming and evaluation.",
          ],
          concepts: [
            ["Thin route", "An endpoint that validates and delegates to business logic in other modules."],
            ["Module import side effects", "Code at a module's top level runs once when it's first imported."],
          ],
        },
      ],
    },
  ],
};
