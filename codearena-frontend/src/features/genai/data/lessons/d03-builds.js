// Day 3 build guides: BPE tokenizer, n-gram language model, attention in NumPy. Merged into d03.js. Shape: see ./index.js
// The Python in these guides was run and checked; keep examples runnable when editing.

export const tokenizerBpe = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "Build a real byte-level BPE tokenizer from scratch in about 90 lines of Python: train it on a book, encode and decode text losslessly, save it, and compare it with GPT-4o's tokenizer. After this, \"tokens\" are no longer abstract. You'll *see* why English-trained tokenizers are expensive for Hindi, and you'll have a portfolio-worthy repo that shows you understand LLM internals, the same exercise Andrej Karpathy uses to teach tokenization.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `tokenizer-from-scratch/
├── bpe.py          # BPETokenizer: train, encode, decode, save, load
├── train.py        # trains on corpus.txt, prints the merges it learns
├── compare.py      # compares your tokenizer with tiktoken's o200k_base
└── corpus.txt      # training text (a public-domain book)`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/tokenizer-from-scratch && cd ~/genai-practice/tokenizer-from-scratch
uv init --no-readme .
uv add tiktoken

# Training text: "Pride and Prejudice" from Project Gutenberg (public domain), first 200 KB
curl -L https://www.gutenberg.org/cache/epub/1342/pg1342.txt -o book.txt
head -c 200000 book.txt > corpus.txt          # Windows PowerShell: see the note below`,
        },
        {
          note: "On Windows without `curl`/`head`, open the Gutenberg link in a browser, save it as `book.txt`, then in Python: `open(\"corpus.txt\", \"w\", encoding=\"utf-8\").write(open(\"book.txt\", encoding=\"utf-8\").read()[:200_000])`. Any 100–500 KB of plain text works, including your own notes.",
        },
      ],
    },
    {
      h: "Step 1: the two building blocks",
      blocks: [
        "Training is just two operations repeated: **count adjacent pairs**, and **merge** the most frequent pair into a new token ID.",
        {
          lang: "python",
          code: `ids = [104, 101, 108, 108, 111]            # "hello" as UTF-8 bytes
pair_counts([ids])   # Counter({(104,101): 1, (101,108): 1, (108,108): 1, (108,111): 1})
merge(ids, (108, 108), 256)                # [104, 101, 256, 111]: "ll" is now token 256`,
          caption: "Both functions are in the full bpe.py below.",
        },
        {
          list: [
            "We start from **bytes** (0–255), not characters, so any text (Hindi, emoji, code) can be encoded. That's what \"byte-level BPE\" means.",
            "Real tokenizers first split text into word-like **chunks** (with a regex) and only merge inside a chunk, so tokens don't span across words. Our `CHUNK` regex keeps each word together with its leading space, like GPT's `' the'` tokens.",
          ],
        },
      ],
    },
    {
      h: "Step 2: the full tokenizer (bpe.py)",
      blocks: [
        {
          lang: "python",
          code: `"""A byte-level BPE tokenizer from scratch (the same algorithm GPT tokenizers use)."""
import json
import re
from collections import Counter

CHUNK = re.compile(r"\\s?\\S+|\\s+")          # split into words (with their leading space) first


def pair_counts(chunks: list[list[int]]) -> Counter:
    counts = Counter()
    for ids in chunks:
        counts.update(zip(ids, ids[1:]))
    return counts


def merge(ids: list[int], pair: tuple[int, int], new_id: int) -> list[int]:
    out, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == pair:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out


class BPETokenizer:
    def __init__(self) -> None:
        self.merges: dict[tuple[int, int], int] = {}             # (a, b) -> new token id, in merge order
        self.vocab: dict[int, bytes] = {i: bytes([i]) for i in range(256)}

    def train(self, text: str, vocab_size: int, verbose: bool = False) -> None:
        assert vocab_size >= 256
        chunks = [list(c.encode("utf-8")) for c in CHUNK.findall(text)]
        for new_id in range(256, vocab_size):
            counts = pair_counts(chunks)
            if not counts:
                break
            pair, freq = counts.most_common(1)[0]
            if freq < 2:                                          # nothing repeats any more
                break
            chunks = [merge(ids, pair, new_id) for ids in chunks]
            self.merges[pair] = new_id
            self.vocab[new_id] = self.vocab[pair[0]] + self.vocab[pair[1]]
            if verbose and (new_id < 266 or new_id % 100 == 0):
                print(f"merge {new_id - 255:>4}: {self.vocab[pair[0]]!r} + {self.vocab[pair[1]]!r}"
                      f" -> {self.vocab[new_id]!r}  ({freq} times)")

    def _encode_chunk(self, ids: list[int]) -> list[int]:
        while len(ids) >= 2:
            # apply the earliest-learned merge that is present, exactly like training did
            pair = min(zip(ids, ids[1:]), key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges:
                break
            ids = merge(ids, pair, self.merges[pair])
        return ids

    def encode(self, text: str) -> list[int]:
        out: list[int] = []
        for chunk in CHUNK.findall(text):
            out.extend(self._encode_chunk(list(chunk.encode("utf-8"))))
        return out

    def decode(self, ids: list[int]) -> str:
        return b"".join(self.vocab[i] for i in ids).decode("utf-8", errors="replace")

    def save(self, path: str) -> None:
        data = [[a, b, new] for (a, b), new in self.merges.items()]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    @classmethod
    def load(cls, path: str) -> "BPETokenizer":
        tok = cls()
        with open(path, encoding="utf-8") as f:
            for a, b, new in json.load(f):
                tok.merges[(a, b)] = new
                tok.vocab[new] = tok.vocab[a] + tok.vocab[b]
        return tok`,
        },
        {
          table: {
            head: ["Piece", "What it does"],
            rows: [
              ["`merges`", "The learned rules in order: `(a, b) → new_id`. This dict *is* the tokenizer."],
              ["`vocab`", "Token ID → its bytes. Starts with 256 single bytes; each merge adds one entry."],
              ["`train`", "Repeatedly finds the most common pair across all chunks and merges it, until the vocabulary is full or nothing repeats."],
              ["`_encode_chunk`", "Applies merges to new text in the order they were learned (lowest new ID first), exactly as training did."],
              ["`decode`", "Concatenates bytes and decodes UTF-8. `errors=\"replace\"` handles a single token ID that is only part of a multi-byte character."],
            ],
          },
        },
      ],
    },
    {
      h: "Step 3: train it (train.py)",
      blocks: [
        {
          lang: "python",
          code: `# train.py
import time
from pathlib import Path
from bpe import BPETokenizer

text = Path("corpus.txt").read_text(encoding="utf-8")
print(f"Corpus: {len(text):,} characters, {len(text.encode()):,} bytes")

tok = BPETokenizer()
start = time.perf_counter()
tok.train(text, vocab_size=512, verbose=True)
print(f"Trained {len(tok.merges)} merges in {time.perf_counter() - start:.1f}s")
tok.save("merges.json")

sample = "The transformer changed natural language processing."
ids = tok.encode(sample)
print(len(sample.encode()), "bytes ->", len(ids), "tokens")
print([tok.decode([i]) for i in ids])
assert tok.decode(ids) == sample                       # lossless round trip
print("Round trip OK")`,
        },
        {
          lang: "text",
          code: `Corpus: 192,947 characters, 195,947 bytes
merge    1: b' ' + b' ' -> b'  '  (5501 times)
merge    2: b'h' + b'e' -> b'he'  (3769 times)
merge    3: b' ' + b't' -> b' t'  (3700 times)
merge    4: b' ' + b'a' -> b' a'  (3399 times)
merge    5: b'i' + b'n' -> b'in'  (2748 times)
...
merge  145: b'T' + b'he' -> b'The'  (165 times)
Trained 256 merges in 5.6s
52 bytes -> 29 tokens
['The', ' t', 'r', 'an', 's', 'f', 'or', 'm', 'er', ' c', 'han', 'g', 'ed', ...]
Round trip OK`,
          caption: "Real output on the first 200 KB of the book. The first merge is double spaces because the Gutenberg file is indented.",
        },
        "Look at the merges: common English fragments (`he`, ` t`, `in`, `The`) appear first, just as frequency predicts. With only 256 merges, rare words like \"transformer\" are still split into many pieces.",
      ],
    },
    {
      h: "Step 4: compare with GPT-4o's tokenizer (compare.py)",
      blocks: [
        {
          lang: "python",
          code: `# compare.py
from pathlib import Path
import tiktoken
from bpe import BPETokenizer

mine = BPETokenizer.load("merges.json")
gpt4o = tiktoken.get_encoding("o200k_base")
tests = {
    "English": "Attention lets every token look at every other token in parallel.",
    "Hindi": "मैं बेंगलुरु में GenAI सीख रहा हूँ।",
    "Code": "def add(a, b):\\n    return a + b",
}
print(f"{'text':<9}{'bytes':>7}{'mine':>7}{'o200k':>7}")
for name, t in tests.items():
    print(f"{name:<9}{len(t.encode()):>7}{len(mine.encode(t)):>7}{len(gpt4o.encode(t)):>7}")
    assert mine.decode(mine.encode(t)) == t`,
        },
        {
          lang: "text",
          code: `text       bytes   mine  o200k
English       65     33     12
Hindi         83     82     13
Code          31     21     11`,
        },
        {
          list: [
            "**English:** your 512-token vocabulary halves the byte count; GPT-4o's ~200K vocabulary compresses far more.",
            "**Hindi:** your tokenizer barely compresses at all (82 tokens for 83 bytes), because it never saw Devanagari during training. This is exactly why early, English-heavy tokenizers made Indian languages expensive.",
            "**Code:** partly compressed, because spaces and common letters were learned from the book.",
          ],
        },
      ],
    },
    {
      h: "Extensions (make it portfolio-worthy)",
      blocks: [
        {
          list: [
            "Train with `vocab_size=2000` and plot tokens-per-byte against vocabulary size.",
            "Add Hindi text (e.g. a public-domain Hindi book or Wikipedia article) to the corpus and watch the Hindi count drop.",
            "Add **special tokens** such as `<|endoftext|>` that are never split and get reserved IDs.",
            "Speed it up: only recount pairs affected by each merge instead of recounting everything.",
            "Write pytest tests: round-trip on random strings, emoji and Hindi; `encode(\"\") == []`.",
            "Write a README explaining BPE with your merge log, and push to GitHub.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Byte-level BPE: start from 256 bytes, repeatedly merge the most frequent adjacent pair, record merges in order.",
    "Pre-split text into word chunks so merges don't cross words.",
    "Encode = apply merges in learned order; decode = join bytes and UTF-8 decode. Lossless round trip.",
    "The tokenizer reflects its training data: an English-only corpus barely compresses Hindi.",
  ],
  mistakes: [
    "Applying merges in the wrong order during encoding (results differ from training).",
    "Working on characters instead of bytes, which breaks on emoji and unseen scripts.",
    "Forgetting `encoding=\"utf-8\"` when reading files on Windows.",
  ],
  practice: [
    "Train two tokenizers (English-only and English+Hindi corpus) and compare token counts on the same Hindi paragraph.",
  ],
};

export const bigramLm = {
  minutes: 150,
  level: "Beginner",
  intro:
    "Build a tiny language model from scratch that learns Indian first names character by character and invents new ones. It's an **n-gram** model, the pre-neural approach from the history lesson, but it has everything an LLM has in miniature: a vocabulary with a special boundary token, training, next-token probabilities, sampling with temperature, greedy decoding, a loss and perplexity, a train/validation split, and even **overfitting**. No NumPy, no GPU, about 60 lines.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `tiny-lm/
├── names.py     # the training data: ~80 Indian first names
├── ngram.py     # NGramLM: train (count), probs, generate (temperature), loss
└── run.py       # train/val split, compare n = 1..4, generate names at several temperatures`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/tiny-lm && cd ~/genai-practice/tiny-lm
uv init --no-readme .          # no packages needed: pure Python`,
        },
        {
          table: {
            head: ["In this project", "In a real LLM"],
            rows: [
              ["27 tokens: `.` + a–z", "~100K–200K sub-word tokens"],
              ["`.` marks start and end of a name", "Special tokens: begin-of-text, end-of-turn"],
              ["Context = previous 1–3 characters", "Context = up to hundreds of thousands of tokens"],
              ["\"Training\" = counting pairs", "Training = gradient descent on billions of parameters"],
              ["`probs(ctx)` returns next-char probabilities", "Forward pass returns next-token probabilities"],
              ["Sample with temperature", "Exactly the same"],
              ["Loss = average −ln P(true next char)", "Exactly the same (cross-entropy)"],
            ],
          },
        },
      ],
    },
    {
      h: "Step 1: the data (names.py)",
      blocks: [
        {
          lang: "python",
          code: `# names.py
NAMES = """aarav aditi aditya akash akshay alok amit amrita ananya anika anil anjali ankit anushka arjun
arnav aryan asha ayesha bhavna chetan deepak deepika dev dhruv divya farhan gaurav geeta harsh
isha ishaan jaya karan kavya kiran krishna lakshmi mahesh manish meera mohan nandini naveen neha
nikhil nisha pallavi pooja pranav priya rahul raj rajesh ravi riya rohan rohit sachin sahil sakshi
sameer sanjay sara shreya siddharth simran sneha sunil suresh swati tanvi tara tushar uday varun
vidya vijay vikram vinay yash zoya""".split()`,
        },
        {
          tip: "More data = better model. Add names from your class, office or a public dataset of Indian names; 500+ names makes a big difference.",
        },
      ],
    },
    {
      h: "Step 2: the model (ngram.py)",
      blocks: [
        {
          lang: "python",
          code: `"""A character-level n-gram language model from scratch: count → probabilities → sample → evaluate."""
import math
import random
import string
from collections import defaultdict

BOUNDARY = "."                                      # start/end marker, like BOS/EOS special tokens
VOCAB = [BOUNDARY] + list(string.ascii_lowercase)   # 27 "tokens"


class NGramLM:
    def __init__(self, n: int = 2, smoothing: float = 0.1) -> None:
        self.n = n                                  # n=2: bigram (1 char of context), n=3: trigram (2 chars)
        self.smoothing = smoothing
        self.counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def _pairs(self, word: str):
        chars = BOUNDARY * (self.n - 1) + word + BOUNDARY
        for i in range(self.n - 1, len(chars)):
            yield chars[i - self.n + 1 : i], chars[i]          # (context, next char)

    def train(self, words: list[str]) -> None:                  # "training" = counting
        for w in words:
            for ctx, nxt in self._pairs(w):
                self.counts[ctx][nxt] += 1

    def probs(self, ctx: str) -> dict[str, float]:
        row = {c: self.counts[ctx][c] + self.smoothing for c in VOCAB}   # smoothing: no zero probabilities
        total = sum(row.values())
        return {c: v / total for c, v in row.items()}

    def generate(self, temperature: float = 1.0, seed: int | None = None, max_len: int = 15) -> str:
        rng = random.Random(seed)
        ctx, out = BOUNDARY * (self.n - 1), ""
        while len(out) < max_len:
            p = self.probs(ctx)
            if temperature == 0:                                # greedy decoding
                nxt = max(p, key=p.get)
            else:                                               # p ** (1/T) ≡ dividing logits by T
                weights = [p[c] ** (1 / temperature) for c in VOCAB]
                nxt = rng.choices(VOCAB, weights=weights)[0]
            if nxt == BOUNDARY:
                break
            out += nxt
            ctx = (ctx + nxt)[-(self.n - 1):] if self.n > 1 else ""
        return out

    def loss(self, words: list[str]) -> float:                  # average negative log-likelihood
        nll = [-math.log(self.probs(ctx)[nxt]) for w in words for ctx, nxt in self._pairs(w)]
        return sum(nll) / len(nll)`,
        },
        {
          list: [
            "`_pairs(\"ravi\")` with `n=2` yields `('.', 'r'), ('r', 'a'), ('a', 'v'), ('v', 'i'), ('i', '.')`: every position becomes a training example (context → next character). This is the **self-supervised** trick: labels come from the data itself.",
            "`smoothing` adds a small pseudo-count to every character so unseen combinations aren't impossible (probability 0 would make the loss infinite).",
            "`p ** (1 / temperature)` then renormalising is mathematically the same as dividing logits by *T*, as in the sampling lesson.",
            "`loss` is cross-entropy: the average surprise at the true next character. Perplexity = e^loss.",
          ],
        },
      ],
    },
    {
      h: "Step 3: train, evaluate, generate (run.py)",
      blocks: [
        {
          lang: "python",
          code: `# run.py
import math
import random
from names import NAMES
from ngram import NGramLM, VOCAB

words = NAMES[:]
random.Random(42).shuffle(words)
split = int(len(words) * 0.85)
train, val = words[:split], words[split:]
print(f"{len(train)} training names, {len(val)} held-out names")
print(f"uniform guessing: loss {math.log(len(VOCAB)):.2f}, perplexity {len(VOCAB)}")

for n in (1, 2, 3, 4):
    lm = NGramLM(n)
    lm.train(train)
    tr, va = lm.loss(train), lm.loss(val)
    print(f"n={n}: train loss {tr:.2f} (ppl {math.exp(tr):5.1f})   val loss {va:.2f} (ppl {math.exp(va):5.1f})")

lm = NGramLM(3)
lm.train(train)
for t in (0, 0.5, 1.0, 1.5):
    print(f"T={t}:", [lm.generate(t, seed=i) for i in range(8)])`,
        },
        {
          lang: "text",
          code: `69 training names, 13 held-out names
uniform guessing: loss 3.30, perplexity 27
n=1: train loss 2.67 (ppl  14.5)   val loss 2.68 (ppl  14.6)
n=2: train loss 1.98 (ppl   7.3)   val loss 2.33 (ppl  10.2)
n=3: train loss 1.60 (ppl   5.0)   val loss 2.63 (ppl  13.9)
n=4: train loss 1.49 (ppl   4.4)   val loss 2.98 (ppl  19.7)
T=0:   ['an', 'an', 'an', 'an', 'an', 'an', 'an', 'an']
T=0.5: ['saksh', 'arnav', 'tuhbvsrhan', 'an', 'adin', 'rohini', 'sh', 'adinika']
T=1.0: ['snehdjuhlowmgtp', 'arthhlqub', 'vwactsrhlpoekjs', 'dhgppa', ...]
T=1.5: ['tumfmjuhloxmgtp', 'bvtfmlqub', 'vxabvsrhnnodkjs', 'dinmpa', ...]`,
          caption: "Real output. Your generated names will match if you use the same data and seeds.",
        },
      ],
    },
    {
      h: "Step 4: read the results like an ML engineer",
      blocks: [
        {
          table: {
            head: ["Observation", "What it teaches"],
            rows: [
              ["Every model beats uniform guessing (perplexity 27)", "Even counting learns real structure in language"],
              ["n=2 has the best **validation** loss", "The right amount of context for this little data"],
              ["n=3, n=4: training loss keeps falling, validation loss **rises**", "**Overfitting**: bigger contexts memorise the training names and generalise worse. LLMs avoid this with huge data and parameter sharing"],
              ["T=0 always produces \"an\"", "Greedy decoding is repetitive and bland"],
              ["T=0.5 gives plausible names (arnav, rohini)", "Low temperature = safe, likely choices"],
              ["T=1.0–1.5 gives gibberish", "High temperature + smoothing lets rare, bad characters through, one bad pick derails the rest"],
            ],
          },
        },
        {
          note: "Why can't we just use n=10 with more data? The number of possible contexts explodes (27¹⁰), and most are never seen. Neural networks solve this by **sharing** what they learn across similar contexts through embeddings. That's the jump from Bengio's 2003 paper to GPT.",
        },
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Add top-k sampling (keep only the 5 most likely characters) and see whether T=1.0 improves.",
            "Tune `smoothing` (0.01, 0.1, 1.0) using the validation loss, like tuning a hyperparameter.",
            "Train on Hindi names in Devanagari by changing `VOCAB` to the characters in your data.",
            "Next level: watch Karpathy's *makemore* series and replace counting with a small neural network in PyTorch.",
          ],
        },
      ],
    },
  ],
  revise: [
    "A language model gives P(next token | context). Counting pairs is the simplest way to estimate it.",
    "Special boundary tokens mark start and end; generation stops when the end token is sampled.",
    "Loss = average −ln P(true next token); perplexity = e^loss; compare with uniform guessing.",
    "Train/validation split reveals overfitting: training loss falls while validation loss rises.",
    "Temperature 0 = greedy (repetitive); low T = plausible; high T = gibberish.",
  ],
  practice: [
    "Plot validation loss for n = 1..5 and smoothing values, and pick the best combination.",
  ],
};

