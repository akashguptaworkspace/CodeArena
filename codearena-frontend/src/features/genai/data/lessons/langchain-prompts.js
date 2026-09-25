// Day 5 lessons: prompts (templates, messages, chat history), structured output, output parsers, and two builds.
// Follows the CampusX LangChain playlist's order and teaching style, updated to LangChain 1.x.
// Code was checked against langchain 1.4 / langchain-core 1.6 with offline fake models and Streamlit's AppTest. Picked into d05.js.

const lcPrompts = {
  minutes: 75,
  level: "Beginner",
  intro:
    "A prompt is the message you send to an LLM, and the output is very sensitive to it. This lesson covers LangChain's prompt tools the way you'd discover them while building two real apps: a research-paper summariser (static prompts break; templates fix them) and a chatbot (it forgets; history fixes that; labelled messages make history reliable). Each tool appears only after you've seen the problem it solves.",
  recap:
    "On Day 4 you called chat models with plain strings. Today you control what goes **into** the model (this lesson), and then what comes **out** (structured output and parsers).",
  sections: [
    {
      h: "Static vs dynamic prompts",
      blocks: [
        "**Definition:** a prompt is the input you send to an LLM. Every `model.invoke(\"...\")` on Day 4 was a prompt. Prompts can be text or **multimodal** (an image, audio or video plus text, as when you upload a photo to ChatGPT and ask about it). This lesson is about text prompts, which is what you'll send almost all the time.",
        "In a real app the programmer doesn't hard-code the prompt; users supply it. So let's build a research tool with **Streamlit** (a Python library that turns a script into a web page; `uv add streamlit`).",
        "**Version 1: a static prompt.** The user types the whole prompt.",
        { code: `# prompt_ui.py, version 1: the user types the whole prompt
import streamlit as st
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

st.header("Research Tool")
user_input = st.text_input("Enter your prompt")

if st.button("Summarize"):
    result = model.invoke(user_input)
    st.write(result.content)          # st.write, not print: it shows on the page`, lang: "python", caption: "Run with `uv run streamlit run prompt_ui.py`; it opens a page in your browser." },
        "It works, but it has three problems:",
        {
          list: [
            "Users must write a good prompt every time (\"Summarise the Word2Vec paper in five lines, with an example…\").",
            "Users get too much control. A misspelt paper title can make the LLM confidently summarise a paper that doesn't exist (a hallucination).",
            "Small wording changes (\"make it maths-heavy\", \"code-heavy\") change the output a lot, so you can't guarantee a **consistent experience**, such as always including an analogy.",
          ],
          ordered: true,
        },
        "**Version 2: a dynamic prompt.** You write a **template** in advance with placeholders, and the user only fills in the blanks, through dropdowns, so there's no room for typos.",
        {
          table: {
            head: ["Placeholder", "Example choices"],
            rows: [
              ["`{paper_input}`", "Attention Is All You Need, BERT, GPT-3, Diffusion Models, Word2Vec"],
              ["`{style_input}`", "Beginner-Friendly, Technical, Code-Oriented, Mathematical"],
              ["`{length_input}`", "Short, Medium, Long"],
            ],
          },
        },
        "The template's fixed instructions enforce quality for every request: include the key equations, explain with small code snippets, use analogies, and say \"Insufficient information available\" instead of guessing. One template now serves every paper, style and length.",
      ],
    },
    {
      h: "PromptTemplate",
      blocks: [
        "`PromptTemplate` builds dynamic prompts for a **single message**: write the text with `{placeholders}`, list the variables, then fill them with `invoke()`.",
        { code: `# prompt_ui.py, version 2: dropdowns fill a template you wrote in advance
import streamlit as st
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

st.header("Research Tool")
paper_input = st.selectbox("Select research paper", ["Attention Is All You Need", "BERT", "GPT-3", "Diffusion Models", "Word2Vec"])
style_input = st.selectbox("Select explanation style", ["Beginner-Friendly", "Technical", "Code-Oriented", "Mathematical"])
length_input = st.selectbox("Select explanation length", ["Short (1-2 paragraphs)", "Medium (3-5 paragraphs)", "Long (detailed)"])

template = PromptTemplate(
    template="""Summarize the research paper "{paper_input}".
Style: {style_input}. Length: {length_input}.
Include key equations with intuitive explanations, short code snippets where useful,
and relatable analogies. If information is missing, say "Insufficient information available".""",
    input_variables=["paper_input", "style_input", "length_input"],
)

if st.button("Summarize"):
    prompt = template.invoke({"paper_input": paper_input, "style_input": style_input, "length_input": length_input})
    result = model.invoke(prompt)
    st.write(result.content)`, lang: "python" },
        "**Why not just use an f-string?** An f-string could fill the blanks too, but `PromptTemplate` gives you three things:",
        "**1. Validation.** With `validate_template=True`, LangChain checks that the placeholders in the text match `input_variables`. A typo raises an error while you develop, not on the live server:",
        { code: `from langchain_core.prompts import PromptTemplate

# A typo: the text says {lenght_input}, the list says length_input
try:
    PromptTemplate(
        template="Summarize {paper_input} in a {style_input} style, {lenght_input} long.",
        input_variables=["paper_input", "style_input", "length_input"],
        validate_template=True,
    )
except ValueError as e:
    print("Caught while developing, not on the live server:", type(e).__name__)`, lang: "python" },
        "**2. Reuse.** Keep long templates in their own files and load them where they're needed, so your main code stays short and several pages can share one prompt:",
        { lang: "text", code: `Please summarize the research paper titled "{paper_input}" with the following specifications:
Explanation style: {style_input}
Explanation length: {length_input}
1. Mathematical details:
   - Include relevant mathematical equations if present in the paper.
   - Explain the mathematical concepts using simple, intuitive code snippets where applicable.
2. Analogies:
   - Use relatable analogies to simplify complex ideas.
If certain information is not available in the paper, respond with "Insufficient information available" instead of guessing.
Ensure the summary is clear, accurate, and aligned with the provided style and length.`, caption: "prompts/summary.txt" },
        { code: `from langchain_core.prompts import PromptTemplate

# prompts/summary.txt holds the long template text, with {placeholders}
template = PromptTemplate.from_file("prompts/summary.txt")
print(template.input_variables)     # ['length_input', 'paper_input', 'style_input']`, lang: "python" },
        { note: "Older tutorials save templates with `template.save(\"template.json\")` and read them with `load_prompt(...)`. Both are deprecated in LangChain 1.x; keep prompts in text files (or a Python module) under version control instead." },
        "**3. It fits the LangChain ecosystem.** A template plugs straight into a chain; an f-string can't. Instead of calling `invoke()` twice (once on the template, once on the model), chain them and call once:",
        { code: `from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")
template = PromptTemplate.from_file("prompts/summary.txt")

chain = template | model          # fill the template, then send it to the model
result = chain.invoke({"paper_input": "Word2Vec", "style_input": "Beginner-Friendly", "length_input": "Short (1-2 paragraphs)"})
print(result.content)`, lang: "python", caption: "The chain fills the template, sends the prompt to the model and returns the result. Chains get their own day (Day 6)." },
      ],
    },
    {
      h: "Building a chatbot, and why it forgets",
      blocks: [
        "**Version 1: no memory.** A loop reads input until you type `exit` and sends each message on its own.",
        { code: `# chatbot.py, version 1: no memory
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

while True:
    user_input = input("You: ")
    if user_input == "exit":
        break
    result = model.invoke(user_input)
    print("AI:", result.content)`, lang: "python" },
        "Ask \"Which is greater, 2 or 0?\" (it says 2), then \"Now multiply the bigger number by 10\". It replies with something like \"x × 10 = 10x\" instead of 20: it has no idea what \"the bigger number\" is. Remember Day 4: **LLM calls are stateless.**",
        "**Version 2: keep the chat history.** Store every message in a list and send the whole list each time; `invoke()` accepts a single message or a list.",
        { code: `# chatbot.py, version 2: keep the history and send all of it every time
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")
chat_history = []

while True:
    user_input = input("You: ")
    if user_input == "exit":
        break
    chat_history.append(user_input)
    result = model.invoke(chat_history)     # invoke accepts one message or a list
    chat_history.append(result.content)
    print("AI:", result.content)

print(chat_history)`, lang: "python" },
        "Now the follow-up works: the model sees the history and answers 2 × 10 = 20.",
        "**The remaining problem:** the history is a plain list of strings with no record of **who said what**. In a long chat the model can't reliably tell its own earlier replies from the user's messages, and answers start to go wrong. Every message needs a label.",
      ],
    },
    {
      h: "Messages: system, human and AI",
      blocks: [
        "LangChain has message classes for exactly this. Label every message and the model always knows who said what, however long the chat.",
        {
          table: {
            head: ["Message", "Who sends it", "Example"],
            rows: [
              ["`SystemMessage`", "You, once, at the start, to set the AI's role and rules", "\"You are a helpful assistant\", \"You are a knowledgeable doctor\""],
              ["`HumanMessage`", "The user", "\"Tell me the capital of India\""],
              ["`AIMessage`", "The model's reply", "\"The capital of India is New Delhi\""],
            ],
          },
        },
        { code: `# messages.py
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

messages = [
    SystemMessage(content="You are a helpful assistant"),
    HumanMessage(content="Tell me about LangChain"),
]
result = model.invoke(messages)
messages.append(AIMessage(content=result.content))
print(messages)`, lang: "python", caption: "The printed list shows each message with its type, content and metadata." },
        "**Version 3: the chatbot with labelled messages.**",
        { code: `# chatbot.py, version 3: every message labelled system, human or AI
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")
chat_history = [SystemMessage(content="You are a helpful AI assistant")]

while True:
    user_input = input("You: ")
    if user_input == "exit":
        break
    chat_history.append(HumanMessage(content=user_input))
    result = model.invoke(chat_history)
    chat_history.append(AIMessage(content=result.content))
    print("AI:", result.content)

print(chat_history)`, lang: "python" },
        "Every entry is now labelled system, human or AI. Every chatbot in this course builds its history this way. (A fourth type, `ToolMessage`, carries a tool's result back to the model; you'll meet it on Day 12.)",
      ],
    },
    {
      h: "ChatPromptTemplate: templates for message lists",
      blocks: [
        "`ChatPromptTemplate` does for a **list of messages** what `PromptTemplate` does for one: it lets you put placeholders inside system and human messages.",
        {
          table: {
            head: ["Class", "Use it for"],
            rows: [
              ["`PromptTemplate`", "Dynamic single-message prompts"],
              ["`ChatPromptTemplate`", "Dynamic multi-message (chat) prompts"],
            ],
          },
        },
        "Example: a system message \"You are a helpful {domain} expert\" and a human message \"Explain in simple terms, what is {topic}\". Write each message as a `(role, text)` tuple:",
        { code: `# chat_prompt_template.py
from langchain_core.prompts import ChatPromptTemplate

chat_template = ChatPromptTemplate([
    ("system", "You are a helpful {domain} expert"),
    ("human", "Explain in simple terms, what is {topic}"),
])

prompt = chat_template.invoke({"domain": "cricket", "topic": "doosra"})
print(prompt.messages)`, lang: "python", caption: "Output: \"You are a helpful cricket expert\" and \"Explain in simple terms, what is doosra\"." },
        {
          warn: "A trap: if you put `SystemMessage(content=\"...{domain}...\")` **objects** inside the list, the placeholders are **not** filled. LangChain treats message objects as finished messages and prints `{domain}` as-is. Use the `(role, text)` tuples shown above.",
        },
        { code: `from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

# Message objects are treated as finished messages: their {placeholders} are NOT filled
chat_template = ChatPromptTemplate([
    SystemMessage(content="You are a helpful {domain} expert"),
    HumanMessage(content="Explain in simple terms, what is {topic}"),
])
print(chat_template.invoke({}).messages[0].content)   # You are a helpful {domain} expert`, lang: "python" },
        "You'll also see `ChatPromptTemplate.from_messages([...])` in many examples; it's the same thing.",
      ],
    },
    {
      h: "MessagesPlaceholder: slotting in saved chat history",
      blocks: [
        "**Definition:** `MessagesPlaceholder` is a special placeholder inside a `ChatPromptTemplate` that inserts a whole list of messages, usually the chat history, at run time.",
        "**Why it's needed.** On a shopping site's support chat, a customer asks for a refund on order #12345 and is told it will arrive in 3–5 business days. Two days later they start a new chat: \"Where is my refund?\" To answer, the bot needs the earlier conversation. Real apps save each chat to a database; when a new session starts, the old history is loaded and slotted into the prompt between the system message and the new question.",
        { flow: ["System message", "**MessagesPlaceholder**: the past conversation", "New human message: \"Where is my refund?\""] },
        { lang: "json", code: `[
  {"role": "human", "content": "I want to request a refund for my order #12345."},
  {"role": "ai", "content": "Your refund request for order #12345 has been initiated. It will be processed in 3-5 business days."}
]`, caption: "chat_history.json: the earlier conversation, saved by the app (a database table in production)." },
        { code: `# message_placeholder.py
import json
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 1. The chat template, with a slot for the history
chat_template = ChatPromptTemplate([
    ("system", "You are a helpful customer support agent"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{query}"),
])

# 2. Load the saved conversation (a database in a real app)
with open("chat_history.json") as f:
    chat_history = [(m["role"], m["content"]) for m in json.load(f)]

# 3. Build the final prompt
prompt = chat_template.invoke({"chat_history": chat_history, "query": "Where is my refund?"})
for message in prompt.messages:
    print(f"{message.type:>6}: {message.content}")`, lang: "python" },
        "The final prompt holds the system message, then the whole past conversation, then \"Where is my refund?\", so the model has the context it needs. `MessagesPlaceholder` is how you'll insert history in every chatbot, RAG app and agent from now on.",
        { tip: "Histories grow. Keep only recent messages (a window) or summarise older ones; Day 6 shows LangChain's `trim_messages` helper for this." },
      ],
    },
  ],
  revise: [
    "Static prompts: users type everything; inconsistent and error-prone. Dynamic prompts: you write a template, users fill blanks.",
    "`PromptTemplate`: single-message templates with `{placeholders}`; validation, reuse from files (`from_file`), and it plugs into chains.",
    "LLM calls are stateless: a chatbot must send the history every time.",
    "Label history with `SystemMessage`, `HumanMessage`, `AIMessage` so the model knows who said what.",
    "`ChatPromptTemplate`: templates for message lists; use `(role, text)` tuples (message objects don't get filled).",
    "`MessagesPlaceholder`: inserts saved chat history into a chat template at run time.",
  ],
  check: [
    "Give two problems with letting users write the whole prompt.",
    "Name three advantages of `PromptTemplate` over an f-string.",
    "How do you keep a long prompt out of your Python code and reuse it?",
    "Why did the first chatbot fail to multiply \"the bigger number\" by 10?",
    "What problem do the three message types solve?",
    "When would you use `ChatPromptTemplate` instead of `PromptTemplate`?",
    "Where does `MessagesPlaceholder` sit in a template, and what fills it?",
  ],
  mistakes: [
    "Putting message objects with `{placeholders}` inside `ChatPromptTemplate` and wondering why they aren't filled.",
    "Letting user text change the instructions: user input belongs in a human message or a placeholder, never pasted into your system prompt.",
    "Sending the entire chat history forever. Trim or summarise it, or long chats get slow and expensive.",
    "Using `save()` / `load_prompt()` from old tutorials in a 1.x project; they're deprecated.",
  ],
  interview: [
    {
      q: "PromptTemplate vs an f-string: why use the template?",
      a: "A PromptTemplate knows its input variables, can validate that the text and variables match, can be loaded from a file and shared, and is a Runnable, so it composes into chains (`template | model | parser`) and supports invoke, batch and stream. An f-string is just a string built in place.",
    },
    {
      q: "What is MessagesPlaceholder for?",
      a: "It reserves a slot in a ChatPromptTemplate for a variable-length list of messages, usually the conversation history loaded from a database, so the prompt becomes system message, past messages, then the new question. It's also used for few-shot example messages or an agent's scratchpad.",
    },
    {
      q: "How do you give a chatbot memory?",
      a: "LLM calls are stateless, so you store the conversation (labelled system, human and AI messages) and send it with each call, typically through a MessagesPlaceholder. To control cost, keep a window of recent messages, summarise older ones, or store long-term facts separately. Agents in LangChain 1.x get this from LangGraph checkpointers.",
    },
  ],
};

