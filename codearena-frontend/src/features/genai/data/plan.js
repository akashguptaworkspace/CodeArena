/**
 * GenAI 20-Day Sprint: a MERN developer's plan to become interview-ready for GenAI developer roles.
 *
 * Every learn/build item is a task the student ticks off. Task ids are stable slugs (not indexes), so
 * editing the text or reordering items never moves someone's saved ticks onto a different task.
 * Progress is stored in `progress.design` as "ready" (done), so it syncs through the existing API;
 * run `npm run sync:catalog` in the backend after adding or renaming a task.
 */

export const GENAI_PHASES = [
  {
    id: "foundations",
    title: "Foundations",
    days: "Days 1–4",
    summary: "Python for a JavaScript developer, how LLMs work at an intuition level, and calling LLM APIs properly.",
  },
  {
    id: "rag",
    title: "RAG",
    days: "Days 5–9",
    summary: "The most asked GenAI interview topic. Build it from scratch first, then with frameworks, then make it good.",
  },
  {
    id: "agents",
    title: "Agents & MCP",
    days: "Days 10–14",
    summary: "Tool calling, LangGraph, MCP and production concerns. Resume goes live and you start applying on Day 14.",
  },
  {
    id: "deploy",
    title: "Open models & deployment",
    days: "Days 15–17",
    summary: "Fine-tuning concepts, self-hosting, and shipping to AWS, where your DevOps background pays off.",
  },
  {
    id: "interview",
    title: "Interview mode",
    days: "Days 18–20",
    summary: "GenAI system design, coding rounds, mock interviews and applications.",
  },
];

