// Day 7 practice, part 2: LangChain 1.x essentials, tools and agents, testing and observability, retrieval extras, LlamaIndex.
// Merged into d07.js. Every solution was run with langchain 1.4 / langgraph 1.2 / llama-index-core 0.14 (with fake models).

export const essentialsGroup = {
  title: "LangChain 1.x essentials",
  exercises: [
    {
      id: "imports-migration",
      title: "Which old imports still work?",
      level: "Easy",
      task: [
        "You'll meet pre-1.0 LangChain code in tutorials and at work. Write a script that checks a list of old imports (`langchain.chains:LLMChain`, `langchain.retrievers:EnsembleRetriever`, `langchain.memory:ConversationBufferMemory`, `langchain.agents:initialize_agent`, ...) and prints whether each works, next to its modern replacement.",
        "Expected on LangChain 1.x: every old path prints `FAILS`.",
      ],
      hint: "Split `module:name`, `importlib.import_module(module)`, then `hasattr(module, name)`; catch `ImportError`.",
      solution: `import importlib

# (old pre-1.0 import, modern replacement) — the old ones fail on LangChain 1.x
MIGRATIONS = [
    ("langchain.chains:LLMChain", "langchain_core.prompts:ChatPromptTemplate  (use prompt | llm | parser)"),
    ("langchain.chains:create_retrieval_chain", "langchain_classic.chains:create_retrieval_chain  (or an LCEL chain)"),
    ("langchain.retrievers:EnsembleRetriever", "langchain_classic.retrievers:EnsembleRetriever"),
    ("langchain.retrievers:MultiQueryRetriever", "langchain_classic.retrievers:MultiQueryRetriever"),
    ("langchain.memory:ConversationBufferMemory", "langgraph.checkpoint.memory:InMemorySaver  (checkpointer + thread_id)"),
    ("langchain.agents:initialize_agent", "langchain.agents:create_agent"),
    ("langchain.text_splitter:RecursiveCharacterTextSplitter", "langchain_text_splitters:RecursiveCharacterTextSplitter"),
    ("langchain.vectorstores:Chroma", "langchain_chroma:Chroma"),
]


def importable(path: str) -> bool:
    module, _, name = path.partition(":")
    try:
        return hasattr(importlib.import_module(module), name)
    except ImportError:
        return False


for old, new in MIGRATIONS:
    new_path = new.split()[0]
    print(f"{'works' if importable(old) else 'FAILS':<6} {old:<55} → {new}"
          + ("" if importable(new_path) else "   (install the package for the new path)"))`,
      explanation: [
        "In 1.x the main `langchain` package was slimmed down: legacy chains and retrievers live in `langchain-classic`, memory moved to LangGraph checkpointers, agents to `create_agent`, and splitters and vector stores to their own packages.",
        "Keep this table in your notes: translating old tutorials is a daily task when learning LangChain.",
      ],
      concepts: [
        ["`importlib.import_module`", "Imports a module from its name as a string."],
        ["langchain-classic", "The package holding pre-1.0 chains and retrievers."],
      ],
    },
    {
      id: "router-chain",
      title: "Route questions to the right chain",
      level: "Medium",
      task: [
        "Build a router: a classifier chain labels each question billing, delivery or other; then the question goes to a billing chain, a delivery chain, or a fixed \"connect you to a human\" reply. Try three questions.",
      ],
      hint: "`RunnablePassthrough.assign(label=classify)` adds the label; a `RunnableLambda` whose function returns a Runnable does the routing.",
      solution: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from lc import llm

classify = (ChatPromptTemplate.from_template(
    "Classify the support question as exactly one word: billing, delivery or other.\\nQuestion: {q}")
    | llm | StrOutputParser())

billing = ChatPromptTemplate.from_template("You handle billing. Reply in one sentence: {q}") | llm | StrOutputParser()
delivery = ChatPromptTemplate.from_template("You handle delivery. Reply in one sentence: {q}") | llm | StrOutputParser()
other = RunnableLambda(lambda x: "Let me connect you to a human agent.")


def route(x: dict):
    label = x["label"].strip().lower()
    return {"billing": billing, "delivery": delivery}.get(label, other)


router = RunnablePassthrough.assign(label=classify) | RunnableLambda(route)

for q in ["I was charged twice for one order", "My parcel is late", "Can I become a seller?"]:
    print(f"{q!r} → {router.invoke({'q': q})}")`,
      explanation: [
        "When the routing function returns a Runnable, LangChain invokes it with the same input, so each branch gets both `q` and `label`.",
        "A cheap classifier in front of specialised chains is a common production pattern (and a cost saver: route easy questions to small models).",
        "Unknown labels fall back to a safe default instead of crashing.",
      ],
      concepts: [
        ["`RunnablePassthrough.assign`", "Adds computed keys to the input dict while keeping the rest."],
        ["Routing", "Choosing which chain handles an input based on a classification."],
      ],
    },
    {
      id: "astream-events",
      title: "Stream tokens and show intermediate steps",
      level: "Medium",
      task: [
        "Build a small RAG chain over the `docs/` folder and consume it with `astream_events(version=\"v2\")`: print \"searching...\" when retrieval starts, the sources when it ends, and the answer tokens as they stream.",
      ],
      hint: "Watch for `on_retriever_start`, `on_retriever_end` (documents in `ev[\"data\"][\"output\"]`) and `on_chat_model_stream` (token in `ev[\"data\"][\"chunk\"].content`).",
      solution: `import asyncio
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from lc import embeddings, llm

docs = DirectoryLoader("docs", glob="*.md", loader_cls=TextLoader).load()
chunks = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=40).split_documents(docs)
retriever = InMemoryVectorStore.from_documents(chunks, embeddings).as_retriever(search_kwargs={"k": 3})

prompt = ChatPromptTemplate.from_template("Answer from the context.\\n\\n{context}\\n\\nQuestion: {question}")
chain = ({"context": retriever | (lambda ds: "\\n\\n".join(d.page_content for d in ds)), "question": RunnablePassthrough()}
         | prompt | llm | StrOutputParser())


async def main(question: str) -> None:
    async for ev in chain.astream_events(question, version="v2"):
        if ev["event"] == "on_retriever_start":
            print("🔎 searching documents...")
        elif ev["event"] == "on_retriever_end":
            print("📄 found:", [d.metadata["source"] for d in ev["data"]["output"]])
        elif ev["event"] == "on_chat_model_stream":
            print(ev["data"]["chunk"].content, end="", flush=True)
    print()

asyncio.run(main("How many casual leaves do interns get?"))`,
      explanation: [
        "`astream_events` exposes every internal step, not just the final output, which is how UIs show \"Searching documents...\" before the answer.",
        "In FastAPI you'd translate these events into SSE messages, exactly as on Day 4.",
      ],
      concepts: [
        ["`astream_events`", "An async stream of start/end/stream events from every step of a chain."],
        ["Intermediate steps", "Retriever, tool and model events inside a chain."],
      ],
    },
  ],
};

