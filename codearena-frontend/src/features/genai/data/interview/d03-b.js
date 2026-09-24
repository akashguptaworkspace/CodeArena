// Day 3 interview bank, part 2: training, inference, sampling, limits, models, scenarios, coding. Assembled in d03.js.

export const trainingQs = {
  title: "How LLMs are trained",
  questions: [
    {
      id: "pipeline",
      q: "Describe the stages of training a chat LLM.",
      level: "Basic",
      common: true,
      answer:
        "Pretraining on trillions of tokens with next-token prediction produces a base model that continues text. Supervised fine-tuning on instruction–response pairs teaches it to follow instructions in a chat format. Preference tuning (RLHF, DPO or AI feedback) aligns it with what people prefer: helpful, honest, safe. Reasoning models add reinforcement learning on verifiable problems. Then safety evaluation and red-teaming before release.",
    },
    {
      id: "pretraining-data",
      q: "What goes into pretraining data, and how is it prepared?",
      level: "Intermediate",
      answer:
        "Filtered web crawls, code, books, papers, Wikipedia, multilingual text and increasingly synthetic data. Preparation includes text extraction, deduplication, quality filtering with classifiers, removing toxic content and personal data, decontaminating benchmarks, and choosing the mixture proportions, which strongly shape what the model is good at.",
    },
    {
      id: "base-vs-instruct",
      q: "What is the difference between a base model and an instruct model?",
      level: "Basic",
      common: true,
      answer:
        "A base model has only been pretrained: it continues text in the style of its training data and may ignore questions or ramble. An instruct (chat) model has been further fine-tuned and preference-tuned to follow instructions, answer in a helpful assistant style, use the chat template and refuse harmful requests. Apps use instruct models; base models are for research or further fine-tuning.",
    },
    {
      id: "sft",
      q: "What does supervised fine-tuning teach, and what doesn't it teach well?",
      level: "Intermediate",
      answer:
        "SFT teaches behaviour and format: following instructions, the chat template, tone, answer structure and tool-call syntax, using relatively small, high-quality datasets. It isn't an efficient way to add large amounts of new factual knowledge; it can even encourage confident answers about facts the model doesn't really know. For knowledge, use RAG.",
    },
    {
      id: "rlhf",
      q: "Explain RLHF.",
      level: "Intermediate",
      common: true,
      answer:
        "Collect prompts and several model responses; humans rank the responses. Train a reward model to predict those rankings. Then optimise the language model with reinforcement learning (classically PPO) to maximise the reward model's score, with a KL-divergence penalty keeping it close to the SFT model so it doesn't drift into text that exploits the reward model.",
      followups: ["What is reward hacking?", "How does DPO differ?"],
    },
    {
      id: "dpo",
      q: "What is DPO and how does it compare with RLHF?",
      level: "Advanced",
      common: true,
      answer:
        "Direct Preference Optimization trains directly on pairs of chosen and rejected responses with a classification-style loss that raises the probability of the chosen response relative to a frozen reference model. It skips training a reward model and running RL, so it's simpler, cheaper and more stable, which is why it's popular for open models, though RL-based methods remain in use at frontier labs.",
    },
    {
      id: "constitutional-ai",
      q: "What is Constitutional AI / RLAIF?",
      level: "Intermediate",
      answer:
        "An approach popularised by Anthropic where a written set of principles (a constitution) guides AI-generated critiques and preference labels, replacing much of the human labelling in the preference stage. It scales feedback, makes the intended values explicit and auditable, and reduces the need for humans to read harmful content.",
    },
    {
      id: "sycophancy-cause",
      q: "Why do aligned models tend to be sycophantic or verbose?",
      level: "Intermediate",
      answer:
        "Preference tuning optimises for what raters prefer, and people tend to rate agreeable, confident and longer answers higher. The model learns those correlations, so it may agree with incorrect users or pad answers. Labs counter this with better rating guidelines, targeted training data and evals.",
    },
    {
      id: "reasoning-training",
      q: "How are reasoning models trained?",
      level: "Advanced",
      common: true,
      answer:
        "On top of pretraining and SFT, they're trained with reinforcement learning using verifiable rewards: maths problems with known answers, code checked by unit tests, logic puzzles. The model generates a long chain of thought and final answer, and correct answers are rewarded, so it learns to decompose, check and backtrack. Methods like GRPO compare groups of sampled answers; reasoning traces can then be distilled into smaller models.",
    },
    {
      id: "knowledge-cutoff",
      q: "What is a knowledge cutoff, and how do you handle it?",
      level: "Basic",
      common: true,
      answer:
        "The date where the model's training data ends; it doesn't know later events, prices, APIs or laws, and may not know its own cutoff precisely. Handle it by supplying current information at runtime: RAG over fresh documents, tool calls (web search, databases, APIs), and today's date in the system prompt.",
    },
    {
      id: "fine-tune-vs-rag",
      q: "When would you fine-tune instead of using RAG or prompting?",
      level: "Intermediate",
      common: true,
      answer:
        "Start with prompting, then RAG for knowledge. Fine-tune when you need consistent behaviour that prompts can't achieve reliably (a strict output style, domain-specific classification or extraction), or to make a small, cheap, fast model match a large model on a narrow high-volume task. Don't fine-tune to add facts that change or need citations; that's RAG's job. Often the best systems combine both.",
    },
    {
      id: "lora",
      q: "What are LoRA and QLoRA?",
      level: "Intermediate",
      answer:
        "LoRA (low-rank adaptation) freezes the base model and trains small low-rank matrices added to selected layers, so only a tiny fraction of parameters are trained and the adapter is a few megabytes. QLoRA does the same on a 4-bit quantised base model, making it possible to fine-tune 7–8B models on a single consumer-class GPU.",
    },
    {
      id: "distillation",
      q: "What is distillation?",
      level: "Intermediate",
      answer:
        "Training a smaller student model to imitate a larger teacher, using the teacher's outputs (or probability distributions) as training data. It transfers much of the capability at a fraction of the inference cost, and it's how many small open models and small reasoning models were produced. Provider terms often restrict using their model outputs to train competing models.",
    },
  ],
};

