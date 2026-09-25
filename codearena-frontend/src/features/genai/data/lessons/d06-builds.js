// Day 6 build guides: chunking lab and RAG test suite. Merged into d06.js. Shape: see ./index.js
// The Python here was run and tested; keep it runnable when editing.

export const chunkLab = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "\"Why did you choose that chunk size?\" is a classic interview follow-up. Answer it with data. In this lab you chunk the same handbook four ways (fixed, fixed with overlap, recursive, heading-aware), ask the same 12 labelled questions, and compare retrieval hit rate and MRR. Labels are answer phrases, not chunk ids, so they stay valid whatever chunking you try.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `chunk-lab/
├── llm.py                 # Day 3 helper (embed)
├── data/policy.md         # a sample employee handbook with headings
├── data/questions.jsonl   # 12 questions + the answer phrase each must retrieve
├── chunkers.py            # four strategies, same signature: text -> list[str]
└── lab.py                 # chunk → embed → retrieve → hit@2 / MRR per strategy`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/chunk-lab/data && cd ~/genai-practice/chunk-lab
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken
cp ../day03/llm.py ../day03/.env .`,
        },
      ],
    },
    {
      h: "Step 1: the data",
      blocks: [
        {
          lang: "markdown",
          code: `# Acme India Employee Handbook 2026

## 1. Working hours

Standard working hours are 9:30 am to 6:30 pm, Monday to Friday, with a one-hour lunch break. Teams may agree flexible hours with their manager, provided employees are available between 11 am and 4 pm for meetings.

Employees working from the Pune and Bengaluru offices must record attendance using the Acme app. Late arrivals of more than 30 minutes on three days in a month are reported to the manager.

## 2. Leave policy

### 2.1 Casual leave

Full-time employees receive 12 days of casual leave per calendar year. Casual leave cannot be carried forward to the next year and cannot be encashed. Interns receive 6 days of casual leave for a twelve-month internship, pro-rated for shorter internships.

### 2.2 Sick leave

Employees receive 10 days of paid sick leave per year. A medical certificate is required for sick leave longer than two consecutive days. Unused sick leave can be carried forward up to a maximum of 30 days.

### 2.3 Maternity and paternity leave

Eligible employees receive 26 weeks of paid maternity leave for the first two children, as per the Maternity Benefit Act. Paternity leave is 10 working days, to be taken within six months of the child's birth or adoption.

### 2.4 Applying for leave

Leave requests must be submitted on the HR portal at least 7 days in advance, except for sick leave. Managers must approve or reject requests within 3 working days.

## 3. Work from home

Employees may work from home up to 2 days per week with manager approval. Work from home is not available during the first 90 days of employment. Employees must be reachable on Slack and phone during working hours.

## 4. Reimbursements

### 4.1 Travel

Domestic travel for work is booked through the travel desk. Economy class airfare is reimbursed for journeys longer than 500 km. Hotel stays are reimbursed up to ₹5,000 per night in metro cities and ₹3,500 per night elsewhere.

### 4.2 Internet and phone

Employees receive a monthly internet reimbursement of ₹1,000 on submission of the bill. Phone bills are reimbursed only for roles that require customer calls.

### 4.3 Claims process

Claims must be submitted within 30 days of the expense with original receipts. Approved claims are paid with the next salary. Claims above ₹25,000 need approval from the department head.

## 5. Notice period and exit

The notice period is 60 days for employees in their first year and 90 days after that. Notice can be shortened at the company's discretion. Final settlement is processed within 45 days of the last working day.

## 6. Code of conduct

