// Practice exercises: open models, quantisation, fine-tuning. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  {
    note: "`torch` is a large download (1–2 GB). Small models (0.5–1.5B parameters) run fine on a laptop CPU or Apple Silicon; they're slow but good for learning.",
  },
];

export default {
  groups: [
    {
      title: "Hugging Face",
      exercises: [
        {
          id: "pipelines",
          title: "Three tasks with pipelines",
          level: "Easy",
          task: [
            "Use `pipeline` for sentiment analysis on 3 product reviews, zero-shot classification of 3 tickets into `billing/bug/feature`, and summarisation of one paragraph. Print the results neatly.",
          ],
          solution: `from transformers import pipeline

reviews = ["Delivery was super quick, love it!", "The charger stopped working in 2 days.", "It's okay for the price."]
sentiment = pipeline("sentiment-analysis")
for text, r in zip(reviews, sentiment(reviews)):
    print(f"{r['label']:<8} {r['score']:.2f}  {text}")

zero_shot = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
for ticket in ["I was charged twice", "App crashes on upload", "Please add dark mode"]:
    r = zero_shot(ticket, candidate_labels=["billing", "bug", "feature"])
    print(f"{r['labels'][0]:<8} {r['scores'][0]:.2f}  {ticket}")

summariser = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
text = ("Retrieval-augmented generation combines a search step with a large language model. The system "
        "first finds relevant passages from a company's documents, then asks the model to answer using only "
        "those passages. This reduces hallucinations, allows citations, and keeps answers up to date "
        "without retraining the model.")
print(summariser(text, max_length=40, min_length=15)[0]["summary_text"])`,
          explanation: [
            "`pipeline(task)` downloads a suitable model on first use and handles tokenising, running and decoding for you.",
            "Zero-shot classification works with labels it was never trained on, by testing whether \"This text is about {label}\" is entailed. It's a free, local alternative to an LLM call for simple routing.",
            "Models are cached in `~/.cache/huggingface`, so later runs are fast.",
          ],
          concepts: [
            ["Hugging Face Hub", "A site hosting hundreds of thousands of open models and datasets."],
            ["`pipeline()`", "The simplest way to run a model for a task in `transformers`."],
            ["Zero-shot classification", "Classifying into labels without task-specific training."],
          ],
        },
        {
          id: "local-chat",
          title: "Chat with a small instruct model",
          level: "Medium",
          task: [
            "Load `Qwen/Qwen2.5-0.5B-Instruct` with `AutoTokenizer` and `AutoModelForCausalLM`, format a conversation with `apply_chat_template`, and generate a reply. Print the formatted prompt once to see the special tokens.",
          ],
          solution: `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

name = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name, torch_dtype="auto", device_map="auto")

messages = [
    {"role": "system", "content": "You are a concise Python tutor."},
    {"role": "user", "content": "What is a dictionary in Python? One sentence."},
]
prompt_text = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
print(prompt_text)                       # see the special tokens the model was trained with

inputs = tok(prompt_text, return_tensors="pt").to(model.device)
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=60, do_sample=False)
reply = tok.decode(out[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
print("reply:", reply)`,
          explanation: [
            "Every chat model is trained on a specific format with special tokens (like `<|im_start|>`). `apply_chat_template` produces exactly that format; getting it wrong is the top cause of garbage output from open models.",
            "`add_generation_prompt=True` ends the prompt with the assistant's turn marker, so the model knows to answer.",
            "We slice off the prompt tokens (`out[0][prompt_length:]`) to decode only the new text.",
            "`torch.no_grad()` skips gradient tracking, saving memory during inference.",
          ],
          concepts: [
            ["Instruct model", "A model fine-tuned to follow chat instructions (vs a base model that just continues text)."],
            ["Chat template", "The model's exact prompt format with special tokens."],
            ["`generate()`", "Runs the next-token loop to produce text."],
          ],
        },
      ],
    },
    {
      title: "Serving and sizing",
      exercises: [
        {
          id: "ollama-bench",
          title: "Benchmark a local model vs an API model",
          level: "Medium",
          task: [
            "Send the same 3 prompts to Ollama (through its OpenAI-compatible API) and to your API model. For each, measure time to first token and tokens per second with streaming. Print a comparison table.",
          ],
          solution: `import os
import time
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
TARGETS = {
    "ollama qwen2.5:1.5b": (OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"), "qwen2.5:1.5b"),
    "api model": (OpenAI(base_url=os.getenv("LLM_BASE_URL") or None, api_key=os.getenv("LLM_API_KEY")),
                  os.getenv("LLM_MODEL", "gpt-4o-mini")),
}
PROMPTS = ["Explain HNSW in 3 sentences.", "Write a haiku about Mumbai rain.", "List 5 uses of Python dicts."]

def measure(client, model, prompt):
    start = time.perf_counter(); first = None; chunks = 0
    for chunk in client.chat.completions.create(model=model, stream=True,
                                                messages=[{"role": "user", "content": prompt}]):
        if chunk.choices and chunk.choices[0].delta.content:
            first = first or time.perf_counter() - start
            chunks += 1
    total = time.perf_counter() - start
    return first or total, chunks / max(total - (first or 0), 1e-6)

print(f"{'target':<22} {'first token':>11} {'chunks/s':>9}")
for name, (client, model) in TARGETS.items():
    for p in PROMPTS:
        ttft, rate = measure(client, model, p)
        print(f"{name:<22} {ttft:>10.2f}s {rate:>9.1f}")`,
          explanation: [
            "**Time to first token** is what users feel; **tokens per second** is how fast the rest arrives. (Stream chunks are roughly tokens, good enough for comparison.)",
            "On a laptop, local models are usually slower and weaker, but free, private and offline. That trade-off is exactly what you discuss in \"API vs self-hosted\" interview questions.",
            "`first = first or ...` sets `first` only once, on the first chunk.",
          ],
          concepts: [
            ["Ollama", "A tool that downloads and runs quantised open models locally with an OpenAI-compatible API."],
            ["TTFT", "Time to first token."],
            ["Throughput", "Tokens generated per second."],
          ],
        },
        {
          id: "memory-calc",
          title: "How much memory does a model need?",
          level: "Easy",
          task: [
            "Write `model_memory_gb(params_billion, bits)` for the weights, and print a table for 1.5B, 8B and 70B models at 16, 8 and 4 bits. Add a rough 20% overhead column for runtime and KV cache at short context.",
          ],
          solution: `def model_memory_gb(params_billion: float, bits: int) -> float:
    return params_billion * 1e9 * bits / 8 / 1e9        # bytes per parameter = bits / 8

print(f"{'model':<7} {'bits':>4} {'weights':>9} {'+20%':>7}")
for size in [1.5, 8, 70]:
    for bits in [16, 8, 4]:
        w = model_memory_gb(size, bits)
        print(f"{size:>5}B {bits:>4} {w:>7.1f}GB {w * 1.2:>5.1f}GB")`,
          explanation: [
            "Weights memory ≈ parameters × bytes per parameter. 16-bit = 2 bytes, 8-bit = 1 byte, 4-bit = 0.5 bytes. An 8B model is ~16 GB at 16-bit but ~4 GB at 4-bit, which is why quantised models run on laptops.",
            "Real usage adds the KV cache (grows with context length and concurrent users) and runtime overhead, so leave headroom.",
            "This quick maths answers common interview questions like \"can we serve a 70B model on one 24 GB GPU?\" (not without heavy quantisation or multiple GPUs).",
          ],
          concepts: [
            ["Parameters", "The model's learned numbers (weights). \"8B\" = 8 billion."],
            ["Quantisation", "Storing weights with fewer bits to save memory."],
            ["KV cache", "Memory for attention keys/values of the tokens so far; grows with context."],
          ],
        },
        {
          id: "lora-params",
          title: "Count LoRA's trainable parameters",
          level: "Medium",
          task: [
            "For a weight matrix of size d × k, full fine-tuning trains d·k numbers while LoRA with rank r trains r·(d + k). Write a function that compares them for one 4096×4096 matrix at r = 8, 16, 64, and for a whole model with 32 layers × 7 such matrices.",
          ],
          solution: `def lora_params(d: int, k: int, r: int) -> int:
    return r * (d + k)            # A is r×k, B is d×r

d = k = 4096
full = d * k
print(f"one matrix: full = {full:,}")
for r in [8, 16, 64]:
    lp = lora_params(d, k, r)
    print(f"  r={r:<3} LoRA = {lp:>9,}  ({lp / full:.2%} of full)")

layers, matrices = 32, 7
for r in [8, 16]:
    total = layers * matrices * lora_params(d, k, r)
    print(f"whole model r={r}: {total / 1e6:.1f}M trainable parameters")`,
          explanation: [
            "LoRA freezes the original matrix and learns a low-rank update `B·A`. With r = 16 that's under 1% of the matrix's parameters.",
            "Fewer trainable parameters means far less GPU memory for gradients and optimizer state, which is why a 7B model can be fine-tuned on one GPU (with QLoRA, even a free Colab GPU).",
            "The trained adapter file is small (tens of MB), so you can keep many adapters for different tasks.",
          ],
          concepts: [
            ["LoRA", "Low-Rank Adaptation: fine-tune by training small matrices added to frozen weights."],
            ["Rank r", "The inner size of the LoRA matrices; higher = more capacity, more parameters."],
            ["Adapter", "The small set of trained LoRA weights, loaded on top of a base model."],
          ],
        },
      ],
    },
    {
      title: "Fine-tuning workflow",
      exercises: [
        {
          id: "sft-dataset",
          title: "Build and validate a fine-tuning dataset",
          level: "Medium",
          task: [
            "Generate 60 training examples for turning informal Hinglish support messages into JSON `{category, urgency, order_id}` using your API model, validate every example with Pydantic, drop duplicates and invalid ones, shuffle, and write `train.jsonl` (90%) and `test.jsonl` (10%) in chat format.",
          ],
          solution: `import json, random
from pydantic import BaseModel, Field, ValidationError
from llm import client, CHAT_MODEL        # copy llm.py from day03

class Label(BaseModel):
    category: str = Field(pattern="^(billing|delivery|product|other)$")
    urgency: int = Field(ge=1, le=5)
    order_id: str | None

SYSTEM = "Convert the support message to JSON with category, urgency (1-5) and order_id (or null)."

def generate_batch(n: int = 20) -> list[dict]:
    r = client.chat.completions.create(
        model=CHAT_MODEL, temperature=0.9, response_format={"type": "json_object"},
        messages=[{"role": "user", "content":
                   f"Create {n} varied, realistic Hinglish customer support messages for an Indian "
                   "e-commerce app, each with the correct label. Reply as JSON "
                   '{"items": [{"message": "...", "label": {"category": "billing|delivery|product|other", '
                   '"urgency": 1-5, "order_id": "digits or null"}}]}'}])
    return json.loads(r.choices[0].message.content)["items"]

rows, seen = [], set()
for _ in range(3):
    for item in generate_batch():
        try:
            label = Label.model_validate(item["label"])
        except (ValidationError, KeyError, TypeError):
            continue
        msg = item.get("message", "").strip()
        if not msg or msg.lower() in seen:
            continue
        seen.add(msg.lower())
        rows.append({"messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": msg},
            {"role": "assistant", "content": label.model_dump_json()},
        ]})

random.seed(0); random.shuffle(rows)
split = int(len(rows) * 0.9)
for name, part in [("train", rows[:split]), ("test", rows[split:])]:
    with open(f"{name}.jsonl", "w", encoding="utf-8") as f:
        f.writelines(json.dumps(r, ensure_ascii=False) + "\\n" for r in part)
print(f"{len(rows)} valid examples → {split} train / {len(rows) - split} test")`,
          explanation: [
            "Generating drafts with a strong model and filtering them is called **distillation**. Always review a sample by hand too; quality matters more than quantity.",
            "Every example goes through the same Pydantic validation you'd use in production, so the training labels are consistent.",
            "The test split is never trained on; it's how you'll prove the fine-tune helped. Real projects use 300–1,000+ examples.",
          ],
          concepts: [
            ["SFT dataset", "Chat-format examples of the exact outputs you want the model to learn."],
            ["Train/test split", "Keeping some examples out of training to measure real performance."],
            ["Distillation", "Using a strong model's outputs to train a smaller one."],
          ],
        },
        {
          id: "eval-finetune",
          title: "Evaluate base vs fine-tuned",
          level: "Hard",
          task: [
            "After training with the Unsloth Colab notebook from the lesson (export to GGUF and `ollama create` it, or serve it any way you like), run both the base model and your fine-tuned model on `test.jsonl`. Report valid-JSON rate and per-field accuracy.",
          ],
          solution: `import json
from openai import OpenAI
from pydantic import ValidationError
from sft_dataset import Label           # previous exercise saved as sft_dataset.py

ollama = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
MODELS = {"base": "qwen2.5:1.5b", "fine-tuned": "ticket-parser"}   # name you gave "ollama create"

tests = [json.loads(l) for l in open("test.jsonl", encoding="utf-8")]

for name, model in MODELS.items():
    valid, correct = 0, dict.fromkeys(["category", "urgency", "order_id"], 0)
    for t in tests:
        msgs = t["messages"][:2]                               # system + user only
        expected = Label.model_validate_json(t["messages"][2]["content"])
        out = ollama.chat.completions.create(model=model, messages=msgs, temperature=0).choices[0].message.content
        try:
            got = Label.model_validate_json(out.strip().strip("\`"))
        except ValidationError:
            continue
        valid += 1
        for field in correct:
            correct[field] += getattr(got, field) == getattr(expected, field)
    n = len(tests)
    print(f"{name:<11} valid JSON {valid / n:.0%} | " +
          " | ".join(f"{f} {c / n:.0%}" for f, c in correct.items()))`,
          explanation: [
            "A fine-tune is only worth it if it measurably beats the base model (and ideally approaches a big API model) on held-out data.",
            "Typical result on narrow tasks: the base small model often breaks the format; the fine-tuned one returns valid JSON almost always, with much better field accuracy.",
            "`dict.fromkeys([...], 0)` creates a dict with every field starting at 0; `True` adds 1 when a field matches.",
          ],
          concepts: [
            ["Held-out evaluation", "Testing on examples the model never saw in training."],
            ["Valid-output rate", "Share of outputs that parse and validate: a key metric for structured tasks."],
            ["`ollama create`", "Registers a local model (for example your GGUF export) under a name."],
          ],
        },
      ],
    },
  ],
};