export const inferenceQs = {
  title: "Inference, latency and serving",
  questions: [
    {
      id: "generation-walkthrough",
      q: "Walk me through what happens when you send a prompt to an LLM API.",
      level: "Intermediate",
      common: true,
      answer:
        "The provider applies the chat template and tokenizes the input. The request is queued and batched on a GPU server. Prefill runs all input tokens through the model in parallel, filling the KV cache and producing the first token. Then the decode loop repeatedly runs the model on the newest token, samples the next token from the logits and streams it back, until an end-of-turn token, a stop sequence or max_tokens. The response ends with a finish reason and usage counts.",
    },
    {
      id: "prefill-decode",
      q: "What are prefill and decode, and which is the bottleneck for what?",
      level: "Intermediate",
      common: true,
      answer:
        "Prefill processes the whole prompt at once; it's compute-bound and determines time to first token, growing with prompt length. Decode generates one token per step; it's memory-bandwidth-bound because all weights (and the KV cache) are read per step, and it determines tokens per second. Long prompts hurt TTFT; long answers hurt total latency.",
    },
    {
      id: "kv-cache",
      q: "What is the KV cache?",
      level: "Intermediate",
      common: true,
      answer:
        "During generation, each new token attends to the keys and values of all previous tokens. The KV cache stores them so they're computed once rather than at every step, making decoding fast. It consumes GPU memory proportional to layers × KV heads × head size × tokens × concurrent sequences, which limits batch size and long-context serving.",
    },
    {
      id: "prompt-caching",
      q: "What is prompt caching and how do you design for it?",
      level: "Intermediate",
      common: true,
      answer:
        "Providers keep the KV cache for a prompt prefix they've recently seen, so repeated prefixes (system prompt, tool definitions, reference documents, conversation so far) are processed faster and billed at a discount. Design for it by putting stable content first and variable content last, avoiding timestamps or per-user data early in the prompt, and keeping tool definitions stable. Some providers cache automatically; others require explicit cache markers.",
    },
    {
      id: "output-cost",
      q: "Why are output tokens priced higher than input tokens?",
      level: "Basic",
      common: true,
      answer:
        "Input tokens are processed together in one parallel prefill pass, which uses the GPU efficiently. Output tokens are generated one at a time, each requiring a pass that reads the model weights and KV cache from memory, so each output token costs more GPU time. Reasoning tokens are billed as output for the same reason.",
    },
    {
      id: "latency-metrics",
      q: "Which latency metrics do you track for an LLM feature?",
      level: "Intermediate",
      answer:
        "Time to first token (TTFT), time per output token or inter-token latency, output tokens per second, end-to-end latency (roughly TTFT + output tokens × TPOT), error and timeout rates, all at p50 and p95/p99, plus throughput and cost per request. For agents, also the number of LLM calls and tool calls per task.",
    },
    {
      id: "reduce-latency",
      q: "Your chatbot feels slow. How do you speed it up?",
      level: "Intermediate",
      common: true,
      answer:
        "First measure where time goes: queueing, TTFT, decode, tools or retrieval. Then: stream responses; cut output length with concise instructions and max_tokens; use a smaller or faster model where quality allows, or route; shorten and cache prompts (stable prefix first); fewer or smaller RAG chunks; parallelise independent calls; use a nearby region; avoid reasoning models for simple turns. Re-measure p95 after each change.",
    },
    {
      id: "continuous-batching",
      q: "What is continuous batching?",
      level: "Advanced",
      answer:
        "Instead of waiting for a whole batch of requests to finish, the server adds and removes sequences from the running batch at every decode step. Short requests leave immediately and new ones join, keeping the GPU busy and greatly improving throughput. It's standard in engines like vLLM, TGI and SGLang, usually combined with paged KV-cache memory.",
    },
    {
      id: "quantisation",
      q: "What is quantisation, and what are the trade-offs?",
      level: "Intermediate",
      common: true,
      answer:
        "Storing weights (and sometimes activations or the KV cache) in fewer bits, e.g. 8-bit or 4-bit instead of 16-bit. It cuts memory and bandwidth, so models run faster, cheaper and on smaller hardware such as laptops. The cost is some quality loss, usually small at 8-bit and more noticeable at 4-bit or below, especially for maths and long reasoning. Formats include GGUF (llama.cpp/Ollama), GPTQ, AWQ and FP8.",
    },
    {
      id: "speculative-decoding",
      q: "What is speculative decoding?",
      level: "Advanced",
      answer:
        "A small, fast draft model proposes several next tokens, and the large model verifies them all in one parallel forward pass, accepting the matching prefix and correcting the first mismatch. The output distribution is the same as the large model's, but decoding can be 2–3× faster when the draft guesses well.",
    },
    {
      id: "serving-options",
      q: "Hosted API vs self-hosting an open model: how do you decide?",
      level: "Intermediate",
      common: true,
      answer:
        "Hosted APIs give the best models, no ops, pay per token and fast iteration. Self-hosting (vLLM on your GPUs, or a private cloud endpoint) suits strict data residency or privacy, high steady volume where GPU cost beats per-token pricing, heavy customisation and fine-tuned models, or offline needs. Consider GPU cost and utilisation, ops skills, quality gap and latency; many teams use APIs first and self-host specific high-volume workloads.",
    },
    {
      id: "rate-limits",
      q: "How do you handle rate limits from an LLM provider?",
      level: "Basic",
      answer:
        "Know the limits (requests and tokens per minute). Retry 429 and transient 5xx errors with exponential backoff and jitter, respecting Retry-After. Queue and throttle work on your side, use batch APIs for offline jobs, cache results, spread load across keys, regions or providers where allowed, and request higher limits ahead of launches.",
    },
  ],
};

