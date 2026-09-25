// Day 15: Open-source models & fine-tuning concepts. Shape: see ./index.js
export default {
  hf: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "**Hugging Face** is the GitHub of machine learning: the Hub hosts hundreds of thousands of models and datasets, and the `transformers` library runs them. Even as an application developer you'll use it to try open models, run embedding and reranking models, and publish your fine-tuned model.",
    sections: [
      {
        h: "The Hub",
        blocks: [
          {
            list: [
              "**Models:** each has a model card (what it's for, how it was trained, licence, limitations) and files (weights in `safetensors` format, tokenizer, config).",
              "**Datasets:** browse, preview and load with the `datasets` library.",
              "**Spaces:** hosted demos (Gradio/Streamlit), handy for showing your own model.",
              "**Gated models:** some (e.g. Llama) require accepting a licence on the website and logging in with a token (`huggingface-cli login` or `HF_TOKEN`).",
            ],
          },
          "When you pick a model, read the card: licence (commercial use?), context length, languages, recommended prompt format, and benchmark results.",
        ],
      },
      {
        h: "Pipelines: the quickest way to run a model",
        blocks: [
          {
            lang: "python",
            code: `# uv add transformers torch accelerate
from transformers import pipeline

clf = pipeline("sentiment-analysis")
clf(["The delivery was quick!", "Worst support ever."])
# [{'label': 'POSITIVE', 'score': 0.99}, {'label': 'NEGATIVE', 'score': 0.99}]

summarise = pipeline("summarization", model="facebook/bart-large-cnn")
generate = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct", device_map="auto")
generate([{"role": "user", "content": "Explain RAG in one sentence."}], max_new_tokens=60)`,
          },
        ],
      },
      {
        h: "Tokenizer + model directly",
        blocks: [
          {
            lang: "python",
            code: `from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

name = "Qwen/Qwen2.5-1.5B-Instruct"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto")

messages = [{"role": "user", "content": "Give 3 tips for writing good prompts."}]
inputs = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)
out = model.generate(inputs, max_new_tokens=200, temperature=0.7, do_sample=True)
print(tok.decode(out[0][inputs.shape[-1]:], skip_special_tokens=True))`,
          },
          {
            list: [
              "`apply_chat_template` formats messages in the exact special-token format the model was trained on. Getting this wrong is the most common cause of garbage output from open models.",
              "`device_map=\"auto\"` places layers on available GPUs (or CPU).",
              "Small models (0.5–3B parameters) run on a laptop CPU or free Colab GPU; 7–8B models need a decent GPU or quantisation.",
            ],
          },
          {
            note: "For production serving you won't call `model.generate` in a web server; you'll use a serving engine (next lesson). `transformers` is for experiments, embeddings, classifiers and training.",
          },
        ],
      },
    ],
    revise: [
      "Hub: models (read the card: licence, context, languages, prompt format), datasets, Spaces; gated models need a token.",
      "`pipeline(task, model=...)` is the quickest way to run a model.",
      "`AutoTokenizer` + `AutoModelForCausalLM`; always use `apply_chat_template` for chat models.",
      "0.5–3B models run on laptops; 7–8B need a GPU or quantisation; production uses serving engines.",
    ],
    interview: [
      {
        q: "What would you check before using an open model from Hugging Face in a product?",
        a: "The licence (commercial use, restrictions), the model card's intended use and limitations, context length and language support, benchmark and, more importantly, my own eval results on our task, hardware requirements and latency at the expected size and quantisation, the correct chat template, safety behaviour, and whether it's actively maintained.",
      },
    ],
    practice: [
      "Run a 0.5–1.5B instruct model locally with `transformers` and compare its answer quality with an API model on 5 prompts.",
    ],
  },

  serving: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "To use open models in an app, you need a **serving engine**: software that loads the model once, batches requests from many users efficiently, and exposes an API. **Ollama** is the easy local option; **vLLM** is the production standard for GPUs.",
    sections: [
      {
        h: "Ollama: local models in one command",
        blocks: [
          {
            lang: "bash",
            code: `# install from ollama.com, then:
ollama pull llama3.2           # or qwen2.5, gemma, mistral, phi...
ollama run llama3.2 "Explain HNSW in two sentences"
ollama list
# Ollama serves an API on http://localhost:11434`,
          },
          {
            lang: "python",
            code: `# Ollama exposes an OpenAI-compatible endpoint, so your existing code works
from openai import OpenAI
local = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")   # key is ignored
r = local.chat.completions.create(model="llama3.2",
                                  messages=[{"role": "user", "content": "Hello!"}])

# embeddings too:  ollama pull nomic-embed-text`,
          },
          "Ollama uses quantised GGUF models (via llama.cpp), so 3–8B models run on a laptop. Great for development, offline demos and privacy-sensitive prototypes.",
        ],
      },
      {
        h: "vLLM: production serving",
        blocks: [
          {
            lang: "bash",
            code: `pip install vllm                       # Linux + NVIDIA GPU
vllm serve Qwen/Qwen2.5-7B-Instruct --max-model-len 16384
# OpenAI-compatible server on :8000 → point your OpenAI client's base_url at it`,
          },
          {
            list: [
              "**PagedAttention:** manages the KV cache in pages (like virtual memory), wasting far less GPU memory, so more requests fit at once.",
              "**Continuous batching:** new requests join the running batch as others finish, instead of waiting for a whole batch. Much higher throughput.",
              "Supports quantised models, LoRA adapters (serve many fine-tunes on one base model), tensor parallelism across GPUs, and structured output.",
            ],
          },
          {
            table: {
              head: ["Engine", "Best for"],
              rows: [
                ["Ollama / llama.cpp", "Laptops, CPUs, Macs, local dev"],
                ["vLLM", "GPU production serving, high throughput"],
                ["SGLang, TensorRT-LLM, Hugging Face TGI", "Alternatives for GPU serving"],
                ["Managed (Bedrock, Together, Groq, Fireworks…)", "Open models without running GPUs yourself"],
              ],
            },
          },
        ],
      },
      {
        h: "Self-hosting economics",
        blocks: [
          "A GPU costs the same per hour whether it's busy or idle. Self-hosting beats APIs only with **high, steady utilisation**, or when data can't leave your infrastructure, or you need a custom fine-tuned model. At low or spiky volume, APIs (or serverless open-model providers) are almost always cheaper and far less work.",
          {
            lang: "text",
            code: `Rough comparison method:
  GPU cost/month ÷ tokens you'd actually serve per month  vs  API price per token
  + engineering time for ops, scaling, monitoring, upgrades`,
          },
        ],
      },
    ],
    revise: [
      "Ollama: `ollama pull/run`, OpenAI-compatible API at `localhost:11434/v1`, GGUF quantised models; great for local dev.",
      "vLLM: GPU production serving; PagedAttention + continuous batching → high throughput; OpenAI-compatible; LoRA adapters.",
      "Alternatives: SGLang, TensorRT-LLM, TGI; managed open-model providers.",
      "Self-host only with high steady utilisation, strict data residency or custom models.",
    ],
    interview: [
      {
        q: "When would you self-host instead of using an API?",
        a: "When data can't leave our infrastructure for regulatory or contractual reasons; when volume is high and steady enough that GPU utilisation makes per-token cost lower than APIs; when we need a custom fine-tuned or specialised open model; or when we need guaranteed latency or offline operation. Otherwise APIs win on quality, simplicity and cost at low or spiky volume. Managed open-model endpoints are a middle path.",
      },
      {
        q: "Why is vLLM faster than a naive transformers server?",
        a: "It uses PagedAttention to store the KV cache in non-contiguous blocks, drastically reducing memory fragmentation so many more concurrent sequences fit on the GPU, and continuous batching so new requests are added to the running batch token by token instead of waiting. Together they multiply throughput under concurrent load.",
      },
    ],
    practice: [
      "Install Ollama, pull a small model, and point DocChat's OpenAI-compatible adapter at it via `base_url`.",
    ],
  },

  quantization: {
    minutes: 35,
    level: "Intermediate",
    intro:
      "Model weights are numbers. Storing them with fewer bits (**quantisation**) makes models much smaller and faster, which is how 8-billion-parameter models run on laptops. It's a standard interview topic because it underpins local and self-hosted AI.",
    sections: [
      {
        h: "The memory maths",
        blocks: [
          "Memory for the weights ≈ **parameters × bytes per parameter** (plus extra for the KV cache and activations during inference).",
          {
            table: {
              head: ["Precision", "Bytes / param", "8B model", "70B model"],
              rows: [
                ["FP32", "4", "~32 GB", "~280 GB"],
                ["FP16 / BF16", "2", "~16 GB", "~140 GB"],
                ["INT8", "1", "~8 GB", "~70 GB"],
                ["4-bit", "0.5", "~4–5 GB", "~35–40 GB"],
              ],
            },
          },
        ],
      },
      {
        h: "How it works, and what it costs",
        blocks: [
          "Quantisation maps each weight (or small group of weights) from a 16-bit float to a low-bit integer plus a scale factor. Some precision is lost, but LLMs are surprisingly robust: good 8-bit quantisation is nearly lossless, and 4-bit usually keeps most quality. Below 4 bits, quality drops faster.",
          {
            table: {
              head: ["Format / method", "Used with"],
              rows: [
                ["**GGUF** (e.g. Q4_K_M, Q5_K_M, Q8_0)", "llama.cpp, Ollama; CPU and Apple Silicon friendly"],
                ["**GPTQ, AWQ**", "GPU inference (vLLM and others)"],
                ["**bitsandbytes** 8-bit / 4-bit NF4", "Loading in transformers; used by QLoRA training"],
                ["FP8", "Newer GPUs; near-lossless, fast"],
              ],
            },
          },
          {
            list: [
              "**Gains:** 2–4× less memory, often faster inference (less data to move), cheaper hardware.",
              "**Costs:** some quality loss (worse on maths, code and long reasoning first), and occasionally slower if the hardware lacks fast low-bit kernels.",
              "Always evaluate the quantised model on your own tasks; don't assume.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Weights memory ≈ params × bytes/param: FP16 = 2, INT8 = 1, 4-bit = 0.5 (8B model: ~16 / 8 / ~4–5 GB).",
      "Quantisation stores weights in fewer bits with scale factors; 8-bit ≈ lossless, 4-bit usually good, below that degrades.",
      "GGUF (llama.cpp/Ollama), GPTQ/AWQ (GPU), bitsandbytes NF4 (QLoRA), FP8.",
      "Evaluate quality on your own tasks after quantising.",
    ],
    interview: [
      {
        q: "What is quantisation and what does it cost you?",
        a: "Representing model weights (and sometimes activations) with fewer bits, such as 8-bit or 4-bit integers instead of 16-bit floats, using scale factors per group of weights. It cuts memory 2–4× and often speeds up inference, letting bigger models run on smaller hardware. The cost is some accuracy loss, usually small at 8-bit and moderate at 4-bit, showing up first on precise tasks like maths and code, so you validate with evals.",
      },
      {
        q: "How much GPU memory do you need to serve a 7B model?",
        a: "Weights alone are about 14 GB in FP16 or roughly 4–5 GB in 4-bit. On top of that you need memory for the KV cache, which grows with context length and the number of concurrent requests, plus runtime overhead. So a 24 GB GPU comfortably serves a 7B FP16 model with moderate concurrency, while a 4-bit version fits on much smaller GPUs or a laptop.",
      },
    ],
    practice: [
      "In Ollama, run the same model at two quantisation levels (e.g. `q4_K_M` and `q8_0` tags) and compare memory use and answers on 5 prompts.",
    ],
  },

  lora: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Fine-tuning continues training a model on your own examples. Full fine-tuning updates every weight, which is expensive. **LoRA** and **QLoRA** train a tiny fraction of parameters and get most of the benefit on a single GPU. You need to explain these clearly in interviews and have done one yourself.",
    sections: [
      {
        h: "SFT: supervised fine-tuning",
        blocks: [
          "You prepare examples of the behaviour you want, usually in chat format, and train the model to produce the assistant responses:",
          {
            lang: "json",
            code: `{"messages": [
  {"role": "system", "content": "Classify the support ticket. Reply with JSON."},
  {"role": "user", "content": "Paid twice for order 4521, need money back"},
  {"role": "assistant", "content": "{\\"category\\": \\"billing\\", \\"urgency\\": 4, \\"refund_requested\\": true}"}
]}`,
            caption: "One line of a JSONL training file. Hundreds to a few thousand good examples are typical for narrow tasks.",
          },
          "Data quality matters far more than quantity: consistent, correct, diverse examples covering edge cases. Keep a separate evaluation set that is never trained on.",
        ],
      },
      {
        h: "LoRA: low-rank adaptation",
        blocks: [
          "Instead of updating a huge weight matrix **W** (say 4096 × 4096 ≈ 16.7M numbers), LoRA freezes W and learns a small update expressed as the product of two thin matrices: **ΔW = B × A**, where A is r × 4096 and B is 4096 × r, with a small rank r (e.g. 8–64).",
          {
            lang: "text",
            code: `W' = W + (α / r) · B·A        W frozen;  only A and B are trained

rank r = 16:  A and B have 2 × 4096 × 16 ≈ 131K params   vs   16.7M for the full matrix (~0.8%)`,
          },
          {
            list: [
              "Trains well under 1% of parameters, so it needs far less GPU memory and time.",
              "The result is a small **adapter** file (tens of MB) that you load on top of the base model. You can keep many adapters for different tasks and swap them (vLLM can serve many at once).",
              "Adapters can also be merged into the base weights for deployment.",
              "Key settings: `r` (rank), `lora_alpha` (scaling), `target_modules` (which layers get adapters, typically the attention and MLP projections), learning rate and epochs.",
            ],
          },
        ],
      },
      {
        h: "QLoRA",
        blocks: [
          "**QLoRA** loads the frozen base model in **4-bit** (NF4 via bitsandbytes) and trains LoRA adapters on top in higher precision. The frozen weights take a quarter of the memory, so a 7–8B model can be fine-tuned on a single consumer or free Colab GPU. Quality is close to 16-bit LoRA.",
          {
            table: {
              head: ["Method", "Trains", "Memory (7–8B model, roughly)"],
              rows: [
                ["Full fine-tuning", "All weights", "Very high: many GPUs"],
                ["LoRA (16-bit base)", "Adapters only", "One large GPU"],
                ["QLoRA (4-bit base)", "Adapters only", "One 16–24 GB GPU; small models fit a free Colab T4"],
              ],
            },
          },
          "**PEFT** (Parameter-Efficient Fine-Tuning) is the umbrella term, and also the Hugging Face library that implements LoRA and friends. **TRL** provides trainers (`SFTTrainer`, `DPOTrainer`). **Unsloth** wraps them with speed and memory optimisations.",
        ],
      },
      {
        h: "DPO (concept)",
        blocks: [
          "After SFT, you can align the model to preferences with **DPO**: training pairs of a prompt with a *chosen* and a *rejected* response. The model learns to prefer the chosen style, such as more concise answers or refusing out-of-scope requests. It's simpler than RLHF (Day 3) and supported by TRL's `DPOTrainer`, usually with LoRA.",
        ],
      },
    ],
    revise: [
      "SFT: train on chat-format examples of desired outputs; quality > quantity; separate eval set.",
      "LoRA: freeze W, learn ΔW = B·A with small rank r; <1% of params trained; small swappable adapters; can merge.",
      "Settings: r, lora_alpha, target_modules, learning rate, epochs.",
      "QLoRA: 4-bit NF4 frozen base + LoRA adapters → fine-tune 7–8B on one GPU.",
      "PEFT (concept + library), TRL (trainers), Unsloth (fast wrapper). DPO: chosen vs rejected pairs.",
    ],
    interview: [
      {
        q: "Explain LoRA simply.",
        a: "Instead of changing all of a model's billions of weights, LoRA freezes them and adds small trainable matrices beside certain layers. The weight update is represented as the product of two thin matrices of low rank, so you train well under 1% of the parameters. That makes fine-tuning cheap and fast, and the result is a small adapter file you can load, swap or merge into the base model.",
      },
      {
        q: "What does QLoRA add?",
        a: "It quantises the frozen base model to 4-bit (NF4) to cut its memory by about 4×, while training the LoRA adapters in higher precision, with tricks like double quantisation and paged optimisers to save more memory. This allows fine-tuning 7B+ models on a single consumer GPU with quality close to 16-bit LoRA.",
      },
    ],
    practice: [
      "Write 20 training examples in chat JSONL for a narrow task (e.g. converting informal Hinglish support messages into structured JSON).",
    ],
  },

  decision: {
    minutes: 35,
    level: "Intermediate",
    intro:
      "\"Should we use RAG or fine-tune?\" is one of the most common GenAI interview questions. The strong answer is a set of clear decision rules, not a favourite technique.",
    sections: [
      {
        h: "What each approach changes",
        blocks: [
          {
            table: {
              head: ["Approach", "Changes", "Best for", "Weak at"],
              rows: [
                ["**Prompting** (incl. few-shot)", "Instructions and examples per request", "Most tasks; fast iteration", "Very long prompts; strict consistency at scale"],
                ["**RAG**", "The **knowledge** the model sees", "Private, changing or large knowledge; citations; access control", "Teaching new behaviour or formats"],
                ["**Fine-tuning**", "The model's **behaviour**: format, style, tone, narrow skills", "Consistent output format, domain style, classification, making small models match big ones", "Adding frequently changing facts; it's costly to update"],
                ["**Tools**", "What the model can **do** or look up live", "Calculations, live data, actions", "—"],
              ],
            },
          },
          {
            note: "The classic rule: **RAG for knowledge, fine-tuning for behaviour.** They're often combined: a fine-tuned small model that follows your format, fed by RAG.",
          },
        ],
      },
      {
        h: "Decision order",
        blocks: [
          {
            list: [
              "**Prompt first.** A clear prompt with examples and structured output solves most tasks. Build an eval set now.",
              "**Missing or changing knowledge?** Add RAG (or tools for live data).",
              "**Still inconsistent format/style, or prompts are huge and costly, or latency needs a smaller model?** Fine-tune, often a smaller model, with examples collected from the prompted big model plus human fixes.",
              "**Re-evaluate** against the same eval set at every step.",
            ],
            ordered: true,
          },
          {
            table: {
              head: ["Scenario", "Choice"],
              rows: [
                ["Chatbot over HR policies that change quarterly", "RAG"],
                ["Classify 2M support tickets/day into 40 categories cheaply", "Fine-tune a small model (after prototyping with prompts)"],
                ["Always reply in the company's brand voice and JSON format", "Prompting first; fine-tune if inconsistent at scale"],
                ["Answer questions about today's order status", "Tools / API calls"],
                ["Medical Q&A with citations", "RAG (+ strict guardrails), possibly a fine-tuned model for style"],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "Prompting → behaviour per request; RAG → knowledge; fine-tuning → consistent behaviour/format/style, smaller models; tools → live data and actions.",
      "RAG for knowledge, fine-tuning for behaviour; often combined.",
      "Order: prompt + eval set → RAG/tools for knowledge → fine-tune for consistency, cost or latency → re-evaluate.",
    ],
    interview: [
      {
        q: "RAG vs fine-tuning: how do you decide?",
        a: "I start with prompting and an eval set. If the model lacks knowledge, especially private or frequently changing information, or we need citations and access control, I add RAG, since fine-tuning is a poor, expensive way to inject facts that change. If the problem is behaviour, like inconsistent format, domain style, a narrow classification task at high volume, or needing a smaller cheaper model to match a larger one, I fine-tune, typically with LoRA. They combine well: a fine-tuned model that consumes retrieved context.",
      },
    ],
    practice: [
      "Write your decision (with reasons) for 3 scenarios from your own past MERN projects where an LLM could help.",
    ],
  },

  ollama: {
    minutes: 90,
    level: "Beginner",
    intro:
      "Run an open model locally with Ollama and plug it into DocChat, for both generation and embeddings. You'll see first-hand how local models compare, and you'll have a \"runs fully offline\" mode to show in interviews.",
    sections: [
      {
        h: "Steps",
        blocks: [
          {
            lang: "bash",
            code: `ollama pull qwen2.5:7b          # or llama3.1:8b / llama3.2:3b on smaller machines
ollama pull nomic-embed-text   # local embedding model`,
          },
          {
            lang: "python",
            code: `# settings: LLM_PROVIDERS=["openai_compat:qwen2.5:7b@http://localhost:11434/v1"]
class OpenAICompatProvider(OpenAIProvider):
    name = "openai_compat"
    def __init__(self, spec: str):
        model, base_url = spec.split("@")
        self.client = AsyncOpenAI(base_url=base_url, api_key="local")
        self.model = model`,
          },
          {
            list: [
              "Add an Ollama-backed embedding function and create a **separate collection** for its vectors (different model, different dimensions).",
              "Re-index a few documents with local embeddings.",
              "Run your eval set in fully local mode and compare with the API mode: accuracy, faithfulness, latency.",
            ],
            ordered: true,
          },
        ],
      },
      {
        h: "What to note in the README",
        blocks: [
          {
            table: {
              head: ["Mode", "Correct (30 Qs)", "Faithfulness", "p50 latency", "Cost"],
              rows: [
                ["API models", "…", "…", "…", "$ per 1k"],
                ["Local (Ollama, 7B, 4-bit)", "…", "…", "…", "Hardware only"],
              ],
            },
          },
          "Typical findings: local small models are decent on simple grounded questions, weaker at following strict citation formats and at multi-part questions, and slower on a laptop. That nuance is exactly what interviewers want to hear.",
        ],
      },
    ],
    revise: [
      "Ollama's OpenAI-compatible endpoint plugs into the existing adapter via `base_url`.",
      "Local embeddings need their own collection.",
      "Compare local vs API on the same eval set: quality, faithfulness, latency, cost.",
    ],
    practice: [
      "Try a smaller (3B) model and note where quality drops.",
    ],
  },

  qlora: {
    minutes: 240,
    level: "Advanced",
    intro:
      "Fine-tune a small model with QLoRA on a free Colab GPU using Unsloth, evaluate it against the base model, and publish it on Hugging Face. It's a mini-project that proves you understand fine-tuning in practice, not just in theory.",
    sections: [
      {
        h: "Choose a narrow task",
        blocks: [
          "Fine-tuning shines on narrow, consistent tasks. Good options:",
          {
            list: [
              "Hinglish support message → structured JSON (category, urgency, entities).",
              "Informal job description → standardised skills list.",
              "Commit diff → conventional commit message.",
            ],
          },
          "Build **300–1,000 examples**: generate drafts with a strong API model, then review and fix them by hand (this is standard practice, called distillation). Split 90/10 into train and test.",
        ],
      },
      {
        h: "Training with Unsloth (Colab, T4 GPU)",
        blocks: [
          {
            lang: "python",
            code: `# In Colab: Runtime → Change runtime type → T4 GPU
# !pip install unsloth
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/Qwen2.5-1.5B-Instruct", max_seq_length=2048, load_in_4bit=True)     # QLoRA base

model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=16, lora_dropout=0,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"])

ds = load_dataset("json", data_files={"train": "train.jsonl", "test": "test.jsonl"})
ds = ds.map(lambda ex: {"text": tokenizer.apply_chat_template(ex["messages"], tokenize=False)})

trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=ds["train"], eval_dataset=ds["test"],
    args=SFTConfig(dataset_text_field="text", per_device_train_batch_size=2,
                   gradient_accumulation_steps=4, num_train_epochs=2, learning_rate=2e-4,
                   logging_steps=10, output_dir="outputs"),
)
trainer.train()
model.save_pretrained("ticket-parser-lora")            # the adapter (small)`,
            caption: "Library APIs evolve; follow the current Unsloth notebook for your chosen model if anything differs.",
          },
          {
            list: [
              "Watch the training loss go down and the eval loss not go up (rising eval loss = overfitting; reduce epochs).",
              "Training ~500 short examples on a T4 takes minutes, not hours.",
            ],
          },
        ],
      },
      {
        h: "Evaluate and publish",
        blocks: [
          {
            list: [
              "Run the **base** and **fine-tuned** models on the test set; measure valid-JSON rate and field accuracy.",
              "Compare with the big API model too; a fine-tuned 1.5B model matching it on a narrow task is a great result.",
              "Push the adapter (or merged model) to the Hub: `model.push_to_hub(\"yourname/ticket-parser-lora\")`, and write a model card: task, data, training settings, results, limitations.",
              "Optionally export to GGUF and run it in Ollama.",
            ],
          },
          {
            lang: "markdown",
            code: `| Model | Valid JSON | Field accuracy | Cost / 1k |
|---|---|---|---|
| Qwen2.5-1.5B base | 71% | 58% | ~0 (local) |
| Qwen2.5-1.5B + QLoRA | 99% | 91% | ~0 (local) |
| Large API model (few-shot) | 100% | 93% | $… |`,
            caption: "Example layout; report your real numbers.",
          },
        ],
      },
    ],
    revise: [
      "Narrow task; 300–1,000 reviewed chat-format examples (distilled from a strong model + human fixes); train/test split.",
      "Unsloth: 4-bit base + LoRA (r=16) + TRL SFTTrainer; watch train vs eval loss.",
      "Evaluate base vs fine-tuned vs API model on held-out data; publish adapter + model card.",
    ],
    practice: [
      "Try r=8 vs r=32 and 1 vs 3 epochs; record the effect on test accuracy.",
    ],
  },
};