export const agentGroup = {
  title: "Tools and agents (LangChain 1.x)",
  exercises: [
    {
      id: "lc-tool",
      title: "Define and test tools",
      level: "Easy",
      task: [
        "Define `get_order_status(order_id)` and `get_refund_policy(category)` with `@tool`. Print each tool's name, description and argument schema, and call each with `.invoke` directly.",
      ],
      hint: "The docstring becomes the description; type hints become the schema.",
      solution: `from langchain_core.tools import tool


@tool
def get_order_status(order_id: str) -> str:
    """Get the delivery status of a ShopKart order by its numeric id."""
    orders = {"4521": "shipped, arriving Friday", "7781": "delivered on Monday"}
    return orders.get(order_id, f"No order with id {order_id}")


@tool
def get_refund_policy(category: str) -> str:
    """Get the return window for a product category such as electronics, fashion or grocery."""
    days = {"electronics": 7, "fashion": 30, "grocery": 0}
    d = days.get(category.lower())
    return "Unknown category" if d is None else ("Not returnable" if d == 0 else f"Returnable within {d} days")


for t in (get_order_status, get_refund_policy):
    print(f"{t.name}: {t.description}")
    print("   args schema:", t.args)
print(get_order_status.invoke({"order_id": "4521"}))
print(get_refund_policy.invoke({"category": "Fashion"}))
print(get_refund_policy.invoke({"category": "grocery"}))`,
      explanation: [
        "The model only sees the name, description and schema, so the docstring is effectively a prompt: say what the tool does and what the arguments mean.",
        "Tools are Runnables, so you can unit-test them without any model.",
      ],
      concepts: [
        ["`@tool`", "Turns a Python function into a LangChain tool with a schema."],
        ["Tool schema", "The JSON Schema of the arguments, generated from type hints."],
      ],
    },
    {
      id: "create-agent",
      title: "A support agent with create_agent",
      level: "Medium",
      task: [
        "Create an agent with both tools and a system prompt, ask \"Where is order 4521, and how long can I return electronics?\", and print every message in the result (human, tool calls, tool results, final answer).",
        { note: "Your `lc.llm` must support tool calling: OpenAI and Gemini models do; with Ollama use `qwen2.5` or `llama3.1`." },
      ],
      hint: "`create_agent(model=llm, tools=[...], system_prompt=...)`, then `agent.invoke({\"messages\": [{\"role\": \"user\", \"content\": ...}]})`.",
      solution: `from langchain.agents import create_agent
from langchain_core.tools import tool
from lc import llm


@tool
def get_order_status(order_id: str) -> str:
    """Get the delivery status of a ShopKart order by its numeric id."""
    return {"4521": "shipped, arriving Friday"}.get(order_id, "order not found")


@tool
def get_refund_policy(category: str) -> str:
    """Get the return window for a product category such as electronics or fashion."""
    return {"electronics": "7 days", "fashion": "30 days"}.get(category.lower(), "unknown category")


agent = create_agent(
    model=llm,
    tools=[get_order_status, get_refund_policy],
    system_prompt="You are ShopKart's support agent. Use the tools; never guess order details. Be brief.",
)
result = agent.invoke({"messages": [{"role": "user",
                                     "content": "Where is order 4521, and how long can I return electronics?"}]})
for m in result["messages"]:
    detail = m.content or ", ".join(f"{c['name']}({c['args']})" for c in m.tool_calls)
    print(f"{type(m).__name__:<12} {detail}")`,
      explanation: [
        "The message list shows the whole loop: the model requests tools (possibly both at once), LangChain runs them, and the model answers from the results.",
        "Compare with your hand-written loop from Day 4: same steps, less code, plus streaming, persistence and middleware for free.",
      ],
      concepts: [
        ["`create_agent`", "LangChain 1.x's standard tool-calling agent, built on LangGraph."],
        ["ToolMessage", "The message carrying a tool's result back to the model."],
      ],
    },
    {
      id: "agent-memory",
      title: "Conversation memory with a checkpointer",
      level: "Medium",
      task: [
        "Create an agent with `checkpointer=InMemorySaver()`. Have a two-turn conversation in thread `neha-1` (introduce yourself, then ask \"What's my name?\"), then ask the same question in thread `ravi-1`. Print the replies and how many messages each thread has stored.",
      ],
      hint: "Pass `config={\"configurable\": {\"thread_id\": ...}}` to every `invoke`; send only the new message each time.",
      solution: `from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver
from lc import llm

agent = create_agent(model=llm, tools=[], system_prompt="You are a friendly assistant. Be brief.",
                     checkpointer=InMemorySaver())


def say(thread: str, text: str) -> None:
    config = {"configurable": {"thread_id": thread}}
    result = agent.invoke({"messages": [{"role": "user", "content": text}]}, config)
    print(f"[{thread}] you: {text}\\n[{thread}] bot: {result['messages'][-1].content}"
          f"   ({len(result['messages'])} messages stored in this thread)")


say("neha-1", "Hi, I'm Neha and I'm learning LangChain.")
say("neha-1", "What's my name and what am I learning?")
say("ravi-1", "What's my name?")                 # a different thread knows nothing about Neha`,
      explanation: [
        "The checkpointer saves state per thread, so you send only the new message and the agent sees the whole conversation.",
        "Threads are isolated: `ravi-1` knows nothing about Neha. In production, use one thread per conversation and a persistent checkpointer (e.g. Postgres).",
        "This replaces the deprecated `RunnableWithMessageHistory`.",
      ],
      concepts: [
        ["Checkpointer", "Stores agent state after each step, keyed by thread id."],
        ["`thread_id`", "Identifies one conversation's saved state."],
      ],
    },
    {
      id: "agent-middleware",
      title: "Redact PII and cap model calls with middleware",
      level: "Hard",
      task: [
        "Add `PIIMiddleware(\"email\", strategy=\"redact\")` and `ModelCallLimitMiddleware(run_limit=3)` to an agent. Send a message containing an email address and print the stored messages to confirm the email was redacted before reaching the model.",
        "Expected: the human message shows `[REDACTED_EMAIL]`.",
      ],
      hint: "Middleware is a list passed as `middleware=[...]` to `create_agent`.",
      solution: `from langchain.agents import create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware, PIIMiddleware
from lc import llm

agent = create_agent(
    model=llm,
    tools=[],
    system_prompt="You are a support assistant.",
    middleware=[
        PIIMiddleware("email", strategy="redact"),          # mask emails before the model sees them
        ModelCallLimitMiddleware(run_limit=3),              # stop runaway loops
    ],
)
result = agent.invoke({"messages": [{"role": "user", "content": "My email is neha@example.com, please update my account."}]})
for m in result["messages"]:
    print(f"{type(m).__name__:<12} {m.content}")`,
      explanation: [
        "Middleware wraps every model and tool call, so cross-cutting rules (privacy, limits, approvals, fallbacks) live in one place instead of in every prompt.",
        "Redacting PII before the model call means the provider never receives it, which matters under data-protection rules like India's DPDP Act.",
        "Call limits protect against runaway agent loops and surprise bills.",
      ],
      concepts: [
        ["Middleware", "Code that runs around model and tool calls in an agent."],
        ["PII", "Personally identifiable information such as emails, phone numbers and IDs."],
      ],
    },
  ],
};