const lcStructured = {
  minutes: 70,
  level: "Beginner",
  intro:
    "Until now LLMs talked to people, in free text. Structured output lets them talk to **other software**: databases, APIs, and the tools agents call. This lesson shows why that matters, then the three ways to describe the shape you want (TypedDict, Pydantic and JSON Schema) with LangChain's `with_structured_output`.",
  recap:
    "The previous lesson controlled the input to an LLM. This lesson and the next control the **output**.",
  sections: [
    {
      h: "Unstructured vs structured output",
      blocks: [
        "Normally you send text and get text: \"What is the capital of India?\" → \"New Delhi is the capital of India.\" Plain text has no structure, so it's **unstructured output**.",
        "Ask for a one-day Paris itinerary and you'd usually get prose: the Eiffel Tower in the morning, a museum in the afternoon, dinner by the river. **Structured output** returns the same content in a fixed data format:",
        {
          lang: "json",
          code: `[
  {"time": "Morning", "activity": "Visit the Eiffel Tower"},
  {"time": "Afternoon", "activity": "Walk through the Louvre Museum"},
  {"time": "Evening", "activity": "Dinner at a café by the Seine"}
]`,
        },
        "**Definition:** in LangChain, structured output means the model returns its response in a well-defined data format, such as JSON, rather than free text, so your code can parse and use it directly.",
        { flow: ["LLM", ["↔ Humans: text", "↔ Databases: structured data", "↔ APIs: structured data", "↔ Agent tools: structured data"]] },
      ],
    },
    {
      h: "Why it matters: three use cases",
      blocks: [
        {
          table: {
            head: ["Use case", "How structured output helps", "Example"],
            rows: [
              ["**Data extraction**", "Pull key fields out of text and store them in a database", "A job portal extracts name, last company, and 10th, 12th and college marks from every uploaded resume as JSON, then inserts them into its database"],
              ["**Building APIs**", "Turn long, messy text into clean fields other apps can use", "Break product reviews into topics (battery, display, processor), pros, cons and sentiment, and serve them from FastAPI"],
              ["**Agents**", "Tools need exact inputs, not prose", "Asked \"find the square root of 2\", an agent extracts the operation (square root) and the number (2) to call its calculator tool"],
            ],
          },
        },
        "There are two ways to get structured output in LangChain:",
        {
          table: {
            head: ["Model", "Approach", "Covered in"],
            rows: [
              ["Models with native structured-output support (OpenAI, Claude, Gemini and most modern models)", "`with_structured_output(schema)`", "This lesson"],
              ["Models that can't produce it themselves (many small open models)", "**Output parsers**: classes that give structure to any model's text", "Next lesson"],
            ],
          },
        },
        "The flow is the same as before with one extra step: before calling the model, call `with_structured_output()` and pass it your schema (the data format). There are three ways to write a schema.",
      ],
    },
    {
      h: "Schema option 1: TypedDict",
      blocks: [
        "**Definition:** `TypedDict` defines a Python dictionary with fixed keys and a type for each value. It keeps a dictionary's shape consistent, and your editor shows the expected types.",
        { code: `from typing import TypedDict

class Person(TypedDict):
    name: str
    age: int

new_person: Person = {"name": "Asha", "age": 35}
print(new_person)

wrong: Person = {"name": "Ravi", "age": "35"}   # runs fine: TypedDict is only a hint
print(wrong)`, lang: "python" },
        "**Limitation:** `TypedDict` is only a type hint. There's no validation: `\"age\": \"35\"` still runs without error.",
        "**Demo: analysing a phone review.** Send a review and get back a dictionary with a `summary` and a `sentiment`:",
        { code: `# with_structured_output_typeddict.py
from typing import TypedDict
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

class Review(TypedDict):
    summary: str
    sentiment: str

structured_model = model.with_structured_output(Review)

result = structured_model.invoke(
    "The hardware is great, but the software feels bloated. "
    "Too many pre-installed apps I can't remove, and updates are slow."
)
print(type(result))            # <class 'dict'>
print(result["summary"])
print(result["sentiment"])`, lang: "python" },
        "**How does it know?** The prompt never asked for a summary or sentiment. Behind the scenes, `with_structured_output()` sends your schema to the provider (using its structured-output or tool-calling feature), so the model returns JSON with exactly those keys, which LangChain turns into a Python `dict`.",
        "**Adding detail.** Use `Annotated` to attach a description to each field so the model knows exactly what to put there, `Optional` for fields that may be missing, and `Literal` to restrict a field to fixed choices:",
        { code: `from typing import Annotated, Literal, Optional, TypedDict
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

class Review(TypedDict):
    key_themes: Annotated[list[str], "All the key themes discussed in the review, as a list"]
    summary: Annotated[str, "A brief summary of the review"]
    sentiment: Annotated[Literal["pos", "neg"], "Sentiment of the review: pos or neg"]
    pros: Annotated[Optional[list[str]], "The pros, only if the review explicitly mentions them"]
    cons: Annotated[Optional[list[str]], "The cons, only if the review explicitly mentions them"]
    name: Annotated[Optional[str], "The reviewer's name, if given"]

review = """I recently upgraded to the Samsung Galaxy S24 Ultra, and it's an absolute powerhouse!
The Snapdragon 8 Gen 3 processor makes everything lightning fast, whether I'm gaming or multitasking.
The 5000mAh battery easily lasts a full day even with heavy use, and 45W fast charging is a lifesaver.
The S-Pen integration is great for note-taking and quick sketches. The 200MP camera is stunning,
especially in night mode, and the 100x space zoom is fun for distant shots.
However, the weight and size make it uncomfortable for one-handed use, Samsung's One UI still comes
with bloatware, and the price tag of ₹1,30,000 is hard to swallow.
Review by Nitin Sharma"""

result = model.with_structured_output(Review).invoke(review)
for key, value in result.items():
    print(f"{key}: {value}")`, lang: "python" },
        "The result includes key themes (processor, battery, fast charging…), a summary, `pos` as sentiment, lists of pros and cons, and the reviewer's name.",
        { warn: "Models infer. Remove the cons from the review and the model may still invent some from the text. Say it plainly in the description (\"only if explicitly mentioned\"), and test with inputs that lack the field." },
      ],
    },
    {
      h: "Schema option 2: Pydantic",
      blocks: [
        "**Definition:** Pydantic is a data validation and parsing library. It makes sure the data you work with is correct, structured and type-safe; FastAPI uses it to validate request bodies (you used it on Day 2). The syntax looks like `TypedDict`, but Pydantic **enforces** the types.",
        { code: `from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ValidationError

class Student(BaseModel):
    name: str = "asha"                        # default value
    age: Optional[int] = None                 # optional field
    email: EmailStr                           # built-in email validation (uv add "pydantic[email]")
    cgpa: float = Field(gt=0, lt=10, default=5.0, description="CGPA of the student, between 0 and 10")

student = Student(**{"age": "32", "email": "abc@gmail.com"})
print(student)                 # name='asha' age=32 email='abc@gmail.com' cgpa=5.0  ← "32" became 32
print(student.name)            # dot access
print(student.model_dump())    # → a dict
print(student.model_dump_json())

for bad in [{"name": 32, "email": "a@b.com"}, {"email": "abc"}, {"email": "a@b.com", "cgpa": 12}]:
    try:
        Student(**bad)
    except ValidationError as e:
        print("Rejected:", e.errors()[0]["msg"])`, lang: "python" },
        {
          table: {
            head: ["Feature", "What happens"],
            rows: [
              ["Type validation", "`Student(name=32)` raises: input should be a valid string"],
              ["Default values", "A missing `name` falls back to `\"asha\"`"],
              ["Optional fields", "A missing `age` becomes `None`"],
              ["Type coercion", "`\"32\"` (a string) becomes the integer 32"],
              ["Built-in validators", "`EmailStr` rejects `\"abc\"`"],
              ["`Field()`", "Constraints (`gt`, `lt`, `max_length`, regex `pattern`), defaults and descriptions"],
              ["Conversion", "`model_dump()` → dict, `model_dump_json()` → JSON string"],
            ],
          },
        },
        "**Pydantic with `with_structured_output()`.** The phone-review schema, rewritten:",
        { code: `from typing import Literal, Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

class Review(BaseModel):
    key_themes: list[str] = Field(description="All the key themes discussed in the review, as a list")
    summary: str = Field(description="A brief summary of the review")
    sentiment: Literal["pos", "neg"] = Field(description="Sentiment of the review: pos or neg")
    pros: Optional[list[str]] = Field(default=None, description="The pros, only if explicitly mentioned")
    cons: Optional[list[str]] = Field(default=None, description="The cons, only if explicitly mentioned")
    name: Optional[str] = Field(default=None, description="The reviewer's name, if given")

structured_model = model.with_structured_output(Review)
result = structured_model.invoke("Great battery and camera, but it's heavy and overpriced. Review by Nitin Sharma")

print(type(result).__name__)   # Review: a Pydantic object
print(result.name)             # dot access, not result["name"]
print(result.sentiment, result.pros, result.cons)`, lang: "python" },
        "You get a Pydantic object (use dot access: `result.name`), and invalid data is caught. It's more powerful than `TypedDict`, and it's what you'll use most.",
      ],
    },
    {
      h: "Schema option 3: JSON Schema",
      blocks: [
        "Use JSON Schema when the schema must be shared across languages, for example a Python backend and a JavaScript frontend that both validate the same data. JSON is universal.",
        {
          table: {
            head: ["Key", "Purpose"],
            rows: [
              ["`title`, `description`", "Name and explain the schema"],
              ["`type: \"object\"`, `properties`", "An object and its fields"],
              ["`type` per field", "`string`, `integer`, `number`, `boolean`, `array` (with `items`), `null`"],
              ["`enum`", "Restrict to fixed values (like `Literal`)"],
              ["`[\"array\", \"null\"]`", "A field that may be missing (like `Optional`)"],
              ["`required`", "Fields that must be present"],
            ],
          },
        },
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

review_schema = {
    "title": "Review",
    "description": "A structured summary of a product review",
    "type": "object",
    "properties": {
        "key_themes": {"type": "array", "items": {"type": "string"}, "description": "All the key themes discussed"},
        "summary": {"type": "string", "description": "A brief summary of the review"},
        "sentiment": {"type": "string", "enum": ["pos", "neg"], "description": "Sentiment: pos or neg"},
        "pros": {"type": ["array", "null"], "items": {"type": "string"}, "description": "The pros, if any"},
        "cons": {"type": ["array", "null"], "items": {"type": "string"}, "description": "The cons, if any"},
        "name": {"type": ["string", "null"], "description": "The reviewer's name, if given"},
    },
    "required": ["key_themes", "summary", "sentiment"],
}

result = model.with_structured_output(review_schema).invoke("Great camera, weak battery. Review by Nitin.")
print(type(result), result)    # a plain dict`, lang: "python" },
        "Like `TypedDict`, the result is a plain Python dictionary.",
      ],
    },
    {
      h: "Which schema, and which method",
      blocks: [
        {
          table: {
            head: ["Feature", "TypedDict", "Pydantic", "JSON Schema"],
            rows: [
              ["Basic structure", "Yes", "Yes", "Yes"],
              ["Type enforcement", "Hints only", "Yes", "Yes"],
              ["Data validation", "No", "Yes", "Yes"],
              ["Default values", "No", "Yes", "No"],
              ["Automatic type conversion", "No", "Yes", "No"],
              ["Cross-language", "No", "No", "Yes"],
              ["Result type", "`dict`", "Pydantic object", "`dict`"],
            ],
          },
        },
        "**Default to Pydantic** in Python projects. Use `TypedDict` only for quick hints without validation, and JSON Schema when other languages share the schema.",
        "`with_structured_output()` also takes a `method` argument that sets how the provider produces the structure:",
        {
          table: {
            head: ["`method`", "How it works", "Default for"],
            rows: [
              ["`\"json_schema\"`", "The provider's native structured-output feature constrains the reply to your schema", "OpenAI and Gemini in LangChain 1.x"],
              ["`\"function_calling\"`", "The schema becomes a tool, and the model \"calls\" it with the fields as arguments", "Anthropic (Claude)"],
              ["`\"json_mode\"`", "The model is only told to return valid JSON; your schema guides it through the prompt", "Fallback for models with JSON mode only"],
            ],
          },
        },
        { code: `from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

load_dotenv()

class Person(BaseModel):
    name: str
    age: int

model = ChatOpenAI(model="gpt-4o-mini")

# The default for OpenAI is the provider's native JSON-schema feature. You can pick another method:
extract = model.with_structured_output(Person, method="function_calling")

# include_raw=True never raises: you get the raw message, the parsed object, and any parsing error
safe_extract = model.with_structured_output(Person, include_raw=True)
out = safe_extract.invoke("Asha is 29 and lives in Pune.")
print(out.keys())              # dict_keys(['raw', 'parsed', 'parsing_error'])
print(out["parsed"])`, lang: "python" },
        "In production, use `include_raw=True` (or catch the error): if the model's reply can't be parsed, you get the raw message and the error instead of a crash, so you can retry or log it.",
        "**Models without support.** Swap in a small open model such as TinyLlama through `ChatHuggingFace` and `with_structured_output()` raises an error: the model supports neither tool calling nor JSON mode. For those models you need **output parsers**, next.",
      ],
    },
  ],
  revise: [
    "Unstructured output is text; structured output follows a defined format such as JSON.",
    "Structured output lets LLMs feed databases, APIs and agent tools, not just people.",
    "`model.with_structured_output(schema)` for models that support it; output parsers for the rest.",
    "TypedDict: hints only. Pydantic: validation, defaults, coercion (default choice). JSON Schema: cross-language.",
    "`Annotated` / `Field(description=...)` guide the model; `Optional` = may be missing; `Literal` / `enum` = fixed choices.",
    "`method`: `json_schema` (OpenAI, Gemini default), `function_calling` (Claude default), `json_mode` (fallback).",
    "`include_raw=True` returns raw, parsed and parsing_error instead of raising.",
  ],
  check: [
    "What makes output \"structured\" rather than \"unstructured\"?",
    "Describe one use case each for data extraction, APIs and agents.",
    "How does the model know to return a summary and a sentiment when the prompt never asks for them?",
    "What does `TypedDict` fail to do that Pydantic does?",
    "How do you make a field optional in TypedDict, Pydantic and JSON Schema?",
    "When would you choose JSON Schema over Pydantic?",
    "Why would `with_structured_output()` fail with a small local model?",
  ],
  mistakes: [
    "Using `result[\"name\"]` on a Pydantic result (use `result.name`), or `result.name` on a TypedDict result.",
    "Vague field descriptions. The description is part of the prompt; write it like an instruction.",
    "Trusting extracted values blindly. Validate with Pydantic constraints and handle `parsing_error`.",
    "Required fields for data that may not exist; the model will invent something. Make them optional.",
  ],
  interview: [
    {
      q: "How do you get reliable JSON out of an LLM in LangChain?",
      a: "Define a Pydantic model and call `model.with_structured_output(Model)`. It uses the provider's native structured output or tool calling, so the reply matches the schema, and Pydantic validates types and constraints. Handle failures with `include_raw=True` or a retry. For models without native support, use a `PydanticOutputParser` with format instructions in the prompt.",
    },
    {
      q: "TypedDict vs Pydantic vs JSON Schema for structured output?",
      a: "TypedDict gives type hints only and returns a dict, with no validation. Pydantic validates, coerces types, supports defaults and constraints, and returns an object: the usual choice in Python. JSON Schema is a language-neutral dict, useful when the schema is shared with other services or a frontend; it also returns a dict.",
    },
  ],
};

