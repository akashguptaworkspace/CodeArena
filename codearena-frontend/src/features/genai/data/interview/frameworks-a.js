// Day 7 interview bank, part 1: LangChain basics, RAG in LangChain, agents and memory. Assembled in d07.js.

export const lcBasicsQs = {
  title: "LangChain fundamentals",
  questions: [
    {
      id: "what-langchain",
      q: "What is LangChain and what problem does it solve?",
      level: "Basic",
      common: true,
      answer:
        "An open-source framework for building LLM applications. It provides standard interfaces for chat models, prompts, output parsers, documents, retrievers, vector stores and tools across many providers, a composition model (LCEL/Runnables) with streaming, batching and async built in, and, with LangGraph, a runtime for stateful agents. It saves integration work and standardises patterns; the cost is abstraction and fast-changing APIs.",
    },
    {
      id: "lcel",
      q: "What is LCEL?",
      level: "Basic",
      common: true,
      answer:
        "LangChain Expression Language: a declarative way to compose Runnables with the pipe operator (`prompt | llm | parser`). Because every component implements the same interface, a composed chain automatically supports invoke, batch, stream and their async versions, plus retries, fallbacks, config and tracing.",
    },
    {
      id: "runnable-interface",
      q: "What is the Runnable interface?",
      level: "Intermediate",
      answer:
        "The common protocol implemented by prompts, models, parsers, retrievers, tools and chains: `invoke`, `batch`, `stream`, `ainvoke`, `abatch`, `astream`, `astream_events`, plus helpers like `with_retry`, `with_fallbacks`, `with_config` and `assign`. It's what lets any component be composed and executed the same way.",
    },
    {
      id: "packages",
      q: "How is LangChain split into packages?",
      level: "Intermediate",
      answer:
        "`langchain-core` holds base abstractions and LCEL; provider packages (`langchain-openai`, `langchain-anthropic`, ...) hold model integrations; `langchain-text-splitters` the splitters; `langchain-community` community loaders and integrations; vector store packages like `langchain-chroma` and `langchain-postgres`; `langchain` holds `create_agent`, middleware and `init_chat_model`; `langchain-classic` keeps legacy chains and retrievers; `langgraph` is the agent runtime.",
    },
    {
      id: "v1-changes",
      q: "What changed in LangChain 1.0?",
      level: "Intermediate",
      common: true,
      answer:
        "It was refocused on agents: `create_agent` built on LangGraph became the main entry point, middleware was added for cross-cutting behaviour (summarisation, human-in-the-loop, PII, retries, fallbacks, call limits), messages gained standard content blocks across providers, legacy chains and several retrievers moved to `langchain-classic`, and conversation memory moved to LangGraph persistence.",
    },
    {
      id: "old-tutorials",
      q: "Why do many LangChain tutorials no longer work?",
      level: "Basic",
      common: true,
      answer:
        "LangChain changed fast: 2023-era code used LLMChain, ConversationalRetrievalChain, ConversationBufferMemory and initialize_agent, and imports from `langchain.chains` or `langchain.retrievers`. Those were deprecated in favour of LCEL and LangGraph and removed from the main package in 1.x (some remain in langchain-classic). Check the date, use official docs and pin versions.",
    },
    {
      id: "structured-output",
      q: "Output parsers vs with_structured_output?",
      level: "Intermediate",
      answer:
        "Output parsers (StrOutputParser, JsonOutputParser, PydanticOutputParser) post-process model text, sometimes by adding format instructions to the prompt, which can fail on malformed output. `with_structured_output(PydanticModel)` uses the provider's native structured output or tool calling, so the model is constrained to the schema. Prefer with_structured_output for structured data.",
    },
    {
      id: "init-chat-model",
      q: "How do you switch model providers in LangChain?",
      level: "Basic",
      answer:
        "All chat models share the same interface, so you either change the class (ChatOpenAI → ChatAnthropic) or use `init_chat_model(\"provider:model\")` with the string from configuration. Prompts, chains and agents stay unchanged, though you should re-run evals because models behave differently.",
    },
    {
      id: "streaming-lc",
      q: "How does streaming work in LangChain?",
      level: "Intermediate",
      answer:
        "Every Runnable has `stream`/`astream`, which yields output chunks as they're produced; composed chains stream through when their components support it (models and parsers do). `astream_events` additionally yields events from every internal step, useful for showing retrieval progress and tool calls in a UI.",
    },
    {
      id: "batch",
      q: "How do you run many LLM calls efficiently with LangChain?",
      level: "Intermediate",
      answer:
        "Use `batch`/`abatch`, which run calls concurrently, with `config={\"max_concurrency\": n}` to respect rate limits; add a rate limiter on the model for requests per second; and for large offline jobs consider the provider's batch API, which is cheaper, outside LangChain's normal path.",
    },
  ],
};

