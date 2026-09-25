// Day 4 build guides: prompt lab and vision extractor. Merged into d04.js. Shape: see ./index.js
// The Python here was run and tested (with a fake LLM client); keep it runnable when editing.

export const promptLab = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "Stop judging prompts by trying two examples in a chat window. Build a **prompt lab**: a script that runs several prompt versions over a labelled dataset, scores them, shows a confusion matrix and the exact mistakes, and saves a report. It's a miniature eval harness (Day 11 goes further), and \"I improved ticket-routing accuracy from 81% to 94% and measured it\" is a much stronger interview story than \"I wrote a good prompt\".",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `prompt-lab/
├── llm.py                   # your helper from Day 3 (OpenAI, Gemini or Ollama)
├── data/tickets.jsonl       # labelled examples: {"text": ..., "label": ...}
├── prompts/
│   ├── v1.txt               # zero-shot baseline
│   └── v2.txt               # label definitions + tie-break rule
├── lab.py                   # runs every prompt on every example, scores, reports
└── results/                 # v1.csv, v2.csv, report.md`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/prompt-lab/{data,prompts} && cd ~/genai-practice/prompt-lab
uv init --no-readme .
uv add openai python-dotenv
cp ../day03/llm.py ../day03/.env .`,
        },
      ],
    },
    {
      h: "Step 1: a labelled dataset",
      blocks: [
        "Write examples that look like real traffic, including tricky ones: two plausible categories, Hinglish, vague messages. Start with 16; grow to 50–100 as you find failures.",
        {
          lang: "json",
          code: `{"text": "I was charged twice for my Pro subscription this month", "label": "billing"}
{"text": "Refund not received yet, it has been 10 days since you approved it", "label": "billing"}
{"text": "Why is there a convenience fee on my UPI payment?", "label": "billing"}
{"text": "My parcel shows delivered but I never got it", "label": "delivery"}
{"text": "Delivery boy asked for extra cash, is that allowed?", "label": "delivery"}
{"text": "Order stuck at 'shipped' for a week, courier not responding", "label": "delivery"}
{"text": "The shoes I received are a different size from what I ordered", "label": "product"}
{"text": "Screen of the phone had a crack when I opened the box", "label": "product"}
{"text": "The kurta colour faded after the first wash", "label": "product"}
{"text": "OTP is not coming on my new number, can't log in", "label": "account"}
{"text": "Please delete my account and all my data", "label": "account"}
{"text": "Someone changed my email address without my permission", "label": "account"}
{"text": "Do you have any job openings in Pune?", "label": "other"}
{"text": "Can you add a dark mode to the app?", "label": "other"}
{"text": "I got charged but the order was cancelled and the item never shipped", "label": "billing"}
{"text": "Wrong item delivered: I ordered a mixer, got a kettle", "label": "product"}`,
          caption: "data/tickets.jsonl: one JSON object per line. The last two are deliberately ambiguous.",
        },
        {
          tip: "Label the data *before* writing prompts, and have a friend label 10 of them too. If two humans disagree, the label definitions are unclear, and no prompt will fix that.",
        },
      ],
    },
    {
      h: "Step 2: two prompt versions",
      blocks: [
        {
          lang: "text",
          code: `Classify the customer support ticket into one category: billing, delivery, product, account, other.
Reply with the category name only.`,
          caption: "prompts/v1.txt: the zero-shot baseline.",
        },
        {
          lang: "text",
          code: `You label customer support tickets for an Indian e-commerce app so they reach the right team.

Categories:
- billing: payments, charges, refunds, fees, invoices (including refunds for cancelled orders)
- delivery: shipping status, couriers, delivery agents, missing or late parcels
- product: the item itself: damaged, defective, wrong item, wrong size, quality
- account: login, OTP, profile, email/phone changes, account deletion, security
- other: anything else (jobs, feature requests, general questions)