const outputParsers = {
  minutes: 60,
  level: "Beginner",
  intro:
    "Output parsers turn any model's raw text into structured data: plain strings, JSON, or validated Pydantic objects. They work with every model, including small open-source ones that can't do structured output natively, and one of them, `StrOutputParser`, will appear in almost every chain you write.",
  recap:
    "LLM replies are usually text that databases and APIs can't use. `with_structured_output()` fixes that for models with native support. Parsers fix it for **every** model.",
  sections: [
    {
      h: "What output parsers are",
      blocks: [
        "**Definition:** output parsers convert raw LLM responses into structured formats such as JSON, CSV or Pydantic objects. They make output consistent, validated and easy to use in code.",
        "LangChain has many parsers, but four cover most needs. Each fixes the previous one's weakness:",
        { flow: ["**StrOutputParser**: plain string", "**JsonOutputParser**: any JSON", "**StructuredOutputParser**: JSON with your fields", "**PydanticOutputParser**: fields + validation"] },
      ],
    },
    {
      h: "Parser 1: StrOutputParser",
      blocks: [
        "`StrOutputParser` is the simplest: it takes the model's response and returns just the text. A chat model returns an `AIMessage` with metadata, which is why you've been printing `result.content`; the parser does that for you. Its real value is in **chains**.",
        "**Use case: report, then summary.** Ask for a detailed report on a topic, then send that report back and ask for a five-line summary.",
        "Without a parser you pull `.content` out by hand between the steps:",
        { code: `# stroutputparser.py, without a parser: pull .content out by hand between steps
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

template1 = PromptTemplate.from_template("Write a detailed report on {topic}")                       # 1st prompt
template2 = PromptTemplate.from_template("Write a 5 line summary on the following text.\\n{text}")     # 2nd prompt

prompt1 = template1.invoke({"topic": "black hole"})
result = model.invoke(prompt1)

prompt2 = template2.invoke({"text": result.content})
result1 = model.invoke(prompt2)
print(result1.content)`, lang: "python" },
        "With `StrOutputParser` the whole flow becomes one chain:",
        { code: `from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")
template1 = PromptTemplate.from_template("Write a detailed report on {topic}")
template2 = PromptTemplate.from_template("Write a 5 line summary on the following text.\\n{text}")

parser = StrOutputParser()
chain = template1 | model | parser | template2 | model | parser

print(chain.invoke({"topic": "black hole"}))`, lang: "python" },
        { flow: ["template1", "model", "parser → report text", "template2", "model", "parser → summary text"] },
        "The single chain works only because the parser turns each model result into plain text that the next template can use.",
        { note: "This works with any model: OpenAI, Claude, Gemini, or open models through `ChatHuggingFace` and `ChatOllama`. Free hosted APIs can time out; if one does, switch to a local model or a paid one." },
      ],
    },
    {
      h: "Parser 2: JsonOutputParser",
      blocks: [
        "`JsonOutputParser` gets JSON from any model. It's the quickest way to get a dictionary, but it **can't enforce a particular shape**.",
        "**How format instructions work:** the parser supplies extra instructions for the prompt through `get_format_instructions()`. You add them as a **partial variable**: a placeholder filled in advance by your code, not by the user at run time.",
        { code: `# jsonoutputparser.py
from dotenv import load_dotenv
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")
parser = JsonOutputParser()

template = PromptTemplate(
    template="Give me the name, age and city of a fictional person\\n{format_instruction}",
    input_variables=[],
    partial_variables={"format_instruction": parser.get_format_instructions()},
)
print(template.format())       # your text + "Return a JSON object."

# Without a chain
result = model.invoke(template.format())
final_result = parser.parse(result.content)
print(final_result, type(final_result))       # {'name': ..., 'age': ..., 'city': ...} <class 'dict'>

# With a chain: no input variables, so pass an empty dict
chain = template | model | parser
print(chain.invoke({}))`, lang: "python" },
        "Because the template has no input variables, you call `chain.invoke({})` with an empty dict. Leaving the argument out raises \"missing 1 required positional argument: input\".",
        "**The limitation: no schema.** Ask for \"5 facts about black holes\" and the model decides the shape; it might return one key holding a list. If you need `fact_1`, `fact_2`, `fact_3` as separate keys, `JsonOutputParser` can't guarantee it. You can ask in the prompt, but the model may ignore you.",
      ],
    },
    {
      h: "Parser 3: StructuredOutputParser",
      blocks: [
        "**Definition:** `StructuredOutputParser` extracts JSON that follows predefined fields. You describe each field with a `ResponseSchema`, and the format instructions tell the model the exact shape.",
        { code: `# structuredoutputparser.py
from dotenv import load_dotenv
from langchain_classic.output_parsers import ResponseSchema, StructuredOutputParser   # 0.x: from langchain.output_parsers
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

schema = [                                      # one ResponseSchema per field you want
    ResponseSchema(name="fact_1", description="Fact 1 about the topic"),
    ResponseSchema(name="fact_2", description="Fact 2 about the topic"),
    ResponseSchema(name="fact_3", description="Fact 3 about the topic"),
]
parser = StructuredOutputParser.from_response_schemas(schema)

template = PromptTemplate(
    template="Give 3 facts about {topic}\\n{format_instruction}",
    input_variables=["topic"],
    partial_variables={"format_instruction": parser.get_format_instructions()},
)

chain = template | model | parser
print(chain.invoke({"topic": "black hole"}))    # {'fact_1': '...', 'fact_2': '...', 'fact_3': '...'}`, lang: "python" },
        { note: "Import path: in LangChain 0.x this lived in `langchain.output_parsers`. In 1.x it moved to the **`langchain-classic`** package (`uv add langchain-classic`), because newer code uses Pydantic parsers or `with_structured_output` instead. You'll still meet it in tutorials and older codebases." },
        "**The limitation: no validation.** The schema sets the keys, not the data types. Ask for a person's name, age and city with age as a number, and the model may still return `\"35 years\"`. You can ask for an integer, but you can't enforce it.",
      ],
    },
    {
      h: "Parser 4: PydanticOutputParser",
      blocks: [
        "**Definition:** `PydanticOutputParser` uses a Pydantic model to both **enforce the structure** and **validate the data**.",
        {
          table: {
            head: ["Feature", "Meaning"],
            rows: [
              ["Strict schema", "Exact fields, types and constraints"],
              ["Type safety", "Slightly wrong types are coerced where possible (\"32\" → 32)"],
              ["Validation", "Pydantic constraints (`gt`, `max_length`, email checks…) raise errors on bad data"],
              ["Works in chains", "`template | model | parser` like the others"],
            ],
          },
        },
        "**Demo:** a fictional person's name, age and city, where age must be an integer above 18.",
        { code: `# pydanticoutputparser.py
from dotenv import load_dotenv
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini")

class Person(BaseModel):
    name: str = Field(description="Name of the person")
    age: int = Field(gt=18, description="Age of the person")
    city: str = Field(description="Name of the city the person belongs to")

parser = PydanticOutputParser(pydantic_object=Person)

template = PromptTemplate(
    template="Generate the name, age and city of a fictional {place} person\\n{format_instruction}",
    input_variables=["place"],
    partial_variables={"format_instruction": parser.get_format_instructions()},
)
print(template.invoke({"place": "Indian"}).text)     # see the instructions the parser adds

chain = template | model | parser
person = chain.invoke({"place": "Sri Lankan"})
print(person)                                        # name='...' age=... city='...'
print(person.age + 1)                                # a real int, validated to be above 18`, lang: "python" },
        "**What the model actually sees:** print the prompt and you'll see your text followed by a long block from the parser. It tells the model to return a JSON instance that conforms to a JSON schema, shows an example, then lists your fields and which are required. That's how a model with no native structured-output support still returns the right shape.",
      ],
    },
    {
      h: "Choosing a parser (and when to use with_structured_output instead)",
      blocks: [
        {
          table: {
            head: ["Parser", "Returns", "Enforces a schema", "Validates data", "Import from", "Best for"],
            rows: [
              ["`StrOutputParser`", "`str`", "No", "No", "`langchain_core`", "Passing text between steps in chains"],
              ["`JsonOutputParser`", "`dict`", "No", "No", "`langchain_core`", "Quick JSON when the shape doesn't matter"],
              ["`StructuredOutputParser`", "`dict`", "Yes", "No", "`langchain_classic`", "A fixed shape in older code"],
              ["`PydanticOutputParser`", "Pydantic object", "Yes", "Yes", "`langchain_core`", "A fixed shape with validated types"],
            ],
          },
        },
        "The common pattern for the last three:",
        {
          list: [
            "Create the parser (with a schema for the last two).",
            "Add `parser.get_format_instructions()` to the prompt as a partial variable.",
            "Build `chain = template | model | parser` and call `chain.invoke({...})`; the chain calls `parse()` for you.",
          ],
          ordered: true,
        },
        {
          table: {
            head: ["Situation", "Use"],
            rows: [
              ["The model supports structured output (OpenAI, Claude, Gemini, most modern models)", "`with_structured_output(PydanticModel)`: more reliable, because the provider enforces the schema"],
              ["Small or older open models without tool calling or JSON mode", "`PydanticOutputParser` with format instructions"],
              ["You just need the text from a chain step", "`StrOutputParser`"],
              ["Other formats", "`CommaSeparatedListOutputParser`, `XMLOutputParser`, `JsonOutputParser` (can stream partial JSON)"],
            ],
          },
        },
        "**When parsing fails**, parsers raise `OutputParserException`. `OutputFixingParser` (in `langchain_classic`) catches that, sends the bad output and the error back to a model, and asks it to fix the format:",
        { code: `from dotenv import load_dotenv
from langchain_classic.output_parsers import OutputFixingParser
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

load_dotenv()
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

class Person(BaseModel):
    name: str
    age: int

parser = PydanticOutputParser(pydantic_object=Person)
fixing = OutputFixingParser.from_llm(parser=parser, llm=model)

bad_output = "{'name': 'Asha', 'age': 'twenty nine'}"     # single quotes and a word, not JSON
print(fixing.parse(bad_output))                         # asks the model to repair it, then parses again`, lang: "python" },
      ],
    },
  ],
  revise: [
    "Output parsers convert raw LLM text into structured formats, and work with any model.",
    "`StrOutputParser`: text only; the glue in chains (no more `result.content`).",
    "`JsonOutputParser`: JSON, but the model picks the shape.",
    "`StructuredOutputParser`: fixed fields via `ResponseSchema`, no type validation; now in `langchain_classic`.",
    "`PydanticOutputParser`: fixed fields plus validation.",
    "Format instructions (`get_format_instructions()`) go in as a partial variable; that's how the model learns the format.",
    "Prefer `with_structured_output` when the model supports it; parsers for the rest.",
  ],
  check: [
    "Why is `StrOutputParser` useful if you can just print `result.content`?",
    "What is a partial variable, and why are format instructions one?",
    "Why must you pass `{}` to `chain.invoke()` when a prompt has no input variables?",
    "What can `StructuredOutputParser` do that `JsonOutputParser` can't?",
    "Give an example of bad data that `PydanticOutputParser` would catch but `StructuredOutputParser` wouldn't.",
    "What does `OutputFixingParser` do?",
  ],
  interview: [
    {
      q: "When do you need an output parser instead of with_structured_output?",
      a: "When the model has no native structured output (many small open models), when you need a text format like a comma-separated list or XML, or simply to extract text in a chain (`StrOutputParser`). With capable models, `with_structured_output` is more reliable because the provider constrains the output to the schema, while parsers depend on the model following format instructions in the prompt.",
    },
    {
      q: "How does PydanticOutputParser get a model to return the right JSON?",
      a: "It generates format instructions from the Pydantic model's JSON schema (the fields, types, descriptions and which are required) that you insert into the prompt, usually as a partial variable. After the model replies, it parses the JSON and validates it with Pydantic, raising `OutputParserException` if it doesn't fit, which you can handle with a retry or `OutputFixingParser`.",
    },
  ],
};

