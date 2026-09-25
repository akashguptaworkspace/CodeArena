// Day 7: extra depth appended to the original lessons in d07.js (lcel, retrievers, memory, llamaindex).
// Code checked against langchain-core 1.6, langchain-classic 1.0, langchain-chroma 1.1, llama-index-core 0.14.

export const deepLcel = {
  minutes: 30,
  sections: [
    {
      h: "Routing, parallel steps and adding keys",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough

classify = ChatPromptTemplate.from_template("Label as billing or tech. Reply with one word: {q}") | llm | StrOutputParser()
billing_chain = RunnableLambda(lambda x: f"[billing team] {x['q']}")     # real chains in practice
tech_chain = RunnableLambda(lambda x: f"[tech team] {x['q']}")

def route(x: dict):
    return billing_chain if "billing" in x["label"].lower() else tech_chain   # return a Runnable

router = RunnablePassthrough.assign(label=classify) | RunnableLambda(route)
router.invoke({"q": "I was charged twice"})          # '[billing team] I was charged twice'

stats = RunnableParallel(words=lambda t: len(t.split()), chars=len, upper=str.upper)
stats.invoke("hello from pune")                      # {'words': 3, 'chars': 15, 'upper': 'HELLO FROM PUNE'}`,
          caption: "A function that returns a Runnable acts as a router: classify first, then send the input to the right chain.",
        },
      ],
    },
    {
      h: "Models: init_chat_model, content blocks and async",
      blocks: [
        {
          lang: "python",
          code: `from langchain.chat_models import init_chat_model

llm = init_chat_model("openai:gpt-4o-mini", temperature=0)        # provider chosen by a string
# llm = init_chat_model("anthropic:claude-opus-5")               # swap with config, not code
# llm = init_chat_model("ollama:llama3.2")                       # local model

msg = llm.invoke("Explain LCEL in one line.")
print(msg.content_blocks)       # provider-independent blocks: [{"type": "text", "text": ...}, ...]
print(msg.usage_metadata)       # {'input_tokens': ..., 'output_tokens': ..., 'total_tokens': ...}

async def main():
    answer = await chain.ainvoke({"words": 30, "question": "What is RAG?"})
    async for token in chain.astream({"words": 30, "question": "What is HNSW?"}):
        print(token, end="")`,
        },
        "Use the async methods (`ainvoke`, `astream`, `abatch`) inside FastAPI, exactly as you used `AsyncOpenAI` on Day 4.",
      ],
    },
  ],
  revise: [
    "Routing: `RunnablePassthrough.assign(label=classifier) | RunnableLambda(route)` where `route` returns a Runnable.",
    "`RunnableParallel` (or a dict) runs branches on the same input and returns a dict.",
    "`init_chat_model(\"provider:model\")`; `msg.content_blocks` and `msg.usage_metadata`; async `ainvoke`/`astream` in FastAPI.",
  ],
  interview: [
    {
      q: "How would you route questions to different chains in LangChain?",
      a: "Classify the input with a small, cheap chain (or structured output), add the label to the input with RunnablePassthrough.assign, then use a RunnableLambda that returns the appropriate chain for that label. For more complex, stateful routing across multiple steps, a LangGraph graph with conditional edges is clearer.",
    },
  ],
};

