// Day 7: LangChain & LlamaIndex. Shape: see ./index.js
import { frameworksCompare, lcObservability, lcOverview, lcTools } from "./frameworks-new.js";
import { deepLcel, deepLlamaindex, deepMemory, deepRetrievers } from "./frameworks-deep.js";
import { lcOfflineLab } from "./frameworks-builds.js";

const base = {
  lcel: {
    minutes: 70,
    level: "Intermediate",
    intro:
      "LangChain is the framework most GenAI job descriptions in India mention. It gives you standard interfaces for models, prompts, retrievers and tools, and a way to compose them. You've just seen chains, runnables and the primitives; this lesson goes deeper into the Runnable interface every piece shares.",
    sections: [
      {
        h: "The package layout",
        blocks: [
          "LangChain is split into packages. Knowing them saves a lot of import confusion:",
          {
            table: {
              head: ["Package", "Contains"],
              rows: [
                ["`langchain-core`", "Base interfaces: messages, prompts, runnables (LCEL), output parsers, documents"],
                ["`langchain-openai`, `langchain-anthropic`, `langchain-google-genai`, …", "Provider integrations (chat models, embeddings)"],
                ["`langchain-text-splitters`", "Chunkers"],
                ["`langchain-community`", "Many third-party loaders and integrations"],
                ["`langchain-qdrant`, `langchain-postgres`, `langchain-chroma`", "Vector store integrations"],
                ["`langchain`", "Higher-level pieces such as agent helpers"],
                ["`langgraph`", "Stateful agent workflows as graphs (Day 14)"],
              ],
            },
          },
          {
            warn: "LangChain's API changes quickly and many online tutorials use removed classes (`LLMChain`, `ConversationalRetrievalChain`, old `langchain.xxx` imports). Prefer the official docs, and pin versions in `pyproject.toml`.",
          },
        ],
      },
      {
        h: "Chat models, prompts and parsers",
        blocks: [
          {
            lang: "python",
            code: `# uv add langchain-core langchain-openai
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a concise tutor. Answer in under {words} words."),
    ("human", "{question}"),
])

msg = llm.invoke("What is a vector database?")      # returns an AIMessage
print(msg.content, msg.usage_metadata)`,
          },
          "Every provider's chat model has the same methods, so switching is one line: `from langchain_anthropic import ChatAnthropic; llm = ChatAnthropic(model=\"claude-opus-5\")`. There's also `init_chat_model(\"openai:gpt-4o-mini\")` to pick the provider from a string.",
        ],
      },
      {
        h: "LCEL: composing with the pipe",
        blocks: [
          "**LCEL (LangChain Expression Language)** composes components with `|`. The output of each step becomes the input of the next. Every component is a **Runnable** with the same methods: `invoke`, `batch`, `stream`, and async `ainvoke`, `abatch`, `astream`.",
          {
            lang: "python",
            code: `chain = prompt | llm | StrOutputParser()

chain.invoke({"words": 40, "question": "What is RAG?"})          # one call
chain.batch([{"words": 20, "question": q} for q in questions])   # parallel calls
for token in chain.stream({"words": 40, "question": "What is HNSW?"}):
    print(token, end="", flush=True)                             # streaming for free`,
          },
          "Useful building blocks from `langchain_core.runnables`:",
          {
            table: {
              head: ["Runnable", "Does"],
              rows: [
                ["`RunnablePassthrough()`", "Passes the input through unchanged"],
                ["`RunnablePassthrough.assign(x=fn)`", "Adds a key to the input dict"],
                ["`RunnableParallel(a=r1, b=r2)` or a plain dict", "Runs branches in parallel, returns a dict"],
                ["`RunnableLambda(fn)`", "Wraps any Python function"],
                ["`.with_retry()`, `.with_fallbacks([...])`", "Retries and fallbacks on any runnable"],
              ],
            },
          },
        ],
      },
      {
        h: "Structured output",
        blocks: [
          {
            lang: "python",
            code: `from pydantic import BaseModel, Field
from typing import Literal

class Ticket(BaseModel):
    category: Literal["billing", "bug", "feature", "other"]
    urgency: int = Field(ge=1, le=5)

extractor = llm.with_structured_output(Ticket)
ticket = extractor.invoke("I was charged twice, please fix ASAP")   # Ticket instance`,
          },
          "`with_structured_output` uses the provider's native structured output or tool calling underneath, so it's the same technique as the Day 5 structured output lesson behind a common interface.",
        ],
      },
      {
        h: "A RAG chain in LCEL",
        blocks: [
          {
            lang: "python",
            code: `from langchain_core.runnables import RunnablePassthrough

rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer only from the documents. Cite like [1]. "
               "If the answer isn't there, say you couldn't find it.\\n\\n<documents>\\n{context}\\n</documents>"),
    ("human", "{question}"),
])

def format_docs(docs) -> str:
    return "\\n\\n".join(
        f'<document index="{i}" source="{d.metadata["source"]}" page="{d.metadata.get("page")}">\\n{d.page_content}\\n</document>'
        for i, d in enumerate(docs, 1))

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)
rag_chain.invoke("How many casual leaves do interns get?")`,
            caption: "The dict runs `retriever | format_docs` and the passthrough in parallel; its output fills the prompt variables.",
          },
          "To return the sources along with the answer, keep the documents in the output:",
          {
            lang: "python",
            code: `from langchain_core.runnables import RunnableParallel

rag_with_sources = RunnableParallel(docs=retriever, question=RunnablePassthrough()).assign(
    answer=(lambda x: {"context": format_docs(x["docs"]), "question": x["question"]})
           | rag_prompt | llm | StrOutputParser()
)
out = rag_with_sources.invoke("...")      # {"docs": [...], "question": "...", "answer": "..."}`,
          },
        ],
      },
    ],
    revise: [
      "Packages: `langchain-core` (interfaces, LCEL), provider packages, text splitters, community loaders, vector store packages, `langgraph`.",
      "Chat models share one interface; switch providers by changing the class or `init_chat_model` string.",
      "LCEL: `prompt | llm | parser`; every Runnable has invoke/batch/stream (+ async).",
      "`RunnablePassthrough`, `.assign`, `RunnableParallel`/dicts, `RunnableLambda`, `.with_retry`, `.with_fallbacks`.",
      "`llm.with_structured_output(PydanticModel)`.",
      "RAG chain: `{context: retriever | format_docs, question: passthrough} | prompt | llm | parser`.",
    ],
    mistakes: [
      "Copying old tutorials with `LLMChain` or deprecated imports.",
      "Not pinning LangChain versions.",
      "Losing the retrieved documents in the chain, so you can't show citations.",
    ],
    interview: [
      {
        q: "What is LCEL?",
        a: "LangChain Expression Language, a declarative way to compose Runnables with the pipe operator. Each component (prompt, model, retriever, parser, function) implements the same interface, so a composed chain automatically supports invoke, batch, streaming and async, and can add retries, fallbacks and tracing uniformly.",
      },
      {
        q: "What does LangChain give you over the raw SDKs?",
        a: "Standard interfaces across providers and vector stores, many ready-made loaders and splitters, composition with streaming and batching built in, structured output helpers, and integration with LangSmith tracing and LangGraph for agents. The cost is abstraction layers, fast-changing APIs and harder debugging, so it's best when you use many of its integrations.",
      },
    ],
    practice: [
      "Build `prompt | llm | parser` and call it with invoke, batch and stream.",
      "Swap the model to another provider without changing anything else.",
    ],
  },

  retrievers: {
    minutes: 50,
    level: "Intermediate",
    intro:
      "LangChain standardises the indexing side too: loaders produce `Document` objects, splitters chunk them, vector stores embed and store them, and retrievers fetch them. Learn these four interfaces and most RAG code you read will make sense.",
    sections: [
      {
        h: "Document",
        blocks: [
          "Everything in LangChain's retrieval world is a `Document`: `page_content` (the text) plus a `metadata` dict.",
          {
            lang: "python",
            code: `from langchain_core.documents import Document
doc = Document(page_content="Refunds within 30 days.", metadata={"source": "policy.pdf", "page": 4})`,
          },
        ],
      },
      {
        h: "Loaders and splitters",
        blocks: [
          {
            lang: "python",
            code: `# uv add langchain-community langchain-text-splitters pypdf
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

pages = PyPDFLoader("hr-policy.pdf").load()              # one Document per page, metadata has page
splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)   # characters
chunks = splitter.split_documents(pages)                 # metadata is copied to each chunk

# token-based sizes instead of characters:
splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=400, chunk_overlap=60)`,
          },
          {
            note: "PyPDFLoader's `page` metadata is 0-based. Add 1 before showing it to users.",
          },
          "There are loaders for almost everything (Notion, Confluence, Google Drive, S3, YouTube transcripts, CSV, SQL). They're convenient, but check what text they actually produce, exactly as on Day 7.",
        ],
      },
      {
        h: "Vector stores and retrievers",
        blocks: [
          {
            lang: "python",
            code: `# uv add langchain-qdrant qdrant-client
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
store = QdrantVectorStore.from_documents(
    chunks, embeddings, url="http://localhost:6333", collection_name="hr",
)

store.similarity_search_with_score("maternity leave eligibility", k=4)

retriever = store.as_retriever(search_kwargs={"k": 5})
retriever.invoke("How many casual leaves?")          # list[Document]; a Runnable, so it works in LCEL`,
          },
          {
            table: {
              head: ["Retriever option", "What it does"],
              rows: [
                ["`search_type=\"similarity\"`", "Plain top-k"],
                ["`search_type=\"mmr\"`", "Maximal Marginal Relevance: relevant but diverse results, reducing near-duplicates"],
                ["`search_type=\"similarity_score_threshold\"`", "Only results above a score"],
                ["`search_kwargs={\"filter\": ...}`", "Metadata filter (syntax depends on the store)"],
              ],
            },
          },
          "Other retrievers you'll meet on Day 10: `BM25Retriever` (keyword), `EnsembleRetriever` (hybrid), `MultiQueryRetriever`, `ParentDocumentRetriever`, and contextual compression with rerankers.",
        ],
      },
    ],
    revise: [
      "`Document` = `page_content` + `metadata`.",
      "Loaders → Documents; `RecursiveCharacterTextSplitter` (chars) or `.from_tiktoken_encoder` (tokens).",
      "Vector store: `from_documents(chunks, embeddings, ...)`, `similarity_search_with_score`.",
      "`store.as_retriever(search_type=..., search_kwargs={k, filter})` is a Runnable returning Documents.",
      "MMR diversifies results; score threshold filters weak matches.",
    ],
    interview: [
      {
        q: "What is MMR retrieval?",
        a: "Maximal Marginal Relevance selects results that are relevant to the query but dissimilar to results already selected, balancing relevance and diversity. It avoids filling the context with near-duplicate chunks, which is common when documents repeat content.",
      },
    ],
    practice: [
      "Load a PDF with PyPDFLoader, split it with token-based sizes, and store it in Qdrant through LangChain.",
      "Compare `similarity` and `mmr` results for 3 queries.",
    ],
  },

  memory: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Chat history in LangChain is just a list of messages you pass into the prompt. The framework adds helpers for storing and injecting it. You already know the concept from Day 4 (the model is stateless, so you resend the history) and the Day 5 chatbot; this lesson shows the LangChain way, and when to keep it in your own database instead.",
    sections: [
      {
        h: "Messages and placeholders",
        blocks: [
          {
            lang: "python",
            code: `from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful HR assistant."),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])

history = [HumanMessage("How many casual leaves?"), AIMessage("12 per year.")]
chain = prompt | llm
chain.invoke({"history": history, "question": "What about interns?"})`,
          },
          "That's the core idea: history is an input variable. You load it from your database, trim it, and pass it in.",
        ],
      },
      {
        h: "RunnableWithMessageHistory (legacy)",
        blocks: [
          {
            warn: "Deprecated in LangChain 1.x: `RunnableWithMessageHistory` and the in-memory chat history classes now emit deprecation warnings and point to LangGraph persistence. Learn it to read existing code; for new code pass history explicitly from your own database, or use `create_agent` with a checkpointer (see the tools lesson).",
          },
          "Older LangChain code wraps a chain to load and save history automatically by session id:",
          {
            lang: "python",
            code: `from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory

stores: dict[str, InMemoryChatMessageHistory] = {}

def get_history(session_id: str):
    return stores.setdefault(session_id, InMemoryChatMessageHistory())

chat = RunnableWithMessageHistory(
    prompt | llm, get_history,
    input_messages_key="question", history_messages_key="history",
)
chat.invoke({"question": "How many casual leaves?"}, config={"configurable": {"session_id": "u1-c9"}})`,
          },
          "In today's LangChain, conversation state is persisted with LangGraph **checkpointers** (Days 13 and 14), or you keep history in your own tables and pass it in as shown above.",
        ],
      },
      {
        h: "Trimming and summarising",
        blocks: [
          {
            lang: "python",
            code: `from langchain_core.messages import trim_messages

from langchain_core.messages.utils import count_tokens_approximately

trimmer = trim_messages(max_tokens=2000, strategy="last", token_counter=count_tokens_approximately,
                        include_system=True, start_on="human")      # or token_counter=llm for exact counts
chain = {"history": lambda x: trimmer.invoke(x["history"]), "question": lambda x: x["question"]} | prompt | llm`,
          },
          {
            tip: "Many production teams keep conversation storage in their own tables (as you did on Day 4) and only use LangChain for the LLM and retrieval parts. It's simpler to query, audit and delete for privacy requests.",
          },
        ],
      },
    ],
    revise: [
      "History is an input: `MessagesPlaceholder(\"history\")` in the prompt.",
      "`RunnableWithMessageHistory` (legacy, deprecated in 1.x) loads/saves by `session_id`; new code uses your own DB or LangGraph checkpointers with a `thread_id`.",
      "`trim_messages` keeps history within a token budget.",
      "Owning history in your DB is often simpler for audit and deletion.",
    ],
    interview: [
      {
        q: "How would you implement memory in a LangChain chatbot?",
        a: "Store messages per conversation in a persistent store, load and trim them (trim_messages or a summary of older turns) into a MessagesPlaceholder, and pass the session id through config, either explicitly from my own database or, in LangChain 1.x, with create_agent and a LangGraph checkpointer keyed by thread_id (RunnableWithMessageHistory is the older, now deprecated way). Long-term user memory (preferences, facts) would be a separate store retrieved like RAG.",
      },
    ],
    practice: [
      "Build a two-turn chat with `MessagesPlaceholder` and a follow-up question.",
    ],
  },

  llamaindex: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "LlamaIndex is the other big framework. It's focused on **data and retrieval**: ingestion, indexing and querying documents. Some teams use it for RAG and LangChain/LangGraph for agents. You should be able to build a basic index with it and explain when it fits better.",
    sections: [
      {
        h: "Five-line RAG",
        blocks: [
          {
            lang: "python",
            code: `# uv add llama-index
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(model="gpt-4o-mini")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

docs = SimpleDirectoryReader("data/").load_data()        # PDFs, DOCX, MD, ...
index = VectorStoreIndex.from_documents(docs)             # chunk + embed + store (in memory)
query_engine = index.as_query_engine(similarity_top_k=5)
resp = query_engine.query("How many casual leaves do interns get?")
print(resp)
for s in resp.source_nodes:
    print(s.score, s.node.metadata.get("file_name"), s.node.metadata.get("page_label"))`,
          },
        ],
      },
      {
        h: "Key concepts",
        blocks: [
          {
            table: {
              head: ["LlamaIndex", "Meaning", "LangChain equivalent"],
              rows: [
                ["Document", "A loaded file", "Document"],
                ["Node", "A chunk with metadata and relationships", "Document (chunk)"],
                ["Node parser", "Chunker (`SentenceSplitter`, semantic, hierarchical)", "Text splitter"],
                ["Index (`VectorStoreIndex`, …)", "Data structure over nodes", "Vector store"],
                ["Retriever", "Fetch nodes", "Retriever"],
                ["Query engine", "Retriever + response synthesis", "RAG chain"],
                ["Chat engine", "Query engine with conversation", "RAG chain + history"],
                ["IngestionPipeline", "Transformations with caching, dedupe", "Your own indexing script"],
              ],
            },
          },
          "It supports persistent vector stores (Qdrant, pgvector, Pinecone…) via `StorageContext`, and advanced retrieval like hierarchical nodes with auto-merging, sub-question query engines and routers.",
        ],
      },
      {
        h: "LangChain vs LlamaIndex",
        blocks: [
          {
            table: {
              head: ["", "LangChain (+ LangGraph)", "LlamaIndex"],
              rows: [
                ["Centre of gravity", "General LLM app composition and agents", "Data ingestion, indexing and retrieval"],
                ["RAG out of the box", "You compose it (flexible)", "Very quick, with many advanced retrieval strategies"],
                ["Agents", "LangGraph is a leading choice", "Has agents and workflows too"],
                ["Job market in India", "Mentioned more often", "Mentioned often for RAG-heavy roles"],
              ],
            },
          },
          "They're not exclusive; you can use LlamaIndex retrievers inside a LangGraph agent. In interviews, show you understand the underlying pipeline and choose based on the job.",
        ],
      },
    ],
    revise: [
      "LlamaIndex = data framework: readers → nodes → index → retriever → query/chat engine.",
      "`VectorStoreIndex.from_documents(docs).as_query_engine()` is a full RAG pipeline; `source_nodes` gives citations.",
      "`Settings.llm` / `Settings.embed_model` set defaults; `StorageContext` for persistent stores.",
      "LangChain = general composition + agents (LangGraph); LlamaIndex = retrieval depth. They can be combined.",
    ],
    interview: [
      {
        q: "LangChain vs LlamaIndex?",
        a: "LangChain is a general framework for composing LLM applications with broad integrations, and with LangGraph it's strong for agents and stateful workflows. LlamaIndex focuses on connecting LLMs to data: ingestion pipelines, node parsers, many index types and advanced retrieval strategies, so RAG is quick and deep. I'd pick LlamaIndex for retrieval-heavy products, LangGraph for complex agent orchestration, and I'm comfortable combining them or using neither when a plain SDK is simpler.",
      },
    ],
    practice: [
      "Build the five-line RAG over the same PDFs as DocChat and compare answers for 5 questions.",
    ],
  },

  "docchat-langchain": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Rebuild DocChat's pipeline with LangChain behind the same API. Your FastAPI routes and React UI stay unchanged; only `app/rag/` changes. That's also a good test of your architecture: if the swap is painful, your layers are too tangled.",
    sections: [
      {
        h: "Plan",
        blocks: [
          {
            list: [
              "Create `app/rag_lc/` next to `app/rag/`, with the same public functions: `index_document()`, `retrieve()`, `answer_stream()`.",
              "Add a setting `RAG_IMPL=plain|langchain` and choose the implementation in a dependency, so you can compare both live.",
              "Use the same embedding model, chunk size and k as the plain version, so the comparison is fair.",
            ],
            ordered: true,
          },
        ],
      },
      {
        h: "Indexing",
        blocks: [
          {
            lang: "python",
            code: `from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_postgres import PGVector         # or QdrantVectorStore

splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=500, chunk_overlap=75)
store = PGVector(embeddings=embeddings, collection_name="docchat",
                 connection=settings.database_url_psycopg, use_jsonb=True)

def index_document(path: str, owner_id: int, doc_id: int) -> int:
    pages = PyMuPDFLoader(path).load()
    chunks = splitter.split_documents(pages)
    for i, c in enumerate(chunks):
        c.metadata.update(owner_id=owner_id, doc_id=doc_id, chunk=i)
    store.add_documents(chunks, ids=[f"{doc_id}:{i}" for i in range(len(chunks))])
    return len(chunks)`,
          },
        ],
      },
      {
        h: "Streaming chain with sources",
        blocks: [
          {
            lang: "python",
            code: `async def answer_stream(question: str, owner_id: int, history):
    retriever = store.as_retriever(search_kwargs={"k": 5, "filter": {"owner_id": owner_id}})
    docs = await retriever.ainvoke(await condense(history, question))
    chain = rag_prompt | llm | StrOutputParser()
    async for token in chain.astream({"context": format_docs(docs), "question": question,
                                      "history": history[-6:]}):
        yield {"type": "token", "text": token}
    yield {"type": "sources", "sources": sources_from(docs)}`,
            caption: "Retrieving first, outside the chain, keeps the documents available for the sources event.",
          },
        ],
      },
      {
        h: "Checks",
        blocks: [
          {
            list: [
              "Same 20 eval questions: are the answers and sources similar to the plain version?",
              "The owner filter still isolates users (re-run the isolation test).",
              "Streaming still works through the UI.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Swap implementations behind the same functions; choose with a setting.",
      "Keep chunking, embedding model and k identical for a fair comparison.",
      "Retrieve before streaming so sources are available.",
    ],
    practice: [
      "Add `.with_fallbacks([other_llm])` to the chain's model.",
    ],
  },

  "compare-readme": {
    minutes: 60,
    level: "Beginner",
    intro:
      "Write up the comparison between your from-scratch pipeline and the LangChain version. A clear, honest trade-off analysis in your README answers the common interview question \"Why did or didn't you use LangChain?\" before it's asked.",
    sections: [
      {
        h: "What to measure",
        blocks: [
          {
            table: {
              head: ["Dimension", "How to assess"],
              rows: [
                ["Lines of code", "`wc -l app/rag/*.py` vs `app/rag_lc/*.py`"],
                ["Answer quality", "Your 20 eval questions: correct answers and correct citations for each"],
                ["Latency", "p50 time to first token and total time over 20 questions"],
                ["Flexibility", "How hard was it to add the owner filter, custom citations, the score threshold?"],
                ["Debuggability", "When something broke, how quickly could you find why?"],
                ["Dependencies", "Number of packages added, and version churn"],
              ],
            },
          },
        ],
      },
      {
        h: "A README section template",
        blocks: [
          {
            lang: "markdown",
            code: `## Plain Python vs LangChain

| | Plain | LangChain |
|---|---|---|
| RAG code | 310 lines | 140 lines |
| Correct answers (20 Qs) | 16 | 16 |
| p50 first token | 1.1 s | 1.2 s |

**What LangChain made easier:** loaders, splitters, swapping vector stores, streaming.
**What was harder:** custom citation validation, debugging nested runnables.
**Decision:** plain pipeline for the core RAG path (full control over prompts and citations),
LangChain loaders for new file types, LangGraph for the agent in Project 2.`,
            caption: "Replace these example numbers with your own measurements.",
          },
          "Interviewers don't want \"frameworks are bad\" or \"LangChain for everything\". They want evidence and a reasoned choice.",
        ],
      },
    ],
    revise: [
      "Compare with numbers: lines, quality on the eval set, latency, flexibility, debuggability, dependencies.",
      "End with a decision and the reason for it.",
    ],
    practice: [
      "Prepare a 60-second spoken version of your comparison for interviews.",
    ],
  },
};

// Append deeper sections (d07-deep.js) to the original lessons.
function deepen(lesson, extra) {
  return {
    ...lesson,
    minutes: lesson.minutes + extra.minutes,
    sections: [...lesson.sections, ...extra.sections],
    revise: [...lesson.revise, ...extra.revise],
    interview: [...(lesson.interview ?? []), ...(extra.interview ?? [])],
  };
}

export default {
  "lc-overview": lcOverview,
  lcel: deepen(base.lcel, deepLcel),
  retrievers: deepen(base.retrievers, deepRetrievers),
  "lc-tools": lcTools,
  memory: deepen(base.memory, deepMemory),
  "lc-observability": lcObservability,
  llamaindex: deepen(base.llamaindex, deepLlamaindex),
  "frameworks-compare": frameworksCompare,
  "lc-offline-lab": lcOfflineLab,
  "docchat-langchain": base["docchat-langchain"],
  "compare-readme": base["compare-readme"],
};
