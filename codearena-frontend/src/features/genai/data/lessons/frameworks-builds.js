// Day 7 build guide: an offline LangChain lab with tests. Merged into d07.js. Shape: see ./index.js
// Tested with langchain 1.4, langchain-core 1.6 and langgraph 1.2; keep it runnable when editing.

export const lcOfflineLab = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "Build a small LangChain app (a RAG chain that returns sources, an owner filter, a tool-calling agent and conversation memory) and a pytest suite that runs it entirely with **fake models and fake embeddings**: no API key, no cost, millisecond tests. You'll practise LangChain 1.x's real APIs and learn the testing pattern teams use to keep framework code from silently breaking on upgrades.",
  sections: [
    {
      h: "What you'll build",
      blocks: [
        {
          lang: "text",
          code: `lc-lab/
├── app.py               # build_store, build_rag_chain (answer + sources), build_agent (tool + memory)
└── tests/
    ├── conftest.py      # fake embeddings, FakeToolModel, sample documents
    └── test_app.py      # 6 tests: formatting, sources, isolation, prompt, agent tools, memory threads`,
        },
        {
          lang: "bash",
          code: `mkdir -p ~/genai-practice/lc-lab/tests && cd ~/genai-practice/lc-lab
uv init --no-readme .
uv add langchain langchain-core langchain-text-splitters langgraph pytest`,
        },
      ],
    },
    {
      h: "Step 1: the app (app.py)",
      blocks: [
        {
          lang: "python",
          code: `"""A small LangChain app whose model, embeddings and store are injectable, so it runs with fakes in tests
and with real providers in production."""
from langchain.agents import create_agent
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough
from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "Answer only from the documents and cite them like [1]. "
               "If they don't contain the answer, say \\"I couldn't find this in the documents.\\"\\n\\n"
               "<documents>\\n{context}\\n</documents>"),
    ("human", "{question}"),
])


def format_docs(docs: list[Document]) -> str:
    return "\\n\\n".join(f'<document index="{i}" source="{d.metadata.get("source")}">\\n{d.page_content}\\n</document>'
                       for i, d in enumerate(docs, start=1))


def build_store(texts: dict[str, str], embeddings, owner_id: int) -> InMemoryVectorStore:
    splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=20)
    docs = splitter.create_documents(list(texts.values()),
                                     metadatas=[{"source": s, "owner_id": owner_id} for s in texts])
    return InMemoryVectorStore.from_documents(docs, embeddings)


def build_rag_chain(store: InMemoryVectorStore, llm, owner_id: int, k: int = 3):
    retriever = store.as_retriever(search_kwargs={"k": k, "filter": lambda d: d.metadata["owner_id"] == owner_id})
    answer = (RunnableLambda(lambda x: {"context": format_docs(x["docs"]), "question": x["question"]})
              | RAG_PROMPT | llm | StrOutputParser())
    return RunnableParallel(docs=retriever, question=RunnablePassthrough()).assign(answer=answer)


@tool
def get_order_status(order_id: str) -> str:
    """Get the delivery status of an order by its id."""
    return {"4521": "shipped, arriving Friday"}.get(order_id, "order not found")


def build_agent(llm, checkpointer=None):
    return create_agent(model=llm, tools=[get_order_status], checkpointer=checkpointer,
                        system_prompt="You are ShopKart's support agent. Use tools for order questions.")`,
        },
        {
          list: [
            "Every dependency (model, embeddings) is passed in, so production uses `ChatOpenAI`/`OpenAIEmbeddings` and tests use fakes, the same injection idea as Day 6's test build.",
            "The retriever's `filter` enforces the owner inside retrieval (InMemoryVectorStore accepts a function; real stores take their own filter syntax).",
            "`RunnableParallel(docs=..., question=...).assign(answer=...)` keeps the retrieved documents in the output, so you can show citations.",
            "`build_agent` uses `create_agent` with an optional checkpointer for memory.",
          ],
        },
      ],
    },
    {
      h: "Step 2: fakes (tests/conftest.py)",
      blocks: [
        {
          lang: "python",
          code: `import sys
from pathlib import Path

import pytest
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class FakeToolModel(GenericFakeChatModel):
    """GenericFakeChatModel plays back scripted AIMessages; tools are accepted but ignored."""
    def bind_tools(self, tools, **kwargs):
        return self


@pytest.fixture
def embeddings():
    return DeterministicFakeEmbedding(size=64)


@pytest.fixture
def docs():
    return {
        "leave.md": "Full-time employees get 12 casual leaves. Interns get 6 casual leaves.",
        "travel.md": "Hotels are reimbursed up to 5000 rupees per night in metros.",
    }`,
        },
        {
          table: {
            head: ["Fake", "Behaves like"],
            rows: [
              ["`FakeListChatModel(responses=[...])`", "A chat model that returns canned strings in order"],
              ["`GenericFakeChatModel(messages=iter([...]))`", "A chat model that plays back full AIMessages, including tool calls"],
              ["`DeterministicFakeEmbedding(size=64)`", "An embedding model returning stable vectors per text"],
              ["`InMemoryVectorStore`", "A real vector store that runs in memory"],
            ],
          },
        },
      ],
    },
    {
      h: "Step 3: the tests (tests/test_app.py)",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.language_models.fake_chat_models import FakeListChatModel, GenericFakeChatModel
from langchain_core.documents import Document
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver

from app import build_agent, build_rag_chain, build_store, format_docs
from conftest import FakeToolModel


def test_format_docs_numbers_sources():
    text = format_docs([Document(page_content="a", metadata={"source": "x.md"}),
                        Document(page_content="b", metadata={"source": "y.md"})])
    assert '<document index="1" source="x.md">' in text and '<document index="2" source="y.md">' in text


def test_rag_chain_returns_answer_and_sources(embeddings, docs):
    store = build_store(docs, embeddings, owner_id=1)
    llm = FakeListChatModel(responses=["Interns get 6 casual leaves [1]."])
    out = build_rag_chain(store, llm, owner_id=1).invoke("How many casual leaves do interns get?")
    assert out["answer"].startswith("Interns get 6")
    assert out["docs"] and all(d.metadata["owner_id"] == 1 for d in out["docs"])


def test_rag_chain_never_returns_other_owners_docs(embeddings, docs):
    store = build_store(docs, embeddings, owner_id=1)
    store.add_documents([Document(page_content="Owner 2 salary data", metadata={"source": "secret.md", "owner_id": 2})])
    out = build_rag_chain(store, FakeListChatModel(responses=["ok"]), owner_id=1, k=10).invoke("salary data")
    assert all(d.metadata["owner_id"] == 1 for d in out["docs"])


def test_prompt_contains_documents_and_question(embeddings, docs):
    store = build_store(docs, embeddings, owner_id=1)
    seen = {}

    class Spy(FakeListChatModel):
        def invoke(self, input, config=None, **kw):
            seen["messages"] = input.to_messages()
            return super().invoke(input, config, **kw)

    build_rag_chain(store, Spy(responses=["x"]), owner_id=1).invoke("interns?")
    system, human = seen["messages"]
    assert "<documents>" in system.content and human.content == "interns?"


def test_agent_calls_the_tool_and_answers():
    llm = FakeToolModel(messages=iter([
        AIMessage("", tool_calls=[{"name": "get_order_status", "args": {"order_id": "4521"}, "id": "c1"}]),
        AIMessage("Order 4521 has shipped and arrives Friday."),
    ]))
    out = build_agent(llm).invoke({"messages": [{"role": "user", "content": "Where is 4521?"}]})
    kinds = [type(m).__name__ for m in out["messages"]]
    assert kinds == ["HumanMessage", "AIMessage", "ToolMessage", "AIMessage"]
    assert "shipped" in out["messages"][2].content


def test_agent_remembers_within_a_thread_only():
    llm = GenericFakeChatModel(messages=iter([AIMessage("Hi Neha"), AIMessage("You're Neha"), AIMessage("I don't know")]))
    agent = build_agent(FakeToolModel(messages=llm.messages), checkpointer=InMemorySaver())
    a = {"configurable": {"thread_id": "a"}}
    agent.invoke({"messages": [{"role": "user", "content": "I'm Neha"}]}, a)
    r = agent.invoke({"messages": [{"role": "user", "content": "Who am I?"}]}, a)
    assert len(r["messages"]) == 4                                 # both turns stored in thread "a"
    other = agent.invoke({"messages": [{"role": "user", "content": "Who am I?"}]}, {"configurable": {"thread_id": "b"}})
    assert len(other["messages"]) == 2                             # a new thread starts empty`,
        },
        {
          lang: "bash",
          code: `uv run pytest -q
# 6 passed in 0.2s`,
        },
        {
          list: [
            "The **spy model** captures the exact messages sent to the LLM, so you can assert on the prompt (documents in the system message, question in the human message).",
            "The **agent test** scripts the model's tool call and checks the full message sequence: Human → AI (tool call) → Tool → AI.",
            "The **memory test** proves conversation state is kept per `thread_id` and never leaks between threads.",
          ],
        },
      ],
    },
    {
      h: "Why this matters",
      blocks: [
        "LangChain upgrades frequently rename or move things. A suite like this, run in CI, tells you within seconds whether an upgrade broke your chains, prompts, filters or agent wiring, before any user or API bill notices. Quality (whether a real model answers well) is still measured separately with evals.",
      ],
    },
    {
      h: "Extensions",
      blocks: [
        {
          list: [
            "Swap in real models behind an environment flag (`USE_REAL_MODELS=1`) for a nightly smoke test.",
            "Add a test for `SummarizationMiddleware` or `ModelCallLimitMiddleware` behaviour.",
            "Recreate the same tests for your LlamaIndex version using `MockLLM` and `MockEmbedding`.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Inject model and embeddings; use FakeListChatModel, GenericFakeChatModel, DeterministicFakeEmbedding and InMemoryVectorStore in tests.",
    "Test prompt structure with a spy model, sources and owner filtering, agent tool sequences, and memory per thread_id.",
    "Run in CI to catch framework upgrade breakage; measure quality separately with evals.",
  ],
  practice: [
    "Add a test that fails if the RAG prompt ever stops containing the \"I couldn't find this\" fallback rule.",
  ],
};
