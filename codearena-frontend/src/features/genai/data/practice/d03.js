// Day 3 practice: tokens, embeddings, sampling, cost. Shape: see ./index.js
export default {
  intro:
    "Nine exercises that make LLM concepts concrete: count tokens, compute similarity by hand, simulate temperature and top-p without any API, then confirm with real calls. You'll also create `llm.py`, a tiny helper you'll reuse for the rest of the plan.",
  setup: [
    "Create today's project and choose **one** LLM provider. Ollama is free and runs on your laptop; the others need an API key.",
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day03 && cd ~/genai-practice/day03
uv init --no-readme .
uv add openai python-dotenv tiktoken numpy`,
    },
    {
      table: {
        head: ["Provider", "`.env` values", "Cost"],
        rows: [
          ["**Ollama** (local)", "`LLM_BASE_URL=http://localhost:11434/v1`, `LLM_API_KEY=ollama`, `LLM_MODEL=llama3.2`, `EMBED_MODEL=nomic-embed-text` (first run `ollama pull llama3.2` and `ollama pull nomic-embed-text`)", "Free"],
          ["**OpenAI**", "`LLM_API_KEY=sk-...`, `LLM_MODEL=gpt-4o-mini`, `EMBED_MODEL=text-embedding-3-small` (leave `LLM_BASE_URL` empty)", "Paid, cheap"],
          ["**Google Gemini**", "`LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`, `LLM_API_KEY=<your key>`, `LLM_MODEL=gemini-2.5-flash` (check Google's docs for the current embedding model name)", "Free tier"],
        ],
      },
    },
    "Then save this as `llm.py` in the folder. Every exercise imports from it. Copy it into later days' folders too.",
    {
      lang: "python",
      code: `# llm.py: one small client for all practice exercises
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(base_url=os.getenv("LLM_BASE_URL") or None, api_key=os.getenv("LLM_API_KEY", "missing"))
CHAT_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

def chat(prompt: str, system: str | None = None, **options) -> str:
    messages = [{"role": "system", "content": system}] if system else []
    messages.append({"role": "user", "content": prompt})
    r = client.chat.completions.create(model=CHAT_MODEL, messages=messages, **options)
    return r.choices[0].message.content

def embed(texts: list[str]) -> list[list[float]]:
    r = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in r.data]`,
    },
    { warn: "Add `.env` to `.gitignore`. Never commit API keys." },
  ],
  groups: [
    {
      title: "Tokens and the context window",
      exercises: [
        {
          id: "see-tokens",
          title: "See how text becomes tokens",
          level: "Easy",
          task: [
            "Use `tiktoken` to encode 3 strings and print the token count and each token piece: an English sentence, the word `strawberry`, and a line of Python code.",
            { lang: "text", code: `'Retrieval augmented generation is powerful' → N tokens: ['Ret', 'rieval', ' augmented', ...]\n(exact pieces and counts depend on the tokenizer)` },
          ],
          hint: "`enc = tiktoken.get_encoding(\"o200k_base\")`, `ids = enc.encode(text)`, `enc.decode([i])` for one token.",
          solution: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")

for text in ["Retrieval augmented generation is powerful",
             "strawberry",
             "def add(a, b): return a + b"]:
    ids = enc.encode(text)
    pieces = [enc.decode([i]) for i in ids]
    print(f"{text!r} → {len(ids)} tokens: {pieces}")`,
          explanation: [
            "The model never sees letters; it sees these integer IDs. Common words are one token; rarer words are split into pieces.",
            "Notice spaces are usually glued to the start of the next token (`' augmented'`).",
            "`strawberry` is split into chunks like `str` / `aw` / `berry`, which is why models struggle to count its letters.",
            "`{text!r}` prints the string with quotes (its \"repr\"), which makes spaces visible.",
          ],
          concepts: [
            ["Token", "A chunk of text from the model's vocabulary; roughly 4 English characters on average."],
            ["Tokenizer / encoding", "The rules that turn text into token IDs and back. `o200k_base` is one used by OpenAI models."],
            ["`!r` in an f-string", "Shows the value's `repr()`, e.g. with quotes around strings."],
          ],
        },
        {
          id: "language-cost",
          title: "Compare tokens across languages",
          level: "Easy",
          task: [
            "Count tokens for the same sentence in English, Hindi (Devanagari) and Hinglish (Hindi in Latin letters). Print tokens per word for each. What does this mean for the cost of a Hindi chatbot?",
            {
              lang: "python",
              code: `texts = {
    "English": "Please send the refund to my bank account by tomorrow",
    "Hindi": "कृपया कल तक रिफंड मेरे बैंक खाते में भेज दीजिए",
    "Hinglish": "Please kal tak refund mere bank account mein bhej dijiye",
}`,
            },
          ],
          solution: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")
texts = {
    "English": "Please send the refund to my bank account by tomorrow",
    "Hindi": "कृपया कल तक रिफंड मेरे बैंक खाते में भेज दीजिए",
    "Hinglish": "Please kal tak refund mere bank account mein bhej dijiye",
}

for lang, text in texts.items():
    tokens = len(enc.encode(text))
    words = len(text.split())
    print(f"{lang:<9} {tokens:>3} tokens  {tokens / words:.2f} tokens/word")`,
          explanation: [
            "Scripts that were rarer in the tokenizer's training data need more tokens per word. More tokens means higher cost, more latency and less room in the context window.",
            "Results differ between tokenizers; newer ones handle Indian languages better. Always measure with the tokenizer (or `usage`) of the model you'll actually use.",
            "`.items()` loops over a dict's (key, value) pairs.",
          ],
          concepts: [
            ["`dict.items()`", "Returns (key, value) pairs for looping."],
            ["Tokens per word", "A quick way to compare how \"expensive\" text is in different languages."],
          ],
        },
        {
          id: "trim-history",
          title: "Trim chat history to a token budget",
          level: "Medium",
          task: [
            "Write `trim_history(messages, max_tokens)` that always keeps the first (system) message, then drops the **oldest** other messages until the total token count is within `max_tokens`. Test it with a system message plus 10 long messages and a budget of 200.",
          ],
          hint: "Count tokens as the sum of `len(enc.encode(m[\"content\"]))`. Keep `system = messages[0]` and `rest = messages[1:]`, and remove `rest[0]` in a loop.",
          solution: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")

def count(messages: list[dict]) -> int:
    return sum(len(enc.encode(m["content"])) for m in messages)

def trim_history(messages: list[dict], max_tokens: int) -> list[dict]:
    system, rest = messages[0], list(messages[1:])
    while rest and count([system, *rest]) > max_tokens:
        rest.pop(0)                       # drop the oldest message
    return [system, *rest]

history = [{"role": "system", "content": "You are a helpful tutor."}]
for i in range(10):
    role = "user" if i % 2 == 0 else "assistant"
    history.append({"role": role, "content": f"Message {i}: " + "blah " * 30})

trimmed = trim_history(history, max_tokens=200)
print(count(history), "→", count(trimmed), "tokens")
print([m["content"][:10] for m in trimmed])`,
          explanation: [
            "The model has no memory between calls; your app resends history every time, so long chats get expensive and eventually exceed the context window.",
            "`[system, *rest]` builds a new list with the system message first, then everything in `rest` (the `*` spreads a list, like `...` in JS).",
            "`list(messages[1:])` makes a copy, so `pop` doesn't change the caller's list.",
            "Real apps often drop user/assistant messages in pairs, or summarise old turns instead of deleting them.",
          ],
          concepts: [
            ["Context window", "The maximum tokens (input + output) a model handles in one request."],
            ["`list.pop(0)`", "Removes and returns the first item of a list."],
            ["`*list` in a list literal", "Unpacks the items into the new list."],
          ],
        },
      ],
    },
    {
      title: "Embeddings and similarity",
      exercises: [
        {
          id: "cosine-by-hand",
          title: "Cosine similarity in pure Python",
          level: "Easy",
          task: [
            "Without NumPy, write `cosine(a, b)` for two lists of numbers. Test it with vectors that point the same way, opposite ways and at right angles.",
            { lang: "python", code: `cosine([1, 2, 3], [2, 4, 6])    # 1.0\ncosine([1, 0], [-1, 0])         # -1.0\ncosine([1, 0], [0, 1])          # 0.0` },
          ],
          hint: "Dot product = `sum(x * y for x, y in zip(a, b))`. Length = `math.sqrt(sum(x * x for x in v))`.",
          solution: `import math

def cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

print(cosine([1, 2, 3], [2, 4, 6]))
print(cosine([1, 0], [-1, 0]))
print(cosine([1, 0], [0, 1]))`,
          explanation: [
            "Cosine similarity measures the **angle** between vectors, ignoring their length. Same direction = 1, unrelated = 0, opposite = −1.",
            "`zip(a, b)` pairs up items from both lists: `(a[0], b[0]), (a[1], b[1]), ...`.",
            "This is a common interview coding question (\"implement cosine similarity without numpy\"). Mention the zero-vector and length checks.",
          ],
          concepts: [
            ["Vector", "A list of numbers. An embedding is a vector representing the meaning of a text."],
            ["Dot product", "Sum of pairwise products of two vectors."],
            ["`zip()`", "Pairs items from several lists together."],
            ["`math.sqrt()`", "Square root."],
          ],
        },
        {
          id: "closest-faq",
          title: "Find the closest FAQ with real embeddings",
          level: "Medium",
          task: [
            "Embed 6 FAQ questions with `llm.embed`, then for 3 user queries print the best-matching FAQ and its similarity score. Use a paraphrase that shares no words with the FAQ, like \"I forgot my login\" → \"How do I reset my password?\".",
          ],
          starter: `from llm import embed

faqs = [
    "How do I reset my password?",
    "What payment methods do you accept?",
    "Can I get a refund after 30 days?",
    "How long does delivery take to Pune?",
    "How do I change my delivery address?",
    "Do you offer cash on delivery?",
]
queries = ["I forgot my login", "can I pay with UPI", "my parcel is late"]`,
          solution: `import numpy as np
from llm import embed

faqs = [
    "How do I reset my password?",
    "What payment methods do you accept?",
    "Can I get a refund after 30 days?",
    "How long does delivery take to Pune?",
    "How do I change my delivery address?",
    "Do you offer cash on delivery?",
]
queries = ["I forgot my login", "can I pay with UPI", "my parcel is late"]

def normalise(vectors) -> np.ndarray:
    v = np.array(vectors, dtype=np.float32)
    return v / np.linalg.norm(v, axis=1, keepdims=True)

faq_vecs = normalise(embed(faqs))
query_vecs = normalise(embed(queries))

for q, qv in zip(queries, query_vecs):
    scores = faq_vecs @ qv                # cosine similarity with every FAQ at once
    best = int(np.argmax(scores))
    print(f"{q!r:24} → {faqs[best]!r}  ({scores[best]:.2f})")`,
          explanation: [
            "After normalising (dividing each vector by its length), cosine similarity is just a dot product. `faq_vecs @ qv` computes it against every FAQ in one step.",
            "`np.argmax(scores)` gives the index of the highest score.",
            "Notice that matches work without shared words: that's semantic search, the core of RAG.",
            "Scores differ between embedding models; compare them only within the same model.",
          ],
          concepts: [
            ["Embedding", "A vector produced by a model so that texts with similar meaning have similar vectors."],
            ["NumPy array", "Fast numeric arrays. `@` is matrix multiplication."],
            ["Normalising", "Scaling a vector to length 1 so dot product equals cosine similarity."],
            ["`np.argmax()`", "Index of the largest value."],
          ],
        },
      ],
    },
    {
      title: "Sampling: temperature and top-p",
      exercises: [
        {
          id: "softmax-temperature",
          title: "Simulate temperature on a toy model",
          level: "Medium",
          task: [
            "A model produced these scores (logits) for the next word after \"The best way to learn Python is\". Turn them into probabilities with softmax at temperatures 0.2, 1.0 and 2.0 and print them. Then sample 20 words at each temperature with `random.choices`.",
            { lang: "python", code: `logits = {" by": 2.0, " to": 1.8, " practice": 0.5, " through": 0.1, " dancing": -1.5}` },
          ],
          hint: "Softmax with temperature: `p_i = exp(l_i / T) / sum(exp(l_j / T))`.",
          solution: `import math
import random
from collections import Counter

logits = {" by": 2.0, " to": 1.8, " practice": 0.5, " through": 0.1, " dancing": -1.5}

def softmax(scores: dict[str, float], temperature: float) -> dict[str, float]:
    exps = {tok: math.exp(s / temperature) for tok, s in scores.items()}
    total = sum(exps.values())
    return {tok: e / total for tok, e in exps.items()}

for t in [0.2, 1.0, 2.0]:
    probs = softmax(logits, t)
    shown = ", ".join(f"{tok.strip()}={p:.2f}" for tok, p in probs.items())
    picks = random.choices(list(probs), weights=list(probs.values()), k=20)
    print(f"T={t}: {shown}")
    print("   sampled:", dict(Counter(p.strip() for p in picks)))`,
          explanation: [
            "Dividing scores by a small temperature exaggerates differences, so the top word gets almost all the probability (focused, repeatable output).",
            "A large temperature flattens differences, so unlikely words like \"dancing\" get picked more (creative, then nonsense).",
            "`random.choices(items, weights=..., k=20)` picks 20 items with the given probabilities, exactly how sampling works.",
            "This is what the `temperature` parameter does inside the model at every token.",
          ],
          concepts: [
            ["Logits", "Raw scores the model gives each possible next token."],
            ["Softmax", "Turns scores into probabilities that add up to 1."],
            ["Temperature", "Divides logits before softmax: low = focused, high = random."],
            ["`random.choices()`", "Random picks with weights (probabilities)."],
          ],
        },
        {
          id: "top-p",
          title: "Implement top-p (nucleus) filtering",
          level: "Medium",
          task: [
            "Write `top_p_filter(probs, p)` that keeps the smallest set of most-likely tokens whose probabilities add up to at least `p`, then re-normalises them. Use the T=1.0 probabilities from the previous exercise with p = 0.9.",
          ],
          hint: "Sort items by probability descending, add them one at a time until the running total reaches `p`, then divide each kept probability by the kept total.",
          solution: `def top_p_filter(probs: dict[str, float], p: float) -> dict[str, float]:
    kept, running = {}, 0.0
    for tok, prob in sorted(probs.items(), key=lambda kv: kv[1], reverse=True):
        kept[tok] = prob
        running += prob
        if running >= p:
            break
    total = sum(kept.values())
    return {tok: prob / total for tok, prob in kept.items()}

probs = {" by": 0.44, " to": 0.36, " practice": 0.10, " through": 0.07, " dancing": 0.03}
print(top_p_filter(probs, 0.9))
# {' by': 0.49, ' to': 0.40, ' practice': 0.11}  (the unlikely tail is cut off)`,
          explanation: [
            "Top-p cuts off the long tail of unlikely tokens, which is where nonsense comes from, while adapting to how confident the model is.",
            "`sorted(..., key=lambda kv: kv[1], reverse=True)` sorts (token, prob) pairs by probability, highest first.",
            "`break` leaves the loop as soon as the running total reaches `p`.",
          ],
          concepts: [
            ["Top-p (nucleus sampling)", "Sample only from the smallest set of tokens covering probability `p`."],
            ["`break`", "Exits the nearest loop immediately."],
          ],
        },
        {
          id: "real-temperature",
          title: "Measure temperature with a real model",
          level: "Easy",
          task: [
            "Ask \"Write a 5-word tagline for a chai startup\" 5 times at temperature 0 and 5 times at 1.2 using `llm.chat`. Print how many **distinct** answers you got at each temperature.",
          ],
          solution: `from llm import chat

prompt = "Write a 5-word tagline for a chai startup. Reply with the tagline only."
for t in [0, 1.2]:
    answers = [chat(prompt, temperature=t, max_tokens=30).strip() for _ in range(5)]
    print(f"temperature {t}: {len(set(answers))} distinct")
    for a in answers:
        print("  -", a)`,
          explanation: [
            "At temperature 0 you should see the same (or nearly the same) answer every time; at 1.2 they vary.",
            "`set(answers)` removes duplicates, so its length is the number of distinct answers.",
            "`_` is the conventional name for a loop variable you don't use.",
            "Some newer models don't accept `temperature`. If you get an error about it, try another model or remove the parameter.",
          ],
          concepts: [
            ["`**options` passthrough", "`chat(..., temperature=0)` forwards the option to the API through `**options` in `llm.py`."],
            ["`len(set(items))`", "Number of unique items."],
          ],
        },
      ],
    },
    {
      title: "Cost",
      exercises: [
        {
          id: "cost-estimate",
          title: "Estimate monthly cost for three models",
          level: "Easy",
          task: [
            "A chatbot gets 2,000 questions a day. Each uses 2,500 input and 300 output tokens. Using a price table (dollars per million tokens), print the monthly cost for three models, cheapest first. Use example prices, and note that real prices must come from the providers' pages.",
            {
              lang: "python",
              code: `PRICES = {   # example numbers: $ per 1M tokens (input, output)
    "small": (0.15, 0.60),
    "medium": (2.50, 10.00),
    "large": (5.00, 25.00),
}`,
            },
          ],
          solution: `PRICES = {
    "small": (0.15, 0.60),
    "medium": (2.50, 10.00),
    "large": (5.00, 25.00),
}

def monthly_cost(model: str, questions_per_day: int, tokens_in: int, tokens_out: int) -> float:
    price_in, price_out = PRICES[model]
    per_question = tokens_in / 1e6 * price_in + tokens_out / 1e6 * price_out
    return per_question * questions_per_day * 30

costs = {m: monthly_cost(m, 2000, 2500, 300) for m in PRICES}
for model, cost in sorted(costs.items(), key=lambda kv: kv[1]):
    print(f"{model:<7} \${cost:>9,.2f} / month")`,
          explanation: [
            "Cost per call = input tokens × input price + output tokens × output price. Prices are per million tokens, hence `/ 1e6` (1e6 means 1,000,000).",
            "A dict comprehension `{m: ... for m in PRICES}` builds a dict of model → cost.",
            "The gap between small and large models is often 10–30×, which is why routing easy questions to small models matters.",
          ],
          concepts: [
            ["`1e6`", "Scientific notation for 1,000,000 (a float)."],
            ["Tuple unpacking `a, b = PRICES[m]`", "Splits a 2-item tuple into two variables."],
            ["Dict comprehension", "`{key: value for item in items}` builds a dict in one expression."],
            ["`:,.2f`", "Format with thousands separators and 2 decimals."],
          ],
        },
      ],
    },
  ],
};
