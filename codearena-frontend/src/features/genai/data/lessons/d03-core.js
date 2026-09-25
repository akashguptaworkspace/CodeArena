// Day 3: tokens, embeddings, attention (the transformer). Merged into d03.js. Shape: see ./index.js

export const tokens = {
  minutes: 75,
  level: "Beginner",
  intro:
    "LLMs don't read characters or words; they read **tokens**. Tokens decide what you pay, how much fits in a request, how fast answers stream, why models are bad at counting letters, and why Hindi or Tamil text costs more than English. This lesson explains tokens from first principles: why they exist, how tokenizers are built, how chat messages become one token stream, and how to count and budget them in code.",
  sections: [
    {
      h: "Why not characters or whole words?",
      blocks: [
        "A model needs a fixed **vocabulary**: a list of units it can read and write, each with an integer ID. There are three obvious choices, and each has a problem:",
        {
          table: {
            head: ["Unit", "Vocabulary size", "Problem"],
            rows: [
              ["Characters", "~100s (or 150K+ for all of Unicode)", "Sequences get very long (a page ≈ 3,000 steps), so the model is slow and must learn spelling from scratch"],
              ["Whole words", "Millions (every word, name, typo, form: run/runs/running)", "Huge vocabulary, and any unseen word (a new product name, \"GenAI\", a typo) is unknown"],
              ["**Sub-words (tokens)**", "**~30K–256K**", "The compromise: common words are one token, rare words split into pieces, nothing is ever unknown"],
            ],
          },
        },
        "Sub-word tokenization won. The model sees text as a sequence of token IDs, turns each ID into a vector (an embedding), processes them, and predicts the next ID.",
      ],
    },
    {
      h: "What a token looks like",
      blocks: [
        "Real output from OpenAI's `o200k_base` tokenizer (used by GPT-4o-family models):",
        {
          lang: "text",
          code: `"Retrieval augmented generation is powerful"   → 6 tokens
  ['Retr', 'ieval', ' augmented', ' generation', ' is', ' powerful']
  [41969, 29979, 107192, 13986, 382, 11629]

"I am learning GenAI in Bengaluru."              → 8 tokens
  ['I', ' am', ' learning', ' Gen', 'AI', ' in', ' Bengaluru', '.']

"strawberry"  → ['st', 'raw', 'berry']      " strawberry" → [' strawberry']   (1 token!)
"12345678"    → ['123', '456', '78']
"2026-09-25"  → ['202', '6', '-', '09', '-', '25']`,
          caption: "IDs are specific to this tokenizer; another model's tokenizer produces different splits and IDs.",
        },
        {
          list: [
            "Rule of thumb for English: **1 token ≈ 4 characters ≈ 0.75 words**, so 1,000 tokens ≈ 750 words and a 300-page book ≈ 100K–130K tokens.",
            "The leading space is part of the token (`' is'`), so the same word is a different token at the start of text, after a space, or capitalised.",
            "Numbers are chopped into chunks (often up to 3 digits), which is one reason LLMs make arithmetic mistakes.",
            "Code uses many tokens for punctuation and indentation; JSON is more token-hungry than plain prose.",
          ],
        },
      ],
    },
    {
      h: "How a BPE tokenizer is built, step by step",
      blocks: [
        "Most LLMs use **Byte Pair Encoding (BPE)**, invented in 1994 as a compression algorithm and adapted for neural translation in 2015. Training a tokenizer is separate from training the model, and it's just counting:",
        {
          list: [
            "Start with a base vocabulary of the 256 possible **bytes** (so any text in any language, emoji or code can be represented).",
            "Split the training text into bytes. Count every **adjacent pair**.",
            "Merge the most frequent pair into a new token and add it to the vocabulary. Record the merge rule.",
            "Repeat until the vocabulary reaches the target size (for example 100,000 tokens).",
          ],
          ordered: true,
        },
        {
          lang: "text",
          code: `Corpus: "low low low lower lowest newer newest"
Start:   l o w _ l o w _ l o w _ l o w e r _ l o w e s t _ n e w e r _ n e w e s t

Merge 1: most frequent pair (l, o)   → "lo"     lo w _ lo w _ lo w _ lo w e r ...
Merge 2: (lo, w)                     → "low"    low _ low _ low _ low e r _ low e s t ...
Merge 3: (e, r)                      → "er"     ... low er _ ... n e w er ...
Merge 4: (e, s)                      → "es"     ... low es t ... n e w es t
Merge 5: (es, t)                     → "est"    ... low est ... n e w est
...
Result: frequent words become single tokens ("low"); rarer ones are built from pieces ("low" + "est").`,
        },
        "To **encode** new text, the tokenizer applies the learned merges in order. To **decode**, it looks up each ID's bytes and joins them. You'll build exactly this from scratch in today's `tokenizer-bpe` guide.",
        {
          note: "Because the vocabulary is learned from training data, whatever was common in that data gets short tokens. Early tokenizers trained mostly on English web text split Indian languages into many small pieces, which made them slower and more expensive.",
        },
      ],
    },
    {
      h: "Tokenizer families you'll hear about",
      blocks: [
        {
          table: {
            head: ["Algorithm", "Used by", "Notes"],
            rows: [
              ["Byte-level **BPE**", "GPT-2/3/4/4o (`tiktoken`), Llama 3, Qwen, many others", "Merges frequent byte pairs; never produces unknown tokens"],
              ["**WordPiece**", "BERT and many embedding models", "Similar merge idea, picks merges by likelihood; marks word pieces with `##` (`play`, `##ing`)"],
              ["**SentencePiece** (BPE or Unigram)", "T5, Llama 1/2, Gemma, Mistral", "Treats text as a raw stream including spaces (shown as `▁`), handy for languages without spaces"],
            ],
          },
        },
        {
          table: {
            head: ["Tokenizer", "Vocabulary size"],
            rows: [
              ["BERT (WordPiece)", "30,522"],
              ["Llama 2 (SentencePiece)", "32,000"],
              ["GPT-2 (`gpt2`)", "50,257"],
              ["GPT-3.5 / GPT-4 (`cl100k_base`)", "~100K"],
              ["Llama 3", "~128K"],
              ["GPT-4o family (`o200k_base`)", "~200K"],
            ],
          },
        },
        "Bigger vocabularies mean fewer tokens per text (cheaper, faster, more context) but a bigger embedding table and output layer. The trend has been towards larger vocabularies, partly to serve non-English languages better.",
      ],
    },
    {
      h: "Languages, and why India should care",
      blocks: [
        "The same sentence, counted with three generations of OpenAI tokenizers:",
        {
          table: {
            head: ["Text", "`gpt2` (2019)", "`cl100k_base` (2023)", "`o200k_base` (2024)"],
            rows: [
              ["I am learning GenAI in Bengaluru.", "9", "9", "8"],
              ["मैं बेंगलुरु में GenAI सीख रहा हूँ।", "49", "34", "13"],
            ],
          },
        },
        {
          list: [
            "With the 2019 tokenizer, Hindi needed **~5× more tokens** than English for the same meaning: 5× the cost, 5× less fitting in the context window, and slower output.",
            "Newer tokenizers narrowed the gap a lot, but Indian-language text still usually costs more than English. Tamil, Telugu, Malayalam and others vary by model.",
            "Indian model builders (for example Sarvam AI and AI4Bharat) design tokenizers with Indic scripts in mind, a real advantage for Bharat-focused products.",
          ],
        },
        {
          tip: "For a multilingual product, always measure tokens per language on *your* model before estimating cost. It's a great detail to mention in an interview about building for Indian users.",
        },
      ],
    },
    {
      h: "Special tokens and chat templates",
      blocks: [
        "Chat APIs take a list of messages, but the model only reads one sequence of tokens. A **chat template** flattens the messages into that sequence using **special tokens** that mark roles and boundaries. Each model family has its own format, learned during fine-tuning.",
        {
          lang: "text",
          code: `messages = [{"role": "system", "content": "You are a helpful tutor."},
            {"role": "user",   "content": "What is a token?"}]

ChatML-style template (Qwen and others):
<|im_start|>system
You are a helpful tutor.<|im_end|>
<|im_start|>user
What is a token?<|im_end|>
<|im_start|>assistant
                                  ← the model starts generating here

Llama 3 template:
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a helpful tutor.<|eot_id|><|start_header_id|>user<|end_header_id|>

What is a token?<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        },
        {
          list: [
            "The model writes the answer and ends it with an **end-of-turn / end-of-sequence token** (`<|im_end|>`, `<|eot_id|>`). That's how it knows when to stop.",
            "Hosted APIs (OpenAI, Anthropic, Gemini) apply the template for you. With open models you use the tokenizer's template (Hugging Face `apply_chat_template`), or tools like Ollama and vLLM apply it.",
            "Using the **wrong template** for an open model is a classic bug: answers get weird, never stop, or ignore the system prompt.",
            "Role markers are just tokens; that's why **prompt injection** works: text inside a document can *look like* instructions, and the model has to learn to ignore it (Day 16).",
            "Tool definitions and tool calls are also serialised into tokens, which is why every tool you add costs input tokens on every request.",
          ],
        },
        {
          lang: "python",
          code: `# uv add transformers   (downloads only the small tokenizer files)
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")
messages = [{"role": "system", "content": "You are a helpful tutor."},
            {"role": "user", "content": "What is a token?"}]
print(tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True))`,
          caption: "Print the real template of an open model and compare it with the one above.",
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

enc = tiktoken.get_encoding("o200k_base")      # GPT-4o family
text = "Retrieval augmented generation is powerful"
ids = enc.encode(text)
print(len(ids), ids)
print([enc.decode([i]) for i in ids])          # see each token
print(enc.decode(ids) == text)                 # lossless round trip → True`,
        },
        {
          table: {
            head: ["Need", "Use"],
            rows: [
              ["Quick estimate for planning", "`tiktoken` (OpenAI tokenizers), or characters ÷ 4"],
              ["Exact count for an open model", "The model's own tokenizer: `AutoTokenizer.from_pretrained(...)`"],
              ["Exact count before calling Claude", "Anthropic's token counting endpoint: `client.messages.count_tokens(model=..., messages=...)`"],
              ["Exact count after a call (any provider)", "The `usage` field in the response: input, output, cached and reasoning tokens"],
            ],
          },
        },
        {
          warn: "Different providers use different tokenizers, so the same prompt can have noticeably different token counts on OpenAI, Claude, Gemini and Llama. Don't reuse one provider's count for another's bill.",
        },
      ],
    },
    {
      h: "The context window",
      blocks: [
        "The **context window** is the maximum number of tokens a model can handle in one request: **input + output combined**. Everything the model knows about your conversation must fit: system prompt, tool definitions, chat history, retrieved documents, images, and the answer it writes.",
        {
          table: {
            head: ["Part of the request", "Typical size"],
            rows: [
              ["System prompt", "200–2,000 tokens"],
              ["Tool definitions", "100–500 tokens per tool"],
              ["Chat history", "Grows every turn"],
              ["Retrieved RAG chunks", "5 chunks × 500 tokens = 2,500"],
              ["An image (multimodal models)", "Hundreds to a few thousand tokens, depending on size"],
              ["User question", "20–200"],
              ["Reserved for the answer (`max_tokens`)", "500–4,000 (more for reasoning models, whose thinking also counts)"],
            ],
          },
        },
        "Context windows grew from 2K tokens (GPT-3, 2020) to 128K–1M+ tokens today. Bigger isn't free:",
        {
          list: [
            "**Cost:** you pay for every input token on every call. Resending a 100K-token history each turn is expensive.",
            "**Latency:** more input means a longer wait before the first output token (prefill time).",
            "**Quality:** models use information at the start and end of a long context better than information in the middle (**\"lost in the middle\"**), and quality often degrades as context fills up (**\"context rot\"**). That's why RAG sends a few relevant chunks rather than whole documents.",
          ],
        },
        {
          tip: "The model has **no memory between API calls**. A chatbot's \"memory\" is you resending the history every time. Managing that history (trimming old turns, summarising, retrieving relevant past messages) is your job, and a common interview topic.",
        },
      ],
    },
    {
      h: "Tokens and money",
      blocks: [
        "APIs charge per million tokens, with separate prices for input and output. **Output tokens usually cost 3–5× more than input tokens**, because input tokens are processed in one parallel pass while each output token needs its own sequential step (see the inference lesson).",
        {
          lang: "python",
          code: `def cost_usd(input_tokens: int, output_tokens: int,
             in_price_per_m: float, out_price_per_m: float) -> float:
    return input_tokens / 1e6 * in_price_per_m + output_tokens / 1e6 * out_price_per_m

# A RAG answer: 3,000 tokens in, 400 out, on a small model priced (example) $0.15 / $0.60
per_call = cost_usd(3000, 400, 0.15, 0.60)     # ≈ $0.00069
print(per_call * 100_000)                       # 100K questions a month ≈ $69`,
          caption: "Prices are examples. Always check the provider's pricing page; they change often.",
        },
        {
          table: {
            head: ["Token type on your bill", "What it is"],
            rows: [
              ["Input tokens", "Everything you send"],
              ["Cached input tokens", "A repeated prefix (system prompt, documents) the provider has cached: much cheaper and faster"],
              ["Output tokens", "Everything the model writes"],
              ["Reasoning / thinking tokens", "Hidden or visible thinking by reasoning models, **billed as output** even if you don't see all of it"],
            ],
          },
        },
        "Cost levers you'll use all through this plan: smaller models for easy tasks, shorter prompts, fewer retrieved chunks, prompt caching, limiting `max_tokens`, and batch APIs for offline work.",
      ],
    },
  ],
  revise: [
    "Tokens are sub-words: the compromise between characters (too long) and words (too many, unknowns).",
    "~4 characters or 0.75 English words per token. Spaces and case change tokens; numbers are split into chunks.",
    "BPE: start from 256 bytes, repeatedly merge the most frequent adjacent pair; encode by applying merges. Never unknown.",
    "Families: byte-level BPE (GPT, Llama 3), WordPiece (BERT), SentencePiece (T5, Llama 2, Gemma). Vocab 30K–200K+.",
    "Non-English text costs more tokens; newer tokenizers narrowed the gap (Hindi sentence: 49 → 34 → 13 tokens).",
    "Chat templates turn messages into one token stream with special tokens; wrong template = broken open model.",
    "Context window = input + output per request; no memory between calls; lost in the middle; context rot.",
    "Output tokens cost more than input; reasoning tokens bill as output; cached input is cheaper. Count with tiktoken / count_tokens / usage.",
  ],
  mistakes: [
    "Estimating cost with words or characters instead of tokens.",
    "Forgetting that `max_tokens` (and reasoning tokens) count toward the context window.",
    "Stuffing the whole context window because \"it fits\", making answers slower, pricier and often worse.",
    "Assuming token counts are the same across providers or languages.",
    "Using the wrong chat template with an open model.",
  ],
  interview: [
    {
      q: "What is a token? Why do costs and limits use tokens?",
      a: "A token is a sub-word unit from the model's tokenizer vocabulary, roughly four characters of English. The model processes and generates text as a sequence of token IDs, and compute scales with the number of tokens processed, so providers price and limit by tokens. Input and output are priced separately, with output usually costing more.",
    },
    {
      q: "How does BPE tokenization work?",
      a: "Start with a base vocabulary of bytes, count the most frequent adjacent pair in a training corpus, merge it into a new token, and repeat until reaching the target vocabulary size. Encoding applies those merges to new text. Frequent strings become single tokens and anything else can still be represented from smaller pieces, so there are no unknown tokens.",
    },
    {
      q: "Why is an LLM bad at counting the letters in a word?",
      a: "Because it doesn't see letters. \"strawberry\" arrives as tokens like `st`, `raw`, `berry`, and the model reasons over token IDs, so character-level facts aren't directly visible. It must have memorised each token's spelling, which is unreliable. A tool call that runs code solves it exactly.",
    },
  ],
  practice: [
    "Tokenize the same sentence in English, Hindi and your mother tongue with `gpt2`, `cl100k_base` and `o200k_base`; record tokens per language.",
    "Estimate the monthly cost of a chatbot with 2,000 users × 10 questions/day × (2,500 in + 300 out) tokens on two different models.",
  ],
};

