// Day 3 interview bank, part 1: history, ML basics, tokens, embeddings, transformer. Assembled in d03.js.

export const historyQs = {
  title: "History and evolution of LLMs",
  questions: [
    {
      id: "evolution",
      q: "Walk me through how NLP evolved into today's LLMs.",
      level: "Basic",
      common: true,
      answer:
        "Rule-based systems (ELIZA, expert systems) were brittle, so NLP moved to statistics: n-gram language models, TF-IDF, statistical translation. Neural networks then learned word embeddings (word2vec, 2013) and sequence models (RNNs, LSTMs), and attention (2014) let decoders focus on relevant inputs. The 2017 transformer replaced recurrence with self-attention, enabling parallel training at scale. Pretrained models followed (BERT for understanding, GPT for generation), scaling laws and GPT-3 (2020) showed bigger models learn tasks from prompts, and InstructGPT's SFT + RLHF made them follow instructions, which ChatGPT packaged in 2022. Since then: multimodal, open-weight, reasoning models and agents.",
      followups: ["What problem did each step solve?", "Why did decoder-only models win?"],
    },
    {
      id: "rnn-limits",
      q: "What were the limitations of RNNs and LSTMs that transformers solved?",
      level: "Intermediate",
      common: true,
      answer:
        "RNNs process tokens sequentially, so training can't be parallelised across positions, which made internet-scale training too slow. Information from early tokens has to survive many hidden-state updates, so long-range dependencies fade (vanishing gradients; LSTMs helped but didn't solve it). Transformers let every token attend directly to every other token in one step and compute all positions in parallel.",
    },
    {
      id: "attention-paper",
      q: "What was \"Attention Is All You Need\" and why does it matter?",
      level: "Basic",
      common: true,
      answer:
        "The 2017 Google paper (Vaswani et al.) that introduced the transformer: an encoder–decoder built only from self-attention and feed-forward layers, with no recurrence. It trained faster and translated better than RNN models, and its parallelism made scaling possible. Nearly every modern LLM is a transformer, mostly the decoder-only variant.",
    },
    {
      id: "bert-vs-gpt",
      q: "BERT vs GPT: what's the difference?",
      level: "Basic",
      common: true,
      answer:
        "BERT (2018) is an encoder-only transformer pretrained by predicting masked words using context from both sides, so it's strong at understanding tasks: classification, extraction, embeddings and reranking. GPT is decoder-only, pretrained to predict the next token using only the left context, so it's built for generation. Chat LLMs descend from GPT; embedding models and rerankers often descend from BERT.",
    },
    {
      id: "gpt3-significance",
      q: "Why was GPT-3 a turning point?",
      level: "Intermediate",
      answer:
        "At 175B parameters it demonstrated in-context (few-shot) learning: performing new tasks from a few examples in the prompt, without fine-tuning. Together with the 2020 scaling laws, it showed that scaling data, parameters and compute predictably produced broad capabilities, and it made prompting a way to program models.",
    },
    {
      id: "chatgpt-why",
      q: "GPT-3 existed in 2020. Why did ChatGPT take off only in late 2022?",
      level: "Intermediate",
      common: true,
      answer:
        "GPT-3 continued text rather than following instructions, and it was only available through an API to developers. ChatGPT used a model tuned with supervised fine-tuning and RLHF (the InstructGPT recipe) so it answered helpfully in dialogue, and it was a free chat interface anyone could use. The leap was alignment and usability, not a brand-new architecture.",
    },
    {
      id: "scaling-laws",
      q: "What are scaling laws, and what did Chinchilla change?",
      level: "Advanced",
      common: true,
      answer:
        "Scaling laws (Kaplan et al., 2020) showed that loss decreases as a smooth power law with parameters, data and compute, so labs can predict big-model performance from small runs. Chinchilla (DeepMind, 2022) found earlier models were too large for their training data: for a fixed compute budget, the optimum is roughly 20 training tokens per parameter. Later models often train far beyond that ratio because smaller, over-trained models are cheaper to serve.",
      followups: ["Why would a lab over-train a small model?"],
    },
    {
      id: "word2vec",
      q: "What did word2vec contribute?",
      level: "Basic",
      answer:
        "It (Mikolov et al., Google, 2013) efficiently learned dense word vectors by training a small network to predict neighbouring words. Words used in similar contexts got similar vectors, and vector arithmetic captured relationships (king − man + woman ≈ queen). It popularised embeddings, the foundation for semantic search and for the input layer of every LLM. Its limitation: one static vector per word regardless of context.",
    },
    {
      id: "open-weights-history",
      q: "How did open-weight models change the field?",
      level: "Intermediate",
      answer:
        "Meta's LLaMA (2023) weights spread widely and triggered a wave of community fine-tunes; Llama 2 allowed commercial use, and Mistral, Qwen, DeepSeek and Gemma followed. Open weights made self-hosting, fine-tuning, research and on-premise deployment possible, pushed API prices down, and by 2025 open models (e.g. DeepSeek-R1) were close to the frontier on many tasks.",
    },
    {
      id: "reasoning-era",
      q: "What changed with reasoning models like o1 and DeepSeek-R1?",
      level: "Intermediate",
      common: true,
      answer:
        "They added a new scaling axis: test-time compute. Trained with reinforcement learning on verifiable problems, they produce long chains of thought before answering, which substantially improves maths, coding and planning. DeepSeek-R1 (2025) showed this could be done openly and cheaply. The trade-off is more output tokens, higher cost and latency.",
    },
    {
      id: "rag-origin",
      q: "Where did RAG come from, and why is it still relevant with long context windows?",
      level: "Intermediate",
      answer:
        "The 2020 RAG paper (Lewis et al., Facebook AI) combined a retriever over a document index with a generator, grounding answers in retrieved text. It remains relevant because private and fresh data isn't in model weights, sending only relevant chunks is far cheaper and faster than filling a huge context, models use long contexts imperfectly (lost in the middle), and retrieval gives citations and access control.",
    },
    {
      id: "eliza-effect",
      q: "What is the ELIZA effect, and why does it matter for LLM products?",
      level: "Basic",
      answer:
        "Named after the 1966 rule-based chatbot ELIZA: people attribute understanding and intelligence to systems that merely produce fluent text. With LLMs it causes over-trust in confident but wrong answers. Products counter it with citations, confidence signals, clear disclaimers and human review for high-stakes decisions.",
    },
  ],
};

