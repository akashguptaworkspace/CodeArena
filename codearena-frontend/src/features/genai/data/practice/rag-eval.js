// Practice exercises: RAG evaluation. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  {
    note: "`rag.py` has `answer()` and `retrieve()` from Day 9, and `safe.py` has `safe_answer()`. Today's exercises evaluate that pipeline. Move the demo code at the bottom of those files under `if __name__ == \"__main__\":` so importing them doesn't run the demos.",
  },
];

export default {
  groups: [
    {
      title: "Golden dataset",
      exercises: [
        {
          id: "golden-set",
          title: "Write and validate a golden dataset",
          level: "Easy",
          task: [
            "Create `golden.jsonl` with at least 10 cases: `question`, `reference` (a short correct answer), `source` (file name) and `answerable` (true/false). Include 3 unanswerable questions. Write a loader that validates every line with Pydantic and reports the line number of any bad line.",
            {
              lang: "json",
              code: `{"question": "How many casual leaves do interns get?", "reference": "Interns get 6 casual leaves per year.", "source": "leave_policy.md", "answerable": true}
{"question": "What is the office Wi-Fi password?", "reference": "", "source": "", "answerable": false}`,
            },
          ],
          solution: `import json
from pathlib import Path
from pydantic import BaseModel, ValidationError

class Case(BaseModel):
    question: str
    reference: str
    source: str
    answerable: bool

def load_golden(path: str = "golden.jsonl") -> list[Case]:
    cases, errors = [], []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            cases.append(Case.model_validate_json(line))
        except ValidationError as e:
            errors.append(f"line {n}: {e.errors()[0]['msg']}")
    if errors:
        raise ValueError("golden.jsonl has problems:\\n" + "\\n".join(errors))
    return cases

cases = load_golden()
print(len(cases), "cases,", sum(not c.answerable for c in cases), "unanswerable")`,
          explanation: [
            "A golden dataset is the fixed exam your system takes after every change. Keep it in the repo, reviewed by a human.",
            "JSONL (one JSON object per line) is easy to append to and diff in Git.",
            "Unanswerable questions test whether the system refuses correctly; without them you only measure half the behaviour.",
          ],
          concepts: [
            ["Golden dataset", "Curated inputs with expected outputs, used as a benchmark."],
            ["JSONL", "A file with one JSON object per line."],
            ["`.splitlines()`", "Splits text into lines."],
          ],
        },
      ],
    },
    {
      title: "LLM judges",
      exercises: [
        {
          id: "faithfulness-judge",
          title: "A faithfulness judge",
          level: "Medium",
          task: [
            "Write `judge_faithfulness(context, answer)` that asks an LLM to list claims in the answer not supported by the context and give a score of 1–3. Return a Pydantic `Verdict`. Run it on 5 answers from your pipeline and on one answer you edit to include a made-up fact.",
          ],
          solution: `import json
from typing import Literal
from pydantic import BaseModel
from llm import client, CHAT_MODEL
from rag import retrieve, answer

class Verdict(BaseModel):
    unsupported_claims: list[str]
    reasoning: str
    score: Literal[1, 2, 3]

JUDGE = """You check whether an answer is supported by the context. Only the context counts as evidence.
List claims in the answer that the context does not support, explain briefly, then score:
3 = fully supported, 2 = only minor details unsupported, 1 = an important claim unsupported.
Reply as JSON: {"unsupported_claims": [...], "reasoning": "...", "score": 1|2|3}"""

def judge_faithfulness(context: str, answer_text: str) -> Verdict:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": JUDGE},
                  {"role": "user", "content": f"<context>\\n{context}\\n</context>\\n<answer>\\n{answer_text}\\n</answer>"}])
    return Verdict.model_validate_json(r.choices[0].message.content)

for q in ["How many casual leaves do interns get?", "What is the per diem for Pune?"]:
    ctx = "\\n\\n".join(c["text"] for c in retrieve(q))
    a = answer(q)["answer"]
    print(q, "→", judge_faithfulness(ctx, a).score)

ctx = "\\n\\n".join(c["text"] for c in retrieve("sick leave"))
fake = "Employees get 10 sick leaves per year, and unused sick leave is paid out in cash in March."
print("edited answer →", judge_faithfulness(ctx, fake))`,
          explanation: [
            "An LLM judge grades outputs against a written rubric. It's the only practical way to score thousands of free-text answers.",
            "Good judges check one thing, list evidence before the score, and use a small scale (1–3 or pass/fail), which is more consistent than 1–10.",
            "The edited answer should score 1 with the cash payout listed as unsupported. If it doesn't, improve the rubric before trusting the judge.",
          ],
          concepts: [
            ["Faithfulness", "Whether every claim in the answer is supported by the retrieved context."],
            ["LLM-as-judge", "Using an LLM with a rubric to grade another model's output."],
            ["Rubric", "The written criteria and scale the judge follows."],
          ],
        },
        {
          id: "correctness-judge",
          title: "Grade answers against reference answers",
          level: "Medium",
          task: [
            "For each answerable golden case, run your pipeline and ask a judge whether the answer is `correct`, `partial` or `wrong` compared with the reference. Print a table and the overall accuracy (partial counts as 0.5).",
          ],
          solution: `import json
from llm import client, CHAT_MODEL
from rag import answer
from golden import load_golden          # the golden-set exercise saved as golden.py

JUDGE = ("Compare the ANSWER with the REFERENCE for the QUESTION. Reply as JSON "
         '{"grade": "correct" | "partial" | "wrong", "why": "..."}. '
         "Correct = same key facts (wording may differ). Partial = some key facts missing. Wrong = contradicts or misses.")

def grade(question: str, reference: str, answer_text: str) -> dict:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": JUDGE},
                  {"role": "user", "content": f"QUESTION: {question}\\nREFERENCE: {reference}\\nANSWER: {answer_text}"}])
    return json.loads(r.choices[0].message.content)

points = {"correct": 1, "partial": 0.5, "wrong": 0}
scores = []
for case in [c for c in load_golden() if c.answerable]:
    g = grade(case.question, case.reference, answer(case.question)["answer"])
    scores.append(points.get(g["grade"], 0))
    print(f"{g['grade']:<8} {case.question}")
print(f"accuracy: {sum(scores) / len(scores):.0%}")`,
          explanation: [
            "Comparing against a reference answer is more reliable than asking a judge \"is this good?\" with nothing to compare to.",
            "`points.get(g[\"grade\"], 0)` treats any unexpected grade as wrong instead of crashing.",
            "Keep the judge prompt and model fixed when comparing versions of your pipeline; changing the judge changes the scores.",
          ],
          concepts: [
            ["Reference-based evaluation", "Grading an output by comparing it with a known correct answer."],
            ["Accuracy", "Share of cases judged correct."],
          ],
        },
        {
          id: "judge-agreement",
          title: "Check the judge against your own grades",
          level: "Easy",
          task: [
            "Grade 10 answers yourself (`correct`/`partial`/`wrong`) and store them next to the judge's grades. Compute the agreement rate and print the cases where you disagree.",
          ],
          solution: `human = ["correct", "correct", "partial", "wrong", "correct", "correct", "partial", "correct", "wrong", "correct"]
judge = ["correct", "correct", "correct", "wrong", "correct", "partial", "partial", "correct", "wrong", "correct"]
questions = [f"q{i + 1}" for i in range(len(human))]      # replace with your real questions

agree = sum(h == j for h, j in zip(human, judge))
print(f"agreement: {agree}/{len(human)} = {agree / len(human):.0%}")
for q, h, j in zip(questions, human, judge):
    if h != j:
        print(f"  {q}: you={h}, judge={j}")`,
          explanation: [
            "A judge is only useful if it agrees with careful humans. Check this before relying on its scores; 80–90% agreement is a reasonable bar for simple rubrics.",
            "Read every disagreement. They usually show a vague rubric (\"what counts as partial?\"), which you fix by adding examples to the judge prompt.",
            "`zip` over three lists walks them in step.",
          ],
          concepts: [
            ["Agreement rate", "Share of items where two graders give the same label."],
            ["Judge calibration", "Adjusting a judge's rubric until it matches human judgement."],
          ],
        },
      ],
    },
    {
      title: "Behaviour, speed and cost",
      exercises: [
        {
          id: "refusal-accuracy",
          title: "Measure refusals",
          level: "Easy",
          task: [
            "Using `safe_answer` and your golden set, count: unanswerable questions correctly refused, and answerable questions wrongly refused. Print both rates.",
          ],
          solution: `from golden import load_golden
from safe import safe_answer, FALLBACK

cases = load_golden()
correct_refusals = wrong_refusals = 0
for c in cases:
    refused = FALLBACK in safe_answer(c.question)["answer"]
    if not c.answerable and refused:
        correct_refusals += 1
    if c.answerable and refused:
        wrong_refusals += 1
        print("wrongly refused:", c.question)

n_unans = sum(not c.answerable for c in cases)
n_ans = len(cases) - n_unans
print(f"correct refusals: {correct_refusals}/{n_unans}")
print(f"wrong refusals:   {wrong_refusals}/{n_ans}")`,
          explanation: [
            "There are two ways to fail: answering when it shouldn't (risky), and refusing when it could answer (unhelpful). Track both.",
            "Tightening the score threshold improves the first number and worsens the second. Choose the balance your product needs: an HR or medical bot should refuse more readily than a shopping assistant.",
          ],
          concepts: [
            ["Refusal accuracy", "How often the system correctly declines questions it can't answer."],
            ["Trade-off", "Improving one metric at the cost of another."],
          ],
        },
        {
          id: "latency-stats",
          title: "Per-stage timing with p50 and p95",
          level: "Medium",
          task: [
            "Time the retrieval and generation stages separately for all golden questions using a small `timed()` context manager, then print p50 and p95 for each stage and the total.",
          ],
          solution: `import statistics
import time
from contextlib import contextmanager
from golden import load_golden
from rag import retrieve
from llm import chat

@contextmanager
def timed(bucket: list[float]):
    start = time.perf_counter()
    yield
    bucket.append((time.perf_counter() - start) * 1000)

retrieve_ms, generate_ms = [], []
for c in load_golden():
    with timed(retrieve_ms):
        chunks = retrieve(c.question)
    with timed(generate_ms):
        chat(f"{[ch['text'] for ch in chunks]}\\n\\nQuestion: {c.question}", max_tokens=150)

def pct(values: list[float], p: int) -> float:
    return statistics.quantiles(values, n=100)[p - 1]

for name, values in [("retrieve", retrieve_ms), ("generate", generate_ms)]:
    print(f"{name:<9} p50 {pct(values, 50):6.0f} ms   p95 {pct(values, 95):6.0f} ms")`,
          explanation: [
            "`@contextmanager` turns a generator into a `with` block: code before `yield` runs on entry, code after runs on exit.",
            "**p50** (median) is the typical request; **p95** is the slow tail that users complain about. Never report only the average.",
            "You'll usually find generation dominates. That's why streaming and smaller models matter more than tuning the vector index.",
          ],
          concepts: [
            ["`@contextmanager`", "Decorator for writing simple `with` context managers."],
            ["Percentile (p50, p95)", "The value below which 50% / 95% of measurements fall."],
            ["`statistics.quantiles()`", "Splits data into equal groups; with `n=100` gives percentiles."],
          ],
        },
        {
          id: "ragas",
          title: "Run RAGAS on your pipeline",
          level: "Hard",
          task: [
            "Install RAGAS and evaluate 5 golden questions with faithfulness and answer relevancy. Compare its faithfulness scores with your own judge's.",
            { lang: "bash", code: `uv add ragas langchain-openai` },
          ],
          solution: `from ragas import EvaluationDataset, evaluate
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import Faithfulness, ResponseRelevancy
from lc import llm, embeddings            # copy lc.py from Day 4
from golden import load_golden
from rag import retrieve, answer

rows = []
for c in [c for c in load_golden() if c.answerable][:5]:
    rows.append({
        "user_input": c.question,
        "response": answer(c.question)["answer"],
        "retrieved_contexts": [ch["text"] for ch in retrieve(c.question)],
        "reference": c.reference,
    })

result = evaluate(
    EvaluationDataset.from_list(rows),
    metrics=[Faithfulness(), ResponseRelevancy()],
    llm=LangchainLLMWrapper(llm),
    embeddings=LangchainEmbeddingsWrapper(embeddings),
)
print(result)
print(result.to_pandas()[["user_input", "faithfulness", "answer_relevancy"]])`,
          explanation: [
            "RAGAS computes standard RAG metrics using an LLM judge and embeddings you provide, so results are comparable across projects and familiar to interviewers.",
            "Faithfulness breaks the answer into claims and checks each against the context; answer relevancy checks the answer addresses the question.",
            "RAGAS renames classes between versions. If an import fails, check the docs for your installed version; the concepts don't change.",
          ],
          concepts: [
            ["RAGAS", "An open-source library of RAG evaluation metrics."],
            ["Answer relevancy", "Whether the answer actually addresses the question asked."],
          ],
        },
      ],
    },
    {
      title: "Production feedback",
      exercises: [
        {
          id: "feedback-api",
          title: "Collect thumbs up/down",
          level: "Medium",
          task: [
            "Add `POST /feedback` taking `{question, answer, rating: \"up\"|\"down\", comment?}` and store it in SQLite. Add `GET /feedback/stats` returning counts and the 5 most recent thumbs-down questions. These become new golden cases.",
          ],
          solution: `import sqlite3
from datetime import datetime
from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()
db = sqlite3.connect("feedback.db", check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS feedback
              (id INTEGER PRIMARY KEY, at TEXT, question TEXT, answer TEXT, rating TEXT, comment TEXT)""")

class FeedbackIn(BaseModel):
    question: str
    answer: str
    rating: Literal["up", "down"]
    comment: str | None = Field(default=None, max_length=1000)

@app.post("/feedback", status_code=201)
def add_feedback(fb: FeedbackIn):
    db.execute("INSERT INTO feedback (at, question, answer, rating, comment) VALUES (?, ?, ?, ?, ?)",
               (datetime.now().isoformat(), fb.question, fb.answer, fb.rating, fb.comment))
    db.commit()
    return {"ok": True}

@app.get("/feedback/stats")
def stats():
    counts = dict(db.execute("SELECT rating, COUNT(*) FROM feedback GROUP BY rating").fetchall())
    worst = [r[0] for r in db.execute(
        "SELECT question FROM feedback WHERE rating = 'down' ORDER BY id DESC LIMIT 5")]
    return {"counts": counts, "recent_thumbs_down": worst}`,
          explanation: [
            "User feedback is your cheapest production quality signal. Review thumbs-down answers weekly and add the good ones to the golden set.",
            "`?` placeholders pass values safely to SQLite. `check_same_thread=False` lets FastAPI's worker threads share the connection (fine for practice; use a proper database and connection pool in production).",
            "`dict(rows)` turns `[(\"up\", 7), (\"down\", 2)]` into `{\"up\": 7, \"down\": 2}`.",
          ],
          concepts: [
            ["`sqlite3`", "Python's built-in module for SQLite, a file-based SQL database."],
            ["Feedback loop", "Using real user signals to find failures and improve the eval set."],
            ["`GROUP BY`", "SQL: aggregate rows that share a value, e.g. count per rating."],
          ],
        },
      ],
    },
  ],
};
