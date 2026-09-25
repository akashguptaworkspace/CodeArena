// Day 7 interview bank, part 3: prompts and parsing, LangGraph preview, production RAG with frameworks, evaluation. Assembled in d07.js.

export const lcPromptQs = {
  title: "Prompts, messages and parsing",
  questions: [
    {
      id: "prompt-templates",
      q: "What are ChatPromptTemplate and MessagesPlaceholder for?",
      level: "Basic",
      common: true,
      answer:
        "ChatPromptTemplate builds a list of role-tagged messages from variables (`{question}`, `{context}`), so prompts are reusable, testable and composable in LCEL. MessagesPlaceholder inserts a variable-length list of messages, typically chat history or few-shot examples, at a fixed position in the prompt.",
    },
    {
      id: "few-shot-lc",
      q: "How do you add few-shot examples in LangChain?",
      level: "Intermediate",
      answer:
        "Static examples as extra human/AI message pairs in the ChatPromptTemplate (or FewShotChatMessagePromptTemplate), or dynamic examples selected per input by an example selector backed by embeddings, which is the dynamic few-shot pattern from Day 4.",
    },
    {
      id: "message-types",
      q: "What message types does LangChain use?",
      level: "Basic",
      answer:
        "SystemMessage, HumanMessage, AIMessage (which can carry `tool_calls` and `usage_metadata`), and ToolMessage (a tool's result, linked by `tool_call_id`). In 1.x, `content_blocks` gives a provider-independent view of message content such as text, reasoning, tool calls and images.",
    },
    {
      id: "json-parsing",
      q: "How do you reliably get JSON from a LangChain chain?",
      level: "Intermediate",
      common: true,
      answer:
        "Use `llm.with_structured_output(PydanticModel)`, which uses the provider's structured output or tool calling so output matches the schema, and handle validation errors. Output parsers like JsonOutputParser are a fallback for models without native support; add retries and validation either way.",
    },
    {
      id: "prompt-versioning-lc",
      q: "Where should prompts live in a LangChain project?",
      level: "Intermediate",
      answer:
        "In version-controlled files or modules (or a prompt registry such as LangSmith's prompt hub), loaded into ChatPromptTemplates, not scattered as inline strings. Log the prompt version with each run and test prompt changes against the eval set.",
    },
  ],
};

export const langgraphPreviewQs = {
  title: "LangGraph basics (preview)",
  questions: [
    {
      id: "what-langgraph",
      q: "What is LangGraph and why was it created?",
      level: "Intermediate",
      common: true,
      answer:
        "A library for building stateful, multi-step LLM applications as graphs: nodes are functions (model calls, tools, logic) that read and update a shared state, and edges (including conditional ones) decide what runs next, with cycles allowed. It was created because linear chains couldn't express loops, branching, retries, human approval and durable state that agents need. LangChain 1.x's create_agent is built on it.",
    },
    {
      id: "chain-vs-graph",
      q: "When do you need a graph instead of a chain?",
      level: "Intermediate",
      answer:
        "When the flow has loops (agent tool loops, retry-until-valid), conditional branching based on intermediate results, multiple steps sharing state, pauses for human input, or long-running tasks that must resume after failures. Straight-through pipelines like basic RAG are fine as chains.",
    },
    {
      id: "checkpointers",
      q: "What does a LangGraph checkpointer do?",
      level: "Intermediate",
      answer:
        "It saves the graph's state after each step under a thread id, enabling conversation memory, resuming after crashes, human-in-the-loop pauses, and inspecting or replaying past states (\"time travel\"). InMemorySaver is for development; Postgres, SQLite or Redis savers are for production.",
    },
    {
      id: "state",
      q: "What is state in LangGraph?",
      level: "Intermediate",
      answer:
        "A typed dictionary (TypedDict or Pydantic model) shared by all nodes, such as messages, retrieved documents and flags. Each node returns partial updates, and reducers define how updates merge (e.g. appending messages rather than replacing them).",
    },
    {
      id: "hitl-langgraph",
      q: "How does human-in-the-loop work in LangGraph?",
      level: "Advanced",
      answer:
        "The graph interrupts before or during a node (for example before a risky tool runs), persisting its state with a checkpointer. The application shows the pending action to a person, then resumes the same thread with their approval, edits or rejection. You'll build this on Days 11–12.",
    },
  ],
};