export const mlQs = {
  title: "Machine learning fundamentals",
  questions: [
    {
      id: "ai-ml-dl-genai",
      q: "Differentiate AI, ML, deep learning and generative AI.",
      level: "Basic",
      common: true,
      answer:
        "AI is the broad goal of machines doing intelligent tasks, including rules. ML is the subset that learns patterns from data. Deep learning is ML with many-layered neural networks. Generative AI creates new content (text, images, audio, code), usually with deep models; LLMs are generative models for text built on transformers.",
    },
    {
      id: "learning-types",
      q: "Supervised, unsupervised, self-supervised and reinforcement learning: give an LLM example of each.",
      level: "Intermediate",
      common: true,
      answer:
        "Supervised: labelled examples, as in SFT (prompt → ideal answer). Unsupervised: find structure without labels, e.g. clustering embeddings of support tickets. Self-supervised: labels derived from the data itself, as in pretraining where the next token is the label. Reinforcement learning: learn from rewards, as in RLHF (a reward model's score) and reasoning training (correct answers).",
    },
    {
      id: "parameters-vs-hyper",
      q: "What are parameters vs hyperparameters?",
      level: "Basic",
      answer:
        "Parameters (weights and biases) are learned during training; \"a 70B model\" has 70 billion of them. Hyperparameters are chosen by people and control training or inference: learning rate, batch size, number of layers, context length, and at inference temperature and top-p.",
    },
    {
      id: "gradient-descent",
      q: "Explain gradient descent and backpropagation simply.",
      level: "Basic",
      common: true,
      answer:
        "Training defines a loss measuring how wrong the model is. Backpropagation uses the chain rule to compute, for every parameter, how the loss would change if that parameter changed (the gradient). Gradient descent then nudges each parameter a small step (the learning rate) in the direction that reduces the loss, repeated over many batches.",
    },
    {
      id: "overfitting",
      q: "What is overfitting, and how do you detect it?",
      level: "Basic",
      common: true,
      answer:
        "Overfitting is when a model memorises its training data, including noise, and performs worse on new data. You detect it by holding out validation and test sets: training loss keeps falling while validation loss rises. Remedies include more data, regularisation, smaller models, early stopping and data augmentation. For LLM apps, the analogue is tuning prompts to a few examples and failing on real traffic, which is why evals use held-out sets.",
    },
    {
      id: "training-vs-inference",
      q: "Does an LLM learn from my conversation?",
      level: "Basic",
      common: true,
      answer:
        "Not in the weights. Inference uses frozen parameters; the model adapts only through the context you send (in-context learning), and forgets it when the next request doesn't include it. A provider could later use logged data for training, which is a data-policy question; most business APIs don't by default, but you should check the terms.",
    },
    {
      id: "why-gpus",
      q: "Why do LLMs need GPUs?",
      level: "Basic",
      answer:
        "Neural networks are dominated by large matrix multiplications, which GPUs perform with thousands of parallel cores. Generation is also limited by memory bandwidth, since all weights are read for each token, and GPUs have very fast high-bandwidth memory. A CPU can run small quantised models, just much more slowly.",
    },
    {
      id: "cross-entropy",
      q: "What loss function do LLMs minimise, and what is perplexity?",
      level: "Intermediate",
      answer:
        "Cross-entropy: the average negative log-probability the model assigned to the actual next token. If it gave the correct token probability 0.9, the loss is about 0.1; with 0.01 it's about 4.6. Perplexity is e raised to that loss, interpretable as how many tokens the model is effectively choosing between; lower is better.",
    },
    {
      id: "model-memory",
      q: "How much memory does a 7B-parameter model need?",
      level: "Intermediate",
      common: true,
      answer:
        "Weights alone: parameters × bytes per parameter. In 16-bit that's about 14 GB, in 8-bit about 7 GB, in 4-bit about 3.5–4 GB. Serving also needs the KV cache (which grows with context length and concurrent users) plus runtime overhead, so plan for noticeably more than the weights.",
      followups: ["How big is the KV cache for a long context?"],
    },
    {
      id: "generalisation-contamination",
      q: "What is benchmark contamination?",
      level: "Intermediate",
      answer:
        "When test questions or answers appear in the training data, usually because benchmarks are published on the web that gets crawled. The model can then score well by memory rather than ability. Labs try to decontaminate training data, and you should prefer fresh, private or held-out evaluations built from your own data.",
    },
  ],
};

