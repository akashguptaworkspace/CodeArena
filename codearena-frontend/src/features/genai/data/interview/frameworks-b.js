// Day 7 interview bank, part 2: LlamaIndex, choosing frameworks, scenarios, live coding. Assembled in d07.js.

export const llamaQs = {
  title: "LlamaIndex",
  questions: [
    {
      id: "what-llamaindex",
      q: "What is LlamaIndex?",
      level: "Basic",
      common: true,
      answer:
        "A data framework for LLM applications, started in late 2022 as GPT Index. It focuses on connecting LLMs to your data: readers for many sources, node parsers (chunking), ingestion pipelines, many index types, retrievers, query and chat engines with response synthesis, advanced retrieval strategies, agents and event-driven workflows, plus the hosted LlamaParse/LlamaCloud services.",
    },
    {
      id: "li-concepts",
      q: "Explain Documents, Nodes, Indexes, Retrievers and Query Engines in LlamaIndex.",
      level: "Intermediate",
      common: true,
      answer:
        "Documents are loaded source files; node parsers split them into Nodes (chunks with metadata and relationships to neighbours and parents); an Index (e.g. VectorStoreIndex) organises nodes for retrieval; a Retriever fetches relevant nodes for a query; and a Query Engine combines a retriever with response synthesis to produce an answer with source nodes. A Chat Engine adds conversation state.",
    },
    {
      id: "query-vs-chat",
      q: "Query engine vs chat engine?",
      level: "Basic",
      answer:
        "A query engine answers one standalone question with retrieval and synthesis. A chat engine keeps conversation history; modes like condense_plus_context rewrite follow-ups into standalone queries, retrieve for them, and answer with both history and retrieved context.",
    },
    {
      id: "response-modes",
      q: "What are LlamaIndex response synthesis modes?",
      level: "Advanced",
      answer:
        "Strategies for turning retrieved nodes into an answer: `compact` (stuff as many chunks as fit per call, the default), `refine` (answer with the first chunk, then refine with each next one), `tree_summarize` (summarise chunks hierarchically, good for summaries), `simple_summarize` (truncate to one call), and `accumulate` (answer per chunk and concatenate). They trade cost, latency and completeness.",
    },
    {
      id: "ingestion-pipeline",
      q: "What is an IngestionPipeline in LlamaIndex?",
      level: "Intermediate",
      answer:
        "A sequence of transformations (node parser, metadata extractors, embedding model) applied to documents to produce nodes, with optional caching of each step and document-level deduplication via a docstore, and the ability to write directly into a vector store. It's the production-friendly way to index and re-index incrementally.",
    },
    {
      id: "li-advanced",
      q: "Name some advanced retrieval features in LlamaIndex.",
      level: "Advanced",
      answer:
        "Hierarchical node parsing with auto-merging retrieval (retrieve small chunks, merge into their parents), sentence-window retrieval, sub-question query engines that decompose complex questions across data sources, router query engines that pick the right index or tool, recursive retrieval over summaries, metadata filters and rerankers as node postprocessors.",
    },
    {
      id: "li-storage",
      q: "How do you persist a LlamaIndex index?",
      level: "Basic",
      answer:
        "For local development, `index.storage_context.persist(persist_dir=...)` and `load_index_from_storage(StorageContext.from_defaults(persist_dir=...))`. In production, build the StorageContext with a vector store integration (Qdrant, pgvector, Pinecone, ...) so embeddings live in a real database.",
    },
    {
      id: "llamaparse",
      q: "What is LlamaParse?",
      level: "Intermediate",
      answer:
        "LlamaIndex's hosted document parsing service, designed for complex PDFs and office files with tables, charts and layouts, returning clean Markdown or structured output for RAG. It's an alternative to self-hosted parsers like Docling or Unstructured and cloud document AI services; evaluate it on your own documents and data-privacy requirements.",
    },
  ],
};