export const embeddings = {
  minutes: 75,
  level: "Beginner",
  intro:
    "An **embedding** turns text (or an image, or code) into a list of numbers, a vector, such that things with similar meaning get similar vectors. Embeddings power semantic search, RAG, recommendations, deduplication, clustering and classification. This lesson traces the idea from one-hot vectors and word2vec to modern embedding models, and gives you the maths and the engineering numbers you'll need on Day 8.",
  sections: [
    {
      h: "Meaning as coordinates",
      blocks: [
        "Imagine placing every sentence on a map so that sentences about similar things land near each other. \"How do I get a refund?\" lands next to \"What's your return policy?\" even though they share almost no words, and far from \"Best biryani in Hyderabad\". An embedding model produces those coordinates, just in hundreds or thousands of dimensions instead of two.",
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
        "Keyword search (SQL `LIKE`, Mongo text search) matches **words**. Embedding search matches **meaning**: synonyms, paraphrases, even other languages, depending on the model.",
      ],
    },
    {
      h: "From one-hot vectors to dense embeddings",
      blocks: [
        "How do you give text to a maths model? Early approaches:",
        {
          table: {
            head: ["Representation", "Idea", "Problem"],
            rows: [
              ["**One-hot**", "Vocabulary of 50,000 words; each word is a vector of 50,000 zeros with a single 1", "Huge, and every pair of words is equally unrelated: \"car\" is as far from \"automobile\" as from \"banana\""],
              ["**Bag of words / TF-IDF**", "A document is a sparse vector of word counts (weighted by rarity)", "Good for keyword search, but no synonyms and no word order"],
              ["**Dense embedding**", "A short vector (e.g. 300–3,000 numbers) learned from data", "Similar meanings get nearby vectors; this is what we use today"],
            ],
          },
        },
        "Sparse vectors (mostly zeros, one dimension per word) still matter: BM25 keyword search is a sparse method, and **hybrid search** combines sparse and dense (Day 10).",
      ],
    },
    {
      h: "word2vec: the idea that started it (2013)",
      blocks: [
        "Tomas Mikolov's team at Google trained a tiny neural network on a simple task: given a word, predict the words around it (**skip-gram**), or the reverse (**CBOW**). Nobody cared about the predictions; the useful by-product was each word's learned vector. Because words used in similar contexts must predict similar neighbours, they end up with similar vectors.",
        {
          lang: "text",
          code: `vector("king") − vector("man") + vector("woman") ≈ vector("queen")
vector("Paris") − vector("France") + vector("India") ≈ vector("Delhi")
vector("walking") − vector("walk") + vector("swim") ≈ vector("swimming")`,
          caption: "Directions in the space encode relationships like gender, capital-of and tense.",
        },
        {
          list: [
            "**Limitation 1: one vector per word.** \"bank\" has the same vector in \"river bank\" and \"bank loan\". These are *static* embeddings.",
            "**Limitation 2: words, not sentences.** Averaging word vectors loses word order and negation.",
          ],
        },
        "**Contextual embeddings** fixed both: in ELMo (2018), BERT and every transformer, a token's vector is recomputed at each layer from its context, so \"bank\" gets different vectors in different sentences. Inside an LLM, every token's vector is a contextual embedding.",
      ],
    },
    {
      h: "How modern text embedding models are made",
      blocks: [
        "A text embedding model is usually a **transformer encoder** (BERT-like) or an adapted LLM. It produces one vector per token, then **pools** them (averages them, or takes a special token's vector) into one vector for the whole text.",
        "It's trained with **contrastive learning**: show the model millions of pairs that should be close (a question and its answer, a title and its article, a query and the clicked result) and pull their vectors together, while pushing apart pairs that don't match. Sentence-BERT (2019) popularised this for sentences; today's models are trained on billions of pairs, often in many languages.",
        {
          lang: "text",
          code: `anchor:   "how to reset my password"
positive: "Go to Settings → Security → Reset password"      → pull closer
negative: "Our office is open 9am–6pm, Monday to Saturday"  → push apart`,
        },
        {
          lang: "python",
          code: `# Free, local, no API key:  uv add sentence-transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")        # small, fast, 384 dimensions
vecs = model.encode(["How do I get a refund?", "What's your return policy?"],
                    normalize_embeddings=True)
print(vecs.shape)              # (2, 384)
print(float(vecs[0] @ vecs[1]))  # cosine similarity (vectors are normalised)`,
        },
      ],
    },
    {
      h: "Measuring similarity",
      blocks: [
        "To compare two texts, compare their vectors. Three measures you should know:",
        {
          table: {
            head: ["Measure", "Formula (intuition)", "Range", "Notes"],
            rows: [
              ["**Cosine similarity**", "cos of the angle between vectors = a·b / (|a||b|)", "−1 to 1 (≈ 0 to 1 in practice)", "The default for text; ignores vector length"],
              ["**Dot product**", "a·b = Σ aᵢbᵢ", "Unbounded", "Equals cosine when vectors are normalised to length 1 (many models do this); fastest"],
              ["**Euclidean (L2) distance**", "Straight-line distance √Σ(aᵢ−bᵢ)²", "0 to ∞ (smaller = closer)", "For normalised vectors, ranks results the same as cosine"],
            ],
          },
        },
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
          note: "Scores are only meaningful **relative** to each other within one model. \"0.45\" isn't universally good or bad; some models rarely go below 0.6 even for unrelated text. Rank by score, and tune any threshold per model on real examples.",
        },
      ],
    },
    {
      h: "Dimensions, storage and speed",
      blocks: [
        {
          table: {
            head: ["Model (examples)", "Dimensions"],
            rows: [
              ["all-MiniLM-L6-v2 (open)", "384"],
              ["BGE / E5 / GTE base models (open)", "768"],
              ["OpenAI text-embedding-3-small", "1,536 (can be shortened)"],
              ["OpenAI text-embedding-3-large", "3,072 (can be shortened)"],
            ],
          },
        },
        {
          lang: "python",
          code: `# Storage for 1 million chunks with 1,536-dim float32 vectors:
1_000_000 * 1536 * 4 / 1e9     # ≈ 6.1 GB (before index overhead)
# The same at 384 dims:          ≈ 1.5 GB`,
        },
        {
          list: [
            "More dimensions can capture more nuance but cost more storage, memory and search time.",
            "**Matryoshka embeddings:** some models (including OpenAI's text-embedding-3 via the `dimensions` parameter) are trained so the first N numbers are a usable smaller embedding, letting you trade quality for size.",
            "**Quantisation** (storing int8 or binary vectors) cuts storage 4–32× with a small quality loss; vector databases support it (Day 8).",
            "Embedding models have a **max input length** (often 512–8,192 tokens). Longer text is truncated silently, which is one reason we **chunk** documents.",
          ],
        },
      ],
    },
    {
      h: "What embeddings are used for",
      blocks: [
        {
          table: {
            head: ["Use", "How"],
            rows: [
              ["Semantic search / RAG", "Embed documents once; embed the query; return the nearest chunks"],
              ["Recommendations", "\"Users who read this also read\" by nearest item vectors"],
              ["Deduplication", "Near-identical vectors → duplicate tickets, products or questions"],
              ["Clustering / topic discovery", "Group support tickets or reviews by meaning (k-means on vectors)"],
              ["Classification", "Train a small classifier on vectors, or compare with labelled examples"],
              ["Anomaly detection", "Text far from everything else is unusual"],
              ["Semantic caching", "Reuse an LLM answer when a new question is very close to a previous one"],
            ],
          },
        },
      ],
    },
    {
      h: "Choosing an embedding model, and the limits",
      blocks: [
        {
          list: [
            "**Quality on your data:** check the **MTEB** leaderboard for a shortlist, then test on your own queries.",
            "**Languages:** for Hindi, Tamil or mixed Hinglish text, choose a multilingual model and test it.",
            "**Max input length, dimensions, cost, latency, and privacy** (API vs self-hosted open model).",
          ],
        },
        {
          table: {
            head: ["Type", "Examples", "Notes"],
            rows: [
              ["API models", "OpenAI text-embedding-3, Cohere Embed, Google, Voyage", "Easy, strong quality, per-token cost, data leaves your infrastructure"],
              ["Open models", "BGE, E5, GTE, Nomic, Jina, multilingual variants", "Free to run, self-hosted; many are excellent"],
            ],
          },
        },
        {
          list: [
            "**Negation and small details:** \"refundable\" vs \"non-refundable\" can land very close together.",
            "**Exact identifiers:** order IDs, error codes and product SKUs are better found by keyword search.",
            "**Domain jargon** the model never saw may embed poorly; hybrid search or a domain model helps.",
          ],
        },
        {
          warn: "Vectors from different embedding models are **not compatible**. If you change the embedding model, you must re-embed every document. Store the model name and version alongside your vectors.",
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
              ["Architecture", "Usually an encoder", "Decoder-only transformer"],
              ["Input", "Text (or images)", "Text (and more)"],
              ["Output", "One fixed-size vector", "New text, token by token"],
              ["Used for", "Search, similarity, clustering, classification", "Answering, writing, reasoning, tool use"],
              ["Cost", "Very cheap", "Much more expensive"],
              ["In RAG", "Finds the relevant chunks", "Writes the answer from them"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Embedding = dense vector representing meaning; similar meaning → nearby vectors.",
    "One-hot and TF-IDF are sparse and have no notion of similarity; dense embeddings learn it from data.",
    "word2vec (2013): vectors from predicting neighbours; king − man + woman ≈ queen; static (one vector per word).",
    "Contextual embeddings (ELMo, BERT, all transformers) change with context.",
    "Text embedding models: encoder + pooling, trained with contrastive learning on related/unrelated pairs.",
    "Cosine (default), dot product (= cosine for normalised vectors), Euclidean. Compare scores only within one model.",
    "Storage ≈ count × dims × 4 bytes; Matryoshka and quantisation shrink it; max input length → chunking.",
    "Weak at negation and exact IDs → hybrid search. Changing models means re-embedding everything.",
  ],
  mistakes: [
    "Comparing similarity scores across different embedding models, or using a fixed threshold without testing.",
    "Embedding very long documents whole (silent truncation) instead of chunking.",
    "Relying only on embeddings for exact codes, names or IDs.",
  ],
  interview: [
    {
      q: "What is an embedding, and how is it used in RAG?",
      a: "An embedding is a dense vector representation of text produced by a model trained so that semantically similar texts have nearby vectors. In RAG you embed document chunks once and store them in a vector index; at query time you embed the question, retrieve the nearest chunks by cosine similarity, and pass them to the LLM as context to ground its answer.",
    },
    {
      q: "Static vs contextual embeddings?",
      a: "Static embeddings like word2vec or GloVe give each word one fixed vector regardless of context, so \"bank\" is the same in \"river bank\" and \"bank loan\". Contextual embeddings from transformers compute each token's vector from the surrounding text, so the meaning adapts to context. Modern sentence embedding models build on contextual representations.",
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
};

export const attention = {
  minutes: 100,
  level: "Intermediate",
  intro:
    "You don't need the maths to build with LLMs, but interviewers expect you to explain what a transformer does, why attention was a breakthrough, and how that affects cost and latency. This lesson builds the intuition, then works through self-attention **by hand with real numbers** so Q, K and V stop being magic, and finishes with the full architecture of a modern LLM.",
  sections: [
    {
      h: "The problem attention solves",
      blocks: [
        "Consider: *\"The trophy didn't fit in the suitcase because it was too big.\"* What does **it** refer to? You know it's the trophy, because you connected \"it\" with \"trophy\" and \"too big\". Change \"big\" to \"small\" and \"it\" becomes the suitcase.",
        "To understand any word, a model must look at other words, sometimes far away, and decide which ones matter. RNNs read one word at a time and squeezed everything seen so far into a single memory vector, so long-range connections faded and training couldn't be parallelised. The 2017 transformer lets **every token look at every other token directly, in parallel**. That operation is **self-attention**.",
      ],
    },
    {
      h: "Self-attention, intuitively",
      blocks: [
        "For each token, self-attention asks: **which other tokens should I pay attention to, and how much?** Then it builds a new representation of the token as a weighted mix of the others. It uses three learned projections of each token's vector, and a search-engine analogy helps:",
        {
          table: {
            head: ["Vector", "Analogy", "Role"],
            rows: [
              ["**Query (Q)**", "What I'm searching for", "\"it\" asks: which object am I referring to?"],
              ["**Key (K)**", "The label on each item", "\"trophy\" advertises: I'm a noun, an object"],
              ["**Value (V)**", "The content you get back", "The information \"trophy\" passes along if selected"],
            ],
          },
        },
        {
          list: [
            "Compare the Query of \"it\" with the Key of every token (a dot product). High score = relevant.",
            "Scale the scores and turn them into weights that add up to 1 (softmax). \"trophy\" might get 0.7, \"suitcase\" 0.2, the rest a little.",
            "Mix the Values using those weights. The new vector for \"it\" now carries information about the trophy.",
          ],
          ordered: true,
        },
        {
          lang: "text",
          code: `Attention(Q, K, V) = softmax( Q · Kᵀ / √d ) · V
                      └── how relevant ──┘   └ what to take ┘`,
          caption: "The one formula worth recognising. d is the size of the key vectors.",
        },
      ],
    },
    {
      h: "Worked example: attention by hand",
      blocks: [
        "Three tokens, \"Ravi ate mango\", with tiny 2-number vectors. Pretend the two numbers mean [is_person, is_food]. Real models use thousands of learned numbers, but the mechanics are identical.",
        {
          lang: "text",
          code: `Token vectors X:           Ravi  = [1.0, 0.0]
                           ate   = [0.5, 0.5]
                           mango = [0.0, 1.0]

Learned projections (weights) produce, for each token:
          Query Q          Key K          Value V
Ravi      [0.0, 1.0]       [1.0, 0.0]     [2.0, 0.0]
ate       [0.5, 0.5]       [0.5, 0.5]     [1.0, 1.0]
mango     [1.0, 0.0]       [0.0, 1.0]     [0.0, 2.0]
(This toy Wq makes a person look for food and food look for a person.)`,
        },
        {
          lang: "text",
          code: `Step 1. Scores = Q · Kᵀ / √2          (row = who is looking, column = looked at)
              Ravi   ate    mango
Ravi          0.00   0.35   0.71        Ravi's query matches mango's key best
ate           0.35   0.35   0.35
mango         0.71   0.35   0.00        mango's query matches Ravi's key best

Step 2. Causal mask: a token may only look at itself and earlier tokens (set the future to −∞)
Ravi          0.00   −∞     −∞
ate           0.35   0.35   −∞
mango         0.71   0.35   0.00

Step 3. Softmax each row → attention weights (each row sums to 1)
Ravi          1.00   0.00   0.00
ate           0.50   0.50   0.00
mango         0.46   0.32   0.22        "mango" attends most to "Ravi": who ate it

Step 4. Output = weights · V   (weighted mix of values)
Ravi          [2.00, 0.00]
ate           [1.50, 0.50]
mango         [1.23, 0.77]              mango's new vector now carries "person" information`,
          caption: "These are exact numbers; you'll reproduce them in NumPy in the attention-numpy build guide.",
        },
        {
          list: [
            "**Why divide by √d?** With large vectors, dot products get large, softmax becomes nearly one-hot, and training becomes unstable. Scaling keeps scores in a sensible range.",
            "**Why softmax?** It turns arbitrary scores into positive weights that sum to 1: a proper \"how much attention\" distribution.",
            "**Why the causal mask?** A decoder LLM is trained to predict the next token, so a position must not peek at tokens that come after it.",
          ],
        },
      ],
    },
    {
      h: "Multi-head attention",
      blocks: [
        "One attention operation captures one kind of relationship. **Multi-head attention** runs several (e.g. 32–128 heads) in parallel, each with its own Q/K/V projections on a slice of the vector, then concatenates and mixes their outputs. Researchers have found heads that track things like the previous token, which noun a pronoun refers to, matching brackets in code, or copying a repeated name (\"induction heads\", key to in-context learning).",
      ],
    },
    {
      h: "Where does word order come from?",
      blocks: [
        "Attention on its own treats input as a *set*: shuffle the tokens and the scores are the same. So transformers add **positional information**:",
        {
          table: {
            head: ["Method", "Idea", "Used by"],
            rows: [
              ["Sinusoidal", "Add fixed sine/cosine patterns for each position", "Original 2017 transformer"],
              ["Learned absolute", "Learn one vector per position (up to a maximum length)", "GPT-2, BERT"],
              ["**RoPE** (rotary)", "Rotate Q and K by an angle that depends on position, so scores depend on *relative* distance", "Llama, Qwen, Mistral, most modern LLMs"],
              ["ALiBi", "Add a penalty to scores that grows with distance", "Some models (e.g. MPT, BLOOM)"],
            ],
          },
        },
        "Relative schemes like RoPE made it easier to **extend context length** after training (with tricks such as position interpolation), part of how windows grew from 4K to 128K+ tokens.",
      ],
    },
    {
      h: "The full transformer block, and the full model",
      blocks: [
        "A decoder-only LLM is the same block stacked N times:",
        {
          lang: "text",
          code: `text ──tokenizer──▶ token IDs ──embedding table──▶ vectors (+ position via RoPE)
      │
      ▼   ┌──────────────── transformer block × N (e.g. 32–120 layers) ──────────────┐
      │   │  x = x + Attention(LayerNorm(x))      ← tokens exchange information      │
      │   │  x = x + MLP(LayerNorm(x))            ← each token processed on its own  │
      │   └─────────────────────────────────────────────────────────────────────────┘
      ▼
final LayerNorm ──▶ LM head (vector → one score per vocabulary token) = logits
      ▼
softmax → probabilities for the next token → sampling picks one → append → repeat`,
        },
        {
          list: [
            "**Embedding table:** a big matrix with one vector per token ID (vocabulary × model width).",
            "**Attention:** mixes information between positions (the only place tokens talk to each other).",
            "**Feed-forward network (MLP):** two big matrix multiplications with a non-linearity, applied to each token separately. It holds about two-thirds of the parameters, and much of the model's factual knowledge is thought to be stored here.",
            "**Residual connections** (`x = x + ...`): each layer *adds* to a running \"residual stream\" rather than replacing it, which keeps very deep networks trainable.",
            "**Layer normalisation** (LayerNorm or RMSNorm): keeps the numbers in a stable range.",
            "**LM head:** projects the final vector to a score (logit) for each of the ~100K+ tokens in the vocabulary.",
          ],
        },
        {
          table: {
            head: ["GPT-3 (2020), for scale", "Value"],
            rows: [
              ["Parameters", "175 billion"],
              ["Layers", "96"],
              ["Attention heads per layer", "96"],
              ["Model width (vector size)", "12,288"],
              ["Context window", "2,048 tokens"],
            ],
          },
        },
      ],
    },
    {
      h: "Encoder, decoder, encoder–decoder",
      blocks: [
        {
          table: {
            head: ["Architecture", "Sees", "Good at", "Examples"],
            rows: [
              ["Encoder-only", "Whole input, both directions", "Understanding: classification, embeddings, reranking", "BERT, RoBERTa, embedding models"],
              ["Decoder-only", "Only previous tokens (causal)", "Generating text", "GPT, Claude, Llama, Gemini, Qwen, Mistral"],
              ["Encoder–decoder", "Encoder sees all; decoder generates", "Translation, summarisation, speech (Whisper)", "T5, BART, original transformer"],
            ],
          },
        },
        "Decoder-only won for general-purpose LLMs because one simple objective (next token) on all text scales well and handles every task as \"continue this text\".",
      ],
    },
    {
      h: "The cost of attention, and the tricks that tame it",
      blocks: [
        "Every token attends to every earlier token, so attention's work grows with the **square** of the sequence length: doubling the prompt roughly quadruples attention compute. The field invented several tricks, and you'll hear their names in interviews:",
        {
          table: {
            head: ["Trick", "What it does"],
            rows: [
              ["**KV cache**", "During generation, store each previous token's keys and values so they aren't recomputed for every new token (details in the inference lesson)"],
              ["**Multi-query / grouped-query attention (MQA/GQA)**", "Heads share keys and values, shrinking the KV cache so longer contexts and bigger batches fit in GPU memory"],
              ["**FlashAttention**", "Computes exactly the same attention but in GPU-memory-friendly tiles: much faster, less memory"],
              ["**Sliding-window attention**", "Each token attends only to the last W tokens in some layers (used by Mistral and others)"],
              ["**Mixture of Experts (MoE)**", "Replaces the single MLP with many \"expert\" MLPs and a router that picks a few per token: huge total parameters, but only a fraction active per token (Mixtral, DeepSeek-V3, Qwen MoE)"],
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
            "**Cost grows with context:** long prompts cost more compute and add latency before the first token.",
            "**KV cache → prompt caching:** providers can reuse the cached keys/values for a repeated prefix, so put stable content (system prompt, tool definitions, documents) **first** and the changing question **last**.",
            "**Parallel input, sequential output:** input tokens are processed together (fast); output tokens come one at a time (slow, priced higher). Streaming exists because of this.",
            "**Position matters:** instructions and key facts at the start or end of the prompt tend to be followed more reliably than those buried in the middle.",
            "**No hidden memory:** the model's only view of the conversation is the tokens in this request.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Transformer (2017) replaced sequential RNNs with self-attention: every token looks at every other token, in parallel.",
    "Q (what I want), K (what I offer), V (what I pass on): scores = Q·Kᵀ/√d → causal mask → softmax → weighted sum of V.",
    "√d keeps scores stable; softmax makes weights sum to 1; the causal mask stops peeking at future tokens.",
    "Multi-head = several attention patterns in parallel. Position comes from RoPE (modern), learned or sinusoidal encodings.",
    "Block: x + Attention(norm(x)), then x + MLP(norm(x)); stacked N times; LM head gives logits over the vocabulary.",
    "Encoder (BERT: understanding, embeddings), decoder (GPT: generation), encoder–decoder (T5, Whisper).",
    "Attention cost grows with the square of length. KV cache, GQA, FlashAttention, sliding windows and MoE make it practical.",
    "Practical effects: long context = cost + latency; stable prefix first for prompt caching; output is sequential → streaming.",
  ],
  mistakes: [
    "Saying the model \"reads the prompt word by word like a human\". Input is processed in parallel; only output is sequential.",
    "Confusing embedding models (encoders) with chat models (decoders).",
    "Thinking a 1M-token context means the model uses all of it equally well.",
  ],
  interview: [
    {
      q: "Explain a transformer to a non-technical manager.",
      a: "It's a model that reads a whole passage at once, and for every word it works out which other words matter for understanding it, like a reader who keeps glancing back to see what \"it\" refers to. It does this in many layers, each refining its understanding. After training on huge amounts of text, it predicts what comes next very well, which is how it writes answers one word at a time.",
    },
    {
      q: "What is self-attention? Walk through the computation.",
      a: "Each token's vector is projected into a query, a key and a value. The token's query is compared with every allowed token's key using dot products, scaled by the square root of the key size, masked so a decoder can't see future tokens, and normalised with softmax into weights. The output is the weighted sum of the value vectors. Multi-head attention runs several of these with different projections and combines them.",
    },
    {
      q: "Why are output tokens slower and more expensive than input tokens?",
      a: "The prompt is processed in one parallel pass, but generation is autoregressive: each new token needs another forward pass that depends on the previous token, so output is produced sequentially and is limited by memory bandwidth. That makes output tokens more expensive per token and responsible for most of the response time.",
    },
  ],
  practice: [
    "Recompute the \"Ravi ate mango\" example on paper without the causal mask and compare the weights.",
    "Watch 3Blue1Brown's attention chapter, then explain Q, K and V in your notes in your own words.",
  ],
};