export const samplingQs = {
  title: "Decoding and sampling",
  questions: [
    {
      id: "temperature",
      q: "What is temperature? What value would you use for code generation?",
      level: "Basic",
      common: true,
      answer:
        "Temperature divides the logits before softmax. Low values sharpen the distribution so the model picks high-probability tokens (focused, consistent); high values flatten it (more diverse, more errors). For code, SQL, JSON or extraction I'd use about 0–0.2; for creative writing 0.8–1.0.",
    },
    {
      id: "top-p-top-k",
      q: "Explain top-k and top-p sampling.",
      level: "Basic",
      common: true,
      answer:
        "Both remove unlikely tokens before sampling. Top-k keeps the k most probable tokens. Top-p (nucleus) keeps the smallest set of tokens whose cumulative probability reaches p, so the candidate set shrinks when the model is confident and grows when it isn't. Typically you tune temperature or top-p, not both.",
    },
    {
      id: "greedy-beam",
      q: "Greedy decoding vs beam search vs sampling?",
      level: "Intermediate",
      answer:
        "Greedy picks the top token each step: deterministic but can be repetitive. Beam search keeps the k best partial sequences and returns the most probable complete one: good for translation and speech, but bland for open-ended chat. Sampling draws from the (temperature-, top-p-shaped) distribution: natural and varied, used by chat models.",
    },
    {
      id: "temp-zero",
      q: "Is temperature 0 deterministic?",
      level: "Intermediate",
      common: true,
      answer:
        "Not guaranteed. It approximates greedy decoding, but floating-point results on GPUs can vary with batch composition and hardware, mixture-of-experts routing can differ, and providers update models. A single flipped near-tie changes the rest of the output. For reproducibility, pin model versions, use a seed if supported, and store outputs.",
    },
    {
      id: "max-tokens",
      q: "What happens when a response hits max_tokens?",
      level: "Basic",
      answer:
        "Generation stops mid-answer and the finish or stop reason reports the length limit. You can get truncated sentences or invalid JSON. Always check the reason, set limits that fit the task, ask for concise output, and handle truncation (retry with a higher limit, or continue generation).",
    },
    {
      id: "logprobs",
      q: "What are logprobs and how can you use them?",
      level: "Intermediate",
      answer:
        "The log-probabilities the model assigned to generated tokens (and top alternatives). Uses: confidence scores for classification to route uncertain cases to humans, calibrated thresholds, detecting low-confidence spans as a weak hallucination signal, and computing perplexity for evaluation. Not every provider or model returns them.",
    },
    {
      id: "penalties",
      q: "What do frequency and presence penalties do?",
      level: "Intermediate",
      answer:
        "They lower the logits of tokens that have already appeared: frequency penalty scales with how many times a token appeared, presence penalty applies once if it appeared at all. They reduce repetition and loops and encourage new topics; too high and the text becomes unnatural or avoids necessary repeated words.",
    },
    {
      id: "reasoning-sampling",
      q: "Why do some models reject temperature or top_p?",
      level: "Advanced",
      answer:
        "Many reasoning models, and the newest Claude models, fix their own sampling because their long chains of thought were trained and evaluated with specific settings; changing them can degrade reasoning. They expose other controls instead, like reasoning effort or thinking budgets. So keep sampling parameters configurable per model rather than hard-coded.",
    },
    {
      id: "constrained-decoding",
      q: "How can decoding guarantee valid JSON?",
      level: "Intermediate",
      answer:
        "With constrained (grammar-guided) decoding: at each step the server masks out tokens that would violate a JSON schema or grammar, so only valid continuations can be sampled. That's how structured outputs/JSON-schema modes work. You still validate the result (e.g. with Pydantic) for business rules the schema can't express.",
    },
    {
      id: "self-consistency",
      q: "What is self-consistency?",
      level: "Advanced",
      answer:
        "Sample several independent reasoning paths for the same question (with temperature above 0) and take the majority final answer. It improves accuracy on reasoning tasks because errors are less likely to agree, at the cost of multiple calls. The disagreement rate also serves as an uncertainty signal.",
    },
  ],
};