export const testObsGroup = {
  title: "Testing and observability",
  exercises: [
    {
      id: "callback-logger",
      title: "Log every model call with a callback",
      level: "Medium",
      task: [
        "Write a `BaseCallbackHandler` that records each chat-model call's duration, tags, token usage and output length, and appends them as JSON Lines to `llm_calls.jsonl`. Attach it via `config={\"callbacks\": [...], \"tags\": [...]}`.",
      ],
      hint: "Store the start time in `on_chat_model_start` keyed by `run_id`; compute the duration in `on_llm_end`.",
      solution: `import json
import time
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from lc import llm


class JsonlLogger(BaseCallbackHandler):
    """Writes one line per model call: duration, token usage, tags."""
    def __init__(self, path: str = "llm_calls.jsonl"):
        self.path, self.started = path, {}

    def on_chat_model_start(self, serialized, messages, *, run_id, tags=None, **kwargs):
        self.started[run_id] = (time.perf_counter(), tags or [])

    def on_llm_end(self, response, *, run_id, **kwargs):
        start, tags = self.started.pop(run_id, (time.perf_counter(), []))
        msg = getattr(response.generations[0][0], "message", None)
        row = {"ms": round((time.perf_counter() - start) * 1000, 1), "tags": tags,
               "usage": getattr(msg, "usage_metadata", None), "chars": len(response.generations[0][0].text)}
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\\n")
        print("logged:", row)


chain = ChatPromptTemplate.from_template("Define {term} in one line.") | llm | StrOutputParser()
logger = JsonlLogger()
for term in ["LCEL", "retriever"]:
    chain.invoke({"term": term}, config={"callbacks": [logger], "tags": ["glossary"]})`,
      explanation: [
        "Callbacks are how tracing tools (LangSmith, Langfuse) hook into LangChain; writing one shows exactly what they capture.",
        "Keying by `run_id` keeps concurrent calls (e.g. from `batch`) from mixing up.",
        "Real models populate `usage_metadata` with token counts; fake models return `None`.",
      ],
      concepts: [
        ["Callback handler", "An object whose methods run on events like model start and end."],
        ["`run_id`", "A unique id for each run, used to pair start and end events."],
      ],
    },
    {
      id: "fake-tests",
      title: "Unit-test a chain with fake models",
      level: "Medium",
      task: [
        "Write two tests for a `prompt | llm | parser` chain using fake models: (1) with a spy model, assert the system message contains the word limit and the \"I don't know\" rule and the human message is the question; (2) assert `batch` returns results in input order.",
      ],
      hint: "Subclass `FakeListChatModel` and override `invoke` to record `input.to_messages()` before calling `super().invoke`.",
      solution: `from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a concise tutor. Answer in under {words} words. If unsure, say \\"I don't know.\\""),
    ("human", "{question}"),
])


def make_chain(llm):
    return PROMPT | llm | StrOutputParser()


class SpyModel(FakeListChatModel):
    """Records the messages it receives, then returns canned responses."""
    seen: list = []

    def invoke(self, input, config=None, **kwargs):
        self.seen.append(input.to_messages())
        return super().invoke(input, config, **kwargs)


def test_prompt_structure():
    spy = SpyModel(responses=["RAG = retrieve then generate."])
    out = make_chain(spy).invoke({"words": 20, "question": "What is RAG?"})
    system, human = spy.seen[-1]
    assert "under 20 words" in system.content and "I don't know" in system.content
    assert human.content == "What is RAG?"
    assert out == "RAG = retrieve then generate."


def test_batch_keeps_order():
    llm = FakeListChatModel(responses=["one", "two", "three"])
    assert make_chain(llm).batch([{"words": 5, "question": q} for q in "abc"], config={"max_concurrency": 1}) == ["one", "two", "three"]


for test in (test_prompt_structure, test_batch_keeps_order):
    test()
    print("PASS", test.__name__)`,
      explanation: [
        "These tests run in milliseconds with no API key, so they can run on every commit.",
        "They catch the most common framework regressions: a prompt variable renamed, a rule dropped, a chain wired differently after an upgrade.",
        "Model quality still needs evals with real models; unit tests check the wiring.",
      ],
      concepts: [
        ["Spy", "A test double that records how it was called."],
        ["`FakeListChatModel`", "A LangChain chat model returning canned responses."],
      ],
    },
  ],
};

