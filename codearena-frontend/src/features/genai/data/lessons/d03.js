// Day 3: How LLMs work. Shape: see ./index.js
export default {
  tokens: {
    minutes: 45,
    level: "Beginner",
    intro:
      "LLMs don't read characters or words; they read **tokens**. Tokens decide what you pay, how much text fits in a request, why models are bad at counting letters, and why Hindi text costs more than English. Every GenAI developer needs this mental model.",
    sections: [
      {
        h: "What a token is",
        blocks: [
          "A token is a chunk of text from a fixed vocabulary, usually 50,000 to 200,000 entries. Common words are one token; rare words are split into pieces. Each token maps to an integer ID, and the model only ever sees those integers.",
          {
            lang: "text",
            code: `"Retrieval augmented generation is powerful"
→ ["Ret", "rieval", " augmented", " generation", " is", " powerful"]
→ [9142, 50122, 57405, 9659, 382, 8866]        (IDs differ per tokenizer)`,
          },
          {
            list: [
              "Rule of thumb for English: **1 token ≈ 4 characters ≈ 0.75 words**, so 1,000 tokens ≈ 750 words.",
              "Spaces are usually part of the token (`\" is\"`), which is why the same word can be different tokens at the start of a sentence and in the middle.",
              "Code, numbers and non-English scripts use more tokens per word. Hindi in Devanagari can take several times more tokens than the same sentence in English, although newer tokenizers have narrowed the gap.",
            ],
          },
        ],
      },
      {
        h: "How tokenizers are built: BPE",
        blocks: [
          "Most LLMs use **Byte Pair Encoding (BPE)** or a close relative (SentencePiece, WordPiece). The idea is simple:",
          {
            list: [
              "Start with individual bytes or characters as the vocabulary.",
              "Count which adjacent pair appears most often in a huge training corpus (say `t` + `h`).",
              "Merge that pair into a new token `th`, and add it to the vocabulary.",
              "Repeat tens of thousands of times: `th` + `e` → `the`, and so on.",
            ],
            ordered: true,
          },
          "The result: frequent strings become single tokens, and anything else can still be spelled out from smaller pieces, so there's never an \"unknown word\". Because it works on bytes, any text (emoji, code, any language) can be encoded.",
          {
            note: "This explains classic LLM failures. \"How many r's in strawberry?\" is hard because the model sees tokens like `str`, `aw`, `berry`, not letters. Reversing strings and exact character counts fail for the same reason.",
          },
        ],
      },
      {
        h: "Counting tokens in code",
        blocks: [
          {
            lang: "python",
            code: `# uv add tiktoken
import tiktoken

enc = tiktoken.get_encoding("o200k_base")     # used by GPT-4o-family models
text = "Retrieval augmented generation is powerful"
ids = enc.encode(text)
print(len(ids), ids)
print([enc.decode([i]) for i in ids])          # see each token

hindi = "पुनर्प्राप्ति संवर्धित पीढ़ी शक्तिशाली है"
print(len(enc.encode(hindi)))                  # compare with the English count`,
          },
          "Each provider has its own tokenizer, so counts differ between OpenAI, Anthropic, Google and open models. For exact numbers, use the provider's token counting endpoint or the `usage` field returned with each response. `tiktoken` is a good estimate for planning.",
        ],
      },
      {
        h: "The context window",
        blocks: [
          "The **context window** is the maximum number of tokens a model can handle in one request: **input + output combined**. Everything the model knows about your conversation must fit: system prompt, chat history, retrieved documents, tool definitions, and the answer it writes.",
          {
            table: {
              head: ["Part of the request", "Typical size"],
              rows: [
                ["System prompt", "200–2,000 tokens"],
                ["Tool definitions", "100–500 tokens per tool"],
                ["Chat history", "Grows every turn"],
                ["Retrieved RAG chunks", "5 chunks × 500 tokens = 2,500"],
                ["User question", "20–200"],
                ["Reserved for the answer (`max_tokens`)", "500–4,000"],
              ],
            },
          },
          "Modern models advertise windows from 128K up to 1M+ tokens. Bigger isn't free:",
          {
            list: [
              "**Cost:** you pay for every input token on every call. Resending a 100K-token history each turn is expensive.",
              "**Latency:** more input means a longer wait before the first output token.",
              "**Quality:** models use information at the start and end of a long context better than information in the middle. This is called **\"lost in the middle\"**, and it's why RAG sends a few relevant chunks rather than whole documents.",
            ],
          },
          {
            tip: "The model has **no memory between API calls**. The \"memory\" in a chatbot is you resending the history every time. Managing that history (trimming, summarising) is your job.",
          },
        ],
      },
      {
        h: "Tokens and money",
        blocks: [
          "APIs charge per million tokens, with separate prices for input and output. **Output tokens usually cost 3–5× more than input tokens**, because each output token requires a full forward pass of the model, while input tokens are processed in parallel.",
          {
            lang: "python",
            code: `def cost_usd(input_tokens: int, output_tokens: int,
             in_price_per_m: float, out_price_per_m: float) -> float:
    return input_tokens / 1e6 * in_price_per_m + output_tokens / 1e6 * out_price_per_m

# A RAG answer: 3,000 tokens in, 400 out, on a small model priced (example) $0.15 / $0.60
per_call = cost_usd(3000, 400, 0.15, 0.60)     # ≈ $0.00069
print(per_call * 100_000)                       # 100K questions a month ≈ $69`,
            caption: "Prices here are examples. Always check the provider's pricing page; they change often.",
          },
          "Cost levers you'll use all through this plan: smaller models for easy tasks, shorter prompts, fewer retrieved chunks, caching, and limiting `max_tokens`.",
        ],
      },
    ],
    revise: [
      "Token = sub-word unit; ~4 characters or 0.75 English words. Models see integer IDs.",
      "BPE builds the vocabulary by repeatedly merging frequent pairs; nothing is ever \"unknown\".",
      "Tokenization explains letter-counting failures and why non-English text costs more.",
      "Context window = input + output tokens per request. The model has no memory between calls.",
      "Long context costs more, is slower, and suffers from \"lost in the middle\".",
      "Output tokens cost more than input tokens. Count with `tiktoken` or read `usage` from responses.",
    ],
    mistakes: [
      "Estimating cost with words or characters instead of tokens.",
      "Forgetting that `max_tokens` (the answer) counts toward the context window.",
      "Stuffing the whole context window because \"it fits\", making answers slower, pricier and often worse.",
      "Assuming token counts are the same across providers.",
    ],
    interview: [
      {
        q: "What is a token? Why do costs and limits use tokens?",
        a: "A token is a sub-word unit from the model's tokenizer vocabulary, roughly four characters of English. The model processes and generates text as a sequence of token IDs, and compute cost scales with the number of tokens processed, so providers price and limit by tokens. Input and output tokens are priced separately, with output usually costing more.",
      },
      {
        q: "What is a context window, and what is \"lost in the middle\"?",
        a: "The context window is the maximum tokens a model handles in one request, including both the prompt and the generated answer. \"Lost in the middle\" is the observed tendency of models to use information at the beginning and end of a long context better than information buried in the middle. So you shouldn't just stuff everything in: retrieve and rank the most relevant pieces, and put the key instructions and evidence where the model attends to them well.",
      },
      {
        q: "Why is an LLM bad at counting the letters in a word?",
        a: "Because it doesn't see letters. The word is split into multi-character tokens, and the model reasons over token IDs, so character-level facts aren't directly visible. It has to have learned the spelling of each token, which is unreliable. A tool call (running code) solves it exactly.",
      },
    ],
    practice: [
      "Tokenize 5 sentences in English, Hindi and Python code with tiktoken; compare tokens per word.",
      "Estimate the monthly cost of a chatbot with 2,000 users × 10 questions/day × (2,500 in + 300 out) tokens on two different models.",
    ],
  },

  embeddings: {
    minutes: 45,
    level: "Beginner",
    intro:
      "An **embedding** turns text into a list of numbers (a vector) such that texts with similar meaning get similar vectors. Embeddings are what make semantic search, RAG, recommendations, deduplication and clustering work. Today is the intuition; Day 5 is the engineering.",
    sections: [
      {
        h: "Meaning as coordinates",
        blocks: [
          "Imagine placing every sentence on a map so that sentences about similar things land near each other. \"How do I get a refund?\" lands next to \"What's your return policy?\" even though they share almost no words. An embedding model produces those coordinates, just in hundreds or thousands of dimensions instead of two.",
          {
            lang: "python",
            code: `from openai import OpenAI
client = OpenAI()

resp = client.embeddings.create(
    model="text-embedding-3-small",
    input=["How do I get a refund?", "What's your return policy?", "Best biryani in Hyderabad"],
)
vectors = [d.embedding for d in resp.data]
print(len(vectors[0]))      # 1536 numbers per text`,
          },
          "Keyword search (like SQL `LIKE` or Mongo text search) matches words. Embedding search matches **meaning**: synonyms, paraphrases, even other languages, depending on the model.",
        ],
      },
      {
        h: "Measuring similarity",
        blocks: [
          "To compare two texts, compare their vectors. The standard measure is **cosine similarity**: the cosine of the angle between the two vectors. It's close to 1 when they point the same way (similar meaning) and near 0 when unrelated.",
          {
            lang: "python",
            code: `import numpy as np

def cosine(a, b) -> float:
    a, b = np.array(a), np.array(b)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print(cosine(vectors[0], vectors[1]))   # high: refund ≈ return policy
print(cosine(vectors[0], vectors[2]))   # low: refund vs biryani`,
          },
          {
            note: "Scores are only meaningful **relative** to each other within one model. \"0.45\" isn't universally good or bad. Different models have different score ranges, so tune thresholds per model.",
          },
        ],
      },
      {
        h: "Where embeddings come from",
        blocks: [
          "Embedding models are neural networks (usually transformer encoders) trained with **contrastive learning**: shown millions of pairs that should be close (a question and its answer, a title and its article) and pairs that shouldn't, and adjusted until related pairs get similar vectors. You don't train them yourself; you choose one.",
          {
            table: {
              head: ["Type", "Examples", "Notes"],
              rows: [
                ["API models", "OpenAI `text-embedding-3-small/large`, Cohere Embed, Google, Voyage", "Easy, good quality, per-token cost, data leaves your infra"],
                ["Open models", "BGE, E5, GTE, Nomic, multilingual variants", "Free to run, self-hosted, some are excellent; check the MTEB leaderboard"],
              ],
            },
          },
        ],
      },
      {
        h: "Embeddings vs LLMs",
        blocks: [
          {
            table: {
              head: ["", "Embedding model", "Generative LLM"],
              rows: [
                ["Input", "Text", "Text (and more)"],
                ["Output", "One fixed-size vector", "New text, token by token"],
                ["Used for", "Search, similarity, clustering, classification", "Answering, writing, reasoning, tool use"],
                ["Cost", "Very cheap", "Much more expensive"],
                ["In RAG", "Finds the relevant chunks", "Writes the answer from them"],
              ],
            },
          },
          {
            warn: "Vectors from different embedding models are **not compatible**. If you change the embedding model, you must re-embed every document. Store the model name alongside your vectors.",
          },
        ],
      },
    ],
    revise: [
      "Embedding = fixed-size vector of numbers representing meaning; similar meaning → nearby vectors.",
      "Cosine similarity compares direction: ~1 similar, ~0 unrelated. Only compare scores within one model.",
      "Trained with contrastive learning on related/unrelated pairs.",
      "Semantic search matches meaning (synonyms, paraphrase); keyword search matches words.",
      "Embeddings find information; the LLM writes the answer. Changing embedding models means re-embedding everything.",
    ],
    interview: [
      {
        q: "What is an embedding, and how is it used in RAG?",
        a: "An embedding is a dense vector representation of text produced by a model trained so that semantically similar texts have nearby vectors. In RAG, you embed document chunks once and store them in a vector index; at query time you embed the question, retrieve the nearest chunks by cosine similarity, and pass them to the LLM as context to ground its answer.",
      },
      {
        q: "Why not just use keyword search?",
        a: "Keyword search misses paraphrases and synonyms (\"refund\" vs \"money back\"), while embeddings capture meaning. But keyword search is better for exact terms like product codes, names and error IDs, so production systems often combine both in hybrid search.",
      },
    ],
    practice: [
      "Embed 10 FAQ questions and 3 user queries; for each query print the top 3 matches by cosine similarity.",
      "Find a pair of sentences with no shared words but high similarity, and a pair with many shared words but low similarity.",
    ],
  },

  attention: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "You don't need the maths to work with LLMs, but interviewers expect you to explain what a transformer does and why attention was a breakthrough. This lesson builds the intuition in plain language, with just enough detail to answer confidently.",
    sections: [
      {
        h: "The problem attention solves",
        blocks: [
          "Consider: *\"The trophy didn't fit in the suitcase because it was too big.\"* What does **it** refer to? You know it's the trophy, because you connected \"it\" with \"trophy\" and \"too big\". Change \"big\" to \"small\" and \"it\" becomes the suitcase.",
          "To understand any word, a model must look at other words, sometimes far away, and decide which ones matter. Older models (RNNs, LSTMs) read one word at a time and squeezed everything seen so far into a fixed memory, so long-range connections faded, and training couldn't be parallelised. The 2017 paper *\"Attention Is All You Need\"* introduced the **transformer**, which lets every token look at every other token directly, in parallel.",
        ],
      },
      {
        h: "Self-attention, intuitively",
        blocks: [
          "For each token, self-attention asks: **which other tokens should I pay attention to, and how much?** Then it builds a new representation of the token as a weighted mix of the others.",
          "It uses three learned projections of each token, and a search-engine analogy helps:",
          {
            table: {
              head: ["Vector", "Analogy", "Role"],
              rows: [
                ["**Query (Q)**", "What I'm searching for", "\"it\" asks: which noun am I referring to?"],
                ["**Key (K)**", "The label on each item", "\"trophy\" advertises: I'm a noun, an object"],
                ["**Value (V)**", "The content you get back", "The information \"trophy\" passes along"],
              ],
            },
          },
          {
            list: [
              "Compare the Query of \"it\" with the Key of every token (a dot product). High score = relevant.",
              "Turn the scores into weights that add up to 1 (softmax). \"trophy\" might get 0.7, \"suitcase\" 0.2, the rest a little.",
              "Mix the Values using those weights. The new vector for \"it\" now carries information about the trophy.",
            ],
            ordered: true,
          },
          {
            lang: "text",
            code: `Attention(Q, K, V) = softmax(Q · Kᵀ / √d) · V
                      └─ how relevant ─┘   └ what to take ┘`,
            caption: "The one formula worth recognising. √d just keeps the scores in a stable range.",
          },
          "**Multi-head attention** runs several attention operations in parallel, each with its own Q/K/V projections. One head might track grammar, another which noun a pronoun refers to, another nearby context. Their outputs are combined.",
        ],
      },
      {
        h: "The full transformer block",
        blocks: [
          "An LLM stacks the same block dozens of times (for example 32–100+ layers). Each block has:",
          {
            list: [
              "**Self-attention:** tokens exchange information with each other.",
              "**Feed-forward network (MLP):** each token's vector is processed on its own. This is where much of the model's stored knowledge is thought to live.",
              "**Residual connections and layer normalisation:** plumbing that keeps training stable in very deep networks.",
            ],
          },
          "Before the first block, each token ID becomes an embedding vector, and **positional information** is added (for example RoPE, rotary position embeddings), because attention on its own doesn't know word order. After the last block, the model produces a score for every token in the vocabulary: the prediction for the next token.",
          {
            lang: "text",
            code: `tokens → embeddings + position → [attention → MLP] × N layers → scores over vocabulary → next token`,
          },
        ],
      },
      {
        h: "Decoder-only models and causal attention",
        blocks: [
          "The original transformer had an encoder and a decoder. Modern chat LLMs (GPT, Claude, Llama, Gemini) are **decoder-only**: they use **causal (masked) attention**, where each token can only attend to tokens before it. That's what makes them next-token predictors.",
          {
            table: {
              head: ["Architecture", "Sees", "Good at", "Examples"],
              rows: [
                ["Encoder-only", "Whole input, both directions", "Understanding: classification, embeddings", "BERT, embedding models"],
                ["Decoder-only", "Only previous tokens", "Generating text", "GPT, Claude, Llama, Mistral"],
                ["Encoder–decoder", "Encoder sees all; decoder generates", "Translation, summarisation", "T5, original transformer"],
              ],
            },
          },
        ],
      },
      {
        h: "Why this matters for you as a developer",
        blocks: [
          {
            list: [
              "**Cost grows with context:** attention compares tokens with each other, so long prompts cost more compute and add latency.",
              "**KV cache:** during generation, the model caches keys and values of previous tokens so it doesn't recompute them. That's why providers can offer cheaper **prompt caching** for repeated prefixes, and why stable system prompts at the start of a request save money.",
              "**Parallel input, sequential output:** input tokens are processed together (fast); output tokens come one at a time (slow, and priced higher). Streaming exists because of this.",
              "**Position matters:** instructions and key facts at the start or end of the prompt tend to be followed more reliably.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Transformer (2017) replaced sequential RNNs with attention: every token looks at every other token, in parallel.",
      "Self-attention: Query (what I want), Key (what I offer), Value (what I pass on); scores → softmax weights → weighted mix.",
      "Multi-head attention = several attention patterns in parallel.",
      "Block = attention + MLP + residuals/normalisation, stacked N times; position is added (e.g. RoPE).",
      "Chat LLMs are decoder-only with causal attention → next-token prediction.",
      "Practical effects: long context = cost + latency; KV cache → prompt caching; output is sequential → streaming.",
    ],
    mistakes: [
      "Saying the model \"reads the prompt word by word like a human\". Input is processed in parallel; only output is sequential.",
      "Confusing embeddings models (encoders) with chat models (decoders).",
    ],
    interview: [
      {
        q: "Explain a transformer to a non-technical manager.",
        a: "It's a model that reads a whole passage at once, and for every word it works out which other words matter for understanding it, like a reader who keeps glancing back to see what \"it\" refers to. It does this in many layers, each refining its understanding. After training on huge amounts of text, it can predict what comes next very well, which is how it writes answers one word at a time.",
      },
      {
        q: "What is self-attention?",
        a: "A mechanism where each token computes relevance scores against every other token (query–key dot products), normalises them with softmax, and builds its new representation as a weighted sum of the other tokens' value vectors. It captures long-range relationships directly and runs in parallel. Multi-head attention runs several of these with different learned projections.",
      },
      {
        q: "Why are output tokens slower and more expensive than input tokens?",
        a: "The prompt can be processed in one parallel pass, but generation is autoregressive: each new token requires another forward pass that depends on the previous token, so output is produced sequentially. That uses more compute per token and can't be parallelised the same way, so it's priced higher and determines most of the response time.",
      },
    ],
    practice: [
      "Watch 3Blue1Brown's transformer and attention chapters, then explain Q, K and V in your notes in your own words.",
      "Write a 60-second spoken explanation of \"how ChatGPT writes an answer\" for a non-technical friend, and record it.",
    ],
  },

  training: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "How does a next-word predictor become a helpful assistant that follows instructions and refuses harmful requests? Through three stages: pretraining, supervised fine-tuning and preference tuning. Knowing them explains model behaviour you'll see every day, and it's a standard interview topic.",
    sections: [
      {
        h: "Stage 1: pretraining (next-token prediction)",
        blocks: [
          "The model reads trillions of tokens (web pages, books, code, papers) and learns one task: **predict the next token**. Given \"The capital of France is\", it should give high probability to \" Paris\". Every wrong prediction nudges billions of parameters slightly.",
          "To predict well across all that text, the model has to learn grammar, facts, reasoning patterns, code syntax and styles of writing. That's why a \"simple\" objective produces broad capability.",
          {
            list: [
              "Cost: huge. Thousands of GPUs for weeks or months. Only large labs do this.",
              "Result: a **base model**. It continues text; it doesn't answer. Ask it \"What is RAG?\" and it might continue with more questions, like a list from a quiz.",
              "The **knowledge cutoff** is where the training data ends. The model knows nothing after it unless you give it the information, which is one reason RAG exists.",
            ],
          },
        ],
      },
      {
        h: "Stage 2: supervised fine-tuning (SFT)",
        blocks: [
          "Next, the base model is trained on a much smaller, high-quality dataset of **instruction → ideal response** examples, often written or reviewed by people. Chat formatting with roles (system/user/assistant) is taught here.",
          {
            lang: "text",
            code: `User: Summarise this email in two bullet points: ...
Assistant: - The client wants the launch moved to Friday.
           - They need the invoice by Wednesday.`,
          },
          "After SFT, the model follows instructions and answers in the assistant style. You can do SFT yourself on open models with LoRA (Day 15).",
        ],
      },
      {
        h: "Stage 3: preference tuning (RLHF, DPO)",
        blocks: [
          "SFT teaches the format, but not what makes one answer *better* than another. Preference tuning does that.",
          {
            list: [
              "**RLHF (Reinforcement Learning from Human Feedback):** people compare pairs of model answers and pick the better one. A **reward model** is trained to predict those preferences. Then the LLM is optimised (classically with the PPO algorithm) to produce answers the reward model scores highly, while staying close to its SFT behaviour.",
              "**DPO (Direct Preference Optimization):** skips the separate reward model and the RL loop, and trains directly on the preference pairs (chosen vs rejected). It's simpler and more stable, so it's widely used, especially for open models.",
              "**Constitutional AI / RLAIF:** AI feedback guided by written principles replaces some of the human labelling (Anthropic popularised this).",
            ],
          },
          "This stage shapes helpfulness, tone, honesty and refusals. It's also why models can be overly agreeable (sycophancy): they learned that people rate agreeable answers highly.",
        ],
      },
      {
        h: "Reasoning training",
        blocks: [
          "Newer **reasoning models** get extra training with reinforcement learning on problems that have checkable answers (maths, code with tests, logic puzzles). The model learns to produce a long internal chain of thought before answering, and is rewarded when the final answer is correct. This is why reasoning models are strong at multi-step problems, and slower and more expensive (they generate many \"thinking\" tokens).",
        ],
      },
      {
        h: "The pipeline at a glance",
        blocks: [
          {
            table: {
              head: ["Stage", "Data", "Teaches", "Who does it"],
              rows: [
                ["Pretraining", "Trillions of tokens of raw text", "Language, knowledge, patterns", "Big labs only"],
                ["SFT", "Thousands to millions of instruction/answer pairs", "Following instructions, chat format", "Labs; you, on open models"],
                ["RLHF / DPO", "Human or AI preference comparisons", "Helpfulness, safety, style", "Labs; DPO is doable on open models"],
                ["Reasoning RL", "Problems with verifiable answers", "Multi-step reasoning", "Labs"],
              ],
            },
          },
          {
            tip: "When a model misbehaves, ask which stage to fix. Missing knowledge → give context (RAG), not fine-tuning. Wrong format or tone → better prompts, then SFT. Weak reasoning → a reasoning model or break the task into steps.",
          },
        ],
      },
    ],
    revise: [
      "Pretraining: next-token prediction on trillions of tokens → base model that continues text; sets the knowledge cutoff.",
      "SFT: instruction→response pairs → follows instructions, chat format.",
      "RLHF: human preference pairs → reward model → optimise the LLM (PPO). DPO trains directly on preference pairs (simpler).",
      "Preference tuning shapes helpfulness, tone, refusals, and causes sycophancy.",
      "Reasoning models: extra RL on verifiable problems → long chains of thought, better multi-step accuracy, higher cost.",
      "Missing knowledge → RAG; wrong style/format → prompting or SFT.",
    ],
    interview: [
      {
        q: "Explain pretraining vs SFT vs RLHF.",
        a: "Pretraining teaches a model language and world knowledge by predicting the next token over a massive corpus, producing a base model that continues text. Supervised fine-tuning trains it on curated instruction–response pairs so it follows instructions in a chat format. RLHF then aligns it with human preferences: people rank responses, a reward model learns those rankings, and the policy is optimised to score well while staying close to the SFT model. DPO achieves similar alignment directly from preference pairs without a separate reward model or RL loop.",
      },
      {
        q: "Why doesn't the model know about events after a certain date?",
        a: "Its knowledge comes from pretraining data, which ends at a cutoff date. Nothing after that is in its weights. To use current or private information, you supply it at inference time, through RAG, tool calls such as web search, or the prompt.",
      },
      {
        q: "What is DPO and why is it popular?",
        a: "Direct Preference Optimization trains the model on pairs of chosen and rejected responses with a simple classification-style loss that increases the likelihood of preferred answers relative to a reference model. It avoids training a reward model and running unstable reinforcement learning, so it's cheaper, simpler and more stable, which makes it popular for open-source model alignment.",
      },
    ],
    practice: [
      "In your notes, draw the pipeline base model → SFT → preference tuning, with one example of what the model does at each stage.",
      "Try a base model (many are on Hugging Face) and its instruct version with the same prompt, and note the difference.",
    ],
  },

  sampling: {
    minutes: 50,
    level: "Beginner",
    intro:
      "At each step the model produces a probability for every possible next token. **Sampling settings** decide how the next token is picked from those probabilities. They control creativity vs consistency, and they're a frequent interview question. This lesson also covers why models hallucinate.",
    sections: [
      {
        h: "From scores to a chosen token",
        blocks: [
          "After processing the prompt, the model outputs a score (logit) for every token in its vocabulary. Softmax turns them into probabilities:",
          {
            lang: "text",
            code: `Prompt: "The best way to learn Python is"
" by"        0.41
" to"        0.33
" practice"  0.09
" through"   0.06
" hands"     0.03
... 100,000 other tokens share the rest`,
          },
          "The chosen token is appended to the text and the whole process repeats, one token at a time, until the model emits a stop token or hits `max_tokens`. That loop is called **autoregressive generation**.",
        ],
      },
      {
        h: "Temperature",
        blocks: [
          "Temperature rescales the probabilities before sampling.",
          {
            list: [
              "**Temperature 0:** (nearly) always take the most likely token. Output is focused and repeatable. It's not perfectly deterministic in practice, because of how GPUs batch calculations.",
              "**Temperature ~0.7–1.0:** sample with the probabilities roughly as they are. Natural and varied.",
              "**Temperature > 1:** flatten the distribution, so unlikely tokens get picked more. Creative at first, then incoherent.",
            ],
          },
          {
            table: {
              head: ["Task", "Temperature"],
              rows: [
                ["Extraction, classification, SQL/code generation, JSON output", "0–0.2"],
                ["RAG answers, support bots", "0–0.3"],
                ["General chat", "0.5–0.8"],
                ["Brainstorming, marketing copy, stories", "0.8–1.1"],
              ],
            },
          },
          {
            note: "Not every model accepts these settings. Many reasoning models, and the newest Claude models, reject `temperature`/`top_p` with an error and are steered with an effort setting instead. Check the model's docs before tuning, and keep sampling parameters out of shared request code.",
          },
        ],
      },
      {
        h: "top-p, top-k and other settings",
        blocks: [
          {
            list: [
              "**top-p (nucleus sampling):** keep only the smallest set of tokens whose probabilities add up to *p* (e.g. 0.9), then sample from those. This cuts off the long tail of nonsense while adapting to how confident the model is.",
              "**top-k:** keep only the *k* most likely tokens. Common with open models; not all APIs expose it.",
              "**max_tokens / max_output_tokens:** a hard cap on the answer's length. Set it to control cost and latency. If the answer stops mid-sentence, check the `finish_reason`/`stop_reason`: it will say the length limit was hit.",
              "**stop sequences:** strings that end generation when produced.",
              "**frequency / presence penalty:** discourage repeating tokens (OpenAI-style APIs).",
              "**seed:** some APIs accept a seed for more reproducible sampling.",
            ],
          },
          {
            tip: "Tune temperature **or** top-p, not both at once. Most teams leave top-p at its default and adjust temperature.",
          },
        ],
      },
      {
        h: "Why hallucinations happen",
        blocks: [
          "A **hallucination** is fluent, confident output that's false or unsupported. It follows from how LLMs work:",
          {
            list: [
              "**The objective is plausibility, not truth.** The model generates what's likely to come next given its training. A confident, plausible fake citation is exactly the kind of text it's seen many times.",
              "**Knowledge gaps.** Facts that were rare in training data, private to your company, or after the cutoff aren't reliably in the weights, but the model still produces an answer-shaped response.",
              "**Training rewards answering.** Evaluations and human raters have often rewarded a confident guess over \"I don't know\".",
              "**Sampling randomness** can take a wrong branch, and once a wrong token is written, the model tends to stay consistent with it.",
              "**Tokenization and arithmetic weaknesses:** exact counting, maths and character-level tasks.",
            ],
          },
        ],
      },
      {
        h: "Reducing hallucinations",
        blocks: [
          {
            table: {
              head: ["Technique", "How it helps"],
              rows: [
                ["**Grounding with RAG**", "Give the facts in the prompt and instruct: answer only from the context."],
                ["**Allow \"I don't know\"**", "Explicitly permit and reward abstaining when the context lacks the answer."],
                ["**Citations**", "Require sources for each claim, then verify the cited text exists."],
                ["**Low temperature**", "Less random branching for factual tasks."],
                ["**Tools**", "Use a calculator, code execution, SQL or search instead of the model's memory."],
                ["**Structured output + validation**", "Constrain the format and reject invalid results."],
                ["**Verification step**", "A second pass (or another model) checks claims against sources."],
                ["**Evals and monitoring**", "Measure faithfulness on a test set (Day 9) and track it in production."],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "The model outputs a probability for every token; generation is a loop of pick → append → repeat.",
      "Temperature: 0 = focused and repeatable, higher = more varied; > 1 gets incoherent.",
      "Use 0–0.2 for extraction, code, JSON and RAG; higher for creative work.",
      "top-p keeps the smallest set of tokens covering probability p. Tune temperature or top-p, not both.",
      "`max_tokens` caps output; check `finish_reason` for truncation.",
      "Hallucination: the objective is plausibility, not truth; knowledge gaps; training rewards guessing; sampling randomness.",
      "Reduce it with RAG grounding, allowing \"I don't know\", citations, tools, low temperature, validation, verification and evals.",
    ],
    mistakes: [
      "Using high temperature for extraction or code, then getting inconsistent output.",
      "Believing temperature 0 guarantees identical output every time.",
      "Treating hallucination as something a better prompt alone fixes; grounding and verification do most of the work.",
    ],
    interview: [
      {
        q: "What is temperature? What would you set for code generation?",
        a: "Temperature scales the token probability distribution before sampling: low values make the model pick high-probability tokens (focused, consistent), high values flatten the distribution (more diverse, more errors). For code generation, SQL or structured extraction I'd use around 0–0.2, because correctness and consistency matter more than variety.",
      },
      {
        q: "Temperature vs top-p?",
        a: "Temperature reshapes the whole distribution. Top-p truncates it, sampling only from the smallest set of tokens whose cumulative probability reaches p, which removes the unlikely tail and adapts to the model's confidence. They interact, so typically you tune one and leave the other at its default.",
      },
      {
        q: "Why do LLMs hallucinate, and how do you reduce it?",
        a: "They're trained to produce plausible continuations, not verified facts, so when knowledge is missing or uncertain they still generate fluent, answer-shaped text; training has also tended to reward confident answers, and sampling adds randomness. To reduce it: ground answers in retrieved sources with instructions to answer only from them, allow and encourage \"I don't know\", require citations and verify them, use tools for calculations and lookups, lower the temperature, validate structured output, and measure faithfulness with evals.",
      },
    ],
    practice: [
      "Ask the same factual question 5 times at temperature 0 and 5 times at 1.0; note the differences.",
      "Ask a model about a made-up library (\"How do I use the fastrag-pro package?\"). Then add \"If you don't know, say so\" and compare.",
    ],
  },

  landscape: {
    minutes: 45,
    level: "Beginner",
    intro:
      "Interviewers ask which models you'd pick and why. Specific model versions change every few months, so learn the **families**, the **trade-offs** and a **way to choose**. That knowledge stays useful after today's model names are out of date.",
    sections: [
      {
        h: "The main families",
        blocks: [
          {
            table: {
              head: ["Provider", "Family", "Weights", "Known for"],
              rows: [
                ["OpenAI", "GPT (plus \"o\"-series reasoning models)", "Closed (plus some open-weight releases)", "Largest ecosystem, strong tool calling and structured output"],
                ["Anthropic", "Claude (Haiku / Sonnet / Opus tiers)", "Closed", "Strong coding, long documents, agentic work, careful instruction following"],
                ["Google", "Gemini (Flash / Pro tiers)", "Closed; Gemma is open", "Very long context, multimodal, generous free tier for learning"],
                ["Meta", "Llama", "Open weights", "The most common base for self-hosting and fine-tuning"],
                ["Mistral", "Mistral / Mixtral", "Mix of open and closed", "Efficient models, European provider"],
                ["Alibaba", "Qwen", "Open weights", "Strong multilingual and coding models in many sizes"],
                ["DeepSeek", "DeepSeek (V / R series)", "Open weights", "Very cost-efficient; open reasoning models"],
              ],
            },
          },
          {
            note: "Most providers offer tiers: a small, fast, cheap model (for classification, extraction, routing) and a large, slower, smarter one (for hard reasoning). Choosing the tier is often more important than choosing the provider.",
          },
        ],
      },
      {
        h: "Open vs closed weights",
        blocks: [
          {
            table: {
              head: ["", "Closed (API only)", "Open weights (download and run)"],
              rows: [
                ["Quality at the frontier", "Usually the best", "Close behind, improving fast"],
                ["Setup", "An API key", "GPUs, serving stack (vLLM, Ollama), ops work"],
                ["Cost model", "Per token", "Per GPU hour: cheaper at high, steady volume"],
                ["Data privacy", "Data goes to the provider (enterprise terms help)", "Stays in your infrastructure"],
                ["Customisation", "Prompting, some hosted fine-tuning", "Full fine-tuning, quantisation, any change"],
                ["Vendor lock-in", "Higher", "Lower"],
              ],
            },
          },
          "Middle ground: open models served by managed providers (AWS Bedrock, Azure, Groq, Together and others) give you open-model economics without running GPUs yourself.",
          {
            note: "\"Open weights\" isn't the same as open source. You get the trained weights under a licence, but usually not the training data or code. Read the licence: some restrict commercial use or very large companies.",
          },
        ],
      },
      {
        h: "Reasoning models",
        blocks: [
          "**Reasoning models** (OpenAI's o-series, Claude and Gemini with extended thinking, DeepSeek-R1-style models) generate a hidden or visible chain of thought before answering. Many APIs let you set a reasoning effort or thinking budget.",
          {
            table: {
              head: ["Use a reasoning model for", "Use a standard fast model for"],
              rows: [
                ["Multi-step maths and logic", "Chat, summarisation, rewriting"],
                ["Hard coding and debugging", "Extraction and classification"],
                ["Planning complex agent tasks", "RAG answers from given context"],
                ["Analysing long, tricky documents", "Anything latency-sensitive (autocomplete, voice)"],
              ],
            },
          },
          "The trade-off: better accuracy on hard problems, but more tokens (you pay for the thinking), higher latency, and often less control over sampling.",
        ],
      },
      {
        h: "How to choose a model",
        blocks: [
          {
            list: [
              "**Define the task and the bar:** what does \"good enough\" mean? Build a small eval set of 20–50 real examples.",
              "**Start with a strong model** to prove it's possible.",
              "**Try smaller, cheaper models** against the same eval set. Many tasks work fine on the small tier.",
              "**Check constraints:** latency budget, context length, data residency and privacy, cost at your expected volume, rate limits.",
              "**Route:** in production, send easy requests to the cheap model and hard ones to the expensive model.",
              "**Re-evaluate regularly:** new models arrive every few months; your eval set makes switching a one-hour job.",
            ],
            ordered: true,
          },
          {
            tip: "Leaderboards (LMArena, benchmark tables) are a starting point, not a decision. Your own eval set on your own data decides.",
          },
          "Other model types you'll meet: **embedding models** (Day 5), **rerankers** (Day 8), **speech** (Whisper, TTS), **image generation**, and **multimodal** chat models that accept images, audio or PDFs.",
        ],
      },
    ],
    revise: [
      "Families: GPT (OpenAI), Claude (Anthropic), Gemini (Google) are closed; Llama, Qwen, DeepSeek, Mistral, Gemma are open-weight options.",
      "Tiers matter: small/fast/cheap vs large/slow/smart.",
      "Open weights: privacy, customisation, cost at scale, but you run them. Closed: best quality, easiest, per-token cost, lock-in.",
      "Open weights ≠ open source; check the licence.",
      "Reasoning models: better on multi-step problems, more tokens, more latency.",
      "Choose with your own eval set: start strong, try cheaper, check constraints, route, re-evaluate.",
    ],
    interview: [
      {
        q: "What is a reasoning model, and when is it worth the cost?",
        a: "A reasoning model is trained to generate an extended chain of thought before answering, which improves accuracy on multi-step problems like maths, complex code and planning. It costs more (you pay for thinking tokens) and responds more slowly. It's worth it when correctness on hard tasks matters more than latency, and not for simple chat, extraction or RAG answers where a fast model performs just as well.",
      },
      {
        q: "Open-source vs closed models for an enterprise chatbot?",
        a: "It depends on constraints. If data can't leave our infrastructure, or we have high steady volume and need customisation, a self-hosted open model (or one on a private cloud endpoint) fits. If we need top quality fast with little ops work, a closed API with enterprise data terms is simpler. I'd benchmark both on our eval set, estimate cost at expected volume, and keep a provider-agnostic interface so we can switch.",
      },
      {
        q: "How would you choose the model for a new feature?",
        a: "Build a small eval set of real examples with clear pass criteria, prove feasibility with a strong model, then test cheaper models against the same set. Weigh quality, latency, cost at projected volume, context length, privacy and rate limits. Often the answer is routing: a small model for most requests and a larger one for hard cases, re-evaluated as new models come out.",
      },
    ],
    practice: [
      "Make a table of 6 current models (2 small closed, 2 large closed, 2 open) with context window, input/output price and one strength each. Check official pages for current numbers.",
      "Pick one of your future projects and write which model tier you'd use for each step, and why.",
    ],
  },

  "cost-calc": {
    minutes: 120,
    level: "Beginner",
    intro:
      "Build a small token counter and cost calculator: paste a prompt, choose the expected answer length, and see the tokens and monthly cost across three models. It practises Python, makes token economics concrete, and is something you'll actually use when estimating projects.",
    sections: [
      {
        h: "What it does",
        blocks: [
          {
            lang: "bash",
            code: `uv run python -m costcalc --file prompt.txt --output-tokens 400 --calls-per-day 5000

Input tokens:   2,184     Output tokens: 400    Calls/month: 150,000
Model              Per call      Per month
small-model        $0.00057      $85.14
mid-model          $0.00946      $1,419.00
large-model        $0.02946      $4,419.00`,
          },
        ],
      },
      {
        h: "Price table as data",
        blocks: [
          "Keep prices in a JSON file, not in code, because they change. Fill in real numbers from each provider's pricing page on the day you build it, and record the date.",
          {
            lang: "json",
            code: `{
  "updated": "2026-09-24",
  "models": [
    {"name": "small-model", "input_per_m": 0.15, "output_per_m": 0.60, "tokenizer": "o200k_base"},
    {"name": "mid-model",   "input_per_m": 2.50, "output_per_m": 10.00, "tokenizer": "o200k_base"},
    {"name": "large-model", "input_per_m": 3.00, "output_per_m": 15.00, "tokenizer": "o200k_base"}
  ]
}`,
            caption: "Example numbers. Replace them with current official prices and real model names.",
          },
        ],
      },
      {
        h: "The code",
        blocks: [
          {
            lang: "python",
            code: `# costcalc/__main__.py
import argparse, json
from dataclasses import dataclass
from pathlib import Path
import tiktoken

@dataclass(frozen=True)
class Model:
    name: str
    input_per_m: float
    output_per_m: float
    tokenizer: str = "o200k_base"

    def cost(self, tokens_in: int, tokens_out: int) -> float:
        return tokens_in / 1e6 * self.input_per_m + tokens_out / 1e6 * self.output_per_m

def load_models(path: Path) -> list[Model]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Model(**m) for m in data["models"]]

def count_tokens(text: str, encoding: str) -> int:
    return len(tiktoken.get_encoding(encoding).encode(text))

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--file", type=Path, required=True)
    p.add_argument("--output-tokens", type=int, default=300)
    p.add_argument("--calls-per-day", type=int, default=1000)
    p.add_argument("--prices", type=Path, default=Path(__file__).parent / "prices.json")
    a = p.parse_args()

    text = a.file.read_text(encoding="utf-8")
    models = load_models(a.prices)
    calls = a.calls_per_day * 30
    tokens_in = count_tokens(text, models[0].tokenizer)

    print(f"Input tokens: {tokens_in:>7,}   Output tokens: {a.output_tokens:,}   Calls/month: {calls:,}")
    print(f"{'Model':<18}{'Per call':>12}{'Per month':>14}")
    for m in sorted(models, key=lambda m: m.cost(tokens_in, a.output_tokens)):
        per_call = m.cost(tokens_in, a.output_tokens)
        print(f"{m.name:<18}{per_call:>12.5f}{per_call * calls:>14,.2f}")

if __name__ == "__main__":
    main()`,
          },
        ],
      },
      {
        h: "Extensions that make it portfolio-worthy",
        blocks: [
          {
            list: [
              "Show the **input/output share** of cost, so you see when long answers dominate.",
              "Add a **cached input** price and a `--cached-fraction` option to model prompt caching savings.",
              "Add a `--compare-hindi` flag that tokenizes an English and a Hindi version of the same text.",
              "Wrap it in a FastAPI endpoint and a tiny React page. You know how to build that part quickly.",
              "Write unit tests for `Model.cost` with hand-calculated numbers.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Prices live in data (JSON), with an \"updated\" date; never hard-code them.",
      "Cost = input/1M × input price + output/1M × output price, per call × calls.",
      "tiktoken gives estimates; provider `usage` fields give exact counts.",
    ],
    practice: [
      "Run it on one of your real prompts and note which model you'd choose at 1K vs 100K calls a day.",
    ],
  },

  "temp-notebook": {
    minutes: 90,
    level: "Beginner",
    intro:
      "Run an experiment and write up what you observe. You'll call a model with the same prompts at temperature 0, 0.7 and 1.2, several times each, and record the differences. Doing it yourself builds intuition that's far stronger than reading about it, and the notebook is a nice artifact for GitHub.",
    sections: [
      {
        h: "Setup",
        blocks: [
          {
            lang: "bash",
            code: `uv add openai python-dotenv pandas
uv add --dev ipykernel
# create experiments/temperature.ipynb in VS Code and select the .venv kernel`,
          },
          {
            tip: "No paid key yet? Gemini's API has a free tier for learning, and it offers an OpenAI-compatible endpoint, so this code works by changing `base_url` and the model name. You can also use a local model with Ollama (Day 15).",
          },
        ],
      },
      {
        h: "The experiment",
        blocks: [
          {
            lang: "python",
            code: `from openai import OpenAI
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
client = OpenAI()
MODEL = "gpt-4o-mini"      # any chat model you have access to

PROMPTS = {
    "factual": "In one sentence, what is the capital of Australia?",
    "extraction": 'Extract the city as JSON {"city": ...}: "I moved from Pune to Bengaluru last year."',
    "creative": "Write a one-line tagline for a chai startup.",
    "code": "Write a Python one-liner that reverses a string s.",
}
TEMPS = [0, 0.7, 1.2]
RUNS = 5

rows = []
for kind, prompt in PROMPTS.items():
    for t in TEMPS:
        for run in range(RUNS):
            r = client.chat.completions.create(
                model=MODEL, temperature=t, max_tokens=80,
                messages=[{"role": "user", "content": prompt}],
            )
            rows.append({"kind": kind, "temp": t, "run": run,
                         "text": r.choices[0].message.content.strip()})

df = pd.DataFrame(rows)
summary = df.groupby(["kind", "temp"])["text"].nunique().unstack()
summary      # how many distinct answers out of 5, per prompt and temperature`,
          },
        ],
      },
      {
        h: "What to write down",
        blocks: [
          "Add a Markdown cell under the results and answer these in your own words:",
          {
            list: [
              "How many distinct answers did each prompt produce at each temperature?",
              "Did temperature 0 always give identical answers? If not, why might that be?",
              "At 1.2, did the factual or extraction answers ever become wrong or badly formatted?",
              "Which temperature would you use for each of the four prompt types in production, and why?",
              "Estimate the cost of this experiment from the `usage` field of the responses.",
            ],
            ordered: true,
          },
          "Push the notebook with outputs to GitHub. It shows you test assumptions with data instead of guessing, which is exactly the habit GenAI teams want.",
        ],
      },
    ],
    revise: [
      "Measure, don't guess: same prompt × several temperatures × several runs.",
      "Low temperature for factual, extraction and code tasks; higher for creative tasks.",
      "Temperature 0 is near-deterministic, not guaranteed identical.",
    ],
    practice: [
      "Repeat the experiment with top-p = 0.5 at temperature 1.0 and compare.",
    ],
  },
};