export const tokenQs = {
  title: "Tokens and tokenization",
  questions: [
    {
      id: "what-token",
      q: "What is a token, and why do LLM APIs charge by tokens?",
      level: "Basic",
      common: true,
      answer:
        "A token is a sub-word unit from the model's vocabulary, roughly four characters or three-quarters of a word in English. Models read and write sequences of token IDs, and compute scales with the number of tokens processed, so providers price and rate-limit by tokens, with separate (usually higher) prices for output tokens.",
    },
    {
      id: "why-subwords",
      q: "Why do LLMs use sub-word tokens rather than characters or words?",
      level: "Intermediate",
      answer:
        "Characters make sequences very long and slow, and push all spelling into the model. Whole words need an enormous vocabulary and can't handle unseen words, names or typos. Sub-words balance both: frequent words are single tokens, rare words are composed from pieces, and with byte-level fallback nothing is ever out of vocabulary.",
    },
    {
      id: "bpe",
      q: "Explain byte pair encoding (BPE).",
      level: "Intermediate",
      common: true,
      answer:
        "Start with a base vocabulary of bytes. Count all adjacent pairs in a training corpus, merge the most frequent pair into a new token, record the merge, and repeat until the vocabulary reaches the target size. To encode new text, apply the merges in the learned order; to decode, concatenate each token's bytes.",
      detail: [
        {
          lang: "text",
          code: `"low lower lowest": (l,o) → "lo", (lo,w) → "low", (e,s) → "es", (es,t) → "est" ...
"lowest" → ["low", "est"]`,
        },
      ],
    },
    {
      id: "tokenizer-families",
      q: "BPE vs WordPiece vs SentencePiece?",
      level: "Advanced",
      answer:
        "All are sub-word schemes. BPE (GPT, Llama 3) merges the most frequent pairs, usually at byte level. WordPiece (BERT) chooses merges that most increase training-data likelihood and marks continuation pieces with ##. SentencePiece (T5, Llama 2, Gemma) is a library that treats text as a raw character stream including spaces (shown as ▁), supporting BPE or unigram models, which suits languages without spaces.",
    },
    {
      id: "strawberry",
      q: "Why do LLMs struggle to count letters, reverse words or do exact arithmetic?",
      level: "Basic",
      common: true,
      answer:
        "They operate on tokens, not characters: \"strawberry\" may be `st` + `raw` + `berry`, so letter-level facts aren't directly visible. Numbers are split into irregular chunks too. The model must have memorised token spellings and arithmetic patterns, which is unreliable. The fix is a tool (running code or a calculator); reasoning models help by spelling things out step by step.",
    },
    {
      id: "indian-languages",
      q: "Why does Hindi or Tamil text cost more tokens than English, and what would you do about it?",
      level: "Intermediate",
      common: true,
      answer:
        "Tokenizer vocabularies are learned from training data that was historically English-heavy, so Indic scripts get split into many small pieces. The same sentence in Hindi needed about 5× more tokens than English with GPT-2's tokenizer; newer tokenizers narrowed the gap substantially, but it still varies by language and model. I'd measure tokens per language on candidate models, prefer models with Indic-friendly tokenizers (or Indian models such as Sarvam's) for vernacular products, and budget cost and context accordingly.",
    },
    {
      id: "context-window",
      q: "What is a context window, and what counts toward it?",
      level: "Basic",
      common: true,
      answer:
        "The maximum number of tokens a model processes in one request, input and output combined. The system prompt, tool definitions, chat history, retrieved documents, images, the user message and the generated answer (including any reasoning tokens) all count.",
    },
    {
      id: "chat-template",
      q: "What is a chat template and why does it matter?",
      level: "Intermediate",
      answer:
        "The model only reads one token sequence, so a chat template turns a list of role-tagged messages into that sequence using special tokens, like `<|im_start|>user ... <|im_end|>`. Each model family learned its own format during fine-tuning. Hosted APIs apply it for you, but with open models the wrong template produces bad or never-ending answers.",
    },
    {
      id: "special-tokens",
      q: "What are special tokens, and what's the security concern with them?",
      level: "Advanced",
      answer:
        "Reserved tokens with control meaning: begin/end of text, end of turn, role markers, tool-call markers. If untrusted user text could be encoded as real special tokens, a user might close the system's turn or impersonate a role. Tokenizers like tiktoken refuse special-token text by default, and when building prompts for open models you should encode user content as plain text.",
    },
    {
      id: "count-tokens",
      q: "How do you count tokens before and after a call?",
      level: "Basic",
      answer:
        "Before: the provider's tokenizer or token-counting endpoint (tiktoken for OpenAI models, Anthropic's count_tokens endpoint, the Hugging Face tokenizer for open models), or characters ÷ 4 as a rough estimate. After: the `usage` field in the response, which reports input, output, cached and reasoning tokens exactly for billing.",
    },
    {
      id: "vocab-size-tradeoff",
      q: "What's the trade-off in choosing a tokenizer's vocabulary size?",
      level: "Advanced",
      answer:
        "A larger vocabulary compresses text into fewer tokens (cheaper, faster, more fits in context, better for multilingual text) but enlarges the embedding table and output layer and leaves rare tokens under-trained. A smaller vocabulary does the opposite. Vocabularies have grown from ~30–50K to 128K–200K+ tokens for this reason.",
    },
  ],
};