export const attentionNumpy = {
  minutes: 120,
  level: "Intermediate",
  intro:
    "Implement the heart of the transformer yourself: scaled dot-product self-attention with a causal mask and multi-head attention, in about 50 lines of NumPy. You'll reproduce the lesson's \"Ravi ate mango\" numbers exactly, prove that the causal mask stops tokens from seeing the future, and measure the quadratic cost of attention on your laptop. Being able to write `softmax(QKᵀ/√d)V` from memory is a strong interview signal.",
  sections: [
    {
      h: "Setup",
      blocks: [
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/attention && cd ~/genai-practice/attention
uv init --no-readme .
uv add numpy`,
        },
        {
          table: {
            head: ["Shape", "Meaning"],
            rows: [
              ["`X`: (n, d_model)", "n tokens, each a vector of size d_model"],
              ["`Wq, Wk, Wv`: (d_model, d_head)", "Learned projection matrices (random or hand-set here)"],
              ["`Q, K, V`: (n, d_head)", "Queries, keys, values for every token"],
              ["`scores`, `weights`: (n, n)", "Row i = how much token i attends to each token"],
              ["output: (n, d_head)", "New vector for each token"],
            ],
          },
        },
      ],
    },
    {
      h: "The code (attention.py)",
      blocks: [
        {
          lang: "python",
          code: `"""Scaled dot-product self-attention with a causal mask, and multi-head attention, in NumPy."""
import numpy as np

np.set_printoptions(precision=2, suppress=True)


def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = x - x.max(axis=axis, keepdims=True)          # subtract the max for numerical stability
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def causal_mask(n: int) -> np.ndarray:
    return np.triu(np.ones((n, n), dtype=bool), k=1)  # True above the diagonal = "future" positions


def attention(Q, K, V, causal: bool = True):
    d = Q.shape[-1]
    scores = Q @ K.swapaxes(-1, -2) / np.sqrt(d)     # (n, n): how relevant is each token to each other
    if causal:
        scores = np.where(causal_mask(scores.shape[-1]), -np.inf, scores)
    weights = softmax(scores, axis=-1)                # each row sums to 1
    return weights @ V, weights


def self_attention(X, Wq, Wk, Wv, causal: bool = True):
    return attention(X @ Wq, X @ Wk, X @ Wv, causal)


def multi_head(X, heads: int, rng: np.random.Generator, causal: bool = True):
    n, d_model = X.shape
    d_head = d_model // heads
    outputs = []
    for _ in range(heads):                            # each head has its own learned projections
        Wq, Wk, Wv = (rng.normal(0, d_model ** -0.5, (d_model, d_head)) for _ in range(3))
        out, _ = self_attention(X, Wq, Wk, Wv, causal)
        outputs.append(out)
    Wo = rng.normal(0, d_model ** -0.5, (d_model, d_model))
    return np.concatenate(outputs, axis=-1) @ Wo      # concat heads, then mix them


if __name__ == "__main__":
    # 1. Reproduce the lesson's "Ravi ate mango" example exactly
    X = np.array([[1.0, 0.0], [0.5, 0.5], [0.0, 1.0]])
    Wq = np.array([[0.0, 1.0], [1.0, 0.0]])
    Wk = np.eye(2)
    Wv = 2 * np.eye(2)
    out, w = self_attention(X, Wq, Wk, Wv)
    print("weights:\\n", w)
    print("output:\\n", out)

    # 2. Causality test: changing a FUTURE token must not change earlier outputs
    rng = np.random.default_rng(0)
    X = rng.normal(size=(6, 16))
    y1 = multi_head(X, heads=4, rng=np.random.default_rng(1))
    X2 = X.copy()
    X2[5] += 10                                       # change only the last token
    y2 = multi_head(X2, heads=4, rng=np.random.default_rng(1))
    print("first 5 rows unchanged:", np.allclose(y1[:5], y2[:5]), "| last row changed:", not np.allclose(y1[5], y2[5]))
    print("output shape:", y1.shape)`,
        },
        {
          lang: "text",
          code: `weights:
 [[1.   0.   0.  ]
 [0.5  0.5  0.  ]
 [0.46 0.32 0.22]]
output:
 [[2.   0.  ]
 [1.5  0.5 ]
 [1.23 0.77]]
first 5 rows unchanged: True | last row changed: True
output shape: (6, 16)`,
          caption: "Real output: identical to the worked example in the attention lesson.",
        },
      ],
    },
    {
      h: "Line by line",
      blocks: [
        {
          list: [
            "`softmax` subtracts the row maximum first. Mathematically nothing changes, but it prevents `exp` overflow with large scores, a detail interviewers like.",
            "`np.triu(..., k=1)` marks positions above the diagonal: for row i, every column j > i is the future. Setting those scores to `-inf` makes their softmax weight exactly 0.",
            "`/ np.sqrt(d)` is the scaling from the paper; try removing it with d = 512 and watch the weights become almost one-hot.",
            "`K.swapaxes(-1, -2)` is the transpose Kᵀ (written this way so it also works with a batch dimension).",
            "`multi_head` gives each head its own projections of size d_model / heads, concatenates the heads and mixes them with `Wo`, exactly as in the transformer paper.",
            "The **causality test** changes only the last token and checks that earlier outputs are identical. That property is what lets a decoder be trained on every position of a sequence in parallel.",
          ],
        },
      ],
    },
    {
      h: "Measure the quadratic cost (scaling.py)",
      blocks: [
        {
          lang: "python",
          code: `# scaling.py
import time
import numpy as np
from attention import attention

rng = np.random.default_rng(0)
d = 64
for n in (512, 1024, 2048, 4096):
    Q, K, V = (rng.normal(size=(n, d)).astype(np.float32) for _ in range(3))
    start = time.perf_counter()
    attention(Q, K, V)
    ms = (time.perf_counter() - start) * 1000
    print(f"n={n:>5}  score matrix {n * n:>12,} entries  {ms:8.1f} ms")`,
        },
        {
          lang: "text",
          code: `n=  512  score matrix      262,144 entries       3.1 ms
n= 1024  score matrix    1,048,576 entries       7.2 ms
n= 2048  score matrix    4,194,304 entries      34.3 ms
n= 4096  score matrix   16,777,216 entries     153.3 ms`,
          caption: "Numbers from one laptop; yours will differ. The pattern is what matters: doubling n roughly quadruples the work.",
        },
        "This is why long prompts cost more and take longer before the first token, and why tricks like FlashAttention, sliding windows and the KV cache exist.",
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Add a **KV cache**: generate token by token, appending each new token's K and V to arrays instead of recomputing them, and check the outputs match the full computation.",
            "Add sinusoidal **positional encodings** to `X` and show that shuffling tokens now changes the output.",
            "Compare your output with PyTorch's `torch.nn.functional.scaled_dot_product_attention(Q, K, V, is_causal=True)`.",
            "Visualise `weights` as a heatmap with matplotlib.",
          ],
        },
      ],
    },
  ],
  revise: [
    "attention(Q, K, V) = softmax(QKᵀ/√d + mask) V; mask = −∞ above the diagonal for causal models.",
    "Stable softmax subtracts the row max. Each weight row sums to 1.",
    "Multi-head: split into heads with their own projections, concatenate, mix with Wo.",
    "Causal mask ⇒ earlier outputs never depend on later tokens (tested).",
    "Cost grows with n²: doubling the sequence ≈ 4× the attention work.",
  ],
  practice: [
    "Implement the KV-cache extension and verify it matches the full computation with np.allclose.",
  ],
};