export const limitsQs = {
  title: "Hallucinations and limitations",
  questions: [
    {
      id: "why-hallucinate",
      q: "Why do LLMs hallucinate?",
      level: "Basic",
      common: true,
      answer:
        "They're trained to generate plausible continuations, not verified facts. When knowledge is missing, rare, private or after the cutoff, they still produce fluent, answer-shaped text. Training and evaluations have often rewarded confident guesses over \"I don't know\", sampling can take a wrong branch the model then stays consistent with, and knowledge compressed into weights is approximate.",
    },
    {
      id: "reduce-hallucination",
      q: "How do you reduce hallucinations in a production app?",
      level: "Intermediate",
      common: true,
      answer:
        "Ground answers in retrieved sources with instructions to answer only from them; explicitly allow \"I don't know\"; require citations and verify they exist in the sources; use tools for calculations and live data; lower the temperature for factual tasks; validate structured output; add a verification step for critical claims; and measure faithfulness with evals and production monitoring. Keep humans in the loop for high-stakes outputs.",
      followups: ["How would you measure faithfulness?"],
    },
    {
      id: "intrinsic-extrinsic",
      q: "Intrinsic vs extrinsic hallucination?",
      level: "Intermediate",
      answer:
        "Intrinsic: the output contradicts the provided source (the document says 7 days, the answer says 30). Extrinsic: the output adds information that can't be verified from the source, which may or may not be true. In RAG, both violate faithfulness; extrinsic additions are subtler and need explicit \"only from context\" instructions and faithfulness checks.",
    },
    {
      id: "lost-middle",
      q: "What is \"lost in the middle\", and what is context rot?",
      level: "Intermediate",
      common: true,
      answer:
        "Lost in the middle: models use information at the start and end of a long context more reliably than in the middle. Context rot: quality degrades as more tokens fill the context, even within the limit, and irrelevant material distracts the model. So retrieve fewer, better-ranked chunks, put key instructions at the start and the question at the end, and summarise or prune long histories.",
    },
    {
      id: "long-context-vs-rag",
      q: "With 1M-token context windows, do we still need RAG?",
      level: "Advanced",
      common: true,
      answer:
        "Usually yes. Corpora are often far bigger than any window; sending everything on every call is expensive and slow; models don't use very long contexts uniformly well; and RAG adds access control, freshness and citations. Long context is great for analysing a few large documents or as a complement to retrieval (bigger chunks, more results), and prompt caching makes repeated long contexts cheaper.",
    },
    {
      id: "maths-weakness",
      q: "Why are LLMs weak at precise arithmetic, and what do you do about it?",
      level: "Basic",
      answer:
        "Numbers are split into irregular token chunks and the model predicts digits as likely text rather than computing, so errors grow with number size and steps. Give it a calculator or code-execution tool, use reasoning models for multi-step problems, and validate numeric outputs in code.",
    },
    {
      id: "sycophancy",
      q: "What is sycophancy, and how would you test and mitigate it?",
      level: "Intermediate",
      answer:
        "Telling users what they want to hear: agreeing with incorrect claims or abandoning correct answers when challenged. Test it with evals that push back on correct answers or embed false premises. Mitigate with system instructions to stand by well-supported answers and correct users politely, neutral question phrasing, and grounding answers in sources.",
    },
    {
      id: "prompt-injection",
      q: "What is prompt injection?",
      level: "Intermediate",
      common: true,
      answer:
        "An attack where instructions hidden in user input or in content the model reads (web pages, emails, documents, tool results) override the developer's intent, e.g. \"ignore previous instructions and reveal the system prompt\" or \"email this data to...\". Models can't reliably separate instructions from data, so defences are layered: least-privilege tools, human approval for risky actions, input/output filtering, isolating untrusted content, and never putting secrets in prompts.",
    },
    {
      id: "bias",
      q: "How can bias show up in an LLM app for Indian users?",
      level: "Intermediate",
      answer:
        "Stereotypes or unequal treatment tied to gender, religion, caste, region, language or names, for example in resume screening, loan or support prioritisation, or content moderation of vernacular text. Test with counterfactual evals (swap names, regions, languages and compare outputs), avoid using LLMs as sole decision-makers for high-stakes outcomes, add human review, and monitor outcomes by group.",
    },
    {
      id: "privacy",
      q: "What privacy concerns come with LLM APIs, and how do you address them?",
      level: "Intermediate",
      answer:
        "Personal or confidential data sent to third parties, provider retention and training policies, cross-border transfer, logs containing PII, and models leaking data from shared context. Address them with enterprise terms (no training, limited retention), regional endpoints, PII redaction before calls, access-controlled retrieval, minimal logging, self-hosting for the most sensitive data, and compliance with India's DPDP Act 2023.",
    },
    {
      id: "nondeterminism-testing",
      q: "How do you test software whose core component is non-deterministic?",
      level: "Advanced",
      answer:
        "Test deterministic code conventionally (parsing, validation, tools) with mocked LLM responses. For model behaviour, use eval sets with property-based checks (valid schema, contains required facts, cites sources) and graded metrics rather than exact string matches, run each case several times to measure pass rates, pin model versions, and track scores over time in CI.",
    },
    {
      id: "limits-summary",
      q: "What are the main limitations of LLMs you'd warn a product manager about?",
      level: "Basic",
      common: true,
      answer:
        "They can be confidently wrong; they don't know recent or private information unless we provide it; they're weak at exact maths and counting; quality varies with prompt wording and isn't perfectly repeatable; long inputs are used imperfectly; they can be manipulated by prompt injection; they can reflect bias; and cost and latency scale with tokens. Each has a mitigation, and we need evals to know how well it works for our use case.",
    },
  ],
};

