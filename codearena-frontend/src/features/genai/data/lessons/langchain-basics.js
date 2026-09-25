// Day 4 lessons: why LangChain, its components, and the Models component (closed, open and embedding models).
// Follows the CampusX LangChain playlist's order and teaching style, updated to LangChain 1.x.
// Code was checked against langchain 1.4 / langchain-core 1.6 with offline fake models. Picked into d04.js.

const whyLangchain = {
  minutes: 50,
  level: "Beginner",
  intro:
    "To understand what something is, first understand why it was needed. This lesson builds the case for LangChain through one real product idea, a PDF reader you can chat with, and shows the three problems anyone building it hits. LLMs solved the first, APIs the second, and LangChain the third. Then you'll see what you can build with it and what the alternatives are.",
  recap:
    "Day 3 gave you the map: foundation models, and the Builder's side vs the User's side. LangChain is the first stop on the User's side: building applications on top of ready-made LLMs.",
  sections: [
    {
      h: "The product idea: chat with your PDF",
      blocks: [
        "Imagine a PDF reader with a chat box beside the document. You upload a machine-learning textbook and type:",
        {
          list: [
            "\"Explain page 5 as if I'm five years old.\"",
            "\"Make ten true/false questions on linear regression for practice.\"",
            "\"Write short notes on decision trees.\"",
          ],
        },
        "Students would love it. Here's how the system has to work at a high level:",
        { flow: ["User uploads a PDF", "Store it", "User asks a question", "Search the book for the relevant pages", "Question + those pages = the **system query**", "The **brain** reads it", "Answer"] },
        {
          list: [
            "The user uploads the PDF, and you store it.",
            "The user asks something like \"What are the assumptions of linear regression?\"",
            "The system searches the book and finds the few pages that discuss it.",
            "Those pages and the original question are combined into a **system query**.",
            "The system query goes to the app's **brain**, which writes the answer.",
          ],
          ordered: true,
        },
      ],
    },
    {
      h: "Two design decisions: semantic search, and sending only the relevant pages",
      blocks: [
        "**How do you find the right pages?** A keyword search for \"assumptions\" and \"linear regression\" would match every page that uses those words, most of them irrelevant. You want pages that match the **meaning** of the question:",
        {
          table: {
            head: ["Search type", "How it works", "Result"],
            rows: [
              ["Keyword search", "Matches the exact words anywhere in the book", "Many pages, many irrelevant"],
              ["**Semantic search**", "Understands the meaning of the whole question", "Few pages, far more relevant"],
            ],
          },
        },
        "**Why not just give the whole book to the brain?** Think of asking a teacher for help. Handing over the entire maths book and saying \"I have a doubt in algebra\" is slow and vague. Saying \"I have a doubt on page 155\" gets a quick, focused answer. Sending only the relevant pages is **cheaper** (less text to process) and gives **better answers** (no noise).",
        "**What must the brain be able to do?** Two things:",
        {
          list: [
            "**Natural language understanding (NLU):** understand the question, in English, Hindi or any language, however it's phrased.",
            "**Context-aware text generation:** read the given pages and write an answer based on them, not on guesswork.",
          ],
        },
      ],
    },
    {
      h: "Semantic search in one minute",
      blocks: [
        "Say you have three paragraphs, about Virat Kohli, Jasprit Bumrah and Rohit Sharma, and the question \"How many runs has Virat scored?\"",
        {
          list: [
            "Turn each paragraph into an **embedding**: a list of numbers (say 100 of them) that captures its meaning. Word2Vec, Doc2Vec and BERT-style models can do this; modern embedding models do it best.",
            "Turn the question into an embedding of the same size.",
            "Measure how similar the question's vector is to each paragraph's vector.",
            "The most similar paragraph, Kohli's, is the one holding the answer.",
          ],
          ordered: true,
        },
        "You learned what embeddings are on Day 3. By the end of today you'll write this exact search in about 20 lines.",
      ],
    },
    {
      h: "The detailed design",
      blocks: [
        {
          flow: [
            "PDF uploaded",
            "Stored in the cloud (e.g. AWS S3)",
            "**Document loader**",
            "**Text splitter** → chunks",
            "**Embedding model** → one vector per chunk",
            "**Vector database**",
            "User's question → embedded with the same model",
            "Find the closest vectors",
            "Question + top pages → **LLM**",
            "Answer",
          ],
        },
        {
          list: [
            "**Store:** save the uploaded PDF in cloud storage such as AWS S3.",
            "**Load:** a document loader brings the PDF into your system as text.",
            "**Split:** a text splitter cuts it into chunks, by chapter, page or paragraph. A 1,000-page book split by page gives 1,000 chunks.",
            "**Embed:** an embedding model turns every chunk into a vector: 1,000 vectors.",
            "**Store the vectors** in a database built for them, a vector database.",
            "**Query:** embed the user's question with the same model.",
            "**Retrieve:** compare that vector with all stored vectors and take the closest few (say 5) with their pages.",
            "**Answer:** the question plus those pages form the system query; the LLM (the brain) does NLU and context-aware generation, and the answer goes back to the user.",
          ],
          ordered: true,
        },
        { note: "This pipeline has a name: **RAG** (retrieval-augmented generation). You'll build it properly on Days 7–9. Today, notice how many separate parts it has." },
      ],
    },
    {
      h: "Three challenges, and what solved each",
      blocks: [
        {
          table: {
            head: ["#", "Challenge", "Why it's hard", "Solved by"],
            rows: [
              ["1", "Building the brain", "It needs strong NLU and context-aware text generation", "**LLMs**: the 2017 transformer paper, then BERT and GPT, then today's models"],
              ["2", "Hosting the brain", "LLMs are huge (billions of parameters, often over 100 GB); running them yourself needs serious engineering and money", "**LLM APIs** from OpenAI, Anthropic, Google and others: send a request, get a reply, pay only for what you use"],
              ["3", "Orchestrating the system", "Many moving parts must work together as one pipeline", "**LangChain**"],
            ],
          },
        },
        "Why is orchestration hard? The app has at least **five components** (cloud storage, text splitter, embedding model, vector database, LLM) and a chain of **tasks** between them: load the document, split it, create embeddings, manage the database, retrieve chunks, talk to the LLM.",
        "Coding all that by hand is tedious, and **change** makes it worse. Next month you may switch from OpenAI to Gemini to cut costs, move from AWS to GCP, or try a different embedding model. Each swap means rewriting code in several places.",
        "LangChain provides plug-and-play building blocks with a common interface, so components connect easily and can be swapped with little change. It handles the boilerplate and the orchestration, so you focus on your idea.",
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

load_dotenv()   # reads OPENAI_API_KEY and ANTHROPIC_API_KEY from .env

model = ChatOpenAI(model="gpt-4o-mini")
# model = ChatAnthropic(model="claude-opus-5")    # switching provider: only this line changes

result = model.invoke("What is LangChain? Answer in one line.")
print(result.content)`, lang: "python", caption: "Swapping OpenAI for Claude changes one import and one line. The call and the response handling stay the same." },
      ],
    },
    {
      h: "What LangChain gives you",
      blocks: [
        "**Definition:** LangChain is an open-source framework for building applications powered by LLMs. It offers modular components and end-to-end tools for chatbots, question-answering systems, RAG apps and autonomous agents.",
        {
          table: {
            head: ["Benefit", "What it means", "Example"],
            rows: [
              ["**Chains**", "Link components and tasks into a pipeline; each step's output automatically becomes the next step's input, so you write no glue code. Chains can be simple, parallel or conditional. The framework is named after them", "load → split → embed → store → retrieve → LLM becomes one chain"],
              ["**Model-agnostic**", "Switch providers by changing a line or two; your business logic stays untouched", "OpenAI today, Gemini tomorrow"],
              ["**Complete ecosystem**", "Every component comes in many flavours: dozens of document loaders (local files, S3, Google Drive, web), text splitters, embedding models and vector databases", "Whatever your company uses, there's probably an integration"],
              ["**Memory and state**", "Remember the conversation so follow-ups work", "\"Explain linear regression\" → \"Now give me interview questions on **this** algorithm\"; without memory the app doesn't know what \"this\" is"],
            ],
          },
        },
        "It also supports almost every major LLM, open or closed (OpenAI's GPT, Anthropic's Claude, Google's Gemini, Llama, Mistral and more), and it's free and under very active development.",
      ],
    },
    {
      h: "What you can build with it",
      blocks: [
        {
          table: {
            head: ["Use case", "What it is", "Example"],
            rows: [
              ["Conversational chatbots", "The first layer of customer contact; hard cases go to a person", "A food-delivery app answering thousands of customers at once without a huge call centre"],
              ["AI knowledge assistants", "A chatbot with access to your own data", "A course-site bot that answers doubts about the exact lecture a student is watching"],
              ["AI agents", "\"Chatbots on steroids\" that take actions using tools", "A travel site's agent that finds and books the cheapest flight for a senior citizen who just describes the trip"],
              ["Workflow automation", "Automating multi-step routine work for a person, a team or a company", "Read invoices from email, extract fields, update the accounts sheet"],
              ["Summarisation and research helpers", "A private ChatGPT-like tool for large or confidential documents", "Summarising research papers, books, or internal company data you can't paste into a public chatbot"],
            ],
          },
        },
        "Many people see agents as the next big wave in AI, and LLM apps are expected to boom the way websites and mobile apps did. LangChain sits in the middle of that.",
      ],
    },
    {
      h: "Alternatives, and a note on versions",
      blocks: [
        {
          table: {
            head: ["Option", "What it is", "When people pick it"],
            rows: [
              ["**LangChain**", "General-purpose framework: models, prompts, chains, retrieval, agents (LangGraph for complex agents)", "Most GenAI job descriptions in India name it"],
              ["**LlamaIndex**", "Framework focused on connecting LLMs to your data (indexing, retrieval, query engines)", "Data-heavy RAG apps; you'll meet it on Day 10"],
              ["**Haystack**", "Pipeline framework for search and RAG", "Search-centric products"],
              ["Plain provider SDKs", "The OpenAI, Anthropic or Gemini SDK directly", "Small apps, maximum control; you used them on Day 3 and earlier today"],
            ],
          },
        },
        "Which is right depends on the job and the team; Day 10 compares them in detail, once you know LangChain well.",
        {
          warn: "LangChain has changed a lot: versions 0.1, 0.2 and 0.3 each moved things around, and **1.0 (October 2025)** reorganised it again. Many YouTube tutorials and blogs use 0.x code. This course uses **LangChain 1.x** and points out the older names as you go (Day 6 has a full lesson on versions). The ideas (models, prompts, chains, retrievers, agents) are the same in every version, which is why each lesson teaches the concept first.",
        },
      ],
    },
  ],
  revise: [
    "LangChain is an open-source framework for building LLM-powered apps: chatbots, RAG systems, agents.",
    "Chat-with-PDF shows why: store → load → split → embed → vector DB → retrieve → LLM answers.",
    "Semantic search compares embeddings, so it finds pages by meaning, not by exact words.",
    "Send only the relevant pages to the LLM: cheaper and more accurate than the whole book.",
    "LLMs solved the brain, LLM APIs solved hosting cost, LangChain solves orchestration.",
    "Benefits: chains, model-agnostic code, a huge ecosystem of integrations, memory.",
    "Alternatives: LlamaIndex, Haystack, or plain SDKs. This course uses LangChain 1.x.",
  ],
  check: [
    "Why is semantic search better than keyword search for the PDF app?",
    "List the eight steps of the PDF app's detailed design in order.",
    "Why send only the relevant pages to the LLM instead of the whole book?",
    "Name the three challenges in building the app, and what solved each.",
    "How do chains save you from writing glue code?",
    "What problem does conversation memory solve?",
  ],
  interview: [
    {
      q: "What is LangChain, and why would you use it?",
      a: "An open-source framework for building LLM applications. It gives standard interfaces for models, prompts, retrievers and tools, and a way to compose them into chains, so you avoid glue code, can swap providers with a line or two, and get ready integrations for loaders, splitters, embedding models and vector stores. For a very small app the provider SDK alone may be simpler.",
    },
    {
      q: "Walk me through the architecture of a chat-with-your-PDF app.",
      a: "Ingestion: store the file, load it, split it into chunks, embed each chunk and save the vectors in a vector database. Query time: embed the question with the same model, retrieve the most similar chunks, put them with the question into a prompt, and have the LLM answer from them, ideally with citations. That's retrieval-augmented generation.",
    },
  ],
};

const lcComponents = {
  minutes: 55,
  level: "Beginner",
  intro:
    "LangChain has six core components. Learn them and you understand most of the framework; every lesson for the next week goes deep on one of them. This lesson is a guided tour with no heavy coding: what each component is, the problem that created it, and a tiny example, so you have the whole picture before the details.",
  recap:
    "You've seen why LangChain exists: an app like chat-with-PDF has many parts, and LangChain orchestrates them into pipelines with little code, without tying you to one provider.",
  sections: [
    {
      h: "The six components",
      blocks: [
        { flow: ["LangChain", ["1. Models", "2. Prompts", "3. Chains", "4. Indexes (retrieval)", "5. Memory", "6. Agents"]] },
        {
          table: {
            head: ["Component", "One line", "Deep dive"],
            rows: [
              ["Models", "One standard interface to talk to any provider's language or embedding models", "Today"],
              ["Prompts", "Flexible templates: dynamic, role-based and few-shot prompts", "Day 5"],
              ["Chains", "Pipelines where each step's output feeds the next: sequential, parallel or conditional", "Day 6"],
              ["Indexes", "Connect LLMs to external knowledge: loaders, splitters, vector stores, retrievers", "Days 7–9"],
              ["Memory", "Adds conversation history to stateless LLM calls", "Days 5–6"],
              ["Agents", "Chatbots with reasoning and tools that can take actions", "Days 12–13"],
            ],
          },
        },
      ],
    },
    {
      h: "1. Models: one interface for every provider",
      blocks: [
        "**Definition:** the Models component is the core interface through which you talk to AI models. It's the most important component, because it standardises how you talk to any provider's model.",
        "It exists because of a chain of three problems:",
        {
          table: {
            head: ["#", "Problem", "Solved by"],
            rows: [
              ["1", "Chatbots were NLP's dream for decades, but understanding a question (NLU) and replying with context-aware text was hard", "LLMs, trained on internet-scale data, solved both at once"],
              ["2", "LLMs are huge (billions of parameters, often 100 GB+), too big for most people or small companies to run", "Providers like OpenAI host them and sell API access; you pay per use"],
              ["3", "Every provider's API is written differently: different code, different response formats", "**LangChain's Models component** gives one standard interface"],
            ],
          },
        },
        "Without LangChain, an app that uses both GPT and Claude needs two code styles, and switching providers means rewriting. With LangChain the code is nearly identical; only the import and the class change:",
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

load_dotenv()   # reads OPENAI_API_KEY and ANTHROPIC_API_KEY from .env

model = ChatOpenAI(model="gpt-4o-mini")
# model = ChatAnthropic(model="claude-opus-5")    # switching provider: only this line changes

result = model.invoke("What is LangChain? Answer in one line.")
print(result.content)`, lang: "python" },
        {
          table: {
            head: ["Model type", "Input → output", "Used for"],
            rows: [
              ["Language models (LLMs / chat models)", "Text in → text out (\"How are you?\" → \"I'm good, and you?\")", "Chatbots, agents, most LLM apps"],
              ["Embedding models", "Text in → a vector of numbers out", "Semantic search, RAG"],
            ],
          },
        },
        "LangChain's docs list the supported providers with the features each supports (tool calling, structured output, JSON mode, running locally, multimodal input). Browsing that table once is worth it.",
      ],
    },
    {
      h: "2. Prompts: the input that shapes the output",
      blocks: [
        "**Definition:** a prompt is the input you send to an LLM. Typing \"What is CodeArena?\" into ChatGPT is a prompt.",
        "LLM output is very sensitive to the prompt. \"Explain linear regression in an academic tone\" and \"...in a fun tone\" differ by one word and give very different answers. That sensitivity created a whole field, **prompt engineering**. LangChain's Prompts component gives you flexible ways to build prompts. Three kinds you'll use constantly:",
        "**Dynamic, reusable prompts:** placeholders filled in at run time.",
        { code: `from langchain_core.prompts import PromptTemplate

prompt = PromptTemplate.from_template("Summarize {topic} in a {tone} tone")
print(prompt.format(topic="cricket", tone="fun"))
print(prompt.format(topic="biology", tone="serious"))`, lang: "python" },
        "**Role-based prompts:** a system message sets the model's role; a human message asks.",
        { code: `from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate([
    ("system", "You are an experienced {profession}."),
    ("human", "Tell me about {topic}."),
])
print(prompt.format_messages(profession="doctor", topic="viral fever"))`, lang: "python", caption: "The same template works for \"an experienced engineer\" asked about building bridges." },
        "**Few-shot prompts:** show the model a few labelled examples, then give it a new case. For a support bot that sorts tickets:",
        {
          table: {
            head: ["Example ticket", "Category"],
            rows: [
              ["I was charged twice for my subscription this month", "Billing issue"],
              ["The app crashes every time I try to log in", "Technical problem"],
              ["Can you explain how to upgrade my plan?", "General inquiry"],
            ],
          },
        },
        "A few-shot template combines an instruction (classify into billing, technical or general), these examples, and the new ticket; the LLM then returns the category. Don't worry if the code feels new: Day 5 covers prompts properly.",
      ],
    },
    {
      h: "3. Chains: pipelines without glue code",
      blocks: [
        "**Definition:** chains let you build pipelines. Each stage's output automatically becomes the next stage's input, so you write no glue code.",
        "**Sequential chain.** Task: take a 1,000-word English text and return a Hindi summary under 100 words.",
        { flow: ["English text", "LLM 1: translate to Hindi", "LLM 2: summarise in under 100 words", "Hindi summary"] },
        "Without a chain you call LLM 1, collect its output, and pass it to LLM 2 by hand at every step. With a chain you pass in the English text and call it once; the hand-offs happen behind the scenes.",
        { code: `from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

translate = PromptTemplate.from_template("Translate this into Hindi:\\n\\n{text}")
summarise = PromptTemplate.from_template("Summarise this Hindi text in under 100 words:\\n\\n{hindi}")

chain = (
    translate | model | StrOutputParser()           # step 1: English → Hindi
    | (lambda hindi: {"hindi": hindi})              # hand the Hindi text to step 2
    | summarise | model | StrOutputParser()         # step 2: Hindi → short summary
)
print(chain.invoke({"text": "LangChain is an open-source framework for building applications with large language models..."}))`, lang: "python", caption: "The `|` (pipe) joins steps into a chain. You'll learn exactly how it works on Day 6." },
        "**Parallel chain.** Task: turn a topic into a detailed report by asking two LLMs at once and merging their work.",
        { flow: ["Topic", ["LLM 1: report", "LLM 2: report"], "LLM 3: combine", "Final report"] },
        "**Conditional chain.** Task: an app that collects customer feedback and responds based on it.",
        { flow: ["User feedback", "LLM judges sentiment", ["Positive → say thank you", "Negative → email the support team"]] },
        "Chains can express far more complex pipelines too; they get a full day (Day 6).",
      ],
    },
    {
      h: "4. Indexes: connecting the LLM to your data",
      blocks: [
        "**Definition:** indexes connect your application to external knowledge such as PDFs, websites and databases. They're made of four parts: document loaders, text splitters, vector stores and retrievers. (Newer docs call this area **retrieval**; the parts are the same.)",
        "Why they're needed: ChatGPT answers most questions because it was trained on internet-scale data, but it can't answer \"What is the leave policy of my company?\" or \"What is our notice period?\". It never saw that private data. The fix is to connect the LLM to an external knowledge source, like the company's rule book. It then answers general questions from its training and company questions from the rule book.",
        { flow: ["Rule book PDF (e.g. on Google Drive)", "1. Document loader", "2. Text splitter: 1,000 pages → 1,000 chunks", "Embedding model", "3. Vector store", "User query → 4. Retriever", "LLM", "Answer"] },
        {
          table: {
            head: ["Part", "Job"],
            rows: [
              ["Document loader", "Brings data in from wherever it lives, such as cloud storage"],
              ["Text splitter", "Breaks the document into chunks (by page, paragraph or chapter) for semantic search"],
              ["Vector store", "A database that stores each chunk's embedding vector for later searches"],
              ["Retriever", "Embeds the user's query, runs a semantic search on the vector store, and hands the relevant chunks plus the query to the LLM"],
            ],
          },
        },
        "The source can be anything: PDFs, websites, a company database. LangChain makes this whole flow short to write, and you'll build full projects with it.",
      ],
    },
    {
      h: "5. Memory: LLM calls are stateless",
      blocks: [
        "**Key fact:** LLM API calls are **stateless**. Each request is independent; the model remembers nothing from earlier requests.",
        {
          list: [
            "You ask \"Who is Narendra Modi?\" and it replies that he's an Indian politician and the Prime Minister of India.",
            "You then ask \"How old is he?\" and it says it doesn't know who \"he\" is, because it doesn't remember the previous question.",
          ],
          ordered: true,
        },
        "A chatbot like that is frustrating: you'd have to repeat the context every time. The fix is to send the conversation so far with every call. The memory strategies:",
        {
          table: {
            head: ["Strategy", "How it works", "Trade-off"],
            rows: [
              ["Full history (buffer)", "Store the whole chat and send it with every call", "Simplest and most common; long chats get large and costly"],
              ["Window", "Keep only the last N messages", "Caps the cost; older context is dropped"],
              ["Summary", "Send a running summary of older messages instead of the full text", "Saves tokens and money; loses detail"],
              ["Custom / long-term", "Store specific facts, such as the user's preferences, across sessions", "Makes later conversations smoother; needs a database"],
            ],
          },
        },
        {
          note: "Older LangChain (0.x) had classes named `ConversationBufferMemory`, `ConversationBufferWindowMemory` and `ConversationSummaryMemory`. In LangChain 1.x those are gone from the main package: you keep the message list yourself (Day 5), trim it with helpers (Day 6), or let LangGraph persist it for agents (Days 13–14). The four strategies above are the same.",
        },
      ],
    },
    {
      h: "6. Agents: chatbots that act",
      blocks: [
        "**Definition:** the Agents component makes it easy to build AI agents. An AI agent is a chatbot with superpowers: it can talk **and** do tasks, because it has **reasoning** and **access to tools**.",
        "On a travel site you ask for the best summer destination in India. A **chatbot** answers from its training: hill stations like Shimla or Manali. An **AI agent** goes further: ask for the cheapest Delhi–Shimla flight on 24 January and it calls a flight API; say \"book it\" and it completes the booking.",
        {
          table: {
            head: ["", "Chatbot", "AI agent"],
            rows: [
              ["Understands and replies", "Yes", "Yes"],
              ["Reasons through multi-step tasks", "No", "Yes"],
              ["Uses tools (APIs, calculators, databases)", "No", "Yes"],
              ["Takes actions for you", "No", "Yes"],
            ],
          },
        },
        "An example. The agent has two tools, a **calculator** and a **weather API**. The user asks: \"Can you multiply today's temperature in Delhi by 3?\"",
        { flow: ["\"Multiply Delhi's temperature by 3\"", "Reason: I need today's temperature first", "Call the weather API (Delhi) → 25 °C", "Reason: now I need 25 × 3", "Call the calculator → 75", "Answer: 75"] },
        {
          list: [
            "**Reason:** the agent breaks the task into steps (a technique like chain-of-thought): get the temperature, then multiply.",
            "**Use a tool:** it finds the weather API among its tools and calls it with \"Delhi\"; it gets 25 °C.",
            "**Use another tool:** it calls the calculator with 25 and 3; it gets 75.",
            "**Answer:** 75.",
          ],
          ordered: true,
        },
        "Big companies and AI labs are converging on agents, and LangChain makes them easy to build; you'll build several on Days 12–15.",
      ],
    },
  ],
  revise: [
    "Six components: Models, Prompts, Chains, Indexes, Memory, Agents.",
    "Models: one interface for any provider; two types, language models (text → text) and embedding models (text → vector).",
    "Prompts: dynamic templates, role-based (system + human) messages, few-shot examples.",
    "Chains: each step's output feeds the next; sequential, parallel, conditional.",
    "Indexes (retrieval): document loaders, text splitters, vector stores, retrievers.",
    "Memory: LLM calls are stateless, so you resend history (full, window, summary or long-term facts).",
    "Agents: reasoning + tools, so they can act, not just talk.",
  ],
  check: [
    "What three problems led to LangChain's Models component?",
    "How do language models and embedding models differ in input and output?",
    "Write a dynamic prompt template with two placeholders.",
    "Sketch a conditional chain for handling customer feedback.",
    "Name the four parts of Indexes and the job of each.",
    "What does \"LLM API calls are stateless\" mean, and which memory strategy saves the most tokens?",
    "What two capabilities make an AI agent different from a chatbot?",
  ],
  interview: [
    {
      q: "What are LangChain's core components?",
      a: "Models (chat and embedding models behind one interface), prompts (templates and messages), chains (composing steps with LCEL), retrieval or indexes (document loaders, text splitters, vector stores, retrievers), memory (conversation history, since LLM calls are stateless) and agents (LLMs that use tools in a loop). In 1.x, agents are built with `create_agent` on LangGraph, and memory is handled by message lists or LangGraph persistence.",
    },
    {
      q: "What does \"LLM calls are stateless\" mean for a chatbot?",
      a: "The model remembers nothing between requests, so the app must send the relevant history with every call. You choose a strategy: full history, a window of recent messages, a running summary, or stored long-term facts, trading context against token cost.",
    },
  ],
};

