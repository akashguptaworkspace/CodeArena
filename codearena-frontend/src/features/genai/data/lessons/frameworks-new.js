// Day 7: LangChain overview and history, tools & agents in LangChain 1.x, observability, choosing a framework.
// Merged into d07.js. Code was checked against langchain 1.4 / langchain-core 1.6 / langgraph 1.2. Shape: see ./index.js

export const lcOverview = {
  minutes: 70,
  level: "Beginner",
  intro:
    "LangChain appears in most Indian GenAI job descriptions, and it has changed more than any other tool in this plan. Tutorials from 2023 use classes that no longer exist, and the 2025 1.0 release reorganised the library around agents. This lesson gives you the history (so old code makes sense), the current package map, what changed in 1.0, and a clear rule for when a framework helps and when the plain SDK you used on Days 4–5 is better.",
  sections: [
    {
      h: "A short history of LangChain",
      blocks: [
        {
          table: {
            head: ["When", "Milestone", "What it meant"],
            rows: [
              ["Oct 2022", "Harrison Chase open-sources LangChain, a month before ChatGPT", "Chains of prompts and LLM calls, agents with tools, loaders"],
              ["2023", "Explosive growth with the ChatGPT wave; LangChain becomes a company; LangSmith (tracing and evals) launches", "\"Chat with your PDF\" tutorials everywhere, mostly using `LLMChain`, `ConversationalRetrievalChain`, `initialize_agent`"],
              ["Aug 2023", "**LCEL** (LangChain Expression Language) introduced", "Compose with `|`; every component becomes a Runnable with invoke/batch/stream"],
              ["Jan 2024", "v0.1: split into `langchain-core`, `langchain-community` and partner packages (`langchain-openai`, ...); **LangGraph** released", "Smaller, stabler core; agents move towards graphs"],
              ["2024", "v0.2 and v0.3 (Pydantic 2); old chains deprecated in favour of LCEL and LangGraph", "Many tutorials become outdated"],
              ["Oct 2025", "**LangChain 1.0 and LangGraph 1.0**", "`create_agent` with middleware, standard content blocks, legacy chains and retrievers moved to `langchain-classic`"],
            ],
          },
        },
        {
          warn: "When you read code online, check the date and imports. `from langchain.chains import ...`, `LLMChain`, `ConversationChain`, `initialize_agent` and `from langchain.retrievers import ...` are pre-1.0. In LangChain 1.x those imports fail; the classes live in `langchain_classic` or have modern replacements.",
        },
      ],
    },
    {
      h: "The package map in LangChain 1.x",
      blocks: [
        {
          table: {
            head: ["Package", "Contains", "You'll use it for"],
            rows: [
              ["`langchain-core`", "Messages, prompts, Runnables/LCEL, output parsers, documents, tools, retrievers base classes, in-memory vector store, fake models for tests", "Almost everything"],
              ["`langchain`", "`create_agent`, agent middleware, `init_chat_model`", "Agents and model selection"],
              ["`langchain-openai`, `langchain-anthropic`, `langchain-google-genai`, `langchain-ollama`, ...", "Chat models and embeddings per provider", "Calling models"],
              ["`langchain-text-splitters`", "Recursive, token, Markdown-header and other splitters", "Chunking"],
              ["`langchain-community`", "Hundreds of community loaders and integrations (PDF, web, BM25 retriever, ...)", "Loading data"],
              ["`langchain-chroma`, `langchain-qdrant`, `langchain-postgres`, ...", "Vector store integrations", "Retrieval"],
              ["`langchain-classic`", "Legacy chains and retrievers (`EnsembleRetriever`, `MultiQueryRetriever`, `create_retrieval_chain`, ...)", "Maintaining older code; some advanced retrievers"],
              ["`langgraph`", "Stateful graphs, checkpointers (persistence), human-in-the-loop", "Agents and multi-step workflows (Days 13–15)"],
              ["LangSmith (service + SDK)", "Tracing, datasets, evals, prompt management", "Debugging and evaluation"],
            ],
          },
        },
        {
          lang: "bash",
          code: `uv add langchain langchain-openai langchain-text-splitters langchain-community
# pin versions in pyproject.toml / uv.lock: LangChain moves fast`,
        },
      ],
    },
    {
      h: "What changed in 1.0 (and why it matters for interviews)",
      blocks: [
        {
          table: {
            head: ["Change", "What it means for you"],
            rows: [
              ["**`create_agent`** is the main entry point", "A production-ready tool-calling agent built on LangGraph, replacing many older agent helpers"],
              ["**Middleware**", "Plug-in behaviour around the model and tool calls: summarising long histories, human approval, PII redaction, retries, fallbacks, call limits"],
              ["**Standard content blocks**", "`message.content_blocks` gives the same shape (text, reasoning, tool calls, images, citations) across providers"],
              ["**Legacy moved to `langchain-classic`**", "Old chains and some retrievers still exist but in a separate package; new code uses LCEL, `create_agent` or LangGraph"],
              ["**Memory = LangGraph persistence**", "`RunnableWithMessageHistory` and the in-memory chat history classes are deprecated; use checkpointers (agents) or your own database"],
            ],
          },
        },
        "What didn't change: chat models, prompts, LCEL, documents, splitters, vector stores and retrievers work as in the rest of today's lessons.",
      ],
    },
    {
      h: "When to use a framework at all",
      blocks: [
        {
          table: {
            head: ["Use the plain SDK when...", "Use LangChain / LlamaIndex when..."],
            rows: [
              ["The flow is simple: one or two LLM calls, a retrieval step", "You need many integrations (loaders, vector stores, providers) quickly"],
              ["You need full control of prompts, citations and error handling", "You want standard streaming, batching, retries and tracing across many components"],
              ["You want minimal dependencies and easy debugging", "You're building agents with state, tools and human-in-the-loop (LangGraph)"],
              ["The team doesn't know the framework", "The team or codebase already uses it"],
            ],
          },
        },
        {
          tip: "The strongest interview position: \"I built RAG from scratch, so I know what the framework does; I use LangChain for integrations and LangGraph for agents, and keep critical logic (permissions, citations) in my own code.\"",
        },
      ],
    },
  ],
  revise: [
    "History: open-sourced Oct 2022 → LCEL (2023) → core/community/partner split + LangGraph (2024) → 1.0 with create_agent, middleware, content blocks, langchain-classic (Oct 2025).",
    "Packages: langchain-core, langchain, provider packages, text-splitters, community, vector store packages, langchain-classic, langgraph, LangSmith.",
    "Pre-1.0 code (`LLMChain`, `langchain.chains`, `langchain.retrievers`, `initialize_agent`) fails in 1.x; look in langchain-classic or use modern replacements.",
    "Memory in 1.x: LangGraph checkpointers or your own DB; RunnableWithMessageHistory is deprecated.",
    "Framework when integrations/agents/standard streaming matter; plain SDK for simple, controlled flows.",
  ],
  mistakes: [
    "Following a 2023 tutorial with a 2026 install and fighting import errors.",
    "Not pinning LangChain versions.",
    "Using a framework for a two-call pipeline and losing control of prompts and citations.",
  ],
  interview: [
    {
      q: "What changed in LangChain 1.0?",
      a: "The library was refocused on agents: `create_agent` built on LangGraph became the main entry point, with middleware for cross-cutting behaviour like summarisation, human-in-the-loop, PII redaction, retries and fallbacks. Messages gained standard content blocks across providers, and legacy chains and several retrievers moved to the `langchain-classic` package. Conversation memory moved to LangGraph persistence (checkpointers).",
    },
    {
      q: "Why do many LangChain tutorials no longer work?",
      a: "LangChain changed rapidly: 2023-era code used classes like LLMChain, ConversationalRetrievalChain and initialize_agent and imports from `langchain.chains` or `langchain.retrievers`. Those were deprecated in favour of LCEL and LangGraph, and in 1.x they were removed from the main package (some live in langchain-classic). Checking dates, reading the official docs and pinning versions avoids this.",
    },
  ],
  practice: [
    "Take one 2023 LangChain RAG tutorial you find online and list every import that would fail in LangChain 1.x, with its modern replacement.",
  ],
};