export const modelQs = {
  title: "Choosing and comparing models",
  questions: [
    {
      id: "choose-model",
      q: "How would you choose an LLM for a new feature?",
      level: "Intermediate",
      common: true,
      answer:
        "Define the task and quality bar, and build an eval set of 20–50 real examples. Prove feasibility with a strong model, then test cheaper and faster models against the same set. Weigh quality, latency, cost at projected volume, context length, languages and modalities, data privacy and residency, rate limits and licence. Often the answer is routing between a small and a large model, behind a provider-agnostic interface, re-evaluated as new models ship.",
    },
    {
      id: "open-vs-closed",
      q: "Open-weight vs closed models: trade-offs?",
      level: "Basic",
      common: true,
      answer:
        "Closed APIs usually lead in quality, need no infrastructure and charge per token, but data goes to the provider and there's lock-in. Open weights can run in your own infrastructure (privacy, data residency), be fine-tuned and quantised, and can be cheaper at high steady volume, but you handle serving and ops, and must check the licence. Open weights aren't the same as open source.",
    },
    {
      id: "reasoning-when",
      q: "When is a reasoning model worth the extra cost?",
      level: "Intermediate",
      common: true,
      answer:
        "When correctness on genuinely multi-step problems matters more than latency: hard maths and logic, complex coding and debugging, planning agent tasks, analysing tricky documents. Not for simple chat, summarisation, extraction or RAG answers from given context, where a fast model is as good, cheaper and quicker. Tune the reasoning effort rather than always using the maximum.",
    },
    {
      id: "small-models",
      q: "When would you use a small language model?",
      level: "Intermediate",
      answer:
        "For high-volume, narrow tasks (classification, extraction, routing, moderation) where it meets the quality bar; for low latency (autocomplete, voice); for on-device, offline or edge use; and when data can't leave a device or network. Fine-tuning or distilling a small model from a big one can close much of the quality gap for a specific task.",
    },
    {
      id: "benchmarks",
      q: "How much do you trust public benchmarks and leaderboards?",
      level: "Intermediate",
      common: true,
      answer:
        "As a shortlist, not a decision. Benchmarks can be contaminated (test data in training), saturated (all top models score similarly), run with vendor-specific setups, and rarely match my task, language or data. Arena-style human votes favour style and length. I trust my own eval set on real examples, plus latency and cost measurements.",
    },
    {
      id: "multimodal",
      q: "What is a multimodal model, and give a use case.",
      level: "Basic",
      answer:
        "A model that accepts (and sometimes produces) more than text: images, audio, video, PDFs. Use cases: reading invoices or KYC documents into structured data, answering questions about screenshots or charts, voice assistants, or inspecting product photos for damage in returns.",
    },
    {
      id: "moe-tradeoff",
      q: "What are the practical implications of a mixture-of-experts model for serving?",
      level: "Advanced",
      answer:
        "Compute per token depends on active parameters, so MoE models generate faster than dense models of the same total size, but memory must hold all experts, so they need more GPU memory than their speed suggests. Load imbalance across experts and multi-GPU expert placement complicate serving. Via an API, you mostly see good quality per unit of price and speed.",
    },
    {
      id: "vendor-lockin",
      q: "How do you avoid vendor lock-in with LLM providers?",
      level: "Intermediate",
      answer:
        "Put a thin interface (adapter) between the app and providers, keep prompts and configuration outside code, use widely supported features (OpenAI-compatible APIs, JSON schema, standard tool calling, MCP), store your own eval sets so switching is testable, and avoid depending on provider-specific quirks without an abstraction.",
    },
    {
      id: "indian-models",
      q: "What would you consider when building for Indian-language users?",
      level: "Intermediate",
      answer:
        "Quality in the specific languages and in code-mixed Hinglish or transliterated text, token efficiency per language (cost and context), speech-to-text and text-to-speech quality for voice-first users, cultural and regional correctness, and data residency. I'd evaluate global models alongside Indian ones such as Sarvam's on a test set of real user queries in each language.",
    },
    {
      id: "model-deprecation",
      q: "A provider announces your model will be deprecated in 3 months. What do you do?",
      level: "Intermediate",
      answer:
        "Run the current eval set on candidate replacement models, compare quality, latency and cost, and adjust prompts where behaviour differs (newer models may reject old parameters or follow instructions differently). Roll out gradually behind a flag, monitor production metrics, and keep the old model as a fallback until the deadline. Afterwards, make sure model IDs are configuration, not code.",
    },
  ],
};