const lcModels = {
  minutes: 70,
  level: "Beginner",
  intro:
    "Your first hands-on LangChain lesson: talk to OpenAI, Claude and Gemini through the same interface, see the difference between old-style LLMs and chat models, and learn the two settings you'll tune in every project, temperature and max tokens. Open-source models and embedding models follow in the next two lessons.",
  recap:
    "You've toured the six components. The first one, Models, is what every other component is built on: prompts go into a model, chains call models, agents are models with tools.",
  sections: [
    {
      h: "Plan of action",
      blocks: [
        "**Definition:** the Model component makes it easy to interact with language models and embedding models. Different companies' models behave differently in code; this component gives all of them one common interface.",
        { flow: ["Models", ["**Language models**: LLMs (older) and chat models", "**Embedding models**"]] },
        {
          table: {
            head: ["What", "Closed source (paid API)", "Open source (free, run anywhere)"],
            rows: [
              ["Chat models", "OpenAI, Anthropic, Google: **this lesson**", "Hugging Face, Ollama: next lesson"],
              ["Embedding models", "OpenAI: lesson after next", "Hugging Face, Ollama: lesson after next"],
            ],
          },
        },
      ],
    },
    {
      h: "LLMs vs chat models",
      blocks: [
        "Language models come in two kinds, and new projects should use **chat models**; plain LLMs are being phased out.",
        {
          table: {
            head: ["Feature", "LLMs", "Chat models"],
            rows: [
              ["Purpose", "Free-form text generation", "Multi-turn conversation between a user and an AI"],
              ["Input → output", "A plain string → a plain string", "A list of messages → a message"],
              ["Training", "General text: books, articles, Wikipedia", "General text, then fine-tuned on conversations"],
              ["Memory", "No notion of earlier messages", "Takes the conversation history as input"],
              ["Roles", "None", "Understands system, user and assistant roles (\"You are a knowledgeable doctor…\")"],
              ["Examples", "Older completion models such as `gpt-3.5-turbo-instruct`", "GPT-4o, Claude, Gemini, Llama chat models"],
              ["Best for", "Simple text generation, summarisation, translation", "Chatbots, assistants, customer support, tutors, agents"],
            ],
          },
        },
        "Most AI apps today are in the right-hand column, which is why the industry and LangChain have moved to chat models. You'll see an LLM once below so you recognise it in older code, then use chat models everywhere.",
      ],
    },
    {
      h: "Project setup",
      blocks: [
        "Make one project folder with its own environment, the libraries, and a `.env` file for your API keys (you've done this since Day 1):",
        {
          lang: "bash",
          code: `mkdir langchain-models && cd langchain-models
uv init --no-readme .
uv add langchain langchain-core langchain-openai langchain-anthropic langchain-google-genai python-dotenv
mkdir LLMs ChatModels EmbeddedModels`,
        },
        {
          lang: "bash",
          code: `# .env  (never commit this file; add it to .gitignore)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="..."
HUGGINGFACEHUB_API_TOKEN="hf_..."`,
          caption: "Use exactly these names: each LangChain integration reads its key from the environment automatically once `load_dotenv()` has run.",
        },
        {
          table: {
            head: ["Provider", "Where to get a key", "Cost"],
            rows: [
              ["OpenAI", "platform.openai.com → API keys", "Prepaid credit (about $5 minimum); $5 goes a long way with small models"],
              ["Anthropic", "console.anthropic.com → API keys", "Paid; add credit first, or just read along"],
              ["Google (Gemini)", "Google AI Studio → Get API key", "Has a free tier: the easiest start"],
              ["Hugging Face", "huggingface.co → Settings → Access tokens → New token (Read)", "Free up to a limit"],
            ],
          },
        },
        { tip: "You don't need all four. Start with Gemini's free tier or a local model (next lesson), and add paid keys only when you need them." },
      ],
    },
    {
      h: "Demo 1: an LLM, then a chat model (OpenAI)",
      blocks: [
        "Every model follows the same four steps: import the class, load the API key, create the model object, call `invoke()`.",
        { code: `# LLMs/1_llm_demo.py: the older, plain-LLM interface (string in, string out)
from dotenv import load_dotenv
from langchain_openai import OpenAI

load_dotenv()

llm = OpenAI(model="gpt-3.5-turbo-instruct")
result = llm.invoke("What is the capital of India?")
print(result)          # a plain str: "The capital of India is New Delhi."`, lang: "python" },
        {
          list: [
            "`langchain_openai` is the integration package that lets LangChain talk to OpenAI's API.",
            "`invoke()` is one of LangChain's most important methods: models, prompts and chains all have it. Day 6 explains why.",
            "Input and output are plain strings, which marks this as an LLM.",
          ],
        },
        "Now a chat model. Only the class changes: `ChatOpenAI` instead of `OpenAI`.",
        { code: `# ChatModels/1_chatmodel_openai.py
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

model = ChatOpenAI(model="gpt-4o-mini")
result = model.invoke("What is the capital of India?")

print(result.content)            # The capital of India is New Delhi.
print(type(result).__name__)     # AIMessage
print(result.usage_metadata)     # {'input_tokens': 14, 'output_tokens': 8, 'total_tokens': 22}`, lang: "python" },
        "The result isn't a plain string. It's an **`AIMessage`** object: `content` holds the answer, and it also carries metadata such as token usage (`usage_metadata`) and the model's finish reason (`response_metadata`). Print `result.content` to see just the answer.",
        "**Behind the scenes:** in LangChain's source code, `OpenAI` inherits from `BaseLLM`, and `ChatOpenAI` inherits from `BaseChatModel`. Every LLM integration inherits from `BaseLLM` and every chat model from `BaseChatModel`, which is why they all share the same methods.",
      ],
    },
    {
      h: "Key parameter: temperature",
      blocks: [
        "Temperature controls how **random** the output is. The precise way to think about it is **repeatability**:",
        {
          list: [
            "**Temperature 0 (or close to it):** the same input gives (almost) the same output every time. Ask for a 5-line cricket poem twice and you get the same poem.",
            "**Higher values (0.7, then 1.5 and above):** the same input gives increasingly different, more creative outputs each run.",
          ],
        },
        {
          table: {
            head: ["Use case", "Temperature"],
            rows: [
              ["Factual answers: maths, code, extraction, classification", "0 – 0.3"],
              ["General Q&A and explanations", "0.5 – 0.7"],
              ["Creative writing, stories, jokes", "0.9 – 1.2"],
              ["Brainstorming many different ideas", "1.3 and above"],
            ],
          },
        },
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
prompt = "Write a 5-line poem on cricket."

for t in [0, 0.7, 1.5]:
    model = ChatOpenAI(model="gpt-4o-mini", temperature=t)
    first = model.invoke(prompt).content
    second = model.invoke(prompt).content
    print(f"--- temperature={t}: same poem twice? {first == second}")
    print(first)`, lang: "python", caption: "Run it and compare: at 0 the two poems match (or nearly); at 1.5 they're clearly different." },
        { note: "Even at 0 some providers aren't perfectly deterministic (GPU arithmetic and batching add tiny variations). Don't build logic that assumes identical output; use structured output (Day 5) when you need a fixed format. Some reasoning models ignore or reject a custom temperature, so check the model's docs." },
      ],
    },
    {
      h: "Key parameter: max tokens",
      blocks: [
        "This caps how many tokens the model writes back. Paid APIs charge per token (priced per million), so limiting output controls cost, and it also stops runaway answers.",
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

model = ChatOpenAI(model="gpt-4o-mini", max_completion_tokens=20)
result = model.invoke("Write a 5-line poem on cricket.")
print(result.content)                                  # cut off after ~20 tokens
print(result.response_metadata.get("finish_reason"))   # "length" when the cap was hit`, lang: "python" },
        "With a cap of 20 the poem is cut off mid-line, and the finish reason tells you the limit was hit. For now think of a token as roughly three-quarters of an English word (you saw exactly what tokens are on Day 3).",
        {
          table: {
            head: ["Class", "Parameter name"],
            rows: [
              ["`ChatOpenAI`", "`max_completion_tokens` (or its older name `max_tokens`)"],
              ["`ChatAnthropic`", "`max_tokens` (required by Claude's API; LangChain sets a default)"],
              ["`ChatGoogleGenerativeAI`", "`max_output_tokens` (or `max_tokens`)"],
            ],
          },
        },
      ],
    },
    {
      h: "Demo 2: Claude and Gemini",
      blocks: [
        "The code is nearly identical to OpenAI's; only the package, the class and the model name change. That consistency is LangChain's main advantage.",
        { code: `# ChatModels/2_chatmodel_anthropic.py
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic

load_dotenv()   # needs ANTHROPIC_API_KEY

model = ChatAnthropic(model="claude-opus-5", temperature=0.5, max_tokens=300)
result = model.invoke("What is the capital of India?")
print(result.content)`, lang: "python", caption: "Claude comes from Anthropic and is widely used for coding and long documents. Current model names are listed in Anthropic's docs under Models." },
        { code: `# ChatModels/3_chatmodel_google.py
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()   # needs GOOGLE_API_KEY

model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.5)
result = model.invoke("What is the capital of India?")
print(result.content)`, lang: "python", caption: "Gemini has a free tier, so it's a good default while learning." },
        {
          table: {
            head: ["Provider", "Package", "Class", "Example model"],
            rows: [
              ["OpenAI", "`langchain-openai`", "`ChatOpenAI`", "`gpt-4o-mini`"],
              ["Anthropic", "`langchain-anthropic`", "`ChatAnthropic`", "`claude-opus-5`"],
              ["Google", "`langchain-google-genai`", "`ChatGoogleGenerativeAI`", "`gemini-2.5-flash`"],
            ],
          },
        },
        "These are the three most popular closed-source model families. Their drawback: all are paid per use, and your data goes to the provider's servers. That leads to open-source models, next lesson.",
      ],
    },
    {
      h: "One more way to create a model, and three ways to call it",
      blocks: [
        "LangChain 1.x adds a shortcut that picks the right class from a `\"provider:model\"` string. Handy when the model comes from config:",
        { code: `from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

load_dotenv()

# "provider:model" strings; the matching integration package must be installed
for name in ["openai:gpt-4o-mini", "anthropic:claude-opus-5", "google_genai:gemini-2.5-flash"]:
    model = init_chat_model(name, temperature=0)
    print(name, "→", model.invoke("Capital of India? One word.").content)`, lang: "python" },
        "Every chat model (and, from Day 6, every chain) can be called three ways:",
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

# 1. One question
print(model.invoke("Capital of India?").content)

# 2. Several questions in one call (runs them in parallel)
for reply in model.batch(["Capital of Kerala?", "Capital of Assam?"]):
    print(reply.content)

# 3. Stream the answer word by word, like ChatGPT
for chunk in model.stream("Explain an API in two lines."):
    print(chunk.content, end="", flush=True)
print()`, lang: "python" },
        {
          table: {
            head: ["Method", "Input", "Use it for"],
            rows: [
              ["`invoke(x)`", "One input", "Normal calls"],
              ["`batch([x1, x2, …])`", "A list of inputs, run in parallel", "Processing many items (tickets, reviews, rows)"],
              ["`stream(x)`", "One input; yields chunks as they're generated", "Chat UIs, so users see the answer appear"],
            ],
          },
        },
        "You can also pass a **list of messages** instead of a string, which is how chatbots send history. That's where Day 5 starts.",
      ],
    },
  ],
  revise: [
    "Two model types: language models (text → text) and embedding models (text → vector).",
    "LLMs: string in, string out, being phased out. Chat models: messages in, `AIMessage` out; use these.",
    "Pattern: import the class → `load_dotenv()` → create the model → `invoke()` → read `.content`.",
    "`OpenAI` inherits `BaseLLM`; `ChatOpenAI`, `ChatAnthropic`, `ChatGoogleGenerativeAI` inherit `BaseChatModel`.",
    "Temperature: near 0 = repeatable output; higher = more varied and creative.",
    "Max tokens caps output length and cost; check `finish_reason`.",
    "`init_chat_model(\"provider:model\")` creates any chat model from a string.",
    "`invoke`, `batch` and `stream` work on every model (and every chain).",
  ],
  check: [
    "Give three differences between LLMs and chat models.",
    "Why does `ChatOpenAI` return an object instead of a plain string, and how do you get the answer?",
    "What temperature would you use for code generation, and for writing a story?",
    "What changes in the code when you switch from OpenAI to Claude?",
    "What happens when the output hits the max-tokens cap, and how can you detect it?",
    "When would you use `batch` instead of calling `invoke` in a loop?",
  ],
  mistakes: [
    "Hard-coding API keys in code or committing `.env`. Keep keys in `.env` and add it to `.gitignore`.",
    "Printing `result` instead of `result.content` and getting the whole message object.",
    "Using a high temperature for extraction or classification, then wondering why results vary.",
    "Copying a 0.x tutorial's imports (`from langchain.llms import OpenAI`) into a 1.x project.",
  ],
  interview: [
    {
      q: "LLMs vs chat models in LangChain?",
      a: "LLMs take a string and return a string; they're older completion-style models. Chat models take a list of role-tagged messages (system, human, AI, tool) and return an `AIMessage` with content and metadata such as token usage and tool calls. Chat models support conversations, roles and tool calling, so new code uses them.",
    },
    {
      q: "What is temperature? What would you use for a SQL generator?",
      a: "It controls randomness when the model picks the next token: near 0 gives repeatable, focused output; higher values give more varied, creative output. For SQL generation, extraction or classification use 0 or close to it, and validate the output anyway, because even temperature 0 isn't perfectly deterministic.",
    },
  ],
};

const openModels = {
  minutes: 55,
  level: "Beginner",
  intro:
    "Closed models are excellent but paid, and your data leaves your machine. Open-source models are free to download, change and run wherever you like. This lesson compares the two, then runs an open model three ways: through Hugging Face's API, downloaded onto your laptop with Hugging Face, and with Ollama, the easiest local option.",
  recap:
    "You called OpenAI, Claude and Gemini through LangChain with almost identical code. The same interface works for open-source models too.",
  sections: [
    {
      h: "Open source vs closed source",
      blocks: [
        "**Definition:** open-source models are AI models whose weights are freely available: you can download, modify, fine-tune and deploy them without depending on a central provider. Closed-source models (GPT, Claude, Gemini) live on the company's servers and are reachable only through a paid API.",
        {
          table: {
            head: ["Aspect", "Open source", "Closed source"],
            rows: [
              ["Cost", "Free to run on your own hardware (you pay for the hardware)", "Pay per API call"],
              ["Control", "Fine-tune and deploy anywhere", "Provider's infrastructure only"],
              ["Data privacy", "Runs on your machine, so confidential data stays with you", "Data goes to the provider's servers"],
              ["Customisation", "Fine-tune on your own data", "Limited, if offered at all"],
              ["Deployment", "Your servers or any cloud", "Not possible; you call their API"],
            ],
          },
        },
        "**Popular open models:** Llama (Meta), Mistral, Qwen (Alibaba), DeepSeek, Gemma (Google), Phi (Microsoft), plus Indian models like Sarvam's. **Where to find them:** Hugging Face, the largest repository of open models: text generation, embeddings, image, speech and multimodal models.",
        "**Drawbacks** to know:",
        {
          list: [
            "Running them well needs a strong GPU, which is expensive; a laptop CPU is slow.",
            "Setup is more work than calling an API.",
            "Small open models can feel less polished because they get less instruction and preference tuning (RLHF); you can fine-tune them yourself (Day 17).",
            "Multimodal abilities are more limited than the top closed models.",
          ],
        },
      ],
    },
    {
      h: "Option A: Hugging Face's Inference API",
      blocks: [
        "The model stays on Hugging Face's infrastructure (Hugging Face routes your request to an **inference provider** that serves it), and you call it over an API. It's free up to a monthly limit and gives you access to many popular open models without any download.",
        { lang: "bash", code: "uv add langchain-huggingface" },
        { code: `# ChatModels/4_chatmodel_hf_api.py
from dotenv import load_dotenv
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

load_dotenv()   # needs HUGGINGFACEHUB_API_TOKEN (a Read token from huggingface.co)

llm = HuggingFaceEndpoint(
    repo_id="Qwen/Qwen2.5-7B-Instruct",   # the model's id on Hugging Face
    task="text-generation",
    max_new_tokens=200,
    provider="auto",                      # let Hugging Face pick a provider that serves this model
)
model = ChatHuggingFace(llm=llm)

result = model.invoke("What is the capital of India?")
print(result.content)`, lang: "python" },
        {
          list: [
            "`HuggingFaceEndpoint` points at a model on Hugging Face by its `repo_id`.",
            "`ChatHuggingFace` wraps it as a chat model, so you get the same `invoke()` and `.content` as with OpenAI.",
            "Only models that an inference provider serves work this way. Each model's page on Hugging Face shows \"Inference Providers\" if it's available; popular instruct models such as Qwen, Llama and DeepSeek usually are.",
          ],
        },
        { note: "Older tutorials call tiny models such as TinyLlama this way. Hugging Face's free serverless API used to host almost any small model; it now goes through inference providers, which serve mainly popular models. For small models, use Option B or C." },
      ],
    },
    {
      h: "Option B: download and run with Hugging Face",
      blocks: [
        "Use `HuggingFacePipeline` instead of `HuggingFaceEndpoint`. The first run downloads the model weights, tokenizer and config to your machine; later runs use the cached copy.",
        { lang: "bash", code: "uv add langchain-huggingface transformers torch accelerate" },
        { code: `# ChatModels/5_chatmodel_hf_local.py
# import os; os.environ["HF_HOME"] = "D:/huggingface_cache"   # optional: where models are downloaded
from langchain_huggingface import ChatHuggingFace, HuggingFacePipeline

llm = HuggingFacePipeline.from_model_id(
    model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0",   # 1.1B parameters, about 2.2 GB
    task="text-generation",
    pipeline_kwargs=dict(temperature=0.5, max_new_tokens=100),
)
model = ChatHuggingFace(llm=llm)

result = model.invoke("What is the capital of India?")
print(result.content)`, lang: "python" },
        "**TinyLlama** is a 1.1-billion-parameter model fine-tuned from Llama: small enough to learn with. The output is formatted as a chat, with your question and the assistant's answer.",
        {
          warn: "Be realistic about hardware. On a laptop with 8 GB of RAM and no strong GPU, even this small model can take minutes per answer and make the machine sluggish. A GPU (or Apple Silicon) makes inference much faster. Models download to `~/.cache/huggingface`; set `HF_HOME` to use another drive if space is short.",
        },
      ],
    },
    {
      h: "Option C: Ollama, the easiest local option",
      blocks: [
        "**Ollama** is a free app that downloads **quantized** (compressed) open models and runs them efficiently on a normal laptop. It's what most developers use locally, and LangChain has a first-class integration.",
        {
          lang: "bash",
          code: `# 1. Install Ollama from https://ollama.com, then download a small model
ollama pull llama3.2          # about 2 GB
# 2. In your project
uv add langchain-ollama`,
        },
        { code: `# ChatModels/6_chatmodel_ollama.py  (first: install Ollama, then \`ollama pull llama3.2\`)
from langchain_ollama import ChatOllama

model = ChatOllama(model="llama3.2", temperature=0.5)
result = model.invoke("What is the capital of India?")
print(result.content)`, lang: "python", caption: "No API key and no cost: the model runs on your machine." },
        {
          table: {
            head: ["Way to run", "Where it runs", "Best for"],
            rows: [
              ["`HuggingFaceEndpoint` + `ChatHuggingFace`", "Hugging Face's inference providers", "Trying popular open models without downloading"],
              ["`HuggingFacePipeline` + `ChatHuggingFace`", "Your machine, full-precision weights", "Learning, experiments, fine-tuned models from Hugging Face"],
              ["`ChatOllama`", "Your machine, quantized weights", "Everyday local development, private data, offline work"],
              ["vLLM or TGI on a GPU server (Day 17)", "Your own server or cloud", "Serving open models to real users in production"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Open-source models: download, modify, fine-tune and deploy yourself; closed models: paid API only.",
    "Open wins on privacy, control and customisation; closed wins on quality, ease and multimodality.",
    "Hugging Face is the biggest home of open models.",
    "`HuggingFaceEndpoint` → runs remotely via Hugging Face; `HuggingFacePipeline` → downloads and runs locally; wrap either in `ChatHuggingFace`.",
    "Ollama runs quantized models locally with one command; use `ChatOllama`.",
    "Local models need good hardware; a GPU makes a big difference.",
  ],
  check: [
    "Name two advantages and two drawbacks of open-source models.",
    "What's the difference between `HuggingFaceEndpoint` and `HuggingFacePipeline`?",
    "Why wrap them in `ChatHuggingFace`?",
    "Why is Ollama usually faster on a laptop than running the same model with `HuggingFacePipeline`?",
    "A bank wants a chatbot over confidential customer data. Which kind of model would you consider first, and why?",
  ],
  interview: [
    {
      q: "Open-source vs closed-source LLMs: how do you choose?",
      a: "Closed models (GPT, Claude, Gemini) give the best quality and multimodal features with zero infrastructure, but cost per call and send data to the provider. Open models (Llama, Qwen, Mistral, DeepSeek) cost only hardware, keep data in-house, and can be fine-tuned and deployed anywhere, but need GPUs and ops work, and small ones are weaker. Choose by privacy requirements, quality needed, volume (API cost vs GPU cost) and team skills; many teams use a closed model first and move specific tasks to an open one.",
    },
    {
      q: "How would you run an open-source model locally with LangChain?",
      a: "Easiest is Ollama: `ollama pull llama3.2`, then `ChatOllama(model=\"llama3.2\")`. With Hugging Face, `HuggingFacePipeline.from_model_id(model_id=..., task=\"text-generation\")` wrapped in `ChatHuggingFace` downloads and runs the weights with transformers. Either way the rest of the code (`invoke`, chains, agents) stays the same.",
    },
  ],
};

const lcEmbeddings = {
  minutes: 45,
  level: "Beginner",
  intro:
    "Embedding models are the second model type: they turn text into a vector of numbers that captures its meaning. They power semantic search, and so every RAG app. This lesson uses them through LangChain with OpenAI (paid, excellent) and with free local models, and shows the two methods you'll call everywhere.",
  recap:
    "You've used language models, which take text and return text, both closed and open. Embedding models take text and return a vector. On Day 3 you saw what embeddings are; now you'll produce them.",
  sections: [
    {
      h: "Two methods: one text or many",
      blocks: [
        {
          table: {
            head: ["Method", "Input", "Output"],
            rows: [
              ["`embed_query(text)`", "One string (usually the user's question)", "One vector: a list of floats"],
              ["`embed_documents(texts)`", "A list of strings (your documents or chunks)", "A list of vectors, one per text"],
            ],
          },
        },
        "Some models embed questions and documents slightly differently, which is why there are two methods. Always use `embed_query` for queries and `embed_documents` for the things you search over.",
      ],
    },
    {
      h: "OpenAI embeddings",
      blocks: [
        { code: `# EmbeddedModels/1_embedding_openai_query.py
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings

load_dotenv()

embedding = OpenAIEmbeddings(model="text-embedding-3-small", dimensions=32)
vector = embedding.embed_query("Delhi is the capital of India")
print(len(vector), vector[:5])     # 32 numbers; first five shown`, lang: "python" },
        "**Choosing dimensions:** bigger vectors capture more nuance; smaller ones are cheaper to store and faster to search. By default `text-embedding-3-small` returns 1,536 numbers and `text-embedding-3-large` returns 3,072. The `dimensions` parameter shortens them (these models are trained so that shorter versions still work well).",
        { code: `# EmbeddedModels/2_embedding_openai_docs.py
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings

load_dotenv()
embedding = OpenAIEmbeddings(model="text-embedding-3-small", dimensions=32)

documents = [
    "Delhi is the capital of India",
    "Kolkata is the capital of West Bengal",
    "Paris is the capital of France",
]
vectors = embedding.embed_documents(documents)
print(len(vectors), "vectors of", len(vectors[0]), "numbers each")    # 3 vectors of 32 numbers each`, lang: "python" },
        "**Cost:** embeddings are very cheap (a few cents per million tokens for the small model) because the output is just numbers. In practice, good API embedding models are usually a little more accurate than small free ones.",
      ],
    },
    {
      h: "Free embeddings on your machine",
      blocks: [
        "The open-source model **sentence-transformers/all-MiniLM-L6-v2** maps sentences to 384-dimensional vectors for clustering and semantic search. It's only about 90 MB, so downloading it beats calling an API.",
        { code: `# EmbeddedModels/3_embedding_hf_local.py  (uv add langchain-huggingface sentence-transformers)
from langchain_huggingface import HuggingFaceEmbeddings

embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

documents = ["Delhi is the capital of India", "Kolkata is the capital of West Bengal", "Paris is the capital of France"]
vector = embedding.embed_query("Delhi is the capital of India")
vectors = embedding.embed_documents(documents)
print(len(vector), len(vectors), len(vectors[0]))   # 384 3 384`, lang: "python", caption: "The first run downloads the model and tokenizer; later runs use the cache." },
        "With Ollama, embedding models are one pull away:",
        { code: `# EmbeddedModels/4_embedding_ollama.py  (first: \`ollama pull nomic-embed-text\`)
from langchain_ollama import OllamaEmbeddings

embedding = OllamaEmbeddings(model="nomic-embed-text")
print(len(embedding.embed_query("Delhi is the capital of India")))   # 768`, lang: "python" },
        {
          table: {
            head: ["Model", "Dimensions", "Runs", "Notes"],
            rows: [
              ["`text-embedding-3-small` (OpenAI)", "1,536 (shortenable)", "API", "Cheap, strong default"],
              ["`text-embedding-3-large` (OpenAI)", "3,072 (shortenable)", "API", "Higher quality, higher cost"],
              ["`all-MiniLM-L6-v2`", "384", "Local", "Tiny and fast; English"],
              ["`nomic-embed-text` (Ollama)", "768", "Local", "Good general-purpose local model"],
              ["Multilingual models (e.g. `bge-m3`)", "1,024", "Local or API", "Hindi and other Indian languages; Day 8"],
            ],
          },
        },
        { warn: "Vectors from different models are **not comparable**. Embed your documents and your queries with the same model, and if you change models, re-embed everything." },
      ],
    },
    {
      h: "Comparing vectors: cosine similarity",
      blocks: [
        "To find which document is closest in meaning to a question, compare their vectors with **cosine similarity**: the cosine of the angle between them. 1 means the same direction (same meaning), 0 means unrelated.",
        { code: `import numpy as np

def cosine(a, b) -> float:
    a, b = np.array(a), np.array(b)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print(cosine([1, 2, 3], [2, 4, 6]))    # 1.0: same direction, same meaning
print(cosine([1, 0], [0, 1]))          # 0.0: unrelated`, lang: "python" },
        "That's all semantic search is: embed everything, then rank by similarity. The build task for today does exactly that.",
      ],
    },
  ],
  revise: [
    "Embedding models: text in → vector out; they power semantic search and RAG.",
    "`embed_query` for one text (the question); `embed_documents` for a list (your documents).",
    "`OpenAIEmbeddings(model=..., dimensions=...)`: cheap and strong; `dimensions` trades quality for size.",
    "Free options: `HuggingFaceEmbeddings` (e.g. all-MiniLM-L6-v2, 384 dims) and `OllamaEmbeddings`.",
    "Cosine similarity compares vectors: 1 = same meaning, 0 = unrelated.",
    "Never mix vectors from different embedding models.",
  ],
  check: [
    "What's the difference between `embed_query` and `embed_documents`?",
    "Why might you choose 256 dimensions instead of 3,072?",
    "Your documents were embedded with OpenAI and your queries with MiniLM. What goes wrong?",
    "What does a cosine similarity of 0.95 between two sentences tell you?",
  ],
  interview: [
    {
      q: "How do you choose an embedding model?",
      a: "Start with a strong default (an API model like OpenAI's text-embedding-3-small, or a local one like bge or nomic), then test on your own data: build a small set of questions with the passages that answer them and measure hit rate. Consider languages (multilingual for Hindi), dimensions and storage cost, latency, privacy (local vs API) and price. Day 8 goes deeper.",
    },
  ],
};

const docSimilarity = {
  minutes: 60,
  level: "Beginner",
  intro:
    "Your first mini project: given a set of documents and a question, find the document that answers it best by comparing embeddings. It's the heart of every RAG app in about 25 lines, and a good project to explain in interviews because every line is visible.",
  recap:
    "You can create embeddings with `embed_query` and `embed_documents`, and compare vectors with cosine similarity. Now combine them.",
  sections: [
    {
      h: "The plan",
      blocks: [
        { flow: [["5 documents → embed → 5 vectors", "User question → embed → 1 vector"], "Cosine similarity: question vs each document", "Highest score = best match"] },
        "All vectors must have the same size (here 300). The question's vector is compared with each document's vector, and the highest similarity wins.",
      ],
    },
    {
      h: "Build it",
      blocks: [
        { lang: "bash", code: "uv add langchain-openai scikit-learn python-dotenv" },
        { code: `# EmbeddedModels/5_document_similarity.py
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()
embedding = OpenAIEmbeddings(model="text-embedding-3-large", dimensions=300)

documents = [
    "Virat Kohli is an Indian batsman known for his aggressive, consistent run-scoring.",
    "MS Dhoni is a former Indian captain famous for his calm finishing.",
    "Sachin Tendulkar holds many of cricket's batting records.",
    "Rohit Sharma is an Indian opener known for big one-day scores.",
    "Jasprit Bumrah is an Indian fast bowler with an unusual bowling action.",
]
query = "Tell me about Virat Kohli"

doc_embeddings = embedding.embed_documents(documents)   # 5 vectors
query_embedding = embedding.embed_query(query)          # 1 vector

# cosine_similarity wants two 2D lists and returns a 2D array: [[s1, s2, s3, s4, s5]]
scores = cosine_similarity([query_embedding], doc_embeddings)[0]

# keep each score's original position, sort by score, take the best
index, score = sorted(list(enumerate(scores)), key=lambda x: x[1])[-1]

print(query)
print(documents[index])
print("Similarity score is:", round(float(score), 3))`, lang: "python" },
        "How the ranking line works, step by step:",
        {
          list: [
            "`cosine_similarity` returns a 2D array (one row per query); `[0]` takes our single row of 5 scores.",
            "`enumerate(scores)` pairs each score with its index, like `(0, 0.66)`, so positions survive sorting.",
            "`sorted(..., key=lambda x: x[1])` sorts by score in ascending order, so `[-1]` is the best match.",
          ],
          ordered: true,
        },
        "With \"Tell me about Virat Kohli\" the Kohli document wins (around 0.66 with real embeddings). Change the question to \"Tell me about Bumrah\" and the Bumrah document wins.",
      ],
    },
    {
      h: "Make it closer to a real app",
      blocks: [
        "The first version re-embeds every document on every run, which wastes money and time, returns a match even for unrelated questions, and gives only one result. Fix all three:",
        { code: `# The same search, ready for real use: top-k results and a "no good match" threshold
from dotenv import load_dotenv
import numpy as np
from langchain_openai import OpenAIEmbeddings

load_dotenv()
embedding = OpenAIEmbeddings(model="text-embedding-3-small")

documents = [
    "Virat Kohli is an Indian batsman known for his aggressive, consistent run-scoring.",
    "MS Dhoni is a former Indian captain famous for his calm finishing.",
    "Sachin Tendulkar holds many of cricket's batting records.",
    "Rohit Sharma is an Indian opener known for big one-day scores.",
    "Jasprit Bumrah is an Indian fast bowler with an unusual bowling action.",
]
DOC_VECTORS = np.array(embedding.embed_documents(documents))            # embed once, reuse for every query
DOC_VECTORS /= np.linalg.norm(DOC_VECTORS, axis=1, keepdims=True)       # normalise → dot product = cosine

def search(query: str, k: int = 2, min_score: float = 0.3):
    q = np.array(embedding.embed_query(query))
    scores = DOC_VECTORS @ (q / np.linalg.norm(q))
    best = np.argsort(-scores)[:k]                                      # indexes of the k highest scores
    return [(documents[i], round(float(scores[i]), 3)) for i in best if scores[i] >= min_score]

for question in ["Who is the best fast bowler?", "Tell me about Rohit", "What is the price of onions?"]:
    print(question, "→", search(question) or "No matching document")`, lang: "python" },
        {
          list: [
            "**Embed once, reuse:** documents are embedded at start-up; only the question is embedded per search. Real systems store document vectors in a **vector database** so they survive restarts; that's Day 8.",
            "**Normalise, then use a dot product:** for unit-length vectors, the dot product equals cosine similarity, and NumPy does it for all documents at once.",
            "**Top-k with a threshold:** return the best few, and nothing if even the best score is low, so \"price of onions\" gets \"No matching document\" instead of a random cricketer. Tune the threshold on your own data; scores differ between embedding models.",
          ],
        },
        "Congratulations: search by meaning is the **retrieval** half of RAG. Add \"send the best documents and the question to a chat model\" and you have a basic RAG app, which is exactly where Days 7–9 go.",
      ],
    },
  ],
  revise: [
    "Embed documents once (`embed_documents`), embed each question (`embed_query`).",
    "Rank documents by cosine similarity with the question; the highest wins.",
    "`enumerate` keeps positions; sort by score; `[-1]` is the best.",
    "Real apps: store vectors in a vector database, return top-k, and use a minimum-score threshold.",
  ],
  check: [
    "Why use `enumerate` before sorting the scores?",
    "Why should document embeddings be stored instead of recomputed on every run?",
    "What does the threshold protect against?",
    "How would you turn this into a question-answering app?",
  ],
  practice: [
    "Replace the cricket documents with 10 FAQs from a website you use and test 5 questions, including one that shouldn't match anything.",
    "Swap `OpenAIEmbeddings` for `HuggingFaceEmbeddings` or `OllamaEmbeddings`. Do the rankings change? Do the scores?",
  ],
};

export default {
  "why-langchain": whyLangchain,
  "lc-components": lcComponents,
  "lc-models": lcModels,
  "open-models": openModels,
  "lc-embeddings": lcEmbeddings,
  "doc-similarity": docSimilarity,
};