// learn / build: [slug, text]. project: the portfolio piece this day feeds, if any.
const DAYS = [
  {
    phase: "foundations",
    title: "Python for JS developers",
    hours: 10,
    why: "Set up Python on your laptop, learn the language mapped from JavaScript, and build your first FastAPI backend structured the way you'd structure Express.",
    learn: [
      ["setup", "Setup: install Python, VS Code and uv on Mac and Windows; run your first program"],
      ["types", "Types, lists, dicts, sets, tuples; slicing; f-strings"],
      ["functions", "Comprehensions, lambda, map/filter; functions with *args / **kwargs"],
      ["classes", "Classes, dataclasses, type hints; modules and imports"],
      ["envs", "Environments: uv (or venv + pip), requirements, .env with python-dotenv"],
      ["errors", "Exceptions, file I/O, JSON; reading tracebacks"],
      ["backend-structure", "Python backend structure for Express developers: routes, controllers, services, models, schemas"],
    ],
    build: [
      ["first-api", "First FastAPI + Pydantic project from scratch, with an Express-style layered (MVC) structure"],
      ["port-utils", "Port 3 small JS utilities you've written to Python"],
      ["cli-tracker", "CLI expense tracker that saves to JSON, with type hints"],
      ["leetcode-10", "Solve 10 easy LeetCode array / string / hashmap problems in Python"],
    ],
    questions: [
      "How would you structure a FastAPI project compared with Express?",
      "List vs tuple vs set: when do you use each?",
      "What goes wrong with a mutable default argument?",
      "What is the GIL, and does it matter for I/O-bound apps?",
    ],
    resources: [
      ["Python official tutorial", "https://docs.python.org/3/tutorial/"],
      ["CampusX Python (Hindi)", "https://www.youtube.com/@campusx-official"],
    ],
  },
  {
    phase: "foundations",
    title: "Python backend: async, Pydantic, FastAPI",
    hours: 10,
    why: "Turn yesterday's Shop API into a production-shaped backend: async code, calling APIs, deep Pydantic and FastAPI, REST design, PostgreSQL with SQLAlchemy and migrations (or MongoDB), JWT auth and tests. Take 3–4 days if you need them.",
    learn: [
      ["asyncio", "async/await and asyncio vs the Node event loop"],
      ["httpx", "httpx / requests for calling APIs"],
      ["pydantic", "Pydantic models and validation (think Zod)"],
      ["fastapi", "FastAPI: routes, path/query/body, dependency injection, middleware, background tasks"],
      ["api-design", "REST API design in FastAPI: status codes, errors, pagination, filtering, versioning, uploads"],
      ["db", "Databases overview (Postgres + SQLAlchemy vs MongoDB + Motor) and logging"],
      ["sqlalchemy", "PostgreSQL with SQLAlchemy 2.0 (async): models, relationships, sessions, transactions, N+1"],
      ["alembic", "Database migrations with Alembic (like Sequelize / Prisma migrations)"],
      ["mongodb", "MongoDB in Python with Beanie ODM, mapped from Mongoose"],
      ["auth", "Authentication and security: password hashing, JWT, OAuth2 in FastAPI, roles, ownership"],
      ["testing", "Testing a FastAPI + database app: pytest fixtures, async tests, test database, coverage"],
    ],
    build: [
      ["crud-api", "Upgrade the Shop API: PostgreSQL + SQLAlchemy async + Alembic + users with JWT auth + tests"],
      ["mongo-api", "Optional for MERN developers: the same Shop API on MongoDB with Beanie"],
      ["docker", "Check the auto-generated Swagger docs; write a Dockerfile for it"],
    ],
    questions: [
      "FastAPI vs Express vs Flask: why FastAPI for AI services?",
      "How does async work in Python compared with Node?",
      "What does Pydantic give you?",
    ],
    resources: [
      ["FastAPI tutorial", "https://fastapi.tiangolo.com/tutorial/"],
      ["Pydantic docs", "https://docs.pydantic.dev/"],
    ],
  },
  {
    phase: "foundations",
    title: "How LLMs work: history, intuition and internals",
    hours: 12,
    why: "Interviewers check that you're more than an API caller. Learn where LLMs came from, how they're built, trained and served, and why they fail, with intuition and tiny from-scratch code instead of heavy maths. Take 3–4 days if you need them.",
    learn: [
      ["history", "The story from AI to ChatGPT: rule-based NLP → statistics → deep learning → transformers → LLMs → reasoning models and agents"],
      ["ml-basics", "Machine learning in plain words: AI vs ML vs deep learning vs GenAI, neural networks, loss, gradient descent, parameters, GPUs"],
      ["tokens", "Tokens and tokenization (BPE, vocabularies, special tokens, chat templates); the context window"],
      ["embeddings", "Embeddings: meaning as vectors, from word2vec to modern embedding models; similarity metrics"],
      ["attention", "Transformer and self-attention: Q/K/V worked by hand, multi-head, positions (RoPE), the full block"],
      ["training", "How an LLM is made: data, pretraining, scaling laws, SFT, RLHF / DPO / Constitutional AI, reasoning RL, fine-tuning"],
      ["inference", "How an LLM runs: prefill vs decode, KV cache, latency metrics, batching, quantization, GPU memory maths"],
      ["sampling", "Decoding and sampling: logits, softmax, greedy, temperature, top-k, top-p, penalties, stop, seed, logprobs"],
      ["limits", "Why LLMs fail: hallucinations, knowledge cutoff, lost in the middle, reasoning and maths limits, sycophancy, bias; fixes"],
      ["landscape", "Model landscape: GPT, Claude, Gemini, Llama, Mistral, Qwen, DeepSeek, Indian models; open vs closed; MoE; reasoning and multimodal models; benchmarks; choosing"],
      ["glossary", "GenAI glossary and one-page cheat sheet: 90+ terms you must be able to explain"],
    ],
    build: [
      ["tokenizer-bpe", "Build a BPE tokenizer from scratch in Python (train, encode, decode) and compare with tiktoken"],
      ["bigram-lm", "Build a tiny character-level language model from scratch and generate Indian names with temperature"],
      ["attention-numpy", "Implement scaled dot-product self-attention with a causal mask in NumPy"],
      ["cost-calc", "Token counter + cost calculator comparing 3 models (tiktoken)"],
      ["temp-notebook", "Notebook: same prompt at temperature 0, 0.7 and 1.2, with written observations"],
    ],
    questions: [
      "Walk me through how an LLM generates a response, from the prompt to the final token.",
      "Explain a transformer to a non-technical manager.",
      "What is temperature? What would you set for code generation?",
      "Why do LLMs hallucinate, and how do you reduce it?",
      "Pretraining vs SFT vs RLHF vs DPO?",
      "What is the KV cache, and why are output tokens more expensive?",
      "What is a reasoning model, and when is it worth the cost?",
    ],
    resources: [
      ["Karpathy: Intro to LLMs", "https://www.youtube.com/watch?v=zjkBMFhNj_g"],
      ["Karpathy: Let's build GPT from scratch", "https://www.youtube.com/watch?v=kCc8FmEb1nY"],
      ["Karpathy: Let's build the GPT tokenizer", "https://www.youtube.com/watch?v=zduSFxRajkE"],
      ["3Blue1Brown: Neural networks & transformers", "https://www.3blue1brown.com/topics/neural-networks"],
      ["The Illustrated Transformer", "https://jalammar.github.io/illustrated-transformer/"],
      ["Attention Is All You Need (2017 paper)", "https://arxiv.org/abs/1706.03762"],
      ["Hugging Face LLM course", "https://huggingface.co/learn/llm-course"],
    ],
  },
  {
    phase: "foundations",
    title: "LLM APIs & prompt engineering",
    hours: 12,
    why: "The day you become useful: calling models reliably over raw HTTP and three SDKs, prompting like an engineer, getting structured output, streaming it to a UI, calling tools, handling images and PDFs, defending against prompt injection and controlling cost. Take 3–4 days if you need them.",
    learn: [
      ["api-basics", "How LLM APIs work: HTTP anatomy, raw requests, keys, SDKs, and the history from Completions to Chat to Responses"],
      ["roles", "Chat format: system / developer / user / assistant roles, content blocks and conversation memory"],
      ["prompting", "Zero-shot, few-shot, chain-of-thought, role prompting, delimiters"],
      ["prompt-craft", "Advanced prompting: anatomy of a production prompt, chaining, self-critique, context engineering, reasoning models, versioning"],
      ["structured", "Structured output: JSON mode vs JSON schema vs tools, Pydantic validation, schema design"],
      ["streaming", "Streaming (SSE) end to end: the protocol, provider event formats, FastAPI and React"],
      ["tools", "Tool / function calling: the loop, tool choice, parallel calls, tool runners, built-in tools"],
      ["multimodal", "Multimodal inputs: images, PDFs and audio with OpenAI, Claude and Gemini"],
      ["injection", "Prompt injection and jailbreaks: how attacks work and layered defences"],
      ["cost-control", "Cost and speed in code: token counting, prompt caching, batch APIs, routing, semantic caching"],
      ["reliability", "Retries, timeouts, rate limits, token budgets, fallbacks, observability; the OpenAI, Gemini and Claude SDKs"],
    ],
    build: [
      ["stream-chat", "FastAPI /chat endpoint streaming tokens to a React chat UI"],
      ["extractor", "Extractor: messy resume text → validated Pydantic JSON"],
      ["adapter", "Switch providers behind one interface (adapter pattern)"],
      ["prompt-lab", "Prompt lab: compare prompt versions on a labelled test set with automatic scoring"],
      ["vision-extract", "Vision extractor: bill or receipt photo → validated Pydantic JSON"],
    ],
    questions: [
      "How do you guarantee valid JSON from an LLM?",
      "Few-shot prompting vs fine-tuning?",
      "What is prompt injection, and how do you defend against it?",
      "How would you stream an LLM response to the browser?",
      "How does function calling work under the hood?",
      "How would you cut the LLM bill of a feature by 50%?",
    ],
    resources: [
      ["OpenAI API docs", "https://platform.openai.com/docs"],
      ["Anthropic (Claude) API docs", "https://docs.anthropic.com/"],
      ["Gemini API docs", "https://ai.google.dev/gemini-api/docs"],
      ["Anthropic prompt engineering", "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"],
      ["OpenAI Cookbook", "https://cookbook.openai.com/"],
      ["DeepLearning.AI short courses", "https://learn.deeplearning.ai/"],
      ["OWASP Top 10 for LLM apps", "https://genai.owasp.org/"],
    ],
  },
  {
    phase: "rag",
    title: "Embeddings & vector databases",
    hours: 12,
    why: "RAG rests on retrieval. Learn how search evolved from keywords to vectors, how embedding models and ANN indexes work, how to measure retrieval, and how to run a vector database in production, before you let a framework hide it. Take 3–4 days if you need them.",
    learn: [
      ["search-history", "How search evolved: inverted indexes, TF-IDF and BM25 → dense retrieval → vector databases"],
      ["similarity", "Cosine similarity, dot product; embedding at scale; choosing an embedding model"],
      ["embed-models", "Embedding models in depth: training, MTEB, multilingual and Indian languages, prefixes, Matryoshka, sparse and late-interaction models, fine-tuning"],
      ["vector-dbs", "Vector DBs: Chroma, Qdrant, Pinecone, pgvector, MongoDB Atlas Vector Search"],
      ["hnsw", "ANN indexes: HNSW, IVF, quantisation; recall vs speed; metadata filtering"],
      ["retrieval-metrics", "Measuring retrieval: hit rate, recall@k, precision@k, MRR, nDCG; building a labelled query set"],
      ["vector-ops", "Vector DBs in production: ingestion, stable ids, updates and deletes, re-indexing, multi-tenancy, backups, scaling"],
      ["tradeoffs", "Dimensions, quantisation, cost and latency trade-offs"],
    ],
    build: [
      ["mini-vectordb", "Build a mini vector database in NumPy: flat search, an IVF index, filters, persistence and a recall benchmark"],
      ["semantic-search", "Semantic search over ~500 product descriptions or FAQs"],
      ["compare-dbs", "Run the same search in Chroma and pgvector; compare results and speed"],
    ],
    questions: [
      "Why can't a normal database index do semantic search?",
      "What is HNSW, roughly? How do you tune it?",
      "BM25 vs dense retrieval: when does each win?",
      "How do you choose an embedding model?",
      "How do you measure retrieval quality?",
      "Estimate the memory needed for 10 million embeddings.",
    ],
    resources: [
      ["Qdrant docs", "https://qdrant.tech/documentation/"],
      ["pgvector", "https://github.com/pgvector/pgvector"],
      ["MTEB leaderboard", "https://huggingface.co/spaces/mteb/leaderboard"],
      ["Sentence Transformers docs", "https://sbert.net/"],
      ["Pinecone learning center", "https://www.pinecone.io/learn/"],
    ],
  },
  {
    phase: "rag",
    title: "RAG from scratch, no framework",
    hours: 12,
    why: "Building RAG by hand is what lets you answer \"explain RAG end to end\" and \"debug this RAG\" with confidence. Learn why RAG exists, parse and chunk documents properly, write grounded prompts with citations, handle follow-ups, and test and debug the pipeline. Take 3–4 days if you need them.",
    project: "Project 1: DocChat",
    learn: [
      ["rag-why", "Why RAG: its history, RAG vs fine-tuning vs long context vs tools, the anatomy and variants of RAG"],
      ["loading", "Loading and parsing PDF, HTML and DOCX: layout, tables, scanned pages, parsing tools"],
      ["chunking", "Chunking: fixed, recursive, structure-aware, semantic; overlap; contextual chunk text"],
      ["pipeline", "Retrieve → augment the prompt → generate; choosing k, MMR, async pipelines"],
      ["grounding", "Prompting for RAG: grounded prompts, context formatting, conflicting sources, answer styles"],
      ["citations", "Citations and \"I don't know\" behaviour; quote verification; provider-native citations"],
      ["history", "Conversation history + query condensation"],
      ["rag-failures", "Why RAG fails: failure points, tracing and a step-by-step debugging method"],
    ],
    build: [
      ["chunk-lab", "Chunking lab: compare four chunking strategies on the same questions and choose with data"],
      ["rag-tests", "Test your RAG pipeline: fake embeddings and LLM, isolation, grounding, citations, fallbacks"],
      ["docchat-v1", "DocChat: upload PDF → chunk → embed → store → answer with page citations (plain Python + FastAPI)"],
    ],
    questions: [
      "Explain RAG end to end.",
      "RAG vs fine-tuning vs long context?",
      "Chunk size trade-offs? How did you choose yours?",
      "How do you make the model say \"I don't know\"?",
      "How do you handle follow-up questions?",
      "Your RAG gives wrong answers. Debug it step by step.",
    ],
    resources: [
      ["RAG paper (Lewis et al., 2020)", "https://arxiv.org/abs/2005.11401"],
      ["Seven Failure Points of RAG (2024)", "https://arxiv.org/abs/2401.05856"],
      ["Anthropic: Contextual Retrieval", "https://www.anthropic.com/news/contextual-retrieval"],
      ["Docling", "https://github.com/docling-project/docling"],
      ["DeepLearning.AI short courses", "https://learn.deeplearning.ai/"],
    ],
  },
  {
    phase: "rag",
    title: "LangChain & LlamaIndex",
    hours: 11,
    why: "Most job descriptions name LangChain. Learn it after building from scratch, so you know what it hides: its history and the 1.0 redesign, LCEL, retrievers, tools and agents, memory, observability, LlamaIndex, and how to choose (or skip) a framework. Take 3–4 days if you need them.",
    learn: [
      ["lc-overview", "LangChain's history, the 1.0 redesign, the package map, and when to use a framework at all"],
      ["lcel", "LangChain: models, prompts, output parsers, LCEL / runnables, routing"],
      ["retrievers", "Document loaders, text splitters, vector stores, retrievers (incl. hybrid and custom)"],
      ["lc-tools", "Tools and agents in LangChain 1.x: @tool, bind_tools, create_agent, checkpointers, middleware"],
      ["memory", "Chat history and memory (and what's deprecated in 1.x)"],
      ["lc-observability", "Debugging and resilience: callbacks, astream_events, LangSmith, retries, fallbacks, rate limits, caching, fakes"],
      ["llamaindex", "LlamaIndex: indexes, ingestion pipelines, query and chat engines, and when it fits better"],
      ["frameworks-compare", "Choosing a framework: SDK vs LangChain vs LlamaIndex vs Haystack, DSPy and others; staying portable"],
    ],
    build: [
      ["lc-offline-lab", "LangChain lab with fake models: RAG chain, owner filter, agent and memory, all tested offline with pytest"],
      ["docchat-langchain", "Rebuild DocChat's pipeline in LangChain"],
      ["compare-readme", "Compare line count, flexibility and debuggability in the README"],
    ],
    questions: [
      "When would you avoid a framework?",
      "LangChain vs LlamaIndex?",
      "What is LCEL?",
      "What changed in LangChain 1.0?",
      "How do you add memory to a LangChain chatbot today?",
      "How do you debug and test a LangChain app?",
    ],
    resources: [
      ["LangChain docs", "https://docs.langchain.com/"],
      ["LangGraph docs", "https://docs.langchain.com/oss/python/langgraph/overview"],
      ["LlamaIndex docs", "https://docs.llamaindex.ai/"],
      ["LangSmith", "https://docs.smith.langchain.com/"],
      ["CampusX LangChain (Hindi)", "https://www.youtube.com/@campusx-official"],
    ],
  },
  {
    phase: "rag",
    title: "Advanced RAG",
    hours: 10,
    why: "Basic RAG is table stakes. Interviewers separate candidates on how they improve it.",
    learn: [
      ["hybrid", "Hybrid search: BM25 + vectors"],
      ["rerank", "Reranking: cross-encoders, Cohere Rerank"],
      ["query-rewrite", "Query rewriting, multi-query, HyDE"],
      ["parent-doc", "Parent-document and contextual retrieval"],
      ["multimodal", "Tables and images: multimodal parsing; GraphRAG (awareness)"],
      ["acl", "Access control with per-user metadata filters"],
    ],
    build: [
      ["hybrid-rerank", "Add hybrid search + a reranker to DocChat"],
      ["test-set", "Build a 30-question test set; record the before/after hit rate"],
    ],
    questions: [
      "Your RAG gives wrong answers. Debug it step by step.",
      "What does a reranker fix that embeddings can't?",
      "How do you handle multi-hop questions?",
    ],
    resources: [["Anthropic: Contextual Retrieval", "https://www.anthropic.com/news/contextual-retrieval"]],
  },
  {
    phase: "rag",
    title: "RAG evaluation + ship Project 1",
    hours: 10,
    why: "\"How did you measure quality?\" comes up in almost every interview. Have numbers ready.",
    project: "Ship Project 1",
    learn: [
      ["ragas", "RAGAS: faithfulness, answer relevancy, context precision & recall"],
      ["judge", "Golden datasets; LLM-as-judge and its biases"],
      ["cost-latency", "Latency and cost per query"],
    ],
    build: [
      ["ragas-run", "Run RAGAS on DocChat; put the score table in the README"],
      ["docchat-ui", "Next.js front end with streaming and auth"],
      ["docchat-deploy", "Deploy (Render / Railway or EC2) and record a 2-minute demo"],
    ],
    questions: [
      "How do you evaluate a RAG system?",
      "Faithfulness vs answer relevancy?",
      "What are the risks of LLM-as-judge?",
    ],
    resources: [["RAGAS docs", "https://docs.ragas.io/"]],
  },
  {
    phase: "agents",
    title: "Agent fundamentals",
    hours: 9,
    why: "An agent is an LLM calling tools in a loop, with you controlling the loop. Know that cold.",
    learn: [
      ["react", "ReAct pattern; the tool-calling loop by hand"],
      ["workflows", "Workflows (chaining, routing, parallelisation) vs autonomous agents"],
      ["planning", "Planning, reflection; short- vs long-term memory"],
      ["failures", "Failure modes: loops, wrong tools, cost blow-ups"],
    ],
    build: [["raw-agent", "Agent in plain Python with 3 tools (web search, calculator, SQL query), max steps and logging"]],
    questions: ["Agent vs chain vs workflow?", "How do you stop infinite loops?", "How does tool calling work under the hood?"],
    resources: [
      ["Anthropic: Building effective agents", "https://www.anthropic.com/research/building-effective-agents"],
      ["Hugging Face Agents course", "https://huggingface.co/learn"],
    ],
  },
  {
    phase: "agents",
    title: "LangGraph",
    hours: 10,
    why: "LangGraph is the agent framework Indian job descriptions ask for most right now.",
    project: "Project 2: Agentic assistant",
    learn: [
      ["graph", "State, nodes, edges, conditional routing"],
      ["checkpoints", "Checkpointers and persistence"],
      ["hitl", "Human-in-the-loop interrupts"],
      ["subgraphs", "Streaming; subgraphs"],
    ],
    build: [["agent-v1", "Agent that answers business questions from your own Postgres / Mongo data and asks approval before any write"]],
    questions: [
      "Why model an agent as a graph?",
      "How do you persist agent state across requests?",
      "Where do you put human approval?",
    ],
    resources: [
      ["LangChain Academy (free LangGraph course)", "https://academy.langchain.com/"],
      ["LangGraph docs", "https://langchain-ai.github.io/langgraph/"],
    ],
  },
  {
    phase: "agents",
    title: "MCP & multi-agent systems",
    hours: 10,
    why: "MCP is now a common interview topic and a strong resume keyword.",
    learn: [
      ["mcp", "Model Context Protocol: hosts, clients, servers; tools, resources, prompts"],
      ["transports", "Transports: stdio vs streamable HTTP; auth"],
      ["multi-agent", "Multi-agent: supervisor, handoffs; OpenAI Agents SDK / CrewAI (awareness)"],
      ["a2a", "A2A protocol (awareness)"],
    ],
    build: [
      ["mcp-server", "MCP server in Python (FastMCP) exposing your DB and 2 business actions"],
      ["mcp-connect", "Connect it to your LangGraph agent and to Claude Desktop"],
    ],
    questions: [
      "MCP vs plain function calling?",
      "What are the security risks of an MCP server?",
      "When is multi-agent worth the complexity?",
    ],
    resources: [
      ["MCP docs", "https://modelcontextprotocol.io/"],
      ["DeepLearning.AI short courses", "https://learn.deeplearning.ai/"],
    ],
  },
  {
    phase: "agents",
    title: "Production: guardrails, observability, cost",
    hours: 9,
    why: "This separates \"did a tutorial\" from \"can ship\". Lean on your backend experience.",
    learn: [
      ["guardrails", "Guardrails: input/output validation, PII masking, prompt-injection defences"],
      ["tracing", "Tracing with Langfuse or LangSmith"],
      ["caching", "Prompt caching, semantic caching, model routing (small model first)"],
      ["resilience", "Fallbacks, retries, rate limiting, timeouts"],
    ],
    build: [
      ["agent-hardening", "Add Langfuse tracing, a guardrail layer and a semantic cache to Project 2"],
      ["measure", "Measure cost and p95 latency before and after"],
    ],
    questions: ["Cut LLM cost by 50%: how?", "How do you defend against prompt injection?", "What do you monitor in production?"],
    resources: [
      ["Langfuse docs", "https://langfuse.com/docs"],
      ["OWASP Top 10 for LLM apps", "https://genai.owasp.org/"],
    ],
  },
  {
    phase: "agents",
    title: "Ship Project 2, update resume, start applying",
    hours: 9,
    why: "Don't wait until Day 20. Interview calls take one to two weeks to arrive.",
    project: "Ship Project 2",
    learn: [
      ["resume-bullets", "GenAI resume bullets with numbers (accuracy, latency, cost)"],
      ["keywords", "Keywords recruiters search: RAG, LangChain, LangGraph, MCP, vector DB, FastAPI, AWS Bedrock, evals"],
    ],
    build: [
      ["agent-ship", "Finish Project 2: README, architecture diagram, demo video, deploy"],
      ["resume", "Rewrite your resume as \"Full-stack + GenAI engineer\"; update LinkedIn and Naukri headlines"],
      ["apply-20", "Apply to 15–20 roles (Naukri, LinkedIn, Instahyre, Wellfound, Cutshort, Hirist)"],
    ],
    questions: ["Walk me through Project 2 in 3 minutes.", "What was the hardest bug?", "What would you change at 100× traffic?"],
    resources: [
      ["Naukri", "https://www.naukri.com/"],
      ["Instahyre", "https://www.instahyre.com/"],
      ["Wellfound", "https://wellfound.com/"],
    ],
  },
  {
    phase: "deploy",
    title: "Open-source models & fine-tuning concepts",
    hours: 10,
    why: "You won't train models, but you must explain when fine-tuning beats RAG and what LoRA does.",
    learn: [
      ["hf", "Hugging Face Hub, transformers pipelines"],
      ["serving", "Ollama locally; vLLM for serving"],
      ["quantization", "Quantization: 4-bit, GGUF, and the trade-offs"],
      ["lora", "Fine-tuning: SFT, LoRA / QLoRA, PEFT; DPO (concept)"],
      ["decision", "Decision rules: prompting → RAG → fine-tuning"],
    ],
    build: [
      ["ollama", "Run Llama / Qwen locally with Ollama and plug it into DocChat"],
      ["qlora", "QLoRA fine-tune a 1–3B model on Colab with Unsloth; push it to Hugging Face"],
    ],
    questions: [
      "RAG vs fine-tuning: decide for 3 scenarios.",
      "Explain LoRA simply.",
      "When would you self-host instead of using an API?",
    ],
    resources: [
      ["Hugging Face courses", "https://huggingface.co/learn"],
      ["Unsloth docs", "https://docs.unsloth.ai/"],
      ["Ollama", "https://ollama.com/"],
    ],
  },
  {
    phase: "deploy",
    title: "Deploy on AWS (plus Azure awareness)",
    hours: 10,
    why: "Your AWS skills matter here. Many Indian service companies use Azure OpenAI too, so know it exists.",
    project: "Capstone: AI Support Copilot",
    learn: [
      ["bedrock", "AWS Bedrock: models, Knowledge Bases, Guardrails, Agents"],
      ["containers", "Docker → ECR → ECS Fargate (or EC2); Lambda for light endpoints"],
      ["storage", "S3, RDS + pgvector / OpenSearch; Secrets Manager"],
      ["cicd", "CI/CD with GitHub Actions"],
      ["azure", "Azure OpenAI + AI Search (awareness)"],
    ],
    build: [["capstone-deploy", "Capstone start: containerise, deploy to AWS with CI/CD, call a model through Bedrock"]],
    questions: [
      "Draw the architecture of your deployed app.",
      "Bedrock vs calling OpenAI directly?",
      "How do you handle secrets and scaling?",
    ],
    resources: [
      ["AWS Bedrock docs", "https://docs.aws.amazon.com/bedrock/"],
      ["Azure OpenAI docs", "https://learn.microsoft.com/azure/ai-services/openai/"],
    ],
  },
  {
    phase: "deploy",
    title: "Capstone build day",
    hours: 10,
    why: "One polished, deployed product beats five half-finished demos.",
    project: "Capstone",
    learn: [
      ["vision-speech", "Multimodal: vision input, Whisper speech-to-text (optional)"],
      ["evals-ci", "Evals in CI: run your test set on every pull request"],
    ],
    build: [
      ["copilot", "AI Support Copilot: RAG over help docs + tools (order lookup, refund request with approval) + auth + streaming UI"],
      ["copilot-evals", "Eval suite + Langfuse dashboards"],
      ["load-test", "Load test with 50 concurrent users; note the p95 latency"],
    ],
    questions: ["How do you test a non-deterministic system?", "Where are the bottlenecks in your capstone?"],
    resources: [["Chip Huyen, AI Engineering (book)", "https://www.oreilly.com/library/view/ai-engineering/9781098166298/"]],
  },
  {
    phase: "interview",
    title: "GenAI system design",
    hours: 9,
    why: "Mid-level and GCC roles almost always include a design round. Use one framework every time.",
    learn: [
      ["framework", "Framework: requirements → ingestion → retrieval → generation → evals → guardrails → monitoring → scale & cost"],
      ["latency", "Latency budgets, caching layers, async queues for ingestion"],
      ["tenancy", "Multi-tenant access control, PII, audit logs"],
    ],
    build: [
      ["three-designs", "Whiteboard 3 designs (45 min each): enterprise doc Q&A, e-commerce support copilot, text-to-SQL analytics"],
      ["record", "Record yourself explaining one of them"],
    ],
    questions: [
      "Design a document Q&A bot for 10,000 employees with permissions.",
      "Design a customer-support copilot.",
      "How do you keep answers fresh when documents change daily?",
    ],
    resources: [["Chip Huyen's blog", "https://huyenchip.com/blog/"]],
  },
  {
    phase: "interview",
    title: "Coding round + rapid-fire concepts",
    hours: 9,
    why: "Indian interview loops often include a Python DSA round and a live \"build a small RAG or agent\" task.",
    learn: [
      ["dsa", "Python DSA: arrays, strings, hashmaps, two pointers, sliding window (easy–medium)"],
      ["live-coding", "Live-coding patterns: minimal RAG in 45 minutes, tool-calling loop in 30"],
    ],
    build: [
      ["leetcode-15", "Solve 15 LeetCode easy/medium problems in Python"],
      ["timed-rag", "Timed: build a minimal RAG from an empty folder in 45 minutes"],
      ["bank-aloud", "Answer the whole question bank aloud"],
    ],
    questions: ["Implement cosine similarity without numpy.", "Write a retry-with-backoff decorator.", "Build a tool-calling loop live."],
    resources: [["NeetCode 150", "https://neetcode.io/practice"]],
  },
  {
    phase: "interview",
    title: "Mock interviews, polish, apply",
    hours: 8,
    why: "Finish strong: rehearse your story and keep the pipeline full.",
    learn: [
      ["intro", "Your 60-second intro: the MERN → GenAI story"],
      ["star", "STAR answers for 3 project challenges"],
    ],
    build: [
      ["mocks", "2 mock interviews (friend, Pramp or AI mock): one on concepts, one on design"],
      ["polish", "Final polish on every README and demo link"],
      ["apply-more", "Apply to 20 more roles; message 10 hiring managers on LinkedIn"],
    ],
    questions: ["Tell me about yourself.", "Why GenAI after MERN?", "Which project are you proudest of, and why?"],
    resources: [
      ["LinkedIn Jobs", "https://www.linkedin.com/jobs/"],
      ["Hirist", "https://www.hirist.tech/"],
      ["Cutshort", "https://cutshort.io/"],
    ],
  },
];

