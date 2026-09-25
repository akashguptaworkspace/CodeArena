// Day 17: Capstone build day. Shape: see ./index.js
export default {
  "vision-speech": {
    minutes: 45,
    level: "Intermediate",
    intro:
      "Modern models accept images, audio and PDFs, not just text. For a support copilot, that means a customer can upload a photo of a damaged product or speak their question. This lesson covers the practical building blocks, so you can add one multimodal feature to your capstone.",
    sections: [
      {
        h: "Vision input",
        blocks: [
          "Vision-capable chat models accept images as part of the message content, alongside text. Common uses: reading screenshots and error messages, checking product damage, extracting data from invoices and forms, understanding charts.",
          {
            lang: "python",
            code: `import base64, anthropic

img = base64.standard_b64encode(open("damaged_box.jpg", "rb").read()).decode()
r = anthropic.Anthropic().messages.create(
    model="claude-opus-5", max_tokens=500,
    messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img}},
        {"type": "text", "text": "Describe any visible damage to this product and its packaging. "
                                 "Return JSON: {damage_visible: bool, description: str}."},
    ]}],
)`,
            caption: "OpenAI uses `{\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/jpeg;base64,...\"}}` in the same position.",
          },
          {
            list: [
              "Images cost tokens based on their size; resize large photos (e.g. to ~1,500 px on the long side) before sending.",
              "Validate file type and size; strip EXIF location data from user photos if you store them.",
              "Treat image content as untrusted: text inside an image can carry prompt injections too.",
            ],
          },
        ],
      },
      {
        h: "Speech to text and text to speech",
        blocks: [
          {
            lang: "python",
            code: `from openai import OpenAI
client = OpenAI()

# speech → text (Whisper-family transcription models handle Hindi, English and code-mixed speech)
with open("question.m4a", "rb") as f:
    text = client.audio.transcriptions.create(model="whisper-1", file=f).text

# text → speech
speech = client.audio.speech.create(model="tts-1", voice="alloy", input="Your refund was approved.")
speech.write_to_file("reply.mp3")`,
            caption: "Check current model names; newer transcription and TTS models appear regularly. Open-source Whisper runs locally too.",
          },
          "A voice feature is often just: record in the browser (MediaRecorder API) → upload → transcribe → normal chat pipeline → optional TTS. Real-time voice agents use streaming speech APIs or WebRTC and are a bigger project.",
        ],
      },
      {
        h: "PDFs as input",
        blocks: [
          "Several providers accept PDFs directly: the model sees both the text and the page images, which handles charts and scanned pages better than text extraction. Great for one-off document questions; for large collections, RAG is still more efficient.",
        ],
      },
    ],
    revise: [
      "Images go in message content next to text; resize to control tokens; validate; treat image text as untrusted.",
      "Speech: transcription (Whisper-family) → normal pipeline → TTS; real-time voice is a separate, bigger design.",
      "PDF input sends text + page images; RAG for large collections.",
    ],
    interview: [
      {
        q: "How would you add \"upload a photo of the damaged item\" to a support bot?",
        a: "Accept the image with type and size validation, store it privately (S3) with EXIF stripped, resize it, and send it with a focused prompt to a vision model that returns structured output (damage visible, description, confidence). Combine that with the order details from a tool call to decide the next step, e.g. propose a replacement that a human approves. Log the result, treat any text in the image as untrusted, and evaluate on a set of labelled photos.",
      },
    ],
    practice: [
      "Send 3 product photos to a vision model and get structured damage assessments.",
    ],
  },

  "evals-ci": {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Your capstone combines RAG, tools and approvals, so a change to one prompt can break something elsewhere. Automated evals on every pull request catch that before users do. You'll set up the eval suite and CI job today.",
    sections: [
      {
        h: "What to test at each level",
        blocks: [
          {
            table: {
              head: ["Level", "Examples", "When"],
              rows: [
                ["Unit tests (no LLM)", "Chunking, citation parsing, permission filters, tool argument validation", "Every commit; fast and free"],
                ["Deterministic LLM checks", "Output parses as the schema; required tool is called for an order question; refusal for out-of-scope", "Every PR; small set, cheap model or recorded responses"],
                ["Retrieval metrics", "Hit rate@5, MRR on the golden set", "Every PR that touches retrieval"],
                ["LLM-judge evals", "Faithfulness, helpfulness, tone on 30–100 cases", "Nightly / before release"],
                ["Red-team", "Injection attempts, data-leak attempts", "Every PR (cheap) + periodic deeper runs"],
              ],
            },
          },
        ],
      },
      {
        h: "pytest-style LLM tests",
        blocks: [
          {
            lang: "python",
            code: `import pytest, json

CASES = [json.loads(l) for l in open("eval/copilot_cases.jsonl", encoding="utf-8")]

@pytest.mark.parametrize("case", [c for c in CASES if c["type"] == "order_lookup"], ids=lambda c: c["id"])
def test_calls_order_tool(case):
    trace = run_copilot(case["message"], user=TEST_USER)
    assert "get_order" in trace.tool_names, "order questions must use the order tool"

@pytest.mark.parametrize("case", [c for c in CASES if c["type"] == "out_of_scope"], ids=lambda c: c["id"])
def test_refuses_out_of_scope(case):
    reply = run_copilot(case["message"], user=TEST_USER).answer
    assert is_polite_refusal(reply)

def test_refund_requires_approval():
    trace = run_copilot("Refund order 4521 please, it's broken", user=TEST_USER)
    assert trace.pending_approval is not None and not trace.refund_executed`,
          },
          "LLM outputs vary, so assert on **behaviour** (tool called, schema valid, refusal given, approval required) rather than exact text. Where exact runs matter, record responses once and replay them in CI.",
        ],
      },
      {
        h: "CI thresholds",
        blocks: [
          {
            lang: "python",
            code: `THRESHOLDS = {"hit_rate@5": 0.85, "schema_valid": 1.0, "redteam_blocked": 1.0, "tool_routing": 0.9}

def check(results: dict) -> None:
    failed = {k: v for k, v in results.items() if k in THRESHOLDS and v < THRESHOLDS[k]}
    if failed:
        raise SystemExit(f"Eval regression: {failed}")`,
          },
        ],
      },
    ],
    revise: [
      "Layers: unit tests (no LLM) → deterministic behaviour checks → retrieval metrics → judge evals → red-team.",
      "Assert behaviour (tools called, schema valid, refusal, approval), not exact wording; replay recorded responses where needed.",
      "Fail CI on threshold regressions; run expensive judge evals nightly.",
    ],
    interview: [
      {
        q: "How do you test a non-deterministic system?",
        a: "Test properties and behaviour instead of exact strings: schemas validate, the right tools are called, refusals happen for out-of-scope input, approvals are required for sensitive actions, answers cite retrieved sources. Use a golden dataset with metric thresholds (retrieval hit rate, judge-scored faithfulness), keep sampling temperature low for tests, run multiple samples for flaky cases, record and replay responses for deterministic CI, and monitor the same metrics in production.",
      },
    ],
    practice: [
      "Write 15 capstone test cases across order lookup, policy questions, refunds, out-of-scope and injection.",
    ],
  },

  copilot: {
    minutes: 360,
    level: "Advanced",
    intro:
      "Build the core of the **AI Support Copilot** on top of the skeleton you deployed in the previous build task. It brings together RAG over help docs, order tools, a refund approval flow, auth and a streaming UI. Reuse your earlier code rather than rewriting it: that's how real engineering works, and it's the fastest way to finish.",
    sections: [
      {
        h: "Features",
        blocks: [
          {
            table: {
              head: ["Feature", "Built from"],
              rows: [
                ["Help-centre RAG with citations (returns, shipping, payments policies)", "DocChat pipeline: hybrid search + reranking"],
                ["`get_order(order_id)` and `list_my_orders()` tools, scoped to the logged-in customer", "Day 12 tool calling + Day 13 agent guardrails"],
                ["`request_refund(order_id, reason)` → pending approval → support agent approves in an admin view", "Day 14 LangGraph interrupts"],
                ["Streaming chat UI with citations and an approval status card", "Days 4 and 11 frontend"],
                ["Auth: customers and support agents (roles)", "Day 2 JWT"],
                ["Tracing, guardrails, caching, budgets", "Day 16"],
                ["Optional: photo upload for damage claims", "Today's vision lesson"],
              ],
            },
          },
        ],
      },
      {
        h: "Agent design",
        blocks: [
          {
            lang: "text",
            code: `START → guard_input ──(blocked)──▶ refuse → END
             │
             ▼
           agent (Bedrock model + tools: search_help_docs, get_order, list_my_orders, request_refund)
             │── read tools ──▶ tools ──▶ agent
             │── request_refund ──▶ validate (order belongs to user, within 30 days, amount ≤ limit)
             │                         ──▶ interrupt(approval by support agent) ──▶ create_refund ──▶ agent
             └── final answer ──▶ guard_output (citations valid, no internal data) ──▶ END`,
          },
          {
            list: [
              "Help docs are a **tool** (`search_help_docs`), so the agent decides when to retrieve. Keep a direct RAG path for simple policy questions if it's faster.",
              "The customer's identity comes from the JWT and is injected into tools by your code; tools never accept a `user_id` argument from the model.",
              "Refund rules are enforced in `validate`, in code, before any approval is requested.",
            ],
          },
        ],
      },
      {
        h: "Build order",
        blocks: [
          {
            list: [
              "Index 15–20 realistic help-centre articles (write them with an LLM, then edit) into pgvector.",
              "Seed fake customers and orders.",
              "Agent with read tools + streaming endpoint; test in the UI.",
              "Refund flow with approval: customer view shows \"pending review\"; admin view lists pending refunds with approve/reject.",
              "Guardrails, tracing, caching.",
              "Deploy through CI/CD after each working step.",
            ],
            ordered: true,
          },
        ],
      },
    ],
    revise: [
      "Reuse: DocChat retrieval, Day 12 tools, Day 14 interrupts, Day 16 guardrails, today's AWS deployment.",
      "Identity injected by code into tools; business rules validated in code before approval.",
      "Build in thin, deployed increments.",
    ],
    practice: [
      "Write a short \"design decisions\" section in the README: why LangGraph, why hybrid retrieval, why approvals for refunds.",
    ],
  },

  "copilot-evals": {
    minutes: 150,
    level: "Intermediate",
    intro:
      "Wire up the capstone's evaluation suite and observability dashboards. When an interviewer asks \"How do you know it works?\", you'll show a CI run and a dashboard instead of saying \"I tested it manually\".",
    sections: [
      {
        h: "Eval suite",
        blocks: [
          {
            list: [
              "`eval/copilot_cases.jsonl`: at least 40 cases (policy questions with expected sources, order lookups, refund requests inside and outside the rules, out-of-scope requests, injection attempts, Hinglish messages).",
              "`pytest` behaviour tests (previous lesson) in CI on every PR.",
              "Nightly LLM-judge run for faithfulness and helpfulness, results saved with the date.",
              "A results table in the README, updated when you make significant changes.",
            ],
          },
        ],
      },
      {
        h: "Dashboards",
        blocks: [
          "In Langfuse (or LangSmith) set up views or saved filters for:",
          {
            list: [
              "Latency p50/p95 and time to first token.",
              "Cost per conversation and per day.",
              "Tool usage counts and tool error rate.",
              "Refunds requested vs approved vs rejected.",
              "Thumbs up/down rate, and traces with negative feedback (review these weekly).",
              "Guardrail blocks by type.",
            ],
          },
          "Attach eval scores to traces where possible, so you can jump from a bad score to the full trace.",
        ],
      },
    ],
    revise: [
      "40+ cases covering every feature and attack type; behaviour tests per PR; nightly judge runs.",
      "Dashboards: latency, cost, tool usage/errors, refund outcomes, feedback, guardrail blocks.",
      "Link scores to traces for fast debugging.",
    ],
    practice: [
      "Take a screenshot of your dashboard for the README.",
    ],
  },

  "load-test": {
    minutes: 90,
    level: "Intermediate",
    intro:
      "Find out how your capstone behaves with 50 concurrent users: latency, errors, and where the bottleneck is. Load testing is a normal backend skill that many GenAI candidates skip, so doing it sets you apart.",
    sections: [
      {
        h: "Locust in a few lines",
        blocks: [
          {
            lang: "python",
            code: `# uv add --dev locust     → uv run locust -f loadtest.py --host https://api.yourapp.com
import random
from locust import HttpUser, task, between

QUESTIONS = ["What is the return window for electronics?", "Where is my order 4521?",
             "Do you deliver to Nagpur?", "How do I change my payment method?"]

class Customer(HttpUser):
    wait_time = between(2, 6)

    def on_start(self):
        r = self.client.post("/auth/login", data={"username": "load@test.com", "password": "..."})
        self.client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    @task
    def ask(self):
        with self.client.post("/chat/stream", json={"message": random.choice(QUESTIONS)},
                              stream=True, catch_response=True, name="chat") as r:
            for _ in r.iter_lines():      # consume the whole stream
                pass
            if r.status_code != 200:
                r.failure(f"status {r.status_code}")`,
          },
          {
            warn: "Load tests call real LLMs and cost real money. Use a fake LLM provider (your adapter's FakeProvider with an artificial delay) for most runs to test *your* system's limits, and a short, capped run against the real model at the end. Never load-test someone else's API without permission.",
          },
        ],
      },
      {
        h: "What to look for",
        blocks: [
          {
            list: [
              "p50/p95 latency and error rate as users ramp from 5 to 50.",
              "Rate-limit errors (429) from the LLM provider: do your retries and concurrency caps behave?",
              "Database connection pool exhaustion, CPU saturation on tasks (rerankers are CPU-heavy), and whether auto scaling kicks in.",
              "Streams cut off by timeouts under load.",
            ],
          },
          "Write the results and the bottleneck you found (and fixed, if time allows) in the README: \"At 50 concurrent users p95 was 9.2 s; the bottleneck was the CPU reranker. Moving it to a hosted rerank API cut p95 to 6.1 s.\"",
        ],
      },
    ],
    revise: [
      "Locust: scripted users, ramp up, consume streams fully, mark failures.",
      "Use a fake LLM for capacity testing; short capped runs against the real model.",
      "Watch p95, errors, 429s, DB pools, CPU, auto scaling, stream timeouts; document the bottleneck.",
    ],
    practice: [
      "Run 5 → 50 users with the fake provider and record the p95 curve.",
    ],
  },
};