Employees must not accept gifts worth more than ₹2,000 from vendors or customers. Any conflict of interest must be declared to HR in writing. Complaints of harassment are handled by the Internal Committee under the POSH Act within 90 days.`,
          caption: "data/policy.md: a fictional handbook. Swap in a real (non-confidential) document once the lab works.",
        },
        {
          lang: "json",
          code: `{"question": "How many casual leaves do interns get?", "answer": "Interns receive 6 days of casual leave"}
{"question": "Can I carry forward unused sick leave?", "answer": "carried forward up to a maximum of 30 days"}
{"question": "How long is paternity leave?", "answer": "Paternity leave is 10 working days"}
{"question": "How early should I apply for leave?", "answer": "at least 7 days in advance"}
{"question": "Can new joiners work from home?", "answer": "not available during the first 90 days"}
{"question": "What is the hotel limit in metro cities?", "answer": "up to ₹5,000 per night in metro cities"}
{"question": "How much internet reimbursement do we get?", "answer": "monthly internet reimbursement of ₹1,000"}
{"question": "Who approves big expense claims?", "answer": "Claims above ₹25,000 need approval from the department head"}
{"question": "What is the notice period after one year?", "answer": "90 days after that"}
{"question": "When is the full and final settlement done?", "answer": "processed within 45 days of the last working day"}
{"question": "Can I accept a gift from a vendor?", "answer": "gifts worth more than ₹2,000"}
{"question": "What are the core hours for meetings?", "answer": "between 11 am and 4 pm"}`,
          caption: "data/questions.jsonl: a chunk counts as relevant if it contains the whole answer phrase.",
        },
      ],
    },
    {
      h: "Step 2: four chunkers (chunkers.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Four chunking strategies with the same signature: text -> list of chunk strings."""
import re
import tiktoken

enc = tiktoken.get_encoding("o200k_base")


def n_tokens(text: str) -> int:
    return len(enc.encode(text))


def fixed(text: str, size: int = 60, overlap: int = 0) -> list[str]:
    ids = enc.encode(text)
    step = size - overlap
    return [enc.decode(ids[i:i + size]) for i in range(0, max(len(ids) - overlap, 1), step)]


def fixed_overlap(text: str) -> list[str]:
    return fixed(text, size=60, overlap=15)


def recursive(text: str, max_tokens: int = 60, seps=("\\n## ", "\\n### ", "\\n\\n", ". ", " ")) -> list[str]:
    if n_tokens(text) <= max_tokens:
        return [text.strip()] if text.strip() else []
    if not seps:
        return fixed(text, max_tokens)
    sep, rest = seps[0], seps[1:]
    chunks, current = [], ""
    for part in text.split(sep):
        candidate = f"{current}{sep}{part}" if current else part
        if n_tokens(candidate) <= max_tokens:
            current = candidate
        else:
            if current.strip():
                chunks.append(current.strip())
            if n_tokens(part) > max_tokens:
                chunks.extend(recursive(part, max_tokens, rest))
                current = ""
            else:
                current = part
    if current.strip():
        chunks.append(current.strip())
    return chunks


def by_headings(text: str, max_tokens: int = 60) -> list[str]:
    """Split at Markdown headings; prefix every piece with its heading path."""
    path: list[str] = []
    sections: list[tuple[str, str]] = []
    body: list[str] = []

    def flush():
        if "".join(body).strip():
            sections.append((" > ".join(path), "\\n".join(body).strip()))
        body.clear()

    for line in text.splitlines():
        m = re.match(r"^(#{1,6})\\s+(.*)", line)
        if m:
            flush()
            level = len(m.group(1))
            path[:] = path[: level - 1] + [m.group(2).strip()]
        else:
            body.append(line)
    flush()
    chunks = []
    for heading, content in sections:
        for piece in recursive(content, max_tokens, seps=("\\n\\n", ". ", " ")):
            chunks.append(f"{heading}\\n{piece}")
    return chunks


STRATEGIES = {"fixed": fixed, "fixed+overlap": fixed_overlap, "recursive": recursive, "headings": by_headings}`,
        },
        {
          list: [
            "Sizes are deliberately small (60 tokens) because the handbook is small; with real 50-page documents, compare 200, 400 and 800 instead.",
            "`by_headings` prefixes each piece with its heading path, so a chunk like \"Interns receive 6 days...\" carries \"Leave policy > Casual leave\" into its embedding.",
          ],
        },
      ],
    },
    {
      h: "Step 3: the lab (lab.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Chunking lab: same document, same questions, four chunking strategies. Which retrieves best?"""
import json
from pathlib import Path
import numpy as np
from chunkers import STRATEGIES, n_tokens
from llm import embed

K = 2
text = Path("data/policy.md").read_text(encoding="utf-8")
cases = [json.loads(line) for line in Path("data/questions.jsonl").read_text(encoding="utf-8").splitlines() if line]
q_vecs = np.array(embed([c["question"] for c in cases]))


def norm(s: str) -> str:
    return " ".join(s.split()).lower()


print(f"{'strategy':<14}{'chunks':>7}{'avg tok':>9}{'hit@2':>7}{'MRR':>6}")
for name, chunker in STRATEGIES.items():
    chunks = chunker(text)
    c_vecs = np.array(embed(chunks))
    hits, rrs, misses = 0, 0.0, []
    for case, q in zip(cases, q_vecs):
        ranked = np.argsort(-(c_vecs @ q))[:K]
        # a chunk is relevant if it contains the whole answer phrase: labels survive re-chunking
        rank = next((r for r, i in enumerate(ranked, 1) if norm(case["answer"]) in norm(chunks[i])), None)
        hits += rank is not None
        rrs += 1 / rank if rank else 0
        if rank is None:
            misses.append(case["question"])
    avg = sum(n_tokens(c) for c in chunks) / len(chunks)
    print(f"{name:<14}{len(chunks):>7}{avg:>9.0f}{hits / len(cases):>7.2f}{rrs / len(cases):>6.2f}")
    for m in misses:
        print(f"{'':<14}miss: {m}")`,
        },
        {
          lang: "text",
          code: `strategy       chunks  avg tok  hit@2   MRR
fixed              11       57   0.75  0.58
              miss: How early should I apply for leave?
              miss: What is the hotel limit in metro cities?
              miss: What are the core hours for meetings?
fixed+overlap      14       59   0.83  0.71
              miss: How early should I apply for leave?
              miss: When is the full and final settlement done?
recursive          15       40   0.92  0.83
              miss: Can I accept a gift from a vendor?
headings           12       63   0.92  0.92
              miss: Can I accept a gift from a vendor?`,
          caption: "Illustrative output from an offline test run with a simple stand-in embedding. Your numbers with a real embedding model will differ; the comparison method is the point.",
        },
      ],
    },
    {
      h: "Step 4: interpret and decide",
      blocks: [
        {
          list: [
            "**Fixed without overlap** cuts sentences at arbitrary token boundaries, so some answer phrases are split across two chunks and can never be retrieved whole.",
            "**Overlap** repairs many of those cuts at the cost of more chunks (more storage and embedding).",
            "**Recursive** ends chunks at paragraph and sentence boundaries.",
            "**Heading-aware** adds context from headings, which helps short chunks match questions phrased around the topic.",
            "Read the **misses**: each points to a specific weakness (a boundary cut, a missing heading, a vague question).",
          ],
        },
        {
          tip: "Write the result in your README as a table plus one sentence: \"We chose heading-aware chunking at ~400 tokens because it had the best recall@5 (0.91 vs 0.78 for fixed-size) on our 40-question set.\" That's an interview-ready answer.",
        },
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Add `semantic_chunks` from the chunking lesson as a fifth strategy.",
            "Run each strategy at three sizes and plot hit rate against average chunk tokens.",
            "Add Hindi or Hinglish questions and see which strategy handles them best.",
            "Measure answer quality too: send the top chunks to the LLM and check whether the answer contains the answer phrase.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Compare chunking strategies on the same document and labelled questions; label with answer phrases so labels survive re-chunking.",
    "Fixed-size without overlap splits answers; overlap, recursive boundaries and heading context each help.",
    "Choose with numbers (hit@k, MRR, chunk count), and read the misses.",
  ],
  practice: [
    "Run the lab on a real 20+ page document with 30 questions and three chunk sizes; record the winner in your DocChat README.",
  ],
};

export const ragTests = {
  minutes: 120,
  level: "Intermediate",
  intro:
    "Most RAG demos have zero tests, and interviewers notice. Build a small RAG pipeline designed for testing (dependencies injected, so tests use a fake embedding function and a fake LLM) and a pytest suite that checks what matters: the right chunk is retrieved, other users' data never is, the prompt is grounded, citations are validated, low-confidence questions skip the LLM, and re-indexing replaces only the right chunks. These tests run in milliseconds with no API key.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `rag-tests/
├── rag.py               # RagPipeline(embed, generate) + InMemoryStore
└── tests/
    ├── conftest.py      # fake_embed, FakeLLM, a populated pipeline fixture
    └── test_rag.py      # 7 behaviour tests`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/rag-tests/tests && cd ~/genai-practice/rag-tests
uv init --no-readme .
uv add numpy pytest`,
        },
      ],
    },
    {
      h: "Step 1: a pipeline built for testing (rag.py)",
      blocks: [
        {
          lang: "python",
          code: `"""A small, testable RAG pipeline: dependencies (embed, generate) are injected, so tests can fake them."""
import re
from dataclasses import dataclass, field
from typing import Callable
import numpy as np

FALLBACK = "I couldn't find this in the documents."
SYSTEM = f"""Answer using ONLY the numbered documents. Cite them like [1].
If they don't contain the answer, reply exactly: "{FALLBACK}\\""""


@dataclass
class Chunk:
    id: str
    owner_id: int
    doc_id: str
    page: int
    text: str


@dataclass
class InMemoryStore:
    chunks: list[Chunk] = field(default_factory=list)
    vectors: np.ndarray | None = None

    def replace_document(self, owner_id: int, doc_id: str, chunks: list[Chunk], vectors: np.ndarray) -> None:
        keep = [i for i, c in enumerate(self.chunks) if not (c.owner_id == owner_id and c.doc_id == doc_id)]
        old_vecs = self.vectors[keep] if self.vectors is not None and keep else np.empty((0, vectors.shape[1]))
        self.chunks = [self.chunks[i] for i in keep] + chunks
        self.vectors = np.vstack([old_vecs, vectors])

    def search(self, qvec: np.ndarray, owner_id: int, k: int) -> list[tuple[Chunk, float]]:
        allowed = [i for i, c in enumerate(self.chunks) if c.owner_id == owner_id]   # filter first
        if not allowed:
            return []
        scores = self.vectors[allowed] @ qvec
        order = np.argsort(-scores)[:k]
        return [(self.chunks[allowed[i]], float(scores[i])) for i in order]


class RagPipeline:
    def __init__(self, embed: Callable[[list[str]], list[list[float]]],
                 generate: Callable[[str, str], str], min_score: float = 0.2):
        self.embed, self.generate, self.min_score = embed, generate, min_score
        self.store = InMemoryStore()

    def _vecs(self, texts: list[str]) -> np.ndarray:
        v = np.array(self.embed(texts), dtype=np.float32)
        return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)

    def index(self, owner_id: int, doc_id: str, pages: list[str]) -> int:
        chunks = [Chunk(f"{owner_id}/{doc_id}/p{p}/c{i}", owner_id, doc_id, p, para.strip())
                  for p, page in enumerate(pages, start=1)
                  for i, para in enumerate(page.split("\\n\\n")) if para.strip()]
        self.store.replace_document(owner_id, doc_id, chunks, self._vecs([c.text for c in chunks]))
        return len(chunks)

    def build_prompt(self, chunks: list[Chunk], question: str) -> str:
        docs = "\\n\\n".join(f'<document index="{i}" doc="{c.doc_id}" page="{c.page}">\\n{c.text}\\n</document>'
                           for i, c in enumerate(chunks, start=1))
        return f"<documents>\\n{docs}\\n</documents>\\n\\nQuestion: {question}"

    def answer(self, owner_id: int, question: str, k: int = 3) -> dict:
        hits = self.store.search(self._vecs([question])[0], owner_id, k)
        if not hits or hits[0][1] < self.min_score:
            return {"answer": FALLBACK, "sources": [], "answerable": False}
        chunks = [c for c, _ in hits]
        text = self.generate(SYSTEM, self.build_prompt(chunks, question))
        cited = sorted({int(n) for n in re.findall(r"\\[(\\d+)\\]", text)})
        valid = [n for n in cited if 1 <= n <= len(chunks)]
        if len(valid) != len(cited):
            text = re.sub(r"\\[(\\d+)\\]", lambda m: m.group(0) if int(m.group(1)) in valid else "", text)
        return {"answer": text, "answerable": FALLBACK not in text,
                "sources": [{"n": n, "doc": chunks[n - 1].doc_id, "page": chunks[n - 1].page} for n in valid]}`,
        },
        {
          list: [
            "`embed` and `generate` are **injected** (dependency injection, like FastAPI's `Depends`), so production passes real clients and tests pass fakes.",
            "The store filters by owner **before** ranking, and `replace_document` removes only that owner's document.",
            "Invalid citation numbers are stripped and only valid ones become sources.",
            "Below `min_score`, the LLM isn't called at all: cheaper and safer.",
          ],
        },
      ],
    },
    {
      h: "Step 2: fakes and fixtures (tests/conftest.py)",
      blocks: [
        {
          lang: "python",
          code: `import hashlib