If a ticket fits two categories, choose the team that must act first.
Reply with the category name only, in lowercase.`,
          caption: "prompts/v2.txt: definitions for each label, an audience, and a tie-break rule.",
        },
      ],
    },
    {
      h: "Step 3: the lab (lab.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Prompt lab: run several prompt versions over a labelled dataset and compare them."""
import argparse
import csv
import json
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from llm import CHAT_MODEL, client

LABELS = ["billing", "delivery", "product", "account", "other"]


def load_dataset(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def normalise(text: str) -> str | None:
    word = text.strip().lower().strip(".\\"'\` ")
    return word if word in LABELS else None                  # anything else counts as invalid


def run_one(system: str, example: dict) -> dict:
    start = time.perf_counter()
    r = client.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0,
        max_tokens=10,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": example["text"]}],
    )
    raw = r.choices[0].message.content or ""
    return {
        "text": example["text"],
        "expected": example["label"],
        "raw": raw.strip(),
        "predicted": normalise(raw),
        "latency_s": round(time.perf_counter() - start, 3),
        "tokens": r.usage.total_tokens if r.usage else None,
    }


def evaluate(version: str, system: str, data: list[dict], workers: int) -> dict:
    with ThreadPoolExecutor(max_workers=workers) as pool:        # a few calls in parallel
        rows = list(pool.map(lambda ex: run_one(system, ex), data))
    correct = sum(r["predicted"] == r["expected"] for r in rows)
    invalid = sum(r["predicted"] is None for r in rows)
    confusion = defaultdict(Counter)
    for r in rows:
        confusion[r["expected"]][r["predicted"] or "INVALID"] += 1
    return {
        "version": version,
        "rows": rows,
        "accuracy": correct / len(rows),
        "invalid": invalid,
        "avg_latency": sum(r["latency_s"] for r in rows) / len(rows),
        "confusion": confusion,
    }


def report(results: list[dict]) -> str:
    lines = ["| prompt | accuracy | invalid | avg latency (s) |", "|---|---|---|---|"]
    for res in results:
        lines.append(f"| {res['version']} | {res['accuracy']:.0%} | {res['invalid']} | {res['avg_latency']:.2f} |")
    for res in results:
        lines += ["", f"### {res['version']}: mistakes"]
        for r in res["rows"]:
            if r["predicted"] != r["expected"]:
                lines.append(f"- expected **{r['expected']}**, got **{r['raw']}**: {r['text']}")
        lines += ["", "confusion (expected → predicted):"]
        for expected, preds in sorted(res["confusion"].items()):
            lines.append(f"- {expected}: {dict(preds)}")
    return "\\n".join(lines)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, default=Path("data/tickets.jsonl"))
    p.add_argument("--prompts", nargs="+", default=["v1", "v2"])
    p.add_argument("--workers", type=int, default=4)
    a = p.parse_args()

    data = load_dataset(a.data)
    results = []
    for version in a.prompts:
        system = Path(f"prompts/{version}.txt").read_text(encoding="utf-8")
        results.append(evaluate(version, system, data, a.workers))

    Path("results").mkdir(exist_ok=True)
    for res in results:
        with open(f"results/{res['version']}.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(res["rows"][0]))
            writer.writeheader()
            writer.writerows(res["rows"])
    text = report(results)
    Path("results/report.md").write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()`,
        },
        {
          list: [
            "`normalise` accepts `Billing.` or `\"billing\"` but counts anything outside the label set as **invalid**, a separate metric from wrong answers.",
            "`ThreadPoolExecutor` runs a few calls in parallel; keep `--workers` low to respect rate limits (or with Ollama, where your laptop is the limit).",
            "The **confusion matrix** shows *which* labels get mixed up, which tells you which definition to improve.",
            "Results go to CSV (open in Excel or pandas) and a Markdown report you can paste into your README.",
          ],
        },
      ],
    },
    {
      h: "Step 4: run it and iterate",
      blocks: [
        {
          lang: "bash",
          code: `uv run python lab.py                      # compares v1 and v2
uv run python lab.py --prompts v2 v3      # after you write v3`,
        },
        {
          lang: "text",
          code: `| prompt | accuracy | invalid | avg latency (s) |
|---|---|---|---|
| v1 | 81% | 1 | 0.62 |
| v2 | 94% | 0 | 0.71 |

### v1: mistakes
- expected **billing**, got **delivery**: I got charged but the order was cancelled and the item never shipped
- expected **product**, got **Delivery.**: Wrong item delivered: I ordered a mixer, got a kettle
...`,
          caption: "Illustrative output. Your numbers depend on the model; small local models make more mistakes, which makes the comparison more interesting.",
        },
        {
          list: [
            "Read every mistake. Is the label wrong, the definition unclear, or the model weak?",
            "Write `v3` changing **one thing** (add two few-shot examples for the confused pair, or switch to structured output with an enum) and re-run everything.",
            "Run each version 2–3 times if you use a temperature above 0; small differences on 16 examples can be noise.",
            "Add every new real-world failure to the dataset so it never regresses.",
          ],
        },
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Compare **models** as well as prompts (`--models small large`) and add cost per 1,000 tickets to the report.",
            "Switch to structured output with a `Literal` enum and see the invalid count drop to zero.",
            "Split the data into a dev set (to iterate on) and a held-out test set (reported once), to avoid overfitting your prompt.",
            "Add a GitHub Action that runs the lab on pull requests that change files in `prompts/`.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Prompt quality is measured on a labelled dataset, not judged by eye.",
    "Track accuracy, invalid outputs, latency (and cost); read the confusion matrix and every mistake.",
    "Change one thing per version; re-run the whole set; add real failures to the data.",
    "Dev vs held-out test split prevents overfitting prompts to your examples.",
  ],
  practice: [
    "Write v3 with two few-shot examples for the most-confused pair of labels and report the change in accuracy.",
  ],
};