export const retrievalExtraGroup = {
  title: "Retrieval extras",
  exercises: [
    {
      id: "custom-retriever",
      title: "A tenant-safe custom retriever",
      level: "Medium",
      task: [
        "Subclass `BaseRetriever` to build `TenantRetriever(tenant, min_year, k)` over an `InMemoryVectorStore`: it must only return the tenant's documents from `min_year` onwards. Show that acme gets its 2026 policy (not the 2024 one) and never globex's.",
      ],
      hint: "Implement `_get_relevant_documents`; `InMemoryVectorStore.similarity_search(query, k=..., filter=fn)` accepts a function.",
      solution: `from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.vectorstores import InMemoryVectorStore
from lc import embeddings

store = InMemoryVectorStore.from_documents([
    Document(page_content="Acme interns get 6 casual leaves.", metadata={"tenant": "acme", "year": 2026}),
    Document(page_content="Acme interns got 4 casual leaves.", metadata={"tenant": "acme", "year": 2024}),
    Document(page_content="Globex interns get 10 casual leaves.", metadata={"tenant": "globex", "year": 2026}),
], embeddings)


class TenantRetriever(BaseRetriever):
    """Always filters by tenant and drops superseded policy years, then returns the top k."""
    tenant: str
    min_year: int = 2025
    k: int = 3

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:
        allowed = lambda d: d.metadata["tenant"] == self.tenant and d.metadata["year"] >= self.min_year
        return store.similarity_search(query, k=self.k, filter=allowed)


for tenant in ("acme", "globex"):
    docs = TenantRetriever(tenant=tenant).invoke("How many casual leaves do interns get?")
    print(tenant, "→", [d.page_content for d in docs])`,
      explanation: [
        "Putting the tenant and version rules inside the retriever means every chain using it is safe by default.",
        "Because it's a real `BaseRetriever`, it works in LCEL chains, supports `invoke`/`ainvoke`, and shows up in traces.",
      ],
      concepts: [
        ["`BaseRetriever`", "LangChain's base class for anything that returns documents for a query."],
        ["Superseded version", "An older document replaced by a newer effective one."],
      ],
    },
    {
      id: "hybrid-lc",
      title: "BM25, dense and hybrid in LangChain",
      level: "Medium",
      task: [
        "Over four documents, compare `BM25Retriever`, a dense retriever and an `EnsembleRetriever` combining both for the queries \"E-4012\", \"SK-X200 capacity\" and \"when will I get my money back\". Print the document ids each returns.",
        { note: "`uv add langchain-community langchain-classic rank_bm25`. `EnsembleRetriever` moved to `langchain_classic` in LangChain 1.x." },
      ],
      hint: "`EnsembleRetriever(retrievers=[bm25, dense], weights=[0.5, 0.5])`.",
      solution: `from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from lc import embeddings

docs = [Document(page_content=t, metadata={"id": i}) for i, t in enumerate([
    "Error E-4012 means your UPI autopay mandate has expired.",
    "Refunds reach your bank within 7 working days.",
    "Model SK-X200 water purifier has an 8 litre tank.",
    "Delivery to Pune takes 2 to 4 working days.",
])]
bm25 = BM25Retriever.from_documents(docs, k=2)
dense = InMemoryVectorStore.from_documents(docs, embeddings).as_retriever(search_kwargs={"k": 2})
hybrid = EnsembleRetriever(retrievers=[bm25, dense], weights=[0.5, 0.5])

for q in ["E-4012", "SK-X200 capacity", "when will I get my money back"]:
    print(q)
    for name, r in [("bm25", bm25), ("dense", dense), ("hybrid", hybrid)]:
        print(f"   {name:<7}", [d.metadata["id"] for d in r.invoke(q)])`,
      explanation: [
        "BM25 nails exact codes; dense retrieval handles paraphrases; the ensemble fuses their rankings (weighted Reciprocal Rank Fusion) so both kinds of query work.",
        "Day 8 goes deeper into hybrid search and adds reranking.",
      ],
      concepts: [
        ["`EnsembleRetriever`", "Combines several retrievers' rankings with weighted rank fusion."],
        ["`BM25Retriever`", "An in-memory keyword retriever based on BM25."],
      ],
    },
  ],
};