export const scenarioQs = {
  title: "Scenario and estimation questions",
  questions: [
    {
      id: "cost-estimate",
      q: "Estimate the monthly LLM cost for a support bot: 20,000 users, 5 questions a day, 3,000 input and 300 output tokens per question.",
      level: "Intermediate",
      common: true,
      answer:
        "Requests: 20,000 × 5 × 30 = 3M a month. Tokens: 9B input and 0.9B output. At an example small-model price of $0.15 in / $0.60 out per million: 9,000 × 0.15 + 900 × 0.60 = $1,350 + $540 ≈ $1,890 a month. At $3 / $15 for a larger model: $27,000 + $13,500 = $40,500. Then reduce with prompt caching of the fixed prefix, fewer RAG tokens, routing easy questions to the small model, and caching frequent answers.",
      detail: [
        {
          lang: "python",
          code: `requests = 20_000 * 5 * 30                      # 3,000,000
inp, out = requests * 3000 / 1e6, requests * 300 / 1e6   # millions of tokens: 9,000 and 900
print(inp * 0.15 + out * 0.60)                     # ≈ 1,890 USD (small model, example prices)
print(inp * 3.00 + out * 15.0)                     # ≈ 40,500 USD (large model, example prices)`,
        },
      ],
    },
    {
      id: "hallucination-complaint",
      q: "Users report your RAG bot confidently gives wrong policy answers. How do you debug it?",
      level: "Intermediate",
      common: true,
      answer:
        "Collect failing examples and inspect traces. For each, check retrieval (was the right policy chunk retrieved and ranked high?) and generation (was the answer faithful to the retrieved text?). Retrieval failures call for chunking, hybrid search, reranking or metadata filters; generation failures call for stricter grounding instructions, allowing \"I don't know\", citations, lower temperature or a stronger model. Add the cases to an eval set to prevent regressions.",
    },
    {
      id: "explain-generation-pm",
      q: "A product manager asks why the bot gives different answers to the same question. Explain.",
      level: "Basic",
      answer:
        "The model generates text by sampling from probabilities, so with a non-zero temperature there's deliberate variation, and even at zero small numerical differences can change the wording. Different context (history, retrieved documents) also changes answers. For consistency we can lower the temperature, ground answers in fixed sources, template key answers and cache responses to common questions.",
    },
    {
      id: "slow-first-token",
      q: "The first token takes 6 seconds but streaming is fast afterwards. What's going on?",
      level: "Intermediate",
      common: true,
      answer:
        "Something before decoding is slow: a very long prompt (large RAG context or history) making prefill slow, queueing or rate limiting at the provider, a reasoning model thinking before visible output, slow retrieval or tool calls before the LLM call, or a cold local model loading. Measure each step with tracing, then trim context, enable prompt caching, move to a faster model or tier, or run retrieval in parallel.",
    },
    {
      id: "context-overflow",
      q: "A long conversation fails with a context-length error. How do you fix it properly?",
      level: "Intermediate",
      answer:
        "Count tokens before each call and manage history: keep the system prompt and recent turns, summarise older turns into a running summary, and retrieve relevant older messages when needed. Trim large tool results and RAG chunks, reserve room for the answer (max_tokens), and consider a model with a larger window only if the product truly needs it.",
    },
    {
      id: "pick-temperature",
      q: "For each feature, what temperature would you use: SQL generation, marketing taglines, support answers from docs, a classification pipeline?",
      level: "Basic",
      answer:
        "SQL generation: 0–0.2 for correctness and consistency. Marketing taglines: 0.8–1.0 for variety, maybe sampling several and picking the best. Support answers from docs: 0–0.3, grounded. Classification: 0, with a strict output format or constrained decoding. If the model doesn't expose temperature (some reasoning models), use prompts, effort settings and validation instead.",
    },
    {
      id: "gpu-sizing",
      q: "Could we serve a 70B open model on one 80 GB GPU for 20 concurrent users?",
      level: "Advanced",
      answer:
        "In 16-bit, the weights alone are about 140 GB, so no. In 4-bit they're about 35–40 GB, leaving roughly 35 GB for the KV cache and overhead. With GQA (8 KV heads, 80 layers, head_dim 128) the cache is about 320 KB per token, so ~35 GB holds on the order of 100K tokens in total: 20 users × ~5K tokens each. Feasible for short conversations with some quality loss from quantisation; for long contexts or higher load, use more GPUs, a smaller model or an API. Validate with a load test.",
    },
    {
      id: "explain-to-junior",
      q: "Explain to a junior developer why the model doesn't remember yesterday's chat.",
      level: "Basic",
      answer:
        "The model is stateless: each API call only sees the tokens we send in that request, and its weights don't change from conversations. A chat feels continuous because our app resends the history each time. To remember across sessions, we store conversation history or a summary in our database and include the relevant parts in future requests.",
    },
    {
      id: "should-we-finetune",
      q: "Your manager wants to fine-tune a model on the company wiki so it knows everything. What do you say?",
      level: "Intermediate",
      common: true,
      answer:
        "Fine-tuning is poor at reliably adding facts: the wiki changes, the model may still hallucinate details, it can't cite sources, and access control is impossible once facts are in the weights. RAG over the wiki gives fresh, citable, permission-aware answers at lower cost. Fine-tuning may still help later for tone or a specific output format, on top of RAG.",
    },
    {
      id: "safety-incident",
      q: "Your customer bot produced an offensive reply that went viral. What do you do?",
      level: "Intermediate",
      answer:
        "Contain first: tighten or temporarily disable the affected flow, add an output moderation filter. Investigate the trace: what input and context caused it (prompt injection, jailbreak, bad retrieved content, missing guardrails)? Fix with a system prompt scope, input/output moderation or guard models, retrieval filtering and escalation to humans, then add the case and variants to a safety eval set and red-team before re-enabling.",
    },
  ],
};