export const deepRetrievers = {
  minutes: 30,
  sections: [
    {
      h: "Vector stores you can run anywhere",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.vectorstores import InMemoryVectorStore      # no server; tests and demos
from langchain_chroma import Chroma                                  # uv add langchain-chroma

mem = InMemoryVectorStore.from_documents(chunks, embeddings)

store = Chroma.from_documents(chunks, embeddings, collection_name="hr_docs",
                              persist_directory="./chroma_db")
flt = {"$and": [{"owner_id": 1}, {"year": {"$gte": 2025}}]}          # Chroma filter syntax
docs = store.as_retriever(search_kwargs={"k": 4, "filter": flt}).invoke("intern leave")`,
          caption: "Filter syntax differs per store (Chroma, Qdrant, PGVector, Pinecone): check each integration's docs.",
        },
      ],
    },
    {
      h: "Hybrid retrieval in LangChain 1.x",
      blocks: [
        {
          lang: "python",
          code: `# uv add langchain-community langchain-classic rank_bm25
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever        # moved out of \`langchain\` in 1.x

bm25 = BM25Retriever.from_documents(chunks, k=5)                   # keyword
dense = store.as_retriever(search_kwargs={"k": 5})                 # vectors
hybrid = EnsembleRetriever(retrievers=[bm25, dense], weights=[0.4, 0.6])   # fused with Reciprocal Rank Fusion
hybrid.invoke("Error E-4012")`,
        },
        "You'll build hybrid search and reranking properly on Day 8; this is the LangChain wiring.",
      ],
    },
    {
      h: "Writing your own retriever",
      blocks: [
        "When the built-in retrievers don't fit (custom permissions, your own search API, a SQL query), subclass `BaseRetriever`. It then works anywhere a retriever does, including LCEL chains and tracing.",
        {
          lang: "python",
          code: `from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

class OwnerFilteredRetriever(BaseRetriever):
    """Wraps any search function and always enforces the owner filter."""
    search_fn: object
    owner_id: int
    k: int = 4

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]:
        return [d for d in self.search_fn(query, 50) if d.metadata.get("owner_id") == self.owner_id][: self.k]

retriever = OwnerFilteredRetriever(search_fn=my_search, owner_id=user.id, k=5)
retriever.invoke("maternity leave")`,
          caption: "Filtering after a 50-result search is shown for clarity; in production push the filter into the vector store query.",
        },
      ],
    },
  ],
  revise: [
    "InMemoryVectorStore for tests; Chroma/Qdrant/PGVector integrations for persistence; filter syntax is store-specific.",
    "Hybrid: `BM25Retriever` (langchain_community) + `EnsembleRetriever` (langchain_classic in 1.x).",
    "Custom retriever: subclass `BaseRetriever` and implement `_get_relevant_documents`.",
  ],
  interview: [],
};

export const deepMemory = {
  minutes: 15,
  sections: [
    {
      h: "History from your own database (framework-agnostic)",
      blocks: [
        {
          lang: "python",
          code: `from langchain_core.messages import AIMessage, HumanMessage, trim_messages
from langchain_core.messages.utils import count_tokens_approximately

def load_history(conversation_id: int, user_id: int) -> list:
    rows = repo.recent_messages(conversation_id, owner_id=user_id, limit=30)      # your SQL, scoped by owner
    msgs = [HumanMessage(r.content) if r.role == "user" else AIMessage(r.content) for r in rows]
    return trim_messages(msgs, max_tokens=2000, strategy="last",
                         token_counter=count_tokens_approximately, start_on="human")

answer = chain.invoke({"history": load_history(conv_id, user.id), "question": question})
repo.add_message(conv_id, "user", question)
repo.add_message(conv_id, "assistant", answer)`,
        },
        "This works with any LangChain version, keeps data where you can query, audit and delete it, and is what many production teams do.",
      ],
    },
  ],
  revise: [
    "Load history from your DB (scoped by owner), convert to messages, trim with `count_tokens_approximately`, pass into `MessagesPlaceholder`, save the new turn.",
  ],
  interview: [],
};

export const deepLlamaindex = {
  minutes: 30,
  sections: [
    {
      h: "Ingestion pipelines and persistence",
      blocks: [
        {
          lang: "python",
          code: `from llama_index.core import Document, Settings, StorageContext, VectorStoreIndex, load_index_from_storage
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter

pipeline = IngestionPipeline(transformations=[
    SentenceSplitter(chunk_size=512, chunk_overlap=64),    # chunking (a "node parser")
    Settings.embed_model,                                  # embedding as a transformation
])
nodes = pipeline.run(documents=docs)                       # metadata is carried onto every node

index = VectorStoreIndex(nodes)
index.storage_context.persist(persist_dir="./li_storage")  # save to disk

index = load_index_from_storage(StorageContext.from_defaults(persist_dir="./li_storage"))`,
          caption: "For production, point the StorageContext at a real vector store (Qdrant, pgvector, Pinecone integrations).",
        },
      ],
    },
    {
      h: "Filters, chat engines and testing",
      blocks: [
        {
          lang: "python",
          code: `from llama_index.core.vector_stores import ExactMatchFilter, MetadataFilters

filters = MetadataFilters(filters=[ExactMatchFilter(key="owner_id", value=user.id)])
retriever = index.as_retriever(similarity_top_k=5, filters=filters)
nodes = retriever.retrieve("maternity leave")

chat = index.as_chat_engine(chat_mode="condense_plus_context")    # condenses follow-ups, then retrieves
print(chat.chat("How many casual leaves do interns get?"))
print(chat.chat("And sick leave?"))`,
        },
        {
          lang: "python",
          code: `# Offline tests: mock LLM and embeddings, no API key
from llama_index.core.embeddings import MockEmbedding
from llama_index.core.llms import MockLLM

Settings.llm = MockLLM(max_tokens=30)
Settings.embed_model = MockEmbedding(embed_dim=32)`,
        },
        "`condense_plus_context` is the same query-condensation idea you built by hand on Day 6, packaged.",
      ],
    },
  ],
  revise: [
    "IngestionPipeline: node parser + embedding transformations; `persist` and `load_index_from_storage`.",
    "MetadataFilters with ExactMatchFilter for owner/tenant filtering; `as_chat_engine(chat_mode=\"condense_plus_context\")`.",
    "MockLLM and MockEmbedding for offline tests.",
  ],
  interview: [
    {
      q: "What is a LlamaIndex query engine vs a chat engine?",
      a: "A query engine answers a single question: it retrieves nodes and synthesises a response with sources. A chat engine adds conversation state; for example condense_plus_context condenses a follow-up with the chat history into a standalone query, retrieves context for it, and answers with both history and context.",
    },
  ],
};