const paperSummarizer = {
  minutes: 60,
  level: "Beginner",
  intro:
    "Build the research-paper summariser from the prompts lesson as a proper small app: a prompt kept in a file, dropdowns so users can't type a bad prompt, a chain, and an answer that streams onto the page as it's written. It's a nice first portfolio piece because anyone can use it.",
  sections: [
    {
      h: "What you're building",
      blocks: [
        { flow: ["User picks paper, style and length", "PromptTemplate (from prompts/summary.txt)", "Chat model", "StrOutputParser", "Summary streams onto the page"] },
        {
          lang: "bash",
          code: `mkdir paper-summariser && cd paper-summariser
uv init --no-readme .
uv add streamlit langchain-core langchain-openai python-dotenv
mkdir prompts`,
        },
      ],
    },
    {
      h: "The prompt, in its own file",
      blocks: [
        "A detailed template does the heavy lifting: it fixes the quality rules (equations, code, analogies, no guessing) for every request.",
        { lang: "text", code: `Please summarize the research paper titled "{paper_input}" with the following specifications:
Explanation style: {style_input}
Explanation length: {length_input}
1. Mathematical details:
   - Include relevant mathematical equations if present in the paper.
   - Explain the mathematical concepts using simple, intuitive code snippets where applicable.
2. Analogies:
   - Use relatable analogies to simplify complex ideas.
If certain information is not available in the paper, respond with "Insufficient information available" instead of guessing.
Ensure the summary is clear, accurate, and aligned with the provided style and length.`, caption: "prompts/summary.txt" },
      ],
    },
    {
      h: "The app",
      blocks: [
        { code: `# app.py: research-paper summariser
import streamlit as st
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()

PAPERS = ["Attention Is All You Need", "BERT", "GPT-3", "Diffusion Models", "Word2Vec", "LoRA", "Retrieval-Augmented Generation"]
STYLES = ["Beginner-Friendly", "Technical", "Code-Oriented", "Mathematical"]
LENGTHS = ["Short (1-2 paragraphs)", "Medium (3-5 paragraphs)", "Long (detailed explanation)"]

@st.cache_resource                      # build the chain once, not on every click
def get_chain():
    template = PromptTemplate.from_file("prompts/summary.txt")
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    return template | model | StrOutputParser()

st.set_page_config(page_title="Research Tool", page_icon="📄")
st.header("📄 Research paper summariser")

paper_input = st.selectbox("Research paper", PAPERS)
style_input = st.selectbox("Explanation style", STYLES)
length_input = st.selectbox("Explanation length", LENGTHS)

if st.button("Summarize", type="primary"):
    inputs = {"paper_input": paper_input, "style_input": style_input, "length_input": length_input}
    with st.spinner("Reading the paper…"):
        summary = st.write_stream(get_chain().stream(inputs))    # words appear as they're generated
    st.download_button("Download as Markdown", summary, file_name=f"{paper_input}.md")`, lang: "python", caption: "app.py. Run with `uv run streamlit run app.py`." },
        {
          list: [
            "`@st.cache_resource` builds the chain once. Streamlit re-runs the whole script on every click, so without it you'd recreate the model each time.",
            "`chain.stream(inputs)` yields text chunks (the parser turns each message chunk into text); `st.write_stream` shows them as they arrive and returns the full text.",
            "Dropdown values fill the template, so users choose **what** to summarise but can't change **how** you instruct the model.",
            "`temperature=0.3` keeps summaries factual but not robotic.",
          ],
        },
      ],
    },
    {
      h: "Make it yours",
      blocks: [
        {
          list: [
            "Add a sidebar select for the model (`gpt-4o-mini`, a Gemini model, or `ChatOllama` for free local runs) using `init_chat_model`.",
            "Let users paste an arXiv link and summarise the real abstract (fetch it with `httpx`), so the model summarises the text instead of relying on memory.",
            "Save each summary with its inputs to SQLite and show a history page.",
            "Deploy it free on Streamlit Community Cloud, with your API key in the app's secrets, not in the code.",
          ],
        },
        { warn: "Summarising a paper from its title alone relies on the model's memory, which can be wrong for less famous papers. The \"Insufficient information available\" rule reduces made-up details, and feeding the real text (from Day 7's loaders) removes most of them." },
      ],
    },
  ],
  revise: [
    "Keep long prompts in files; load with `PromptTemplate.from_file`.",
    "`template | model | StrOutputParser()` is the basic text chain.",
    "Streamlit re-runs the script on each interaction: cache expensive objects with `st.cache_resource`.",
    "`st.write_stream(chain.stream(...))` streams the answer onto the page.",
  ],
  practice: [
    "Add a \"Compare two papers\" mode with two dropdowns and one prompt.",
    "Add a checkbox \"Include 3 quiz questions\" that switches between two prompt files.",
  ],
};