export const codingQs = {
  title: "Live coding questions",
  questions: [
    {
      id: "lc-softmax",
      q: "Implement softmax with temperature in Python/NumPy.",
      level: "Basic",
      common: true,
      answer:
        "Divide logits by temperature, subtract the maximum for numerical stability, exponentiate and normalise. Handle temperature 0 as argmax.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def softmax(logits, temperature: float = 1.0):
    z = np.asarray(logits, dtype=float)
    if temperature == 0:
        out = np.zeros_like(z)
        out[np.argmax(z)] = 1.0
        return out
    z = z / temperature
    z = z - z.max()                      # stability: avoids exp overflow
    e = np.exp(z)
    return e / e.sum()`,
        },
      ],
    },
    {
      id: "lc-cosine-topk",
      q: "Given a query vector and a matrix of document vectors, return the indices of the top-k most similar documents.",
      level: "Basic",
      common: true,
      answer:
        "Normalise rows and the query, compute all cosine similarities with one matrix–vector product, then take the top k with argpartition (O(n)) and sort just those.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def top_k(query: np.ndarray, docs: np.ndarray, k: int = 5) -> list[int]:
    q = query / np.linalg.norm(query)
    d = docs / np.linalg.norm(docs, axis=1, keepdims=True)
    scores = d @ q                                   # cosine similarity for every document
    idx = np.argpartition(-scores, min(k, len(scores) - 1))[:k]
    return idx[np.argsort(-scores[idx])].tolist()`,
        },
      ],
    },
    {
      id: "lc-top-p",
      q: "Implement top-p (nucleus) sampling.",
      level: "Intermediate",
      common: true,
      answer:
        "Sort probabilities descending, take the cumulative sum, keep tokens up to and including the first index where the cumulative sum reaches p, renormalise and sample.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def top_p_sample(probs: np.ndarray, p: float = 0.9, rng=np.random.default_rng()) -> int:
    order = np.argsort(probs)[::-1]
    cum = np.cumsum(probs[order])
    cutoff = np.searchsorted(cum, p) + 1             # smallest set with cumulative prob >= p
    keep = order[:cutoff]
    kept = probs[keep] / probs[keep].sum()
    return int(rng.choice(keep, p=kept))`,
        },
      ],
    },
    {
      id: "lc-attention",
      q: "Implement scaled dot-product attention with a causal mask.",
      level: "Intermediate",
      common: true,
      answer:
        "Compute QKᵀ/√d, set positions above the diagonal to −∞, apply a stable softmax per row, and multiply by V.",
      detail: [
        {
          lang: "python",
          code: `import numpy as np

def causal_attention(Q, K, V):
    n, d = Q.shape
    scores = Q @ K.T / np.sqrt(d)
    scores[np.triu(np.ones((n, n), dtype=bool), k=1)] = -np.inf
    scores -= scores.max(axis=1, keepdims=True)
    w = np.exp(scores)
    w /= w.sum(axis=1, keepdims=True)
    return w @ V`,
        },
      ],
    },
    {
      id: "lc-trim-history",
      q: "Write a function that trims chat history to fit a token budget, always keeping the system prompt and the latest message.",
      level: "Intermediate",
      common: true,
      answer:
        "Count tokens per message, keep the system message and the last message, then add earlier messages from newest to oldest while they fit, and restore chronological order.",
      detail: [
        {
          lang: "python",
          code: `import tiktoken

enc = tiktoken.get_encoding("o200k_base")

def n_tokens(m: dict) -> int:
    return len(enc.encode(m["content"])) + 4           # rough per-message template overhead

def trim(messages: list[dict], budget: int) -> list[dict]:
    system = [m for m in messages if m["role"] == "system"]
    rest = [m for m in messages if m["role"] != "system"]
    kept = [rest[-1]]
    used = sum(map(n_tokens, system)) + n_tokens(rest[-1])
    for m in reversed(rest[:-1]):
        if used + n_tokens(m) > budget:
            break
        kept.append(m)
        used += n_tokens(m)
    return system + kept[::-1]`,
        },
      ],
    },
    {
      id: "lc-bpe-merge",
      q: "Implement one BPE training step: find the most frequent adjacent pair in a list of token IDs and merge it.",
      level: "Intermediate",
      answer:
        "Count pairs with `zip(ids, ids[1:])`, take the most common, then scan left to right replacing each occurrence of the pair with the new ID (skipping two positions after a merge).",
      detail: [
        {
          lang: "python",
          code: `from collections import Counter

def bpe_step(ids: list[int], new_id: int) -> tuple[list[int], tuple[int, int]]:
    pair = Counter(zip(ids, ids[1:])).most_common(1)[0][0]
    out, i = [], 0
    while i < len(ids):
        if i + 1 < len(ids) and (ids[i], ids[i + 1]) == pair:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out, pair`,
        },
      ],
    },
    {
      id: "lc-cost-fn",
      q: "Write a function that estimates the cost of a request from usage and a price table, including cached input tokens.",
      level: "Basic",
      answer:
        "Separate uncached input, cached input and output tokens, multiply each by its per-million price, and sum. Keep prices in data, not code.",
      detail: [
        {
          lang: "python",
          code: `PRICES = {  # USD per 1M tokens (example numbers; load real ones from config)
    "small": {"input": 0.15, "cached_input": 0.075, "output": 0.60},
}

def request_cost(model: str, input_tokens: int, output_tokens: int, cached_tokens: int = 0) -> float:
    p = PRICES[model]
    uncached = input_tokens - cached_tokens
    return (uncached * p["input"] + cached_tokens * p["cached_input"] + output_tokens * p["output"]) / 1e6`,
        },
      ],
    },
  ],
};
