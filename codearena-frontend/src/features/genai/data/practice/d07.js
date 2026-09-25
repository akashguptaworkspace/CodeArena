// Day 7 practice: LangChain & LlamaIndex. Shape: see ./index.js
import { agentGroup, essentialsGroup, liGroup2, retrievalExtraGroup, testObsGroup } from "./d07-more.js";

export default {
  intro:
    "Twenty exercises that rebuild what you wrote by hand, now with LangChain 1.x and LlamaIndex: translate old imports, LCEL chains, routing, structured output, parallel steps, streaming intermediate events, loaders and splitters, retrievers (custom and hybrid), a RAG chain with sources, chat history, tools, create_agent with memory and middleware, callback logging, offline tests with fake models, and a LlamaIndex ingestion pipeline. Spread them over several days if you need to.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day07 && cd ~/genai-practice/day07
uv init --no-readme .
uv add langchain langchain-core langchain-openai langchain-text-splitters langchain-community langchain-classic langgraph rank_bm25 llama-index-core python-dotenv
cp ../day03/.env . && cp -r ../day06/docs .`,
    },
    "Create `lc.py` so every exercise gets the same model and embeddings, whichever provider your `.env` points at:",
    {
      lang: "python",
      code: `# lc.py
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

load_dotenv()
BASE = os.getenv("LLM_BASE_URL") or None
KEY = os.getenv("LLM_API_KEY", "missing")

llm = ChatOpenAI(model=os.getenv("LLM_MODEL", "gpt-4o-mini"), base_url=BASE, api_key=KEY, temperature=0)
embeddings = OpenAIEmbeddings(
    model=os.getenv("EMBED_MODEL", "text-embedding-3-small"), base_url=BASE, api_key=KEY,
    check_embedding_ctx_length=False,     # needed for non-OpenAI providers such as Ollama
)`,
    },
    { note: "LangChain changes quickly. If an import fails, check the current docs for that class; the ideas stay the same." },
  ],
  groups: [
    essentialsGroup,
    {
      title: "LCEL basics",
      exercises: [
        {
          id: "first-chain",
          title: "prompt | llm | parser with invoke, batch and stream",
          level: "Easy",
          task: [
            "Build a chain that explains a Python concept to a beginner in under `{words}` words. Call it once with `invoke`, for 3 concepts with `batch`, and once with `stream`.",
          ],
          solution: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from lc import llm

prompt = ChatPromptTemplate.from_messages([
    ("system", "You teach Python to beginners. Answer in under {words} words."),
    ("human", "Explain {concept}."),
])
chain = prompt | llm | StrOutputParser()

print(chain.invoke({"words": 40, "concept": "list comprehensions"}))

for answer in chain.batch([{"words": 25, "concept": c} for c in ["tuples", "sets", "f-strings"]]):
    print("-", answer)

for token in chain.stream({"words": 40, "concept": "decorators"}):
    print(token, end="", flush=True)
print()`,
          explanation: [
            "`|` pipes the output of one step into the next: the prompt template fills in variables → the model generates a message → the parser extracts the text.",
            "Every chain automatically supports `invoke` (one call), `batch` (several in parallel) and `stream` (tokens as they arrive), with no extra code.",
            "`{words}` and `{concept}` are template variables you pass in a dict.",
          ],
          concepts: [
            ["LCEL", "LangChain Expression Language: composing steps with `|`."],
            ["Runnable", "Any LangChain component with `invoke`, `batch`, `stream` (and async versions)."],
            ["`ChatPromptTemplate`", "A reusable chat prompt with `{variables}`."],
            ["`StrOutputParser`", "Turns the model's message into a plain string."],
          ],
        },
        {
          id: "lc-structured",
          title: "Structured output with with_structured_output",
          level: "Easy",
          task: [
            "Use `llm.with_structured_output(Model)` to turn a job posting into `{title, company, city, min_years, skills}`. Print the Pydantic object.",
            {
              lang: "python",
              code: `POST = """Hiring: GenAI Engineer at Zeta Fintech, Bengaluru (hybrid). 2+ years with Python,
FastAPI, LangChain, vector databases and AWS. Experience with RAG is a must."""`,
            },
          ],
          solution: `from pydantic import BaseModel, Field
from lc import llm

class Job(BaseModel):
    title: str
    company: str
    city: str
    min_years: int = Field(description="Minimum years of experience; 0 if not stated")
    skills: list[str] = Field(description="Technical skills, lowercase")

POST = """Hiring: GenAI Engineer at Zeta Fintech, Bengaluru (hybrid). 2+ years with Python,
FastAPI, LangChain, vector databases and AWS. Experience with RAG is a must."""

extractor = llm.with_structured_output(Job)
job = extractor.invoke(POST)
print(job)`,
          explanation: [
            "`with_structured_output` sends your model's JSON Schema to the provider (via tool calling or structured output underneath) and parses the reply into a `Job` instance.",
            "Field descriptions guide the model, for example what to do when experience isn't stated.",
            "If your provider doesn't support it, try `llm.with_structured_output(Job, method=\"json_mode\")`.",
          ],
          concepts: [
            ["`with_structured_output()`", "Wraps a chat model so it returns validated Pydantic objects."],
          ],
        },
        {
          id: "parallel",
          title: "Run two chains in parallel",
          level: "Medium",
          task: [
            "Given a paragraph, produce a one-sentence summary **and** a list of 5 keywords at the same time with `RunnableParallel`. Then use `.assign` to add a word count of the summary.",
          ],
          solution: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel
from lc import llm

summary = ChatPromptTemplate.from_template("Summarise in one sentence:\\n{text}") | llm | StrOutputParser()
keywords = (ChatPromptTemplate.from_template("Give 5 comma-separated keywords for:\\n{text}")
            | llm | StrOutputParser() | (lambda s: [k.strip() for k in s.split(",")]))

chain = RunnableParallel(summary=summary, keywords=keywords).assign(
    summary_words=lambda x: len(x["summary"].split())
)

text = ("Retrieval-augmented generation combines a search step with a language model so answers are "
        "grounded in company documents, reducing hallucinations and allowing citations.")
print(chain.invoke({"text": text}))`,
          explanation: [
            "`RunnableParallel(summary=..., keywords=...)` runs both chains at the same time on the same input and returns a dict with both results.",
            "A plain Python function (or lambda) in a chain is wrapped automatically, like the keyword splitter.",
            "`.assign(key=fn)` adds a new key computed from the existing output, keeping the rest.",
          ],
          concepts: [
            ["`RunnableParallel`", "Runs several runnables concurrently and collects results into a dict."],
            ["`.assign()`", "Adds computed keys to a chain's dict output."],
          ],
        },
      ],
    },
    {
      title: "Loaders, splitters and retrievers",
      exercises: [
        {
          id: "load-split",
          title: "Load a folder and split it",
          level: "Easy",
          task: [
            "Load every `.md` file in `docs/` with `DirectoryLoader`, split with `RecursiveCharacterTextSplitter` (chunk size 300 characters, overlap 50), and print the number of documents, chunks, and the metadata of the first chunk.",
          ],
          solution: `from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

docs = DirectoryLoader("docs", glob="*.md", loader_cls=TextLoader,
                       loader_kwargs={"encoding": "utf-8"}).load()
splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
chunks = splitter.split_documents(docs)

print(len(docs), "documents →", len(chunks), "chunks")
print(chunks[0].metadata)
print(chunks[0].page_content)`,
          explanation: [
            "Loaders produce `Document` objects: `page_content` (text) plus `metadata` (here the `source` path).",
            "The recursive splitter tries paragraph breaks first, then lines, then spaces, so chunks end at natural boundaries where possible. Metadata is copied to every chunk.",
            "Sizes here are in characters. Use `RecursiveCharacterTextSplitter.from_tiktoken_encoder(...)` to size by tokens.",
          ],
          concepts: [
            ["`Document`", "LangChain's text + metadata object."],
            ["`DirectoryLoader`", "Loads every matching file in a folder using a loader class."],
            ["Chunk overlap", "Characters repeated between neighbouring chunks so sentences at edges aren't lost."],
          ],
        },
        {
          id: "retriever",
          title: "Vector store and retriever, similarity vs MMR",
          level: "Medium",
          task: [
            "Put the chunks into an `InMemoryVectorStore`, then compare `similarity_search_with_score` for \"leave for interns\" with an MMR retriever (`search_type=\"mmr\"`). Print sources and first 60 characters of each result.",
          ],
          solution: `from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from lc import embeddings

docs = DirectoryLoader("docs", glob="*.md", loader_cls=TextLoader, loader_kwargs={"encoding": "utf-8"}).load()
chunks = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50).split_documents(docs)
store = InMemoryVectorStore.from_documents(chunks, embeddings)

query = "leave for interns"
print("similarity:")
for doc, score in store.similarity_search_with_score(query, k=3):
    print(f"  {score:.2f} {doc.metadata['source']}: {doc.page_content[:60]!r}")

mmr = store.as_retriever(search_type="mmr", search_kwargs={"k": 3, "fetch_k": 10})
print("mmr:")
for doc in mmr.invoke(query):
    print(f"  {doc.metadata['source']}: {doc.page_content[:60]!r}")`,
          explanation: [
            "`from_documents` embeds every chunk and stores it. `InMemoryVectorStore` is perfect for practice; swap in Chroma, Qdrant or pgvector with the same interface later.",
            "`as_retriever()` turns the store into a Runnable that takes a question and returns documents, so it can be piped into chains.",
            "MMR (Maximal Marginal Relevance) picks results that are relevant **and** different from each other, avoiding near-duplicate chunks.",
          ],
          concepts: [
            ["Vector store", "LangChain's interface over vector databases."],
            ["Retriever", "A Runnable: question in, list of Documents out."],
            ["MMR", "Maximal Marginal Relevance: balances relevance and diversity."],
          ],
        },
      ],
    },
    retrievalExtraGroup,
    {
      title: "RAG chains and memory",
      exercises: [
        {
          id: "rag-chain",
          title: "A RAG chain that returns sources",
          level: "Medium",
          task: [
            "Build an LCEL RAG chain whose output is a dict with the `answer` and the retrieved `docs`, so you can show citations. Ask 2 questions and print the answer plus the source files.",
          ],
          solution: `from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from lc import llm
from retriever_setup import store        # save the store creation from the previous exercise as retriever_setup.py

retriever = store.as_retriever(search_kwargs={"k": 3})
prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer only from the documents. Cite like [1]. If not found, say you couldn't find it.\\n\\n"
               "<documents>\\n{context}\\n</documents>"),
    ("human", "{question}"),
])

def format_docs(docs) -> str:
    return "\\n\\n".join(f'<document index="{i}">\\n{d.page_content}\\n</document>' for i, d in enumerate(docs, 1))

answer_chain = (
    (lambda x: {"context": format_docs(x["docs"]), "question": x["question"]})
    | prompt | llm | StrOutputParser()
)
rag = RunnableParallel(docs=retriever, question=RunnablePassthrough()).assign(answer=answer_chain)

for q in ["How many casual leaves do interns get?", "How long must passwords be?"]:
    out = rag.invoke(q)
    print(q, "\\n ", out["answer"])
    print("  sources:", [d.metadata["source"] for d in out["docs"]])`,
          explanation: [
            "`RunnableParallel(docs=retriever, question=RunnablePassthrough())` runs retrieval and passes the question through, producing `{\"docs\": [...], \"question\": \"...\"}`.",
            "`.assign(answer=answer_chain)` adds the answer while **keeping the docs** in the output. Chains that drop the docs make citations impossible.",
            "Compare with your Day 6 version: same steps, less plumbing.",
          ],
          concepts: [
            ["`RunnablePassthrough()`", "Passes its input through unchanged."],
            ["RAG chain", "retrieve → format context → prompt → model → parse."],
          ],
        },
        {
          id: "history",
          title: "A chain with chat history",
          level: "Medium",
          task: [
            "Use `MessagesPlaceholder(\"history\")` in a prompt. Keep a Python list of messages, ask \"My name is Asha and I'm learning RAG\", then \"What am I learning, and what's my name?\" and check the second answer uses the history.",
          ],
          solution: `from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from lc import llm

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a friendly tutor. Keep answers under 40 words."),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])
chain = prompt | llm
history: list = []

for question in ["My name is Asha and I'm learning RAG.", "What am I learning, and what's my name?"]:
    reply = chain.invoke({"history": history, "question": question})
    history += [HumanMessage(question), AIMessage(reply.content)]
    print("You:", question, "\\nBot:", reply.content)`,
          explanation: [
            "`MessagesPlaceholder(\"history\")` is where your list of previous messages is inserted into the prompt.",
            "Memory is still just \"send the history again\". LangChain gives you message classes and placeholders; you decide where history is stored and how it's trimmed.",
            "`history += [...]` appends two items to the list.",
          ],
          concepts: [
            ["`MessagesPlaceholder`", "A slot in a prompt template for a list of messages."],
            ["`HumanMessage` / `AIMessage`", "LangChain's user and assistant message objects."],
          ],
        },
      ],
    },
    agentGroup,
    testObsGroup,
    {
      title: "LlamaIndex",
      exercises: [
        {
          id: "llamaindex",
          title: "RAG in a few lines with LlamaIndex",
          level: "Easy",
          task: [
            "Build a query engine over `docs/` with LlamaIndex and ask the same 2 questions. Print the answer and each source node's file name and score. Compare the answers with your LangChain chain.",
            {
              lang: "bash",
              code: `uv add llama-index
# for Ollama instead of OpenAI:
uv add llama-index-llms-ollama llama-index-embeddings-ollama`,
            },
          ],
          solution: `from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex

# OpenAI (reads OPENAI_API_KEY from the environment):
# from llama_index.llms.openai import OpenAI
# from llama_index.embeddings.openai import OpenAIEmbedding
# Settings.llm = OpenAI(model="gpt-4o-mini"); Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Ollama (local, free):
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
Settings.llm = Ollama(model="llama3.2", request_timeout=120)
Settings.embed_model = OllamaEmbedding(model_name="nomic-embed-text")

docs = SimpleDirectoryReader("docs").load_data()
index = VectorStoreIndex.from_documents(docs)
engine = index.as_query_engine(similarity_top_k=3)

for q in ["How many casual leaves do interns get?", "How long must passwords be?"]:
    resp = engine.query(q)
    print(q, "\\n ", resp)
    for node in resp.source_nodes:
        print(f"   {node.score:.2f} {node.node.metadata.get('file_name')}")`,
          explanation: [
            "LlamaIndex packs load → chunk → embed → index → retrieve → answer into a few calls. `Settings` sets the default model and embeddings.",
            "`source_nodes` are the retrieved chunks with scores: your citations.",
            "LlamaIndex focuses on data and retrieval; LangChain/LangGraph on composition and agents. You'll meet both in job descriptions.",
          ],
          concepts: [
            ["Node", "LlamaIndex's name for a chunk with metadata."],
            ["Query engine", "Retriever + answer generation in one object."],
            ["`Settings`", "Global defaults for LlamaIndex (LLM, embedding model, chunk size)."],
          ],
        },
      ],
    },
    liGroup2,
  ],
};