const pad = (n) => String(n).padStart(2, "0");
const toTasks = (dayId, kind, items) =>
  items.map(([slug, text]) => ({ id: `genai-${dayId}-${slug}`, dayId, slug, kind, text, path: `/genai/${dayId}/${slug}` }));

export const GENAI_DAYS = DAYS.map((day, i) => {
  const number = i + 1;
  const id = `d${pad(number)}`;
  return {
    ...day,
    id,
    number,
    learn: toTasks(id, "learn", day.learn),
    build: toTasks(id, "build", day.build),
  };
});

// Every tickable task, in plan order. Each one has a lesson page at task.path (content in lessons/dNN.js).
export const GENAI_TASKS = GENAI_DAYS.flatMap((d) => [...d.learn, ...d.build]);

export const getGenAiDay = (dayId) => GENAI_DAYS.find((d) => d.id === dayId) || null;
export const getGenAiTask = (dayId, slug) => GENAI_TASKS.find((t) => t.dayId === dayId && t.slug === slug) || null;

export const GENAI_TOTAL_HOURS = GENAI_DAYS.reduce((sum, d) => sum + d.hours, 0);

export const PORTFOLIO = [
  {
    when: "Project 1 · Days 6–9",
    title: "DocChat: RAG with citations",
    detail: "Upload PDFs, ask questions, get answers with page citations. Hybrid search, reranking and RAGAS scores in the README.",
    stack: "FastAPI · Qdrant / pgvector · Next.js",
  },
  {
    when: "Project 2 · Days 11–14",
    title: "Agentic assistant + MCP server",
    detail: "A LangGraph agent that queries your own database through an MCP server, with human approval, tracing and guardrails.",
    stack: "LangGraph · FastMCP · Langfuse · Postgres / Mongo",
  },
  {
    when: "Mini project · Day 15",
    title: "Fine-tuned small model",
    detail: "QLoRA fine-tune of a 1–3B model on a narrow task, published on Hugging Face with a before/after comparison.",
    stack: "Unsloth · Colab · Hugging Face Hub",
  },
  {
    when: "Capstone · Days 16–20",
    title: "AI Support Copilot on AWS",
    detail: "RAG + tools + auth + streaming UI + evals + monitoring, deployed with Docker and CI/CD. The project you talk about in every interview.",
    stack: "Bedrock / OpenAI · ECS or EC2 · GitHub Actions",
  },
];