export const lcTools = {
  minutes: 75,
  level: "Intermediate",
  intro:
    "LangChain 1.x is organised around tool-calling agents. LangGraph (Day 14) and MCP (Day 15) take agents further; this lesson is the LangChain way to define tools, bind them to models, run the standard agent with `create_agent`, give it memory with a checkpointer, get structured responses, and add middleware. You built the loop by hand on Day 12, so you'll recognise every step.",
  sections: [
    {
      h: "Defining tools with @tool",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.tools import tool

@tool
def get_order_status(order_id: str) -> str:
    """Get the delivery status of an order by its id."""
    return f"Order {order_id}: shipped, arriving Friday"     # call your real API here

print(get_order_status.name)    # get_order_status
print(get_order_status.args)    # {'order_id': {'title': 'Order Id', 'type': 'string'}}
print(get_order_status.invoke({"order_id": "4521"}))`,
        },
        "The function name becomes the tool name, the docstring becomes its description (which the model reads to decide when to use it), and type hints become the JSON Schema. Tools are Runnables, so they can be tested with `.invoke` directly.",
      ],
    },
    {
      h: "Binding tools to a model (the manual way)",
      blocks: [
        {
          lang: "python",
          code: `from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, ToolMessage

llm = ChatOpenAI(model="gpt-4o-mini")
llm_with_tools = llm.bind_tools([get_order_status])

messages = [HumanMessage("Where is order 4521?")]
ai = llm_with_tools.invoke(messages)
messages.append(ai)
for call in ai.tool_calls:                          # [{"name": ..., "args": {...}, "id": ...}]
    result = get_order_status.invoke(call["args"])
    messages.append(ToolMessage(result, tool_call_id=call["id"]))
print(llm_with_tools.invoke(messages).content)`,
          caption: "The same loop as Day 12, with provider differences hidden behind `tool_calls` and `ToolMessage`.",
        },
      ],
    },
    {
      h: "create_agent: the standard agent",
      blocks: [
        {
          lang: "python",
          code: `from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-4o-mini",                 # or a model object: ChatAnthropic(...), ChatOllama(...)
    tools=[get_order_status],
    system_prompt="You are ShopKart's support agent. Use tools for order questions. Be brief.",
)
result = agent.invoke({"messages": [{"role": "user", "content": "Where is order 4521?"}]})
for m in result["messages"]:
    print(type(m).__name__, m.content or m.tool_calls)
# HumanMessage Where is order 4521?
# AIMessage [{'name': 'get_order_status', 'args': {'order_id': '4521'}, ...}]
# ToolMessage Order 4521: shipped, arriving Friday
# AIMessage Your order 4521 has shipped and arrives Friday.`,
        },
        "`create_agent` runs the model → tools → model loop until the model answers without calling tools. It's a LangGraph graph underneath, so it supports streaming, persistence and human-in-the-loop.",
      ],
    },
    {
      h: "Memory with a checkpointer",
      blocks: [
        {
          lang: "python",
          code: `from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(model="openai:gpt-4o-mini", tools=[get_order_status],
                     checkpointer=InMemorySaver())                 # Postgres/Redis savers in production
config = {"configurable": {"thread_id": "user-42:conv-7"}}        # one thread per conversation

agent.invoke({"messages": [{"role": "user", "content": "Hi, I'm Neha."}]}, config)
reply = agent.invoke({"messages": [{"role": "user", "content": "What's my name?"}]}, config)
print(reply["messages"][-1].content)                              # "Your name is Neha."`,
        },
        "The checkpointer saves the conversation state after every step under the `thread_id`, so each call only sends the new message. This replaces the deprecated `RunnableWithMessageHistory`.",
      ],
    },
    {
      h: "Structured responses",
      blocks: [
        {
          lang: "python",
          code: `from pydantic import BaseModel

class TicketSummary(BaseModel):
    order_id: str | None
    issue: str
    resolved: bool

agent = create_agent(model="openai:gpt-4o-mini", tools=[get_order_status],
                     response_format=TicketSummary)
result = agent.invoke({"messages": [{"role": "user", "content": "Order 4521 hasn't arrived"}]})
print(result["structured_response"])       # a TicketSummary instance`,
        },
      ],
    },
    {
      h: "Middleware: behaviour around every model and tool call",
      blocks: [
        {
          lang: "python",
          code: `from langchain.agents.middleware import (
    HumanInTheLoopMiddleware, ModelCallLimitMiddleware, ModelFallbackMiddleware,
    PIIMiddleware, SummarizationMiddleware,
)

agent = create_agent(
    model="openai:gpt-4o",
    tools=[get_order_status, issue_refund],
    checkpointer=InMemorySaver(),
    middleware=[
        SummarizationMiddleware(model="openai:gpt-4o-mini",
                                trigger=("tokens", 4000), keep=("messages", 20)),   # compress long chats
        PIIMiddleware("email", strategy="redact"),                                   # mask emails in input
        ModelFallbackMiddleware("anthropic:claude-opus-5"),                           # provider fallback
        ModelCallLimitMiddleware(run_limit=10),                                      # stop runaway loops
        HumanInTheLoopMiddleware(interrupt_on={"issue_refund": True}),               # approve refunds
    ],
)`,
          caption: "Middleware names and options are from LangChain 1.x; check the docs for the version you install.",
        },
        {
          table: {
            head: ["Middleware", "Solves"],
            rows: [
              ["Summarization", "Long conversations exceeding the context window"],
              ["Human-in-the-loop", "Approving risky tool calls (refunds, emails) before they run"],
              ["PII", "Redacting or blocking personal data"],
              ["Model fallback / retry", "Provider outages and transient errors"],
              ["Model / tool call limits", "Runaway loops and cost blow-ups"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "`@tool`: name from the function, description from the docstring, schema from type hints; test with `.invoke`.",
    "`llm.bind_tools([...])` → `ai.tool_calls` → run → `ToolMessage(result, tool_call_id=...)` → call again.",
    "`create_agent(model, tools, system_prompt)` runs the loop; returns `{\"messages\": [...]}`.",
    "Memory: `checkpointer=InMemorySaver()` (Postgres in production) + `thread_id` in config.",
    "`response_format=PydanticModel` → `result[\"structured_response\"]`.",
    "Middleware: summarisation, human-in-the-loop, PII, fallbacks, retries, call limits.",
  ],
  mistakes: [
    "Vague tool docstrings, so the agent picks the wrong tool.",
    "No call limit, allowing runaway agent loops.",
    "Letting an agent run refunds or emails without human approval or code-level checks.",
  ],
  interview: [
    {
      q: "How do you create a tool-calling agent in LangChain today?",
      a: "Define tools with the @tool decorator (docstring as description, type hints as schema), then call create_agent with a model, the tools and a system prompt. It runs the model–tool loop on LangGraph. Add a checkpointer with a thread_id for conversation memory, response_format for structured results, and middleware for summarisation, human approval, PII handling, fallbacks and call limits.",
    },
    {
      q: "What is agent middleware in LangChain 1.x?",
      a: "Pluggable components that run around model and tool calls in create_agent, so cross-cutting concerns don't clutter your logic: summarising long histories, pausing for human approval on specific tools, redacting PII, retrying or falling back to other models, and limiting the number of model or tool calls.",
    },
  ],
  practice: [
    "Build a create_agent support bot with two tools and a checkpointer, and have a three-turn conversation that uses both tools.",
  ],
};

export const lcObservability = {
  minutes: 60,
  level: "Intermediate",
  intro:
    "Frameworks hide the prompts and calls you wrote by hand on Day 9, which makes debugging harder unless you can see inside. This lesson covers LangChain's run configuration (tags, metadata, callbacks), streaming internal events, LangSmith tracing, retries, fallbacks, rate limiting, caching and concurrency control: the tools that make a LangChain app production-worthy.",
  sections: [
    {
      h: "Run config: tags, metadata and callbacks",
      blocks: [
        "Every Runnable accepts a `config` with tags, metadata, a run name and callbacks. Callbacks fire on events like a model starting or ending, which is how tracing tools hook in.",
        {
          lang: "python",
          code: `from langchain_core.callbacks import BaseCallbackHandler

class Timing(BaseCallbackHandler):
    def on_chat_model_start(self, serialized, messages, **kwargs):
        print("model start:", messages[0][0].content)

    def on_llm_end(self, response, **kwargs):
        print("model end:", response.generations[0][0].text)

chain.invoke({"name": "Asha"}, config={"callbacks": [Timing()], "tags": ["support"],
                                       "metadata": {"user_id": 42}, "run_name": "greeting"})`,
        },
      ],
    },
    {
      h: "Seeing inside a chain: astream_events",
      blocks: [
        {
          lang: "python",
          code: `async for ev in rag_chain.astream_events("How many casual leaves do interns get?", version="v2"):
    if ev["event"] == "on_retriever_end":
        print("retrieved:", [d.metadata.get("source") for d in ev["data"]["output"]])
    elif ev["event"] == "on_chat_model_stream":
        print(ev["data"]["chunk"].content, end="", flush=True)`,
          caption: "Useful to stream tokens to a UI and also surface intermediate steps (\"Searching documents...\").",
        },
      ],
    },
    {
      h: "LangSmith tracing",
      blocks: [
        {
          lang: "bash",
          code: `# .env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=docchat-dev`,
        },
        "With these set, every LangChain and LangGraph run is traced automatically: each step's inputs and outputs, prompts, retrieved documents, token usage, latency and errors, as a tree. Alternatives include Langfuse (open source, self-hostable) and Arize Phoenix, which integrate via callbacks or OpenTelemetry.",
        {
          warn: "Traces contain prompts and user data. Use the tracing tool's data-masking options, restrict access, and check your company's data policies before sending production traffic to a third-party tracing service.",
        },
      ],
    },
    {
      h: "Resilience: retries, fallbacks and rate limits",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

limiter = InMemoryRateLimiter(requests_per_second=2, check_every_n_seconds=0.1, max_bucket_size=5)
primary = ChatOpenAI(model="gpt-4o-mini", rate_limiter=limiter, timeout=30, max_retries=2)
backup = ChatAnthropic(model="claude-opus-5", max_tokens=16000)

llm = primary.with_fallbacks([backup])                    # switch provider on errors
step = some_flaky_runnable.with_retry(stop_after_attempt=3)   # retry any Runnable
results = chain.batch(inputs, config={"max_concurrency": 5})  # cap parallel calls`,
        },
      ],
    },
    {
      h: "Caching",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.caches import InMemoryCache
from langchain_core.globals import set_llm_cache

set_llm_cache(InMemoryCache())       # identical prompts return cached responses (use Redis/SQLite caches to persist)`,
        },
        "Exact-match caching helps for repeated prompts (tests, evals, FAQ-style traffic). Remember the Day 4 warning: don't share cached answers across users when answers depend on their data.",
      ],
    },
    {
      h: "Testing LangChain code without API calls",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.vectorstores import InMemoryVectorStore

llm = FakeListChatModel(responses=["Interns get 6 casual leaves [1]."])
store = InMemoryVectorStore.from_documents(docs, DeterministicFakeEmbedding(size=64))
# build the same chain with these, then assert on structure, prompts and outputs`,
        },
        "LangChain ships fake models and embeddings for exactly this purpose. You'll use them in today's offline lab.",
      ],
    },
  ],
  revise: [
    "config: callbacks, tags, metadata, run_name on any Runnable; callbacks power tracing.",
    "`astream_events(version=\"v2\")` exposes retriever results, model tokens and other steps.",
    "LangSmith via env vars (LANGSMITH_TRACING, LANGSMITH_API_KEY); Langfuse/Phoenix alternatives; mask sensitive data.",
    "`rate_limiter=InMemoryRateLimiter(...)`, `.with_fallbacks`, `.with_retry`, `batch(..., max_concurrency=...)`.",
    "`set_llm_cache(InMemoryCache())` for exact-match caching.",
    "FakeListChatModel, DeterministicFakeEmbedding and InMemoryVectorStore for offline tests.",
  ],
  mistakes: [
    "Debugging nested chains with print statements instead of tracing.",
    "Sending production prompts with personal data to a tracing service without masking.",
    "Unbounded batch concurrency hitting provider rate limits.",
  ],
  interview: [
    {
      q: "How do you debug a LangChain application?",
      a: "Enable tracing (LangSmith, Langfuse or Phoenix) to see every step's inputs, outputs, prompts, retrieved documents, token usage and latency as a tree; use astream_events or callbacks locally to inspect intermediate steps; tag runs with metadata like user and feature; and reproduce issues with fake models or saved inputs in tests.",
    },
  ],
  practice: [
    "Add a callback handler that logs each model call's duration and token usage to a JSON Lines file.",
  ],
};