export const embeddingQs = {
  title: "Embeddings and similarity",
  questions: [
    {
      id: "what-embedding",
      q: "What is an embedding?",
      level: "Basic",
      common: true,
      answer:
        "A dense vector of numbers representing the meaning of text (or images, code, audio), produced by a model trained so that similar meanings get nearby vectors. It lets you compare meaning with simple maths such as cosine similarity, which powers semantic search, RAG, clustering, deduplication and recommendations.",
    },
    {
      id: "static-contextual",
      q: "Static vs contextual embeddings?",
      level: "Intermediate",
      answer:
        "Static embeddings (word2vec, GloVe) assign one fixed vector per word, so \"bank\" is the same in \"river bank\" and \"bank loan\". Contextual embeddings from transformers compute each token's vector from its surroundings, so meaning adapts to context. Sentence embedding models pool contextual token vectors into one vector per text.",
    },
    {
      id: "cosine-dot-euclid",
      q: "Cosine similarity vs dot product vs Euclidean distance?",
      level: "Intermediate",
      common: true,
      answer:
        "Cosine measures the angle between vectors and ignores length; it's the default for text. Dot product also includes magnitude, and equals cosine when vectors are normalised to length 1 (many embedding models return normalised vectors, so dot product is used for speed). Euclidean distance measures straight-line distance; for normalised vectors it ranks results the same way as cosine.",
    },
    {
      id: "embedding-training",
      q: "How are text embedding models trained?",
      level: "Advanced",
      answer:
        "Usually a transformer encoder (or adapted LLM) is trained with contrastive learning: for pairs that should match (question–answer, query–clicked document, title–body), their vectors are pulled together while vectors of non-matching examples in the same batch are pushed apart. Large, diverse pair datasets, often multilingual, and hard negatives produce the best models.",
    },
    {
      id: "embedding-dimensions",
      q: "What do embedding dimensions affect? What are Matryoshka embeddings?",
      level: "Intermediate",
      answer:
        "More dimensions can capture more nuance but cost more storage, memory and search time: 1M chunks at 1,536 float32 dimensions is about 6 GB before index overhead. Matryoshka-trained models put the most important information in the first dimensions, so you can truncate vectors (e.g. 3,072 → 512) and trade a little quality for much less storage; OpenAI's text-embedding-3 exposes this via a dimensions parameter.",
    },
    {
      id: "change-embedding-model",
      q: "What happens if you switch embedding models in production?",
      level: "Intermediate",
      common: true,
      answer:
        "Vectors from different models live in different spaces and can't be compared, so you must re-embed every document and rebuild the index. Plan for it: store the model name and version with each vector, run the new index side by side, compare retrieval quality on an eval set, then switch over.",
    },
    {
      id: "embedding-limits",
      q: "Where do embeddings fail?",
      level: "Intermediate",
      answer:
        "Exact identifiers (order IDs, error codes, SKUs), negation and small but important words (\"refundable\" vs \"non-refundable\"), rare domain jargon, very long inputs beyond the model's max length (silently truncated), and languages the model wasn't trained on. Hybrid search with BM25, reranking, chunking and choosing a suitable (multilingual or domain) model address these.",
    },
    {
      id: "embedding-vs-llm",
      q: "How is an embedding model different from a chat LLM?",
      level: "Basic",
      answer:
        "An embedding model maps text to one fixed-size vector and is usually encoder-based, small and cheap; it's used to find and compare. A chat LLM is a decoder that generates new text token by token; it's used to answer and reason. In RAG, the embedding model retrieves relevant chunks and the LLM writes the answer from them.",
    },
    {
      id: "choose-embedding",
      q: "How would you choose an embedding model for an Indian e-commerce search?",
      level: "Intermediate",
      answer:
        "Shortlist from MTEB and multilingual benchmarks, then evaluate on our own queries: English, Hindi, Hinglish and transliterated product searches with known relevant results, measuring recall@k. Weigh max input length, dimensions and storage, latency, cost, and whether data can go to an API or needs a self-hosted open model. Combine with keyword search for SKUs and brand names.",
    },
    {
      id: "embedding-uses",
      q: "Besides RAG, what are embeddings used for?",
      level: "Basic",
      answer:
        "Recommendations (similar items), deduplication of tickets or products, clustering and topic discovery, classification with a small model on top, anomaly detection, semantic caching of LLM answers, and routing queries to the right handler.",
    },
  ],
};

