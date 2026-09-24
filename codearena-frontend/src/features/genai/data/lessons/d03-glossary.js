// Day 3: GenAI glossary and one-page cheat sheet. Merged into d03.js. Shape: see ./index.js

export const glossary = {
  minutes: 60,
  level: "Beginner",
  intro:
    "A reference page to come back to all through the plan. Each term has a one-line definition you can say out loud in an interview. Read it once today, then use it for revision: cover the right column and explain each term yourself. Terms marked with a day number are covered in depth later.",
  sections: [
    {
      h: "One-page cheat sheet: how an LLM answers",
      blocks: [
        {
          lang: "text",
          code: `PROMPT (system + history + context + question)
  → chat template + TOKENIZER (BPE)             text → token IDs
  → EMBEDDING table + positions (RoPE)          IDs → vectors
  → N × [ SELF-ATTENTION → MLP ] (+ residuals)  vectors refined with context
  → LM HEAD → LOGITS → SOFTMAX                  a probability for every token
  → SAMPLING (temperature, top-p)               pick one token
  → append, repeat (KV cache makes it fast)     until end token / stop / max_tokens
  → DETOKENIZE → stream to the user

Made by: data → PRETRAINING (next token) → SFT (instructions) → RLHF/DPO (preferences) → reasoning RL
Fails by: hallucination, cutoff, lost in the middle, maths/counting, sycophancy, injection
Fixed by: RAG, tools, citations, low temperature, validation, guardrails, evals, humans`,
        },
      ],
    },
    {
      h: "Foundations",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Artificial intelligence (AI)", "Machines performing tasks that seem to need intelligence, by any method"],
              ["Machine learning (ML)", "Systems that learn patterns from data instead of hand-written rules"],
              ["Deep learning", "ML with many-layered neural networks"],
              ["Generative AI", "Models that create new content: text, images, audio, code"],
              ["Neural network", "Layers of weighted sums and non-linear activations, trained by gradient descent"],
              ["Parameters / weights", "The learned numbers inside a model; \"7B\" = 7 billion parameters"],
              ["Hyperparameters", "Settings chosen by people: learning rate, layer count, batch size (and temperature at inference)"],
              ["Loss", "A number measuring how wrong the model is; training minimises it"],
              ["Gradient descent", "Repeatedly nudging parameters in the direction that lowers the loss"],
              ["Backpropagation", "Efficient computation of gradients through all layers (the chain rule)"],
              ["Training vs inference", "Learning the weights vs using frozen weights to produce outputs"],
              ["Overfitting", "Memorising training data and failing on new data"],
              ["Self-supervised learning", "Labels come from the data itself, e.g. the next token"],
              ["GPU / TPU", "Parallel processors for the matrix maths of neural networks"],
            ],
          },
        },
      ],
    },
    {
      h: "Language models",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Language model", "A model of P(next token | previous tokens)"],
              ["LLM", "A large (billions of parameters) transformer language model"],
              ["Foundation model", "A large pretrained model adapted to many downstream tasks"],
              ["n-gram model", "Pre-neural language model that predicts from the previous n−1 words by counting"],
              ["Autoregressive", "Generates one token at a time, each conditioned on everything before it"],
              ["Base model", "Pretrained model that continues text; not tuned to follow instructions"],
              ["Instruct / chat model", "Base model after SFT and preference tuning; follows instructions"],
              ["Reasoning model", "Trained with RL to think (chain of thought) before answering"],
              ["Multimodal model", "Accepts or produces more than text: images, audio, video, PDFs"],
              ["Small language model (SLM)", "A compact model (roughly 1–10B parameters) for cheap, fast or on-device use"],
              ["Mixture of experts (MoE)", "Many expert sub-networks; a router activates a few per token"],
              ["Open weights", "Downloadable model weights under a licence (not necessarily open source)"],
              ["Knowledge cutoff", "The date the training data ends"],
              ["Emergent abilities", "Capabilities that appear or jump at larger scales"],
              ["Scaling laws", "Loss improves predictably as data, parameters and compute grow"],
            ],
          },
        },
      ],
    },
    {
      h: "Tokens, text and vectors",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Token", "A sub-word unit from the model's vocabulary; ~4 characters of English"],
              ["Tokenizer", "Converts text to token IDs and back"],
              ["BPE (byte pair encoding)", "Builds a vocabulary by repeatedly merging the most frequent adjacent pair"],
              ["Vocabulary", "The fixed set of tokens a model knows (30K–200K+)"],
              ["Special tokens", "Reserved tokens marking roles, boundaries and end of turn"],
              ["Chat template", "The format that turns a messages list into one token sequence"],
              ["Context window", "Max tokens per request, input + output combined"],
              ["Embedding", "A dense vector representing meaning"],
              ["Contextual embedding", "A token vector that depends on its surrounding text"],
              ["Cosine similarity", "Similarity of two vectors by the angle between them"],
              ["Vector database", "Stores embeddings and finds nearest neighbours fast (Day 5)"],
              ["Dimensions", "Length of an embedding vector (e.g. 384, 1536, 3072)"],
            ],
          },
        },
      ],
    },
    {
      h: "Transformer internals",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Transformer", "Neural architecture built from attention and feed-forward blocks (2017)"],
              ["Self-attention", "Each token builds its representation as a weighted mix of other tokens"],
              ["Query / Key / Value", "Projections: what a token looks for / offers / passes on"],
              ["Multi-head attention", "Several attention patterns computed in parallel"],
              ["Causal mask", "Stops tokens attending to future tokens (decoder models)"],
              ["Positional encoding / RoPE", "Adds word-order information to attention"],
              ["Feed-forward network (MLP)", "Per-token layer holding most parameters and much stored knowledge"],
              ["Residual connection", "Adds a layer's output to its input, keeping deep networks trainable"],
              ["Layer normalisation", "Keeps activations in a stable range"],
              ["Logits", "Raw scores for every vocabulary token before softmax"],
              ["Softmax", "Turns scores into probabilities that sum to 1"],
              ["Encoder / decoder", "Understanding (sees all, e.g. BERT) vs generating (sees the past, e.g. GPT)"],
              ["FlashAttention", "Memory-efficient exact attention computation on GPUs"],
              ["Grouped-query attention (GQA)", "Heads share keys/values to shrink the KV cache"],
            ],
          },
        },
      ],
    },
    {
      h: "Training and adaptation",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Pretraining", "Next-token prediction on trillions of tokens"],
              ["Cross-entropy / perplexity", "Average −ln P(true next token) / e^loss; lower is better"],
              ["SFT (supervised fine-tuning)", "Training on instruction → ideal response pairs"],
              ["RLHF", "Human preference rankings → reward model → RL (PPO) optimisation"],
              ["Reward model", "A model that scores how good a response is"],
              ["DPO", "Preference tuning directly on chosen vs rejected pairs, no RL loop"],
              ["Constitutional AI / RLAIF", "AI feedback guided by written principles"],
              ["RLVR / reasoning RL", "RL with automatically verifiable rewards (maths answers, unit tests)"],
              ["Distillation", "Training a smaller model to imitate a larger one's outputs"],
              ["Fine-tuning", "Further training a pretrained model on your data (Day 15)"],
              ["LoRA / QLoRA", "Cheap fine-tuning with small adapter matrices / on a 4-bit base"],
              ["Synthetic data", "Training or eval data generated by models"],
              ["Data contamination", "Test data leaking into training data"],
              ["Alignment", "Making model behaviour match human intentions and values"],
            ],
          },
        },
      ],
    },
    {
      h: "Inference and serving",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Prefill / decode", "Processing the prompt in parallel / generating one token per step"],
              ["KV cache", "Stored keys and values of previous tokens so they aren't recomputed"],
              ["Prompt caching", "Reusing the KV cache for a repeated prompt prefix across requests"],
              ["TTFT", "Time to first token"],
              ["TPOT / ITL", "Time per output token / inter-token latency"],
              ["Throughput", "Total tokens per second a server produces across users"],
              ["Continuous batching", "Requests join and leave a GPU batch at every step"],
              ["PagedAttention / vLLM", "Paged KV-cache memory; a popular open-source serving engine"],
              ["Speculative decoding", "A draft model proposes tokens; the big model verifies them in parallel"],
              ["Quantisation", "Storing weights in fewer bits (8, 4) to save memory and time"],
              ["GGUF", "Quantised model file format used by llama.cpp and Ollama"],
              ["Rate limits (RPM / TPM)", "Requests / tokens per minute allowed by a provider"],
              ["Streaming (SSE)", "Sending tokens to the client as they're generated (Day 4)"],
            ],
          },
        },
      ],
    },
    {
      h: "Decoding and prompting",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["Greedy decoding", "Always choose the most likely token"],
              ["Temperature", "Divides logits: low = focused, high = diverse"],
              ["top-k / top-p / min-p", "Truncate the distribution to the likely tokens before sampling"],
              ["max_tokens", "Cap on output length"],
              ["Stop sequence", "A string that ends generation"],
              ["Logprobs", "Log-probabilities of generated tokens; a confidence signal"],
              ["Seed", "Makes sampling more reproducible (best effort)"],
              ["System prompt", "Instructions that set the model's role and rules (Day 4)"],
              ["Zero-shot / few-shot", "Task with no examples / with a few examples in the prompt"],
              ["In-context learning", "Learning a task from the prompt alone, without weight updates"],
              ["Chain of thought", "Reasoning step by step before answering"],
              ["Structured output / JSON mode", "Output constrained to a JSON schema (Day 4)"],
              ["Tool / function calling", "The model requests a function call with JSON arguments (Days 4, 10)"],
            ],
          },
        },
      ],
    },
    {
      h: "Applications, quality and safety",
      blocks: [
        {
          table: {
            head: ["Term", "Meaning"],
            rows: [
              ["RAG", "Retrieve relevant documents and give them to the model as context (Days 5–9)"],
              ["Chunking", "Splitting documents into retrievable pieces (Day 6)"],
              ["Hybrid search / reranking", "Combining keyword and vector search / re-ordering results with a stronger model (Day 8)"],
              ["Agent", "An LLM calling tools in a loop to reach a goal (Day 10)"],
              ["MCP", "Model Context Protocol: an open standard for connecting models to tools and data (Day 13)"],
              ["Grounding", "Tying answers to provided sources"],
              ["Hallucination", "Fluent but false or unsupported output"],
              ["Faithfulness", "Whether an answer is supported by its context"],
              ["Eval / golden dataset", "A test set with expected outputs for measuring quality (Day 9)"],
              ["LLM-as-judge", "Using a model to grade outputs (Day 9)"],
              ["Guardrails", "Checks and filters around model input and output (Day 16)"],
              ["Prompt injection", "Malicious instructions hidden in input or retrieved content"],
              ["Jailbreak", "A prompt that bypasses a model's safety rules"],
              ["Sycophancy", "Telling users what they want to hear"],
              ["Red-teaming", "Deliberately attacking a system to find failures"],
              ["DPDP Act 2023", "India's Digital Personal Data Protection law"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Use this page for spaced revision: cover the Meaning column and explain each term aloud.",
    "Be able to walk through the cheat sheet flow from prompt to streamed token without notes.",
  ],
  practice: [
    "Pick 15 terms at random and record a 20-second explanation of each.",
  ],
};