export const frameworksCompare = {
  minutes: 55,
  level: "Intermediate",
  intro:
    "LangChain isn't the only option. Interviewers ask \"Which framework would you use and why?\" to see judgement, not loyalty. This lesson maps the landscape (LangChain/LangGraph, LlamaIndex, Haystack, DSPy, Semantic Kernel, PydanticAI, provider agent SDKs), gives a decision guide, and shows how to keep your code portable so a framework choice isn't a lifetime commitment.",
  sections: [
    {
      h: "The landscape",
      blocks: [
        {
          table: {
            head: ["Framework", "Origin", "Strength"],
            rows: [
              ["**LangChain + LangGraph**", "2022, LangChain Inc.", "Broadest integrations; LangGraph for stateful agents; LangSmith tracing"],
              ["**LlamaIndex**", "Nov 2022 as \"GPT Index\" (Jerry Liu)", "Data ingestion, indexing and advanced retrieval; workflows; LlamaParse"],
              ["**Haystack**", "deepset, 2019–20", "Production search and RAG pipelines with explicit, typed components"],
              ["**DSPy**", "Stanford, 2023", "\"Programming, not prompting\": declares modules and optimises prompts automatically against metrics"],
              ["**Semantic Kernel**", "Microsoft, 2023", "C#/.NET and Python; enterprise and Azure ecosystems"],
              ["**PydanticAI**", "Pydantic team, 2024", "Type-safe agents with Pydantic models; simple and Pythonic"],
              ["**Provider agent SDKs**", "OpenAI Agents SDK (2025), Claude Agent SDK, Google ADK", "Tight integration with one provider's models and tools"],
              ["**CrewAI, AutoGen**", "2023–24", "Multi-agent collaboration patterns"],
            ],
          },
        },
      ],
    },
    {
      h: "A decision guide",
      blocks: [
        {
          table: {
            head: ["Situation", "Reasonable choice"],
            rows: [
              ["Simple RAG or extraction with strict control", "Plain SDK + your own code (Days 4–5 and 9)"],
              ["Retrieval-heavy product over many document types", "LlamaIndex, or LangChain loaders + your pipeline"],
              ["Agent with tools, memory, approvals, long workflows", "LangGraph (via `create_agent` or custom graphs)"],
              ["Search-style production pipelines, enterprise search teams", "Haystack"],
              ["Many prompts you want optimised against metrics", "DSPy"],
              [".NET / Azure-heavy company", "Semantic Kernel"],
              ["Single-provider app using that provider's hosted tools", "That provider's agent SDK"],
            ],
          },
        },
        {
          note: "In Indian job descriptions, LangChain/LangGraph appear most often, LlamaIndex next. Knowing one deeply and understanding the underlying pipeline matters more than knowing all of them.",
        },
      ],
    },
    {
      h: "Keeping your code portable",
      blocks: [
        {
          list: [
            "**Own your domain logic:** permissions, citation validation, business rules and data models live in your code, not in framework callbacks.",
            "**Thin adapters:** wrap framework calls behind your own interfaces (`retrieve()`, `answer_stream()`), as in the DocChat rebuild.",
            "**Keep evals framework-independent:** the same eval set should score any implementation.",
            "**Pin and upgrade deliberately:** lock versions, read release notes, upgrade in a branch and run evals.",
            "**Use frameworks for what they're best at:** loaders, integrations, agent runtimes.",
          ],
        },
      ],
    },
    {
      h: "Upgrading a framework safely",
      blocks: [
        {
          list: [
            "Read the migration guide and changelog for the target version.",
            "Upgrade on a branch; fix import errors and deprecation warnings (run tests with warnings shown).",
            "Run unit tests (with fake models) and the eval set; compare quality, latency and cost with the old version.",
            "Roll out behind a feature flag or to a fraction of traffic; watch traces and error rates.",
          ],
          ordered: true,
        },
      ],
    },
  ],
  revise: [
    "Options: LangChain/LangGraph (integrations, agents), LlamaIndex (data and retrieval), Haystack (production pipelines), DSPy (prompt optimisation), Semantic Kernel (.NET/Azure), PydanticAI (typed agents), provider agent SDKs, CrewAI/AutoGen (multi-agent).",
    "Choose by task: plain SDK for simple controlled flows; LlamaIndex for retrieval-heavy; LangGraph for agents.",
    "Portability: own domain logic, thin adapters, framework-independent evals, pinned versions, deliberate upgrades.",
  ],
  mistakes: [
    "Choosing a framework because a tutorial used it.",
    "Business rules buried in framework-specific callbacks, making migration painful.",
  ],
  interview: [
    {
      q: "Which LLM framework would you choose for a new project, and why?",
      a: "It depends on the job. For a simple, high-control RAG or extraction feature I'd use the provider SDK and my own code. For retrieval-heavy products with many document types, LlamaIndex or LangChain's loaders. For agents with tools, memory and human approvals, LangGraph. I'd keep domain logic and evals independent of the framework, wrap it behind thin interfaces, and pin versions so we can change or upgrade safely.",
    },
    {
      q: "When would you avoid a framework?",
      a: "When the flow is simple enough that a few SDK calls are clearer, when I need full control over prompts, citations and error handling, when dependency weight and fast-changing APIs are a risk, or when the team doesn't know the framework. Frameworks pay off with many integrations, agents and standard tooling; otherwise they can add abstraction without benefit.",
    },
  ],
  practice: [
    "Write a one-paragraph framework decision for your DocChat project, as you would in a design doc.",
  ],
};