export const frameworkChoiceQs = {
  title: "Choosing frameworks",
  questions: [
    {
      id: "lc-vs-li",
      q: "LangChain vs LlamaIndex?",
      level: "Intermediate",
      common: true,
      answer:
        "LangChain is a general framework for composing LLM apps with broad integrations, and with LangGraph it's strong for agents and stateful workflows. LlamaIndex focuses on data: ingestion, node parsing, many index types and advanced retrieval, so RAG is quick and deep. I'd pick LlamaIndex for retrieval-heavy products, LangGraph for complex agent orchestration, and I'm comfortable combining them or using neither when a plain SDK is simpler.",
    },
    {
      id: "avoid-framework",
      q: "When would you avoid a framework?",
      level: "Intermediate",
      common: true,
      answer:
        "When the flow is simple enough that a few SDK calls are clearer; when I need full control over prompts, citations and error handling; when dependency weight and fast-changing APIs are a risk; or when the team doesn't know the framework. Frameworks pay off with many integrations, agents and standard tooling.",
    },
    {
      id: "framework-landscape",
      q: "What other LLM frameworks do you know?",
      level: "Intermediate",
      answer:
        "Haystack (deepset) for production search and RAG pipelines; DSPy (Stanford) for declaring modules and optimising prompts against metrics; Semantic Kernel (Microsoft) for .NET and Azure ecosystems; PydanticAI for type-safe agents; provider SDKs like the OpenAI Agents SDK, Claude Agent SDK and Google ADK; and CrewAI and AutoGen for multi-agent patterns.",
    },
    {
      id: "dspy",
      q: "What is DSPy's idea?",
      level: "Advanced",
      answer:
        "\"Programming, not prompting\": you declare the steps of your pipeline as modules with input/output signatures, provide examples and a metric, and DSPy's optimisers search for better prompts and few-shot examples automatically. It suits teams with many prompts and good evaluation data.",
    },
    {
      id: "lock-in",
      q: "How do you avoid framework lock-in?",
      level: "Intermediate",
      answer:
        "Keep domain logic (permissions, citations, business rules) in your own code; wrap framework calls behind thin interfaces like retrieve() and answer_stream(); keep evaluation datasets and scripts framework-independent; pin versions and upgrade deliberately; and use frameworks mainly for integrations and runtimes.",
    },
    {
      id: "justify-choice",
      q: "\"Why did you (or didn't you) use LangChain in your project?\"",
      level: "Basic",
      common: true,
      answer:
        "A strong answer cites evidence: \"I built RAG from scratch first, then rebuilt it with LangChain. LangChain cut the code roughly in half and made loaders, splitters and store swaps easy; answers on my 20-question eval set were the same. I kept my own citation validation and permission filtering, and use LangGraph for the agent project.\" Use your own numbers.",
    },
  ],
};

export const lcScenarioQs = {
  title: "Scenario questions",
  questions: [
    {
      id: "scenario-import-error",
      q: "After upgrading, `from langchain.retrievers import EnsembleRetriever` fails. What do you do?",
      level: "Basic",
      answer:
        "Check the migration guide: in LangChain 1.x, legacy retrievers moved to the `langchain-classic` package, so install it and import from `langchain_classic.retrievers`, or replace it with a modern alternative (native hybrid search in the vector store). Pin versions and add a test that imports and runs the retriever.",
    },
    {
      id: "scenario-slow-chain",
      q: "Your LangChain RAG chain is slow. How do you find out why?",
      level: "Intermediate",
      answer:
        "Trace it (LangSmith, Langfuse or callbacks) to see time per step: retrieval, reranking, each model call. Common culprits are sequential steps that could run in parallel (use RunnableParallel), unnecessary extra model calls (condensation on standalone questions), large contexts, synchronous calls inside async code, and missing caching.",
    },
    {
      id: "scenario-migrate",
      q: "You inherit a 2023 LangChain codebase using ConversationalRetrievalChain. How do you modernise it?",
      level: "Advanced",
      answer:
        "First add tests and an eval set that capture current behaviour. Then replace the legacy chain with an explicit LCEL pipeline (condense question → retriever → prompt → model, returning sources), move memory to your own database or a LangGraph checkpointer, update imports to 1.x packages (classic only where needed), and compare eval results before switching traffic.",
    },
    {
      id: "scenario-agent-wrong-tool",
      q: "Your create_agent keeps calling the wrong tool. What do you check?",
      level: "Intermediate",
      answer:
        "Tool names and docstrings (clear, distinct, saying when to use each), argument descriptions, overlapping tools that should be merged, the system prompt's tool guidance, the model's tool-calling ability (small local models struggle), and traces of the exact tool schemas sent. Add test cases for tool selection.",
    },
  ],
};