export const lcProdRagQs = {
  title: "Production RAG with frameworks",
  questions: [
    {
      id: "fastapi-lc",
      q: "How do you serve a LangChain RAG chain from FastAPI with streaming?",
      level: "Intermediate",
      common: true,
      answer:
        "Retrieve first (async, with the user's filter) so you have the documents, then `astream` the answer chain and send tokens as SSE events from an async generator, followed by a sources event built from document metadata. Use async model clients, handle client disconnects, and save the final answer to history.",
    },
    {
      id: "multi-tenant-lc",
      q: "How would you make a LangChain RAG app multi-tenant?",
      level: "Intermediate",
      answer:
        "Store tenant ids in document metadata and apply the tenant filter in every retriever call based on the authenticated user, ideally inside a custom retriever or repository layer so no chain can skip it; use per-tenant namespaces or collections if the store supports them; and scope caches, histories and traces by tenant.",
    },
    {
      id: "indexing-lc",
      q: "How do you avoid re-embedding unchanged documents with LangChain?",
      level: "Advanced",
      answer:
        "Use stable, deterministic document ids with upserts and content hashes, re-embedding only changed chunks. LangChain has an indexing API with a record manager that tracks what was indexed and cleans up stale chunks, and LlamaIndex's IngestionPipeline has a docstore for deduplication; or implement the same logic yourself as on Day 5.",
    },
    {
      id: "framework-security",
      q: "What security issues should you watch for with LLM frameworks?",
      level: "Advanced",
      answer:
        "Loaders that fetch URLs or run code (SSRF, arbitrary file reads), tools and agents with too much power, prompt injection through loaded documents, unsafe deserialisation of saved chains or indexes, leaking secrets or PII into traces, and outdated dependencies with known vulnerabilities. Pin and scan dependencies, restrict tools and review loaders.",
    },
    {
      id: "framework-cost",
      q: "Can a framework increase your LLM costs without you noticing?",
      level: "Intermediate",
      answer:
        "Yes: hidden extra calls (query condensation on every turn, multi-query retrieval, refine-style synthesis with a call per chunk, agent loops), verbose default prompts, and large contexts. Trace token usage per step, read the prompts the framework sends, and choose modes deliberately (for example compact instead of refine).",
    },
  ],
};

export const lcEvalQs = {
  title: "Evaluating framework-based apps",
  questions: [
    {
      id: "compare-impls",
      q: "How would you compare a from-scratch RAG pipeline with a LangChain version?",
      level: "Intermediate",
      common: true,
      answer:
        "Keep the embedding model, chunking and k identical, run both on the same eval set (retrieval recall and answer correctness and faithfulness), and compare latency, cost per query, lines of code, flexibility for custom needs (filters, citations), debuggability and dependency churn. Decide per component with those numbers.",
    },
    {
      id: "eval-tools",
      q: "Which tools help evaluate LangChain or LlamaIndex apps?",
      level: "Basic",
      answer:
        "LangSmith datasets and evaluators, RAGAS and DeepEval for RAG metrics, LlamaIndex's built-in evaluators (faithfulness, relevancy), Langfuse and Phoenix evaluations, and your own scripts with labelled data and LLM-as-judge. Day 9 covers these in depth.",
    },
    {
      id: "regression-lc",
      q: "How do you catch regressions after changing a chain or upgrading LangChain?",
      level: "Intermediate",
      answer:
        "Fast unit tests with fake models for wiring and prompts on every commit, plus an eval run with real models on changes to prompts, models, retrieval or framework versions, comparing scores against the last release, with traces to inspect any drops.",
    },
  ],
};