export const lcRagQs = {
  title: "RAG with LangChain",
  questions: [
    {
      id: "document",
      q: "What is a LangChain Document?",
      level: "Basic",
      answer:
        "The unit of retrieval: `page_content` (text) plus a `metadata` dict (source, page, owner, ...). Loaders produce Documents, splitters split them while copying metadata, vector stores store them, and retrievers return them, which is how citations and filters work.",
    },
    {
      id: "retriever-vs-store",
      q: "Vector store vs retriever in LangChain?",
      level: "Basic",
      common: true,
      answer:
        "A vector store stores embedded documents and supports similarity search and CRUD. A retriever is any Runnable that takes a query string and returns Documents; `store.as_retriever(...)` wraps a vector store, but retrievers can also be BM25, ensembles, multi-query, or custom classes over an API or SQL. Chains depend on the retriever interface, not the store.",
    },
    {
      id: "rag-chain-sources",
      q: "How do you build a LangChain RAG chain that also returns sources?",
      level: "Intermediate",
      common: true,
      answer:
        "Run the retriever and pass the question in parallel (`RunnableParallel(docs=retriever, question=RunnablePassthrough())`), then `.assign(answer=...)` a sub-chain that formats the docs into the prompt, calls the model and parses the output. The result dict contains both the answer and the documents, whose metadata gives citations.",
    },
    {
      id: "splitters",
      q: "Which text splitters would you use in LangChain?",
      level: "Basic",
      answer:
        "RecursiveCharacterTextSplitter as the default (use `.from_tiktoken_encoder` for token-based sizes), MarkdownHeaderTextSplitter to split by headings and keep them as metadata, language-aware splitters for code, and semantic chunkers when justified by evals. Metadata is copied onto every chunk.",
    },
    {
      id: "mmr-lc",
      q: "What retriever search types are available on a vector store?",
      level: "Intermediate",
      answer:
        "`similarity` (plain top-k), `mmr` (Maximal Marginal Relevance for diverse results), and `similarity_score_threshold` (only results above a score), configured with `search_kwargs` such as k, fetch_k, lambda_mult and a metadata filter whose syntax depends on the store.",
    },
    {
      id: "hybrid-lc",
      q: "How do you do hybrid search in LangChain 1.x?",
      level: "Intermediate",
      answer:
        "Combine a `BM25Retriever` (from langchain_community) and a vector store retriever in an `EnsembleRetriever` (from langchain_classic in 1.x), which fuses rankings with weighted Reciprocal Rank Fusion. Many vector stores (Qdrant, Weaviate, Elasticsearch, PGVector setups) also support hybrid search natively.",
    },
    {
      id: "custom-retriever",
      q: "When and how would you write a custom retriever?",
      level: "Advanced",
      answer:
        "When built-in retrievers don't fit: enforcing tenant permissions, calling an internal search API, combining SQL with vector search, or custom reranking. Subclass `BaseRetriever` and implement `_get_relevant_documents` (and optionally the async version); it then works in any chain and appears in traces.",
    },
    {
      id: "filters-lc",
      q: "How do you enforce user permissions in a LangChain retriever?",
      level: "Intermediate",
      common: true,
      answer:
        "Store owner or tenant ids in document metadata and pass a filter in `search_kwargs` built from the authenticated user on the server (syntax depends on the vector store), or wrap retrieval in a custom retriever that always applies the filter. Never let the model or the user's prompt choose the filter, and test isolation.",
    },
  ],
};

