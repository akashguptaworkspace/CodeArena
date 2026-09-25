// Practice exercises: multimodal, testing LLM apps, load testing. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  {
    note: "Vision needs a vision-capable model: most current API models are; with Ollama use a vision model such as `llama3.2-vision` or `qwen2.5vl` and set it as `VISION_MODEL` in `.env`.",
  },
];

export default {
  groups: [
    {
      title: "Images and audio",
      exercises: [
        {
          id: "vision-damage",
          title: "Assess a product photo",
          level: "Medium",
          task: [
            "Take (or download) a photo of a box or product. Send it with a prompt asking for JSON `{damage_visible: bool, description: str, confidence: 0-1}` and validate the reply with Pydantic.",
          ],
          solution: `import base64
import os
from pydantic import BaseModel, Field
from llm import client

VISION_MODEL = os.getenv("VISION_MODEL", "gpt-4o-mini")

class Damage(BaseModel):
    damage_visible: bool
    description: str
    confidence: float = Field(ge=0, le=1)

def assess(path: str) -> Damage:
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    r = client.chat.completions.create(
        model=VISION_MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "user", "content": [
            {"type": "text", "text": "Inspect this product and its packaging for damage. Reply as JSON "
                                     '{"damage_visible": true|false, "description": "...", "confidence": 0-1}'},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
        ]}],
    )
    return Damage.model_validate_json(r.choices[0].message.content)

print(assess("box.jpg"))`,
          explanation: [
            "Vision models take images as part of the message content, next to text. Here the image is sent inline as a base64 `data:` URL.",
            "Structured output turns a picture into data your code can act on, for example proposing a replacement that a human approves.",
            "Treat text inside images as untrusted too: a photo can contain written instructions (prompt injection).",
          ],
          concepts: [
            ["Multimodal model", "A model that accepts more than text, such as images or audio."],
            ["Base64", "A way to encode binary data (like an image) as text."],
            ["Data URL", "`data:<type>;base64,<data>`: a file embedded directly in a string."],
          ],
        },
        {
          id: "resize-image",
          title: "Shrink images before sending",
          level: "Easy",
          task: [
            "Write `prepare_image(path, max_side=1024)` with Pillow that resizes large photos (keeping the aspect ratio), converts to JPEG at quality 85, strips EXIF metadata, and returns the bytes. Print the size before and after for a phone photo.",
          ],
          solution: `import io
from pathlib import Path
from PIL import Image

def prepare_image(path: str, max_side: int = 1024) -> bytes:
    img = Image.open(path)
    img = img.convert("RGB")                      # drops alpha and some metadata
    img.thumbnail((max_side, max_side))           # resizes in place, keeps aspect ratio
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)      # new file: no EXIF (location, camera) data
    return buf.getvalue()

path = "photo.jpg"
before = Path(path).stat().st_size
after = len(prepare_image(path))
print(f"{before / 1024:.0f} KB → {after / 1024:.0f} KB")`,
          explanation: [
            "Image tokens (and cost) grow with resolution; a 4000-pixel phone photo rarely needs more than ~1000 pixels for a model to understand it.",
            "Re-saving drops EXIF data, which can include the GPS location where the photo was taken. That's personal data you shouldn't store or send without need.",
            "`io.BytesIO` is an in-memory file, handy for building uploads without touching disk.",
          ],
          concepts: [
            ["Pillow (PIL)", "Python's standard image library."],
            ["EXIF", "Metadata inside photos: camera, time, sometimes GPS location."],
            ["`io.BytesIO`", "A file-like object stored in memory."],
          ],
        },
        {
          id: "transcribe",
          title: "Transcribe speech locally",
          level: "Easy",
          task: [
            "Record a 15-second voice note (in English, Hindi or both) and transcribe it with `faster-whisper` on your laptop. Print the detected language and each segment with timestamps. Then send the text to your chat model as a normal question.",
          ],
          solution: `from faster_whisper import WhisperModel
from llm import chat

model = WhisperModel("small", device="cpu", compute_type="int8")   # downloads once
segments, info = model.transcribe("voice_note.m4a")
print(f"language: {info.language} ({info.language_probability:.0%})")

text_parts = []
for seg in segments:
    print(f"[{seg.start:5.1f}s → {seg.end:5.1f}s] {seg.text}")
    text_parts.append(seg.text)

question = " ".join(text_parts).strip()
print("\\nanswer:", chat(question, max_tokens=150))`,
          explanation: [
            "Whisper-family models handle Indian English, Hindi and mixed speech reasonably well; bigger models (`medium`, `large`) are more accurate but slower.",
            "`compute_type=\"int8\"` uses a quantised model so it runs fast enough on a CPU.",
            "A voice feature is usually just: record → transcribe → your normal chat pipeline → optionally text-to-speech.",
          ],
          concepts: [
            ["Speech-to-text (ASR)", "Automatic speech recognition: turning audio into text."],
            ["Whisper", "OpenAI's open-source speech recognition model family; `faster-whisper` is an optimised version."],
          ],
        },
      ],
    },
    {
      title: "Testing LLM features",
      exercises: [
        {
          id: "behaviour-tests",
          title: "Behaviour tests with a fake LLM",
          level: "Medium",
          task: [
            "Write a small `SupportBot` whose `handle(message)` routes with an injected LLM function, calls `get_order` for order questions, and refuses out-of-scope ones. Test the routing and the refusal with pytest using a **fake** LLM, so the tests are instant, free and deterministic.",
          ],
          solution: `# bot.py
import re
from collections.abc import Callable

class SupportBot:
    def __init__(self, classify: Callable[[str], str], get_order: Callable[[str], dict]):
        self.classify, self.get_order = classify, get_order     # dependencies are injected

    def handle(self, message: str) -> dict:
        intent = self.classify(message)
        if intent == "order_status":
            match = re.search(r"\\d{4,}", message)
            if not match:
                return {"reply": "Could you share your order number?", "tool": None}
            order = self.get_order(match.group())
            return {"reply": f"Order {match.group()} is {order['status']}.", "tool": "get_order"}
        if intent == "out_of_scope":
            return {"reply": "Sorry, I can only help with orders, returns and payments.", "tool": None}
        return {"reply": "Let me help with that.", "tool": None}

# test_bot.py
import pytest
from bot import SupportBot

def fake_classify(message: str) -> str:
    rules = {"order": "order_status", "poem": "out_of_scope"}
    return next((v for k, v in rules.items() if k in message.lower()), "other")

calls = []
def fake_get_order(order_id: str) -> dict:
    calls.append(order_id)
    return {"status": "shipped"}

bot = SupportBot(fake_classify, fake_get_order)

@pytest.mark.parametrize("message", ["Where is my order 4521?", "order 99881 status"])
def test_order_questions_use_the_tool(message):
    assert bot.handle(message)["tool"] == "get_order"

def test_asks_for_missing_order_number():
    assert "order number" in bot.handle("where is my order?")["reply"]

def test_refuses_out_of_scope():
    assert "only help" in bot.handle("write me a poem")["reply"]`,
          explanation: [
            "Passing the LLM call in as a function (dependency injection) lets tests swap in a fake, the same idea as FastAPI's `dependency_overrides`.",
            "Tests assert **behaviour** (which tool was used, whether it refused), not exact wording, which would change with every prompt tweak.",
            "Real-model evals still matter; run them less often (nightly) because they're slow and cost money.",
          ],
          concepts: [
            ["Dependency injection", "Giving a component the things it depends on, instead of it creating them."],
            ["Fake / test double", "A simple stand-in for a real dependency in tests."],
            ["`@pytest.mark.parametrize`", "Runs one test function with several inputs."],
          ],
        },
        {
          id: "record-replay",
          title: "Record and replay LLM responses",
          level: "Medium",
          task: [
            "Write a `ReplayLLM` wrapper: in `record` mode it calls the real model and saves each (prompt → response) pair to `cassette.json`; in `replay` mode it returns the saved response and fails loudly if a prompt isn't recorded. Use it to make an integration test deterministic.",
          ],
          solution: `import hashlib
import json
import os
from pathlib import Path
from llm import chat

class ReplayLLM:
    def __init__(self, path: str = "cassette.json", mode: str | None = None):
        self.path = Path(path)
        self.mode = mode or os.getenv("LLM_MODE", "replay")
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {}

    def __call__(self, prompt: str, **options) -> str:
        key = hashlib.sha256(json.dumps([prompt, options], sort_keys=True).encode()).hexdigest()[:16]
        if self.mode == "replay":
            if key not in self.data:
                raise KeyError(f"No recording for prompt {prompt[:40]!r}. Run once with LLM_MODE=record.")
            return self.data[key]
        response = chat(prompt, **options)
        self.data[key] = response
        self.path.write_text(json.dumps(self.data, indent=2, ensure_ascii=False))
        return response

llm = ReplayLLM()

def test_summary_mentions_refund():
    out = llm("Summarise in 5 words: customer wants refund for broken kettle", temperature=0)
    assert "refund" in out.lower()

# first run (calls the real model):   LLM_MODE=record uv run pytest -q
# later runs (instant, free):         uv run pytest -q`,
          explanation: [
            "Recording once and replaying afterwards makes tests fast, free and repeatable, and they run in CI without an API key.",
            "The key hashes the prompt **and** options, so changing either requires re-recording, which is what you want after a prompt change.",
            "Re-record periodically (or when you change model) to catch real behaviour changes.",
          ],
          concepts: [
            ["Record/replay (cassette)", "Saving real responses once and reusing them in later test runs."],
            ["`__call__`", "Makes an object callable like a function: `llm(...)`."],
          ],
        },
      ],
    },
    {
      title: "Load testing",
      exercises: [
        {
          id: "locust",
          title: "Load-test an API with Locust",
          level: "Medium",
          task: [
            "Create a FastAPI `/chat` endpoint that simulates an LLM with `await asyncio.sleep(random.uniform(1, 3))`. Write a Locust file with simulated users posting questions. Ramp from 5 to 50 users and record the p50 and p95 response times and failure rate. Then change the endpoint to a blocking `time.sleep` inside `async def` and see what happens.",
          ],
          solution: `# api.py  →  uv run uvicorn api:app --port 8000
import asyncio, random
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ChatIn(BaseModel):
    message: str

@app.post("/chat")
async def chat(body: ChatIn):
    await asyncio.sleep(random.uniform(1, 3))          # stands in for an LLM call
    return {"reply": f"echo: {body.message}"}

# locustfile.py  →  uv run locust -f locustfile.py --host http://127.0.0.1:8000
#                   open http://localhost:8089, start with 50 users, spawn rate 5
import random
from locust import HttpUser, between, task

QUESTIONS = ["Where is my order?", "Refund policy?", "Do you deliver to Nagpur?"]

class Customer(HttpUser):
    wait_time = between(1, 3)

    @task
    def ask(self):
        self.client.post("/chat", json={"message": random.choice(QUESTIONS)}, name="chat")`,
          explanation: [
            "With `await asyncio.sleep`, one server process handles 50 concurrent users easily: waiting doesn't block the event loop, so p95 stays near 3 seconds.",
            "Replace it with `time.sleep(2)` inside `async def` and latency explodes as users queue behind each other. That's the \"blocking call in async code\" bug from Day 2, now measured.",
            "Use a fake LLM for capacity tests (free, controllable). Run only short, capped tests against a real paid model.",
          ],
          concepts: [
            ["Load testing", "Simulating many users to measure latency, errors and limits."],
            ["Locust", "A Python load-testing tool where users are defined as classes."],
            ["p95", "The response time 95% of requests are faster than: the \"slow tail\"."],
          ],
        },
      ],
    },
  ],
};