export const visionExtract = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "Build a bill extractor: photograph a shop or restaurant bill and get validated JSON with the merchant, GSTIN, date, line items, tax and total, plus a list of problems that need human review. It combines everything from today (multimodal input, structured output, Pydantic validation, image pre-processing, a FastAPI upload endpoint and tests) and mirrors real work at Indian fintech, expense and accounting startups.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `bill-extractor/
├── llm.py            # Day 3 helper; LLM_MODEL must be a vision model
├── schema.py         # Bill / LineItem Pydantic models + check() business rules
├── extract.py        # image → resized base64 → structured output → (Bill, problems)
├── api.py            # POST /bills/extract (multipart upload)
└── test_schema.py    # tests for the rules, no API calls`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/bill-extractor && cd ~/genai-practice/bill-extractor
uv init --no-readme .
uv add openai python-dotenv pydantic pillow "fastapi[standard]" pytest
cp ../day03/llm.py ../day03/.env .`,
        },
        {
          table: {
            head: ["Provider", "Vision model setting in `.env`"],
            rows: [
              ["OpenAI", "`LLM_MODEL=gpt-4o-mini` (or a newer vision-capable model)"],
              ["Gemini (OpenAI-compatible endpoint)", "`LLM_MODEL=gemini-2.5-flash`"],
              ["Ollama (local, free)", "A vision model such as `qwen2.5vl` or `llama3.2-vision` (`ollama pull ...`); slower and less accurate on small text"],
            ],
          },
        },
      ],
    },
    {
      h: "Step 1: the schema and the rules (schema.py)",
      blocks: [
        {
          lang: "python",
          code: `"""The contract for a bill: what the model must return, and the checks code does afterwards."""
import re
from pydantic import BaseModel, Field, field_validator