const reviewAnalyzer = {
  minutes: 60,
  level: "Beginner",
  intro:
    "Turn free-text product reviews into validated data a business can use: themes, a one-line summary, sentiment, a guessed star rating, pros, cons and the reviewer's name, saved to CSV. It's the \"building APIs\" and \"data extraction\" use cases from the structured-output lesson, in about 40 lines.",
  sections: [
    {
      h: "Design the schema first",
      blocks: [
        "The schema is the contract between the model and the rest of your code, and the field descriptions are instructions to the model. Decide:",
        {
          list: [
            "Fixed choices where you'll filter or chart: `sentiment` is `Literal[\"positive\", \"negative\", \"mixed\"]`, not free text.",
            "Constraints for anything numeric: `rating_guess` must be 1–5.",
            "Lists default to empty and only hold what the review **explicitly** says, so the model doesn't invent pros and cons.",
            "`reviewer` is optional: most reviews don't name anyone.",
          ],
        },
      ],
    },
    {
      h: "Build it",
      blocks: [
        { lang: "bash", code: "uv add langchain-openai python-dotenv pydantic" },
        { code: `# review_analyzer.py: product reviews → validated data you can store and chart
import csv
from typing import Literal, Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

load_dotenv()

class Review(BaseModel):
    key_themes: list[str] = Field(description="Main topics discussed, e.g. battery, camera, price (1-5 short phrases)")
    summary: str = Field(description="One-sentence summary of the review")
    sentiment: Literal["positive", "negative", "mixed"] = Field(description="Overall sentiment")
    rating_guess: int = Field(ge=1, le=5, description="The star rating this review most likely gave, 1-5")
    pros: list[str] = Field(default_factory=list, description="Pros explicitly mentioned; empty list if none")
    cons: list[str] = Field(default_factory=list, description="Cons explicitly mentioned; empty list if none")
    reviewer: Optional[str] = Field(default=None, description="Reviewer's name only if the review states it")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
analyzer = model.with_structured_output(Review, include_raw=True)

REVIEWS = [
    "Battery easily lasts two days and the display is gorgeous. Camera is average in low light. - Priya",
    "Stopped charging after 3 weeks. Service centre in Pune asked me to wait 10 days. Never again.",
    "Decent phone for the price. Nothing special, nothing bad.",
]

rows = []
for outcome in analyzer.batch(REVIEWS):          # all reviews in parallel
    if outcome["parsing_error"] or outcome["parsed"] is None:
        print("Skipped a review the model couldn't structure:", outcome["parsing_error"])
        continue
    review: Review = outcome["parsed"]
    print(f"{review.sentiment:>8} {review.rating_guess}★  {review.summary}")
    rows.append({**review.model_dump(), "key_themes": "; ".join(review.key_themes),
                 "pros": "; ".join(review.pros), "cons": "; ".join(review.cons)})

with open("reviews.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(Review.model_fields))
    writer.writeheader()
    writer.writerows(rows)
print(f"Saved {len(rows)} reviews to reviews.csv")`, lang: "python" },
        {
          list: [
            "`with_structured_output(Review, include_raw=True)` returns raw, parsed and parsing_error for each review, so one bad review is logged and skipped instead of crashing the batch.",
            "`analyzer.batch(REVIEWS)` processes all reviews in parallel.",
            "`model_dump()` turns each validated object into a dict for the CSV; lists are joined with `;` for spreadsheet use.",
            "`temperature=0` because this is extraction, not creative writing.",
          ],
        },
      ],
    },
    {
      h: "Take it further",
      blocks: [
        {
          list: [
            "Wrap it in a FastAPI endpoint: `POST /analyze` takes `{\"text\": ...}` and returns the `Review` JSON (FastAPI already speaks Pydantic).",
            "Run it on 200 real reviews from a CSV, then chart sentiment and the top 10 cons with pandas.",
            "Point it at a local model through `ChatOllama`. If structured output fails, switch to a `PydanticOutputParser` chain and compare how often each approach fails.",
            "Write 5 test reviews with known answers (for example, one with no cons) and check the output automatically: your first eval.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Design the schema with fixed choices, constraints, optional fields and instruction-like descriptions.",
    "`include_raw=True` + `batch()` = robust bulk extraction.",
    "Validated Pydantic objects go straight into CSVs, databases and API responses.",
  ],
  practice: [
    "Add a `product_aspects` field: a list of `{aspect, sentiment}` objects (a nested Pydantic model).",
    "Measure how often `parsing_error` is set across 50 reviews with two different models.",
  ],
};

export default {
  "lc-prompts": lcPrompts,
  "lc-structured": lcStructured,
  "output-parsers": outputParsers,
  "paper-summarizer": paperSummarizer,
  "review-analyzer": reviewAnalyzer,
};