export const transformerQs = {
  title: "Transformers and attention",
  questions: [
    {
      id: "explain-transformer",
      q: "Explain a transformer to a non-technical manager.",
      level: "Basic",
      common: true,
      answer:
        "It reads a whole passage at once, and for every word works out which other words matter for understanding it, like a reader glancing back to see what \"it\" refers to. It repeats this over many layers, each refining its understanding. Trained on huge amounts of text, it becomes very good at predicting what comes next, which is how it writes answers one word at a time.",
    },
    {
      id: "self-attention",
      q: "Explain self-attention step by step.",
      level: "Intermediate",
      common: true,
      answer:
        "Each token's vector is projected into a query, a key and a value. A token's query is dot-producted with the keys of the tokens it may see, the scores are divided by the square root of the key dimension, masked for future positions in a decoder, and softmaxed into weights that sum to 1. The output is the weighted sum of the value vectors, giving each token a context-aware representation.",
      detail: [{ lang: "text", code: `Attention(Q, K, V) = softmax(Q·Kᵀ / √d + mask) · V` }],
      followups: ["Why divide by √d?", "What does the mask do?"],
    },
    {
      id: "qkv",
      q: "What do Query, Key and Value represent?",
      level: "Intermediate",
      common: true,
      answer:
        "They're three learned projections of each token's vector. The query represents what the token is looking for, the key what it offers to others, and the value the information it passes on when attended to. Query–key similarity decides the attention weights; values are what get mixed.",
    },
    {
      id: "sqrt-d",
      q: "Why is attention scaled by √d?",
      level: "Advanced",
      answer:
        "Dot products of d-dimensional vectors grow in magnitude with d. Large scores push softmax into a nearly one-hot regime where gradients are tiny, making training unstable. Dividing by √d keeps the variance of the scores roughly constant regardless of dimension.",
    },
    {
      id: "multi-head",
      q: "Why multi-head attention?",
      level: "Intermediate",
      common: true,
      answer:
        "A single attention pattern can only capture one kind of relationship at a time. Multiple heads, each with its own smaller Q/K/V projections, attend in parallel to different relationships (syntax, coreference, nearby context, copying patterns), and their outputs are concatenated and mixed by an output projection, at about the same cost as one big head.",
    },
    {
      id: "causal-mask",
      q: "What is causal masking?",
      level: "Intermediate",
      answer:
        "In decoder models, attention scores for future positions are set to −∞ before softmax, so each token can only attend to itself and earlier tokens. This lets the model be trained to predict every next token of a sequence in parallel without cheating, and makes generation consistent with training.",
    },
    {
      id: "positional",
      q: "How do transformers know word order? What is RoPE?",
      level: "Advanced",
      common: true,
      answer:
        "Attention alone is order-agnostic, so position information is added. The original transformer added sinusoidal position vectors; GPT-2 and BERT learned position embeddings. Most modern LLMs use rotary position embeddings (RoPE), which rotate query and key vectors by position-dependent angles so attention scores depend on relative distance, and which can be extended to longer contexts with interpolation tricks.",
    },
    {
      id: "block-components",
      q: "What are the components of a transformer block?",
      level: "Intermediate",
      answer:
        "Multi-head self-attention (tokens exchange information) and a position-wise feed-forward network (each token transformed independently), each wrapped with layer normalisation and a residual connection. The block is stacked many times, after an embedding layer (plus positional information) and before a final normalisation and an LM head that produces logits over the vocabulary.",
    },
    {
      id: "encoder-decoder",
      q: "Encoder-only vs decoder-only vs encoder–decoder: when is each used?",
      level: "Intermediate",
      common: true,
      answer:
        "Encoder-only (BERT) sees the whole input bidirectionally and is best for understanding: classification, embeddings, reranking. Decoder-only (GPT, Claude, Llama) uses causal attention and is best for generation, and handles almost any task as text continuation. Encoder–decoder (T5, BART, Whisper) encodes an input fully and decodes an output, suiting translation, summarisation and speech recognition.",
    },
    {
      id: "attention-complexity",
      q: "What is the computational complexity of attention, and how is it mitigated?",
      level: "Advanced",
      common: true,
      answer:
        "Standard self-attention is quadratic in sequence length: every token scores every other, so doubling the length roughly quadruples attention compute and the score-matrix memory. Mitigations: FlashAttention (exact, memory-efficient kernels), KV caching during generation, grouped-query attention to shrink the cache, sliding-window or sparse attention, and architectures that mix in linear-time layers.",
    },
    {
      id: "moe",
      q: "What is a mixture-of-experts layer?",
      level: "Advanced",
      answer:
        "It replaces a block's single feed-forward network with many expert FFNs plus a router that sends each token to a few experts (e.g. 2 of 8). Total parameters grow a lot while compute per token stays small: DeepSeek-V3 has 671B parameters but about 37B active per token. The costs: all experts must be in memory, and routing and load balancing make training and serving more complex.",
    },
    {
      id: "where-knowledge",
      q: "Where is factual knowledge stored in an LLM?",
      level: "Advanced",
      answer:
        "Distributed across the weights. Interpretability research suggests the feed-forward (MLP) layers act a bit like key–value memories storing many facts, while attention routes information between positions. Knowledge isn't stored as retrievable records, which is why it's approximate, hard to update or delete precisely, and why RAG is used for facts that must be exact and current.",
    },
  ],
};