export const liGroup2 = {
  title: "LlamaIndex, deeper",
  exercises: [
    {
      id: "li-ingest-persist",
      title: "Ingestion pipeline, persistence and filters",
      level: "Medium",
      task: [
        "With LlamaIndex, load the `docs/` folder, tag each document with a `team` metadata field, run an `IngestionPipeline` (sentence splitting + embedding), persist the index to disk, reload it, retrieve with a metadata filter for `team=hr`, and run a query that prints its source files.",
        { note: "`uv add llama-index-core`. The solution uses `MockLLM`/`MockEmbedding` so it runs offline; swap in real models (e.g. `llama-index-llms-ollama`) for real answers." },
      ],
      hint: "`index.storage_context.persist(persist_dir=...)` and `load_index_from_storage(StorageContext.from_defaults(persist_dir=...))`.",
      solution: `from llama_index.core import (Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex,
                              load_index_from_storage)
from llama_index.core.embeddings import MockEmbedding
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.llms import MockLLM
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.vector_stores import ExactMatchFilter, MetadataFilters

# Mocks keep this runnable offline. For real answers use e.g.
#   from llama_index.llms.ollama import Ollama; Settings.llm = Ollama(model="llama3.2")
Settings.llm = MockLLM(max_tokens=40)
Settings.embed_model = MockEmbedding(embed_dim=64)

docs = SimpleDirectoryReader("docs").load_data()
for d in docs:
    d.metadata["team"] = "hr" if "leave" in d.metadata["file_name"] else "ops"

pipeline = IngestionPipeline(transformations=[SentenceSplitter(chunk_size=200, chunk_overlap=20), Settings.embed_model])
nodes = pipeline.run(documents=docs)
print(f"{len(docs)} documents → {len(nodes)} nodes; metadata example: {nodes[0].metadata['file_name']}, {nodes[0].metadata['team']}")

VectorStoreIndex(nodes).storage_context.persist(persist_dir="./li_storage")
index = load_index_from_storage(StorageContext.from_defaults(persist_dir="./li_storage"))

hr_only = index.as_retriever(similarity_top_k=5,
                             filters=MetadataFilters(filters=[ExactMatchFilter(key="team", value="hr")]))
print("hr-only results from:", {n.node.metadata["file_name"] for n in hr_only.retrieve("leave policy")})
resp = index.as_query_engine(similarity_top_k=2).query("How many casual leaves do interns get?")
print("sources:", [n.node.metadata["file_name"] for n in resp.source_nodes])`,
      explanation: [
        "Metadata added to documents flows to every node, which enables filtering and citations.",
        "Persisting avoids re-embedding on every start; in production you'd use a vector store integration instead of local files.",
        "Mock models let you test the pipeline's mechanics without API keys.",
      ],
      concepts: [
        ["IngestionPipeline", "LlamaIndex's chain of transformations from documents to embedded nodes."],
        ["Node", "LlamaIndex's chunk: text plus metadata and relationships."],
      ],
    },
  ],
};