export const lcCodingQs = {
  title: "Live coding questions",
  questions: [
    {
      id: "lc-rag-sources",
      q: "Write an LCEL RAG chain that returns the answer and the source documents.",
      level: "Intermediate",
      common: true,
      answer: "Run the retriever and pass through the question in parallel, then assign an answer sub-chain that formats documents into the prompt and calls the model.",
      detail: [
        {
          lang: "python",
          code: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer only from the documents; cite like [1].\\n\\n{context}"),
    ("human", "{question}"),
])

def format_docs(docs):
    return "\\n\\n".join(f"[{i}] {d.page_content}" for i, d in enumerate(docs, 1))

chain = RunnableParallel(docs=retriever, question=RunnablePassthrough()).assign(
    answer=RunnableLambda(lambda x: {"context": format_docs(x["docs"]), "question": x["question"]})
           | prompt | llm | StrOutputParser())
result = chain.invoke("How many casual leaves do interns get?")   # {"docs": [...], "question": ..., "answer": ...}`,
        },
      ],
    },
    {
      id: "lc-agent",
      q: "Write a LangChain tool and a create_agent that uses it.",
      level: "Intermediate",
      common: true,
      answer: "Decorate a typed function with @tool (docstring as description), then create_agent with the model, the tool and a system prompt, and invoke it with a messages list.",
      detail: [
        {
          lang: "python",
          code: `from langchain.agents import create_agent
from langchain_core.tools import tool

@tool
def get_order_status(order_id: str) -> str:
    """Get the delivery status of an order by its id."""
    return orders_api.status(order_id)

agent = create_agent(model="openai:gpt-4o-mini", tools=[get_order_status],
                     system_prompt="You are a support agent. Use tools; never guess.")
out = agent.invoke({"messages": [{"role": "user", "content": "Where is order 4521?"}]})
print(out["messages"][-1].content)`,
        },
      ],
    },
    {
      id: "lc-router",
      q: "Write a routing chain that sends billing questions to one chain and everything else to another.",
      level: "Intermediate",
      answer: "Classify with a small chain, add the label with RunnablePassthrough.assign, and use a RunnableLambda that returns the chosen chain.",
      detail: [
        {
          lang: "python",
          code: `from langchain_core.runnables import RunnableLambda, RunnablePassthrough

router = (RunnablePassthrough.assign(label=classifier)            # classifier: prompt | llm | StrOutputParser()
          | RunnableLambda(lambda x: billing_chain if "billing" in x["label"].lower() else general_chain))
router.invoke({"q": "I was charged twice"})`,
        },
      ],
    },
    {
      id: "lc-fake-test",
      q: "Write a unit test for a LangChain chain without calling a real model.",
      level: "Intermediate",
      common: true,
      answer: "Build the chain with FakeListChatModel (or a spy subclass that records messages), then assert on the output and on the prompt the model received.",
      detail: [
        {
          lang: "python",
          code: `from langchain_core.language_models.fake_chat_models import FakeListChatModel

class Spy(FakeListChatModel):
    seen: list = []
    def invoke(self, input, config=None, **kw):
        self.seen.append(input.to_messages())
        return super().invoke(input, config, **kw)

def test_chain_prompt_and_output():
    spy = Spy(responses=["RAG = retrieve then generate."])
    out = (prompt | spy | StrOutputParser()).invoke({"words": 20, "question": "What is RAG?"})
    system, human = spy.seen[-1]
    assert "20 words" in system.content and human.content == "What is RAG?"
    assert out.startswith("RAG")`,
        },
      ],
    },
    {
      id: "lc-llamaindex",
      q: "Build a LlamaIndex query engine over a folder and print answer sources.",
      level: "Basic",
      answer: "Load with SimpleDirectoryReader, build a VectorStoreIndex, create a query engine with similarity_top_k, and read source_nodes from the response.",
      detail: [
        {
          lang: "python",
          code: `from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

docs = SimpleDirectoryReader("docs").load_data()
engine = VectorStoreIndex.from_documents(docs).as_query_engine(similarity_top_k=3)
resp = engine.query("How many casual leaves do interns get?")
print(resp)
for n in resp.source_nodes:
    print(round(n.score or 0, 3), n.node.metadata.get("file_name"))`,
        },
      ],
    },
  ],
};