export const QUESTION_BANK = [
  {
    topic: "LLM fundamentals",
    questions: [
      "What is a token? Why do costs and limits use tokens?",
      "Explain self-attention in simple words.",
      "Temperature vs top-p. What would you use for a SQL generator?",
      "Why do LLMs hallucinate? Five ways to reduce it.",
      "Pretraining vs SFT vs RLHF / DPO.",
      "What is a context window, and what is \"lost in the middle\"?",
    ],
  },
  {
    topic: "RAG",
    questions: [
      "Walk through a RAG pipeline end to end.",
      "How do you choose chunk size and overlap?",
      "Hybrid search and reranking: why and when?",
      "RAG gives wrong answers. How do you debug it?",
      "How do you evaluate RAG? Name the RAGAS metrics.",
      "How do you handle tables and images in PDFs?",
    ],
  },
  {
    topic: "Agents & tools",
    questions: [
      "Workflow vs agent. When is an agent the wrong choice?",
      "How does function / tool calling work under the hood?",
      "What is MCP, and how is it different from plain tool calling?",
      "How do you stop an agent from looping forever?",
      "Short-term vs long-term memory in agents.",
      "Supervisor vs handoff multi-agent patterns.",
    ],
  },
  {
    topic: "Production & LLMOps",
    questions: [
      "Cut LLM cost by 50% without losing quality. How?",
      "How do you defend against prompt injection?",
      "What do you log and monitor in an LLM app?",
      "Semantic caching vs prompt caching.",
      "How do you handle rate limits and provider outages?",
      "How do you test a non-deterministic system?",
    ],
  },
  {
    topic: "Fine-tuning & open models",
    questions: [
      "RAG vs fine-tuning vs prompting: your decision rules.",
      "Explain LoRA and QLoRA.",
      "What is quantization, and what does it cost you?",
      "When would you self-host (vLLM / Ollama) instead of using an API?",
    ],
  },
  {
    topic: "System design",
    questions: [
      "Design a document Q&A bot for 10,000 employees with access control.",
      "Design a customer-support copilot for an e-commerce company.",
      "Design a text-to-SQL analytics assistant.",
      "Design a resume-screening system (discuss bias and PII).",
    ],
  },
];