import re
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from rag import RagPipeline  # noqa: E402

DIM = 128


def fake_embed(texts: list[str]) -> list[list[float]]:
    """Deterministic bag-of-words hashing: same words → similar vectors. No API calls."""
    out = np.zeros((len(texts), DIM))
    for i, t in enumerate(texts):
        for w in re.findall(r"[a-z0-9]+", t.lower()):
            out[i, int(hashlib.md5(w.encode()).hexdigest(), 16) % DIM] += 1
    return out.tolist()


class FakeLLM:
    """Records every prompt and returns a scripted answer."""
    def __init__(self, reply: str = "Interns get 6 casual leaves [1]."):
        self.reply, self.calls = reply, []

    def __call__(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        return self.reply


@pytest.fixture
def llm():
    return FakeLLM()


@pytest.fixture
def rag(llm):
    r = RagPipeline(embed=fake_embed, generate=llm, min_score=0.2)
    r.index(owner_id=1, doc_id="hr", pages=[
        "Employees get 12 casual leaves per year.\\n\\nInterns get 6 casual leaves per year.",
        "Sick leave is 10 days per year.",
    ])
    r.index(owner_id=2, doc_id="hr", pages=["Globex interns get 20 casual leaves."])
    return r`,
        },
        "The fake embedding is a word-hashing trick: texts sharing words get similar vectors. It's not semantic, but it's deterministic and good enough to test the plumbing. The fake LLM records every prompt so tests can inspect exactly what the model would have received.",
      ],
    },
    {
      h: "Step 3: behaviour tests (tests/test_rag.py)",
      blocks: [
        {
          lang: "python",
          code: `from rag import FALLBACK


def test_retrieves_the_relevant_chunk_first(rag):
    hits = rag.store.search(rag._vecs(["casual leaves for interns"])[0], owner_id=1, k=3)
    assert "Interns get 6" in hits[0][0].text


def test_never_returns_another_owners_chunks(rag):
    hits = rag.store.search(rag._vecs(["interns casual leaves"])[0], owner_id=1, k=10)
    assert hits and all(c.owner_id == 1 for c, _ in hits)


def test_prompt_has_numbered_sources_and_question_last(rag, llm):
    rag.answer(1, "How many casual leaves do interns get?")
    system, user = llm.calls[-1]
    assert "ONLY the numbered documents" in system
    assert '<document index="1"' in user
    assert user.rstrip().endswith("Question: How many casual leaves do interns get?")


def test_answer_returns_cited_sources(rag):
    result = rag.answer(1, "How many casual leaves do interns get?")
    assert result["answerable"] and result["sources"][0]["doc"] == "hr"


def test_invalid_citations_are_removed(rag, llm):
    llm.reply = "Interns get 6 [1][7]."
    result = rag.answer(1, "How many casual leaves do interns get?")
    assert "[7]" not in result["answer"] and [s["n"] for s in result["sources"]] == [1]


def test_low_score_skips_the_llm(rag, llm):
    result = rag.answer(1, "quantum chromodynamics lecture notes")
    assert result["answer"] == FALLBACK and llm.calls == []


def test_reindex_replaces_old_chunks_only_for_that_owner(rag):
    rag.index(owner_id=1, doc_id="hr", pages=["Interns now get 8 casual leaves."])
    owner1 = [c.text for c in rag.store.chunks if c.owner_id == 1]
    owner2 = [c.text for c in rag.store.chunks if c.owner_id == 2]
    assert owner1 == ["Interns now get 8 casual leaves."]
    assert owner2 == ["Globex interns get 20 casual leaves."]`,
        },
        {
          lang: "bash",
          code: `uv run pytest -q
# 7 passed in 0.01s`,
        },
      ],
    },
    {
      h: "What these tests do and don't cover",
      blocks: [
        {
          table: {
            head: ["Covered here (deterministic, fast)", "Needs evals with real models (Day 9)"],
            rows: [
              ["Permission filtering and re-index behaviour", "Whether the embedding model retrieves the right chunk for real paraphrases"],
              ["Prompt structure and grounding rules present", "Whether the LLM actually follows them"],
              ["Citation parsing and validation", "Whether answers are faithful and correct"],
              ["Fallback path skips the LLM", "Whether the threshold is well chosen"],
            ],
          },
        },
        "Run these tests in CI on every commit; run the slower, costlier evals on prompt, model or retrieval changes.",
      ],
    },
  ],
  revise: [
    "Inject embed and generate functions so tests can use fakes: no API keys, millisecond tests.",
    "Test isolation, re-indexing, prompt grounding, citation validation and the low-score fallback.",
    "Unit tests check plumbing; evals with real models check quality.",
  ],
  practice: [
    "Add a test that a document uploaded by owner 2 can never appear in owner 1's sources, even with an identical question.",
  ],
};