export const lcAgentQs = {
  title: "Tools, agents and memory in LangChain",
  questions: [
    {
      id: "tool-decorator",
      q: "How do you define a tool in LangChain?",
      level: "Basic",
      common: true,
      answer:
        "Decorate a typed Python function with `@tool`: the function name becomes the tool name, the docstring its description (which the model reads to decide when to call it), and the type hints its argument schema. Tools are Runnables, so they can be unit-tested with `.invoke`.",
    },
    {
      id: "create-agent",
      q: "How do you create an agent in LangChain 1.x?",
      level: "Intermediate",
      common: true,
      answer:
        "Call `create_agent(model, tools, system_prompt)`. It returns a LangGraph graph that loops: call the model, run any requested tools, feed back ToolMessages, and repeat until the model answers without tool calls. Add `checkpointer` for memory, `response_format` for structured output, and `middleware` for summarisation, approvals, PII, fallbacks and limits.",
    },
    {
      id: "bind-tools",
      q: "What does bind_tools do?",
      level: "Intermediate",
      answer:
        "It attaches tool schemas to a chat model so each call includes them in the provider's tool format. The response's `tool_calls` list contains the requested tool names, arguments and ids; you run them and send back ToolMessages with matching `tool_call_id`s. create_agent does this loop for you.",
    },
    {
      id: "middleware",
      q: "What is middleware in LangChain agents?",
      level: "Intermediate",
      answer:
        "Pluggable components that run before or after model and tool calls in create_agent: summarising long histories, pausing for human approval on specific tools, redacting PII, retrying or falling back to other models, and limiting model or tool calls. They keep cross-cutting concerns out of prompts and business logic.",
    },
    {
      id: "memory-lc",
      q: "How do you add memory to a LangChain chatbot today?",
      level: "Intermediate",
      common: true,
      answer:
        "Either keep history in your own database, trim it (trim_messages or a summary) and pass it into a MessagesPlaceholder each turn, or use create_agent with a LangGraph checkpointer (InMemorySaver for development, Postgres or Redis in production) and a thread_id per conversation. RunnableWithMessageHistory and the old memory classes are deprecated in 1.x.",
    },
    {
      id: "hitl",
      q: "How would you require human approval before an agent issues a refund?",
      level: "Advanced",
      answer:
        "Use HumanInTheLoopMiddleware configured to interrupt on the refund tool, with a checkpointer so the paused run can resume after a person approves, edits or rejects the call; and still enforce authorisation and limits inside the refund function itself, because the model's decision is never authorisation.",
    },
    {
      id: "agent-limits",
      q: "How do you stop an agent from looping forever or overspending?",
      level: "Intermediate",
      answer:
        "Cap model and tool calls (ModelCallLimitMiddleware, ToolCallLimitMiddleware, or LangGraph recursion limits), set timeouts, track token usage and cost per run, return tool errors clearly so the model doesn't retry blindly, and alert on unusually long runs.",
    },
    {
      id: "lc-vs-langgraph",
      q: "How do LangChain and LangGraph relate?",
      level: "Intermediate",
      answer:
        "LangChain provides the components (models, prompts, tools, retrievers) and, in 1.x, the high-level `create_agent`. LangGraph is the lower-level runtime that create_agent is built on: graphs of nodes and edges with state, checkpointers, streaming and human-in-the-loop. Use create_agent for standard tool-calling agents and LangGraph directly for custom multi-step workflows (Days 10–12).",
    },
  ],
};

export const lcOpsQs = {
  title: "Debugging, testing and production",
  questions: [
    {
      id: "debug-lc",
      q: "How do you debug a LangChain application?",
      level: "Intermediate",
      common: true,
      answer:
        "Enable tracing (LangSmith, Langfuse or Phoenix) to see every step's inputs, outputs, prompts, retrieved documents, tokens and latency as a tree; use astream_events or callbacks locally; tag runs with metadata like user and feature; and reproduce issues in tests with fake models or saved inputs.",
    },
    {
      id: "langsmith",
      q: "What is LangSmith?",
      level: "Basic",
      answer:
        "LangChain's hosted platform for tracing, evaluation, datasets, prompt management and monitoring of LLM apps. Setting LANGSMITH_TRACING and an API key traces LangChain and LangGraph runs automatically; its SDK can trace non-LangChain code too. Alternatives include Langfuse and Arize Phoenix.",
    },
    {
      id: "callbacks",
      q: "What are callbacks in LangChain?",
      level: "Intermediate",
      answer:
        "Handlers whose methods fire on events such as a chat model starting or ending, a retriever returning, or a tool erroring. They're passed through the run config and power logging, tracing, streaming and cost tracking.",
    },
    {
      id: "resilience-lc",
      q: "How do you make LangChain calls resilient?",
      level: "Intermediate",
      answer:
        "Set timeouts and max_retries on models, add `.with_retry()` for transient failures, `.with_fallbacks([...])` to switch to another model or provider, a rate limiter on the model, and max_concurrency on batches; in agents, the retry and fallback middleware do the same.",
    },
    {
      id: "test-lc",
      q: "How do you unit-test LangChain code without calling an LLM?",
      level: "Intermediate",
      common: true,
      answer:
        "Inject the model and embeddings, and in tests use FakeListChatModel or GenericFakeChatModel (which can script tool calls), DeterministicFakeEmbedding and InMemoryVectorStore. Assert on prompt structure with a spy model, on retrieved documents and filters, on agent message sequences, and on memory per thread. Evaluate real model quality separately.",
    },
    {
      id: "upgrade-lc",
      q: "How would you upgrade LangChain in a production app?",
      level: "Advanced",
      answer:
        "Read the release notes and migration guide, upgrade in a branch with pinned versions, fix imports and deprecation warnings, run unit tests with fake models and the eval set with real models, compare quality, latency and cost, then roll out gradually while watching traces and errors.",
    },
    {
      id: "caching-lc",
      q: "What caching does LangChain offer?",
      level: "Basic",
      answer:
        "A global LLM cache (`set_llm_cache` with in-memory, SQLite, Redis and other backends) that returns stored responses for identical prompts and parameters, plus embedding caches. Useful for tests, evals and repeated prompts; don't share cached answers across users when they depend on user data.",
    },
  ],
};