GSTIN = re.compile(r"^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


class LineItem(BaseModel):
    name: str
    quantity: float | None = Field(description="null if not printed")
    amount: float = Field(description="Line total in rupees, as printed")


class Bill(BaseModel):
    merchant: str | None = Field(description="Business name as printed; null if unreadable")
    gstin: str | None = Field(description="15-character GSTIN exactly as printed; null if absent")
    bill_date: str | None = Field(description="YYYY-MM-DD; null if unreadable")
    items: list[LineItem]
    subtotal: float | None
    tax_total: float | None = Field(description="Sum of CGST + SGST/IGST, null if not shown")
    total: float = Field(description="Grand total payable in rupees")
    unreadable_fields: list[str] = Field(description="Names of fields you could not read with confidence")

    @field_validator("gstin")
    @classmethod
    def clean_gstin(cls, v: str | None) -> str | None:
        return v.replace(" ", "").upper() if v else v


def check(bill: Bill) -> list[str]:
    """Business rules the model can't be trusted with. Returns human-readable problems."""
    problems = []
    if bill.gstin and not GSTIN.match(bill.gstin):
        problems.append(f"GSTIN '{bill.gstin}' has an invalid format")
    items_sum = round(sum(i.amount for i in bill.items), 2)
    if bill.subtotal is not None and abs(items_sum - bill.subtotal) > 1:
        problems.append(f"items add up to {items_sum}, but subtotal is {bill.subtotal}")
    if bill.subtotal is not None and bill.tax_total is not None:
        if abs(bill.subtotal + bill.tax_total - bill.total) > 1:
            problems.append(f"subtotal + tax = {bill.subtotal + bill.tax_total}, but total is {bill.total}")
    if bill.total <= 0:
        problems.append("total must be positive")
    problems += [f"model could not read: {f}" for f in bill.unreadable_fields]
    return problems`,
        },
        {
          list: [
            "Nullable fields plus `unreadable_fields` give the model an honest way to say \"I can't read this\" instead of inventing digits.",
            "`check()` holds rules a model can't be trusted with: the GSTIN format (2-digit state code, 10-character PAN, entity number, `Z`, checksum character), items adding up to the subtotal, subtotal + tax = total.",
            "Problems are returned, not raised: a bill with a problem still gets extracted, but is flagged for a person to review.",
          ],
        },
      ],
    },
    {
      h: "Step 2: extraction (extract.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Photo of a bill → validated Bill, with a list of problems for human review."""
import base64
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps
from llm import CHAT_MODEL, client
from schema import Bill, check

SYSTEM = """You read Indian shop and restaurant bills and extract data into the schema.
- Copy text and numbers exactly as printed; never guess digits you can't read.
- Use null for missing or unreadable values and list them in unreadable_fields.
- Amounts are in rupees without the ₹ symbol. Dates as YYYY-MM-DD."""


def prepare_image(data: bytes, max_side: int = 1600) -> str:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")   # fix phone rotation
    img.thumbnail((max_side, max_side))                              # fewer pixels = fewer tokens
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode()


def extract_bill(image: bytes) -> tuple[Bill, list[str]]:
    image_b64 = prepare_image(image)
    completion = client.chat.completions.parse(
        model=CHAT_MODEL,                                   # must be a vision model
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": [
                {"type": "text", "text": "Extract this bill."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
            ]},
        ],
        response_format=Bill,
    )
    message = completion.choices[0].message
    if message.refusal:
        raise ValueError(f"model refused: {message.refusal}")
    bill = message.parsed
    return bill, check(bill)


if __name__ == "__main__":
    bill, problems = extract_bill(Path(sys.argv[1]).read_bytes())
    print(bill.model_dump_json(indent=2))
    print("NEEDS REVIEW:" if problems else "All checks passed.")
    for p in problems:
        print(" -", p)`,
        },
        {
          list: [
            "`exif_transpose` fixes photos taken sideways on phones; `thumbnail` caps the size so you don't pay for megapixels.",
            "`client.chat.completions.parse(response_format=Bill)` gives constrained, typed output, the same pattern as the structured output lesson, now with an image part.",
            "Check `refusal` before using `parsed`.",
          ],
        },
        {
          lang: "bash",
          code: `uv run python extract.py ~/Downloads/bill.jpg`,
        },
      ],
    },
    {
      h: "Step 3: the API (api.py)",
      blocks: [
        {
          lang: "python",
          code: `"""FastAPI endpoint: upload a bill photo, get JSON + review flags."""
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from extract import extract_bill
from schema import Bill

app = FastAPI(title="Bill extractor")
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024


class BillResult(BaseModel):
    bill: Bill
    needs_review: bool
    problems: list[str]


@app.post("/bills/extract", response_model=BillResult)
async def extract(file: UploadFile) -> BillResult:
    if file.content_type not in ALLOWED:
        raise HTTPException(415, "Upload a JPEG, PNG or WebP image")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image too large (max 8 MB)")
    bill, problems = await run_in_threadpool(extract_bill, data)   # the SDK call is blocking
    return BillResult(bill=bill, needs_review=bool(problems), problems=problems)`,
        },
        "Validate the upload's type and size before spending tokens. `run_in_threadpool` keeps the blocking SDK call from freezing the event loop (Day 2); in a bigger app you'd use the async client.",
        {
          lang: "bash",
          code: `uv run fastapi dev api.py
curl -F "file=@bill.jpg;type=image/jpeg" http://127.0.0.1:8000/bills/extract`,
        },
      ],
    },
    {
      h: "Step 4: tests for the rules (test_schema.py)",
      blocks: [
        {
          lang: "python",
          code: `from schema import Bill, LineItem, check


def make(**overrides) -> Bill:
    data = dict(merchant="Sharma Sweets", gstin="29ABCDE1234F1Z5", bill_date="2026-09-20",
                items=[LineItem(name="Kaju katli", quantity=0.5, amount=450.0),
                       LineItem(name="Samosa", quantity=4, amount=80.0)],
                subtotal=530.0, tax_total=26.5, total=556.5, unreadable_fields=[])
    data.update(overrides)
    return Bill(**data)


def test_clean_bill_passes():
    assert check(make()) == []


def test_bad_gstin_and_totals_are_flagged():
    problems = check(make(gstin="29ABCDE1234F1Z", total=600.0))
    assert any("GSTIN" in p for p in problems)
    assert any("total is 600.0" in p for p in problems)


def test_gstin_is_normalised():
    assert make(gstin="29abcde1234f1z5").gstin == "29ABCDE1234F1Z5"`,
        },
        "These tests never call a model, so they're fast and free. Test the model's accuracy separately with labelled bills (next step).",
      ],
    },
    {
      h: "Step 5: measure accuracy",
      blocks: [
        {
          list: [
            "Collect 10–20 bill photos (your own; blur or skip anything personal) and write the correct JSON for each.",
            "Score **field accuracy** (total, GSTIN, date, item count) and the **review rate** (how often `check()` flags a bill).",
            "Compare two models and two image sizes (1024 vs 1600 px). Report accuracy and cost per bill in your README.",
          ],
        },
        {
          warn: "Don't upload other people's bills, Aadhaar, PAN or bank documents to test. For a real product, follow India's DPDP Act: collect only what's needed, tell users how data is used, and set retention limits.",
        },
      ],
    },
  ],
  revise: [
    "Pre-process images (rotate, resize) before sending: better accuracy, fewer tokens.",
    "Structured output with nullable fields and `unreadable_fields`; never let the model guess digits.",
    "Business rules in code (GSTIN regex, sums); return problems for human review instead of failing.",
    "Validate uploads (type, size) before calling the model; run blocking SDK calls in a thread pool.",
    "Unit-test rules without the model; measure field accuracy on labelled bills.",
  ],
  practice: [
    "Add a Claude or Gemini version of `extract_bill` using their native SDKs, and compare accuracy on your labelled bills.",
  ],
};
