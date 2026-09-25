// Day 4: LLM APIs & prompt engineering. Shape: see ./index.js
import { apiBasics, costControl, multimodal } from "./llm-apis-core.js";
import { injection, promptCraft } from "./llm-apis-prompts.js";
import { deepPrompting, deepReliability, deepRoles, deepStreaming, deepStructured, deepTools } from "./llm-apis-deep.js";
import { promptLab, visionExtract } from "./llm-apis-builds.js";

const base = {
  roles: {
    minutes: 45,
    level: "Beginner",
    intro:
      "Every chat LLM API takes a list of **messages with roles**. Understanding what each role means, how a conversation is built, and how the major SDKs differ is the foundation for everything else in this plan.",
    sections: [
      {
        h: "The three roles",
        blocks: [
          {
            table: {
              head: ["Role", "Who writes it", "Purpose"],
              rows: [
                ["**system**", "You, the developer", "Standing instructions: persona, rules, format, context. Highest priority."],
                ["**user**", "The end user (or your code on their behalf)", "Questions, requests, pasted content."],
                ["**assistant**", "The model", "Its previous replies. You send them back so it remembers the conversation."],
              ],
            },
          },
          "A fourth kind appears with tool use: **tool results** (Day 12). OpenAI uses a `tool` role; Anthropic puts `tool_result` blocks inside a user message.",
        ],
      },
      {
        h: "A conversation is a list you resend",
        blocks: [
          "The API is **stateless**. For a multi-turn chat you append each exchange to a list and send the whole list every time.",
          {
            lang: "python",
            code: `from openai import OpenAI
client = OpenAI()                       # reads OPENAI_API_KEY

messages = [
    {"role": "system", "content": "You are a concise tutor for Python beginners. Answer in under 80 words."},
]

def ask(question: str) -> str:
    messages.append({"role": "user", "content": question})
    r = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    answer = r.choices[0].message.content
    messages.append({"role": "assistant", "content": answer})
    print(r.usage)                      # prompt_tokens, completion_tokens, total_tokens
    return answer

ask("What is a list comprehension?")
ask("Show me one with a condition.")    # "one" makes sense only because history was resent`,
          },
          {
            warn: "That global `messages` list is fine for a script. In a web server, keep one history **per conversation** (in your database), never a shared global, or users see each other's chats.",
          },
        ],
      },
      {
        h: "The same call in three SDKs",
        blocks: [
          "The shapes are similar but not identical. Knowing the differences lets you switch providers and read any codebase.",
          {
            lang: "python",
            code: `# OpenAI: system is just the first message
from openai import OpenAI
r = OpenAI().chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": q}],
)
text = r.choices[0].message.content`,
          },
          {
            lang: "python",
            code: `# Anthropic (Claude): system is a separate parameter; max_tokens is required
import anthropic
r = anthropic.Anthropic().messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    system=SYSTEM,
    messages=[{"role": "user", "content": q}],
)
text = "".join(b.text for b in r.content if b.type == "text")   # content is a list of blocks`,
          },
          {
            lang: "python",
            code: `# Google Gemini (google-genai SDK)
from google import genai
from google.genai import types
r = genai.Client().models.generate_content(          # reads GEMINI_API_KEY
    model="gemini-2.5-flash",
    contents=q,
    config=types.GenerateContentConfig(system_instruction=SYSTEM),
)
text = r.text`,
          },
          {
            table: {
              head: ["", "OpenAI", "Anthropic", "Gemini"],
              rows: [
                ["System prompt", "First message, role `system`", "`system=` parameter", "`system_instruction` in config"],
                ["Response text", "`choices[0].message.content`", "Text blocks in `content`", "`.text`"],
                ["Assistant role name", "`assistant`", "`assistant`", "`model`"],
                ["Output limit", "Optional", "`max_tokens` required", "Optional"],
                ["Why it stopped", "`finish_reason`", "`stop_reason`", "`finish_reason` on candidates"],
                ["Token usage", "`usage`", "`usage`", "`usage_metadata`"],
              ],
            },
          },
          {
            note: "OpenAI also has a newer **Responses API** (`client.responses.create`) with built-in tools and server-side conversation state. Chat Completions remains widely used and is the format most other providers copy (\"OpenAI-compatible\"), so learn it first.",
          },
        ],
      },
      {
        h: "Writing a good system prompt",
        blocks: [
          "The system prompt is your product specification for the model. A solid structure:",
          {
            lang: "text",
            code: `You are the support assistant for ShopKart, an Indian e-commerce app.

## Your job
Answer customer questions about orders, returns and payments using only the
policy excerpts provided in <context>.

## Rules
- If the answer is not in the context, say you don't know and offer to connect a human agent.
- Never promise refunds or delivery dates that the context doesn't state.
- Reply in the customer's language (English or Hindi).

## Format
- 2–4 short sentences. Use a bulleted list only for step-by-step instructions.
- End with the source policy name in brackets, e.g. [Returns Policy].`,
          },
          {
            list: [
              "**Role and audience:** who the model is and who it's talking to.",
              "**Task:** the job in one or two sentences.",
              "**Rules and boundaries:** what to do when unsure; what never to do.",
              "**Output format:** length, structure, language.",
              "**Explain why** for important rules (\"keep it short because users read on mobile\"). Models follow reasons better than bare commands.",
            ],
          },
          {
            tip: "Keep the system prompt stable and put per-request data (retrieved context, user details) in the user message. Stable prefixes are cheaper with prompt caching, and easier to version and test.",
          },
        ],
      },
    ],
    revise: [
      "Roles: system (your standing instructions), user (requests), assistant (model's replies). Tool results are a fourth kind.",
      "APIs are stateless: resend the history each call; store one history per conversation.",
      "OpenAI: system as first message, `choices[0].message.content`. Anthropic: `system=` param, `max_tokens` required, content blocks. Gemini: `system_instruction`, `.text`.",
      "Check the stop reason: `finish_reason` / `stop_reason` tells you if output was cut off.",
      "System prompt = role, task, rules (with reasons), output format. Keep it stable; put per-request data in the user message.",
    ],
    mistakes: [
      "A global messages list shared across users in a server.",
      "Putting user-supplied text into the system prompt, which gives it your authority (a prompt-injection risk).",
      "Ignoring the stop reason and showing truncated answers.",
    ],
    interview: [
      {
        q: "How does a chatbot \"remember\" earlier messages?",
        a: "It doesn't; the API is stateless. The application stores the conversation and sends the relevant history with each request. For long chats you trim old turns, summarise them, or retrieve relevant past messages to stay within the context window and budget.",
      },
      {
        q: "What goes in the system prompt vs the user message?",
        a: "The system prompt holds stable developer instructions: role, task, rules, output format, safety boundaries. The user message holds per-request content: the user's question and any retrieved context or data. Keeping untrusted content out of the system prompt limits prompt injection, and a stable system prompt benefits from prompt caching.",
      },
    ],
    practice: [
      "Build a 10-line terminal chat loop with history, and print token usage after each turn.",
      "Write the same request with the OpenAI, Anthropic and Gemini SDKs (use whichever keys you have).",
      "Write a system prompt for a college admission FAQ bot using the structure above.",
    ],
  },

  prompting: {
    minutes: 60,
    level: "Beginner",
    intro:
      "Prompt engineering is writing clear instructions and examples so the model does what you intend, reliably. It's not magic words; it's clear communication plus testing. These techniques come up in every interview and every project.",
    sections: [
      {
        h: "Principle 1: be specific and give context",
        blocks: [
          "Treat the model like a very capable new colleague who knows nothing about your project. Vague prompts get generic answers.",
          {
            table: {
              head: ["Weak", "Strong"],
              rows: [
                ["Summarise this.", "Summarise this customer complaint in 2 bullet points for a support manager: the problem, and what the customer wants."],
                ["Write a product description.", "Write a 50-word product description for a steel water bottle, for Instagram, targeting college students in India. Casual tone, one emoji."],
                ["Fix my code.", "This FastAPI route returns 422 when I send {...}. Explain the cause and give the corrected Pydantic model."],
              ],
            },
          },
        ],
      },
      {
        h: "Zero-shot and few-shot",
        blocks: [
          "**Zero-shot:** instructions only, no examples. Works for common tasks with capable models.",
          "**Few-shot:** include a few input → output examples. The model copies the pattern, format and labelling style. It's the quickest fix when output format or judgement is inconsistent.",
          {
            lang: "python",
            code: `SYSTEM = """Classify each support ticket as one of: billing, bug, feature, other.
Reply with the label only."""

FEW_SHOT = [
    {"role": "user", "content": "I was charged twice for my subscription"},
    {"role": "assistant", "content": "billing"},
    {"role": "user", "content": "The app crashes when I upload a PDF"},
    {"role": "assistant", "content": "bug"},
    {"role": "user", "content": "Please add dark mode"},
    {"role": "assistant", "content": "feature"},
]

def classify(ticket: str) -> str:
    r = client.chat.completions.create(
        model="gpt-4o-mini", temperature=0,
        messages=[{"role": "system", "content": SYSTEM}, *FEW_SHOT, {"role": "user", "content": ticket}],
    )
    return r.choices[0].message.content.strip()`,
          },
          {
            list: [
              "Use **3–5 diverse** examples that cover edge cases, not five near-identical ones.",
              "Balance the labels, or the model will lean toward the most common one.",
              "Examples cost tokens on every call; use prompt caching or fine-tuning (Day 17) at high volume.",
            ],
          },
        ],
      },
      {
        h: "Chain-of-thought: let it think before answering",
        blocks: [
          "For multi-step problems, asking the model to reason step by step before the final answer improves accuracy, because each generated step becomes context for the next.",
          {
            lang: "text",
            code: `A customer bought 3 items at ₹499 each with a 10% coupon, and paid ₹99 delivery.
They return one item. How much should be refunded?

Think through the calculation step by step inside <thinking> tags,
then give only the final amount inside <answer> tags.`,
          },
          "Separate the reasoning from the answer (tags or JSON fields), so your code can extract just the answer and show the reasoning only if useful.",
          {
            note: "Reasoning models and models with extended thinking already reason internally. For them, asking for step-by-step reasoning in the output adds little. Give a clear goal instead, and control depth with the provider's reasoning effort setting.",
          },
        ],
      },
      {
        h: "Role prompting and delimiters",
        blocks: [
          "**Role prompting** sets expertise and tone: \"You are a senior backend engineer reviewing a pull request.\" It helps focus style and vocabulary. It doesn't add knowledge the model lacks.",
          "**Delimiters** separate instructions from data. Clearly marked sections stop the model from confusing a pasted document with your instructions, and make prompts easy to template. XML-style tags work well with every major model.",
          {
            lang: "python",
            code: `def build_prompt(context_chunks: list[str], question: str) -> str:
    context = "\\n\\n".join(f"<doc id=\\"{i}\\">\\n{c}\\n</doc>" for i, c in enumerate(context_chunks, 1))
    return f"""Answer the question using only the documents below.
Cite document ids like [1]. If the documents don't contain the answer, say "I don't know."

<documents>
{context}
</documents>

<question>{question}</question>"""`,
            caption: "The prompt shape you'll use for RAG on Day 9.",
          },
          {
            tip: "For long documents, put the documents first and the question and instructions at the end. Models tend to answer more accurately when the question comes after the material.",
          },
        ],
      },
      {
        h: "More techniques worth knowing",
        blocks: [
          {
            table: {
              head: ["Technique", "What it is", "Use it for"],
              rows: [
                ["Output format spec", "Describe or show the exact format (or use structured output)", "Anything parsed by code"],
                ["Prompt chaining", "Split a task into several calls, each output feeding the next", "Complex tasks: extract → analyse → write"],
                ["Self-check", "Ask the model to review its answer against the rules", "High-stakes output"],
                ["Positive instructions", "Say what to do, not only what not to do", "\"Write in plain prose paragraphs\" beats \"Don't use markdown\""],
                ["Give an out", "Explicitly allow \"I don't know\" or \"not found\"", "Reducing hallucination"],
                ["Prompt templates", "Prompts as versioned files with variables", "Every production app"],
              ],
            },
          },
        ],
      },
      {
        h: "Treat prompts like code",
        blocks: [
          {
            list: [
              "Store prompts in files or constants, under version control, not scattered through code.",
              "Keep a small test set of inputs with expected outputs; run it whenever you change a prompt.",
              "Change one thing at a time and compare results.",
              "Log which prompt version produced each response.",
            ],
          },
          "This is the start of **evals**, which you'll formalise on Day 11. Teams that test prompts ship faster, because they aren't afraid to change them.",
        ],
      },
    ],
    revise: [
      "Be specific: audience, length, format, tone, context.",
      "Zero-shot = instructions only; few-shot = 3–5 diverse examples to fix format and judgement.",
      "Chain-of-thought: reason step by step, then a separate answer section. Reasoning models do this internally.",
      "Role prompting sets tone and focus, not knowledge. Delimiters (XML tags) separate instructions from data.",
      "Long documents first, question last. Give the model an out (\"I don't know\").",
      "Prompts are code: version them and test them against examples.",
    ],
    mistakes: [
      "Vague one-line prompts, then blaming the model.",
      "Few-shot examples that are all the same type, biasing the output.",
      "Mixing instructions and pasted content with no delimiters.",
      "Changing prompts in production without any test set.",
    ],
    interview: [
      {
        q: "Few-shot prompting vs fine-tuning?",
        a: "Few-shot puts examples in the prompt: instant, no training, easy to change, but it costs tokens on every call and is limited by context. Fine-tuning trains the examples into the weights: better for consistent format or style at high volume, and with shorter prompts, but it needs data, time and re-training to change. Start with prompting and few-shot; fine-tune when prompts can't reach the quality bar or token costs of long prompts are too high.",
      },
      {
        q: "What is chain-of-thought prompting and when does it help?",
        a: "Asking the model to write out intermediate reasoning before its final answer. It helps on multi-step problems like maths, logic and multi-hop questions, because each step conditions the next. It adds output tokens and latency, so skip it for simple tasks, and with reasoning models rely on their built-in thinking instead.",
      },
      {
        q: "How do you make prompts reliable in production?",
        a: "Clear structured instructions with delimiters, few-shot examples for format, structured output with schema validation for anything machine-read, low temperature for deterministic tasks, prompts versioned in the repo, and an eval set run on every change, plus logging of prompt versions and outputs to catch regressions.",
      },
    ],
    practice: [
      "Write a zero-shot and a few-shot ticket classifier; test both on 15 tickets you write, and compare accuracy.",
      "Take one vague prompt from your past ChatGPT history and rewrite it using the principles here.",
      "Write a RAG prompt template with XML delimiters and an \"I don't know\" rule.",
    ],
  },

  structured: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Most LLM output in real apps is read by code, not people: a JSON object to save, a label to route on, fields to fill in a form. **Structured output** makes the model return data that matches your schema, and Pydantic validates it. This is one of the most practical skills in the plan.",
    sections: [
      {
        h: "The ladder of reliability",
        blocks: [
          {
            table: {
              head: ["Approach", "Reliability", "Notes"],
              rows: [
                ["\"Reply in JSON\" in the prompt", "Low–medium", "Often wrapped in text or markdown fences, sometimes invalid"],
                ["JSON mode", "Medium", "Guarantees valid JSON, but not your fields"],
                ["**Structured output with a JSON Schema**", "High", "Generation is constrained to your schema"],
                ["Schema + Pydantic validation + retry", "Highest", "Also checks business rules the schema can't express"],
              ],
            },
          },
          "Structured output works through **constrained decoding**: at each step, the provider only allows tokens that keep the output valid against your schema.",
        ],
      },
      {
        h: "OpenAI: parse into a Pydantic model",
        blocks: [
          {
            lang: "python",
            code: `from typing import Literal
from pydantic import BaseModel, Field
from openai import OpenAI

class Ticket(BaseModel):
    category: Literal["billing", "bug", "feature", "other"]
    urgency: int = Field(ge=1, le=5, description="1 = can wait, 5 = service down")
    summary: str = Field(description="One sentence under 20 words")
    customer_wants_refund: bool

client = OpenAI()
completion = client.chat.completions.parse(      # older SDKs: client.beta.chat.completions.parse
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Extract structured data from the support ticket."},
        {"role": "user", "content": "Charged twice for Pro plan!!! Refund me now, this is urgent."},
    ],
    response_format=Ticket,
)
ticket = completion.choices[0].message.parsed      # a Ticket instance
print(ticket.category, ticket.urgency, ticket.customer_wants_refund)`,
          },
        ],
      },
      {
        h: "Claude and Gemini",
        blocks: [
          {
            lang: "python",
            code: `import anthropic
response = anthropic.Anthropic().messages.parse(
    model="claude-opus-5",
    max_tokens=16000,
    messages=[{"role": "user", "content": f"Extract the ticket fields:\\n{ticket_text}"}],
    output_format=Ticket,
)
ticket = response.parsed_output                    # validated Ticket`,
          },
          {
            lang: "python",
            code: `from google import genai
r = genai.Client().models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Extract the ticket fields:\\n{ticket_text}",
    config={"response_mime_type": "application/json", "response_schema": Ticket},
)
ticket = r.parsed                                  # Ticket instance`,
          },
          "Same idea everywhere: your Pydantic model is the contract. SDK method names change between versions, so check the current docs, but the pattern stays.",
        ],
      },
      {
        h: "Designing schemas the model gets right",
        blocks: [
          {
            list: [
              "**Enums (`Literal`) over free text** for anything you branch on.",
              "**Descriptions on every field** explain meaning, units and edge cases. The model reads them.",
              "**Allow \"not found\":** make fields optional (`str | None`) when the information may be missing, otherwise the model invents a value to satisfy the schema.",
              "**Order fields for reasoning:** put a `reasoning` field before the `answer` or `label` when judgement is needed, so the model thinks before committing.",
              "**Keep it flat and small.** Deeply nested schemas with dozens of fields fail more. Split big extractions into several calls.",
              "Put numbers in the right type (`int`, `float`), and dates as ISO strings you then validate.",
            ],
          },
          {
            lang: "python",
            code: `class Resume(BaseModel):
    name: str
    email: str | None = Field(description="null if not present")
    total_experience_years: float | None = Field(description="Sum of all job durations; null if unclear")
    skills: list[str] = Field(description="Technical skills only, lowercase, deduplicated")
    current_title: str | None`,
          },
        ],
      },
      {
        h: "Validate, then retry with the errors",
        blocks: [
          "Schemas can't express every rule (\"end date after start date\", \"total equals the sum of items\"). Validate with Pydantic, and if it fails, ask again with the error message.",
          {
            lang: "python",
            code: `from pydantic import ValidationError

def extract(text: str, model_cls: type[BaseModel], attempts: int = 2):
    messages = [
        {"role": "system", "content": "Extract the data. Use null for missing fields."},
        {"role": "user", "content": text},
    ]
    for _ in range(attempts):
        c = client.chat.completions.parse(model="gpt-4o-mini", messages=messages, response_format=model_cls)
        msg = c.choices[0].message
        if msg.refusal:                                   # the model declined
            raise ValueError(f"refused: {msg.refusal}")
        try:
            return model_cls.model_validate(msg.parsed.model_dump())   # re-run custom validators
        except ValidationError as e:
            messages += [
                {"role": "assistant", "content": msg.content},
                {"role": "user", "content": f"That output failed validation:\\n{e}\\nReturn corrected data."},
            ]
    raise ValueError("could not extract valid data")`,
          },
        ],
      },
    ],
    revise: [
      "Prompt-only JSON is unreliable; JSON mode guarantees JSON but not fields; structured output with a schema constrains generation.",
      "OpenAI: `chat.completions.parse(response_format=Model)` → `.message.parsed`. Anthropic: `messages.parse(output_format=Model)` → `.parsed_output`. Gemini: `response_schema=Model` → `.parsed`.",
      "Schema design: enums, field descriptions, optional fields for missing data, reasoning before answer, keep it small.",
      "Validate with Pydantic for business rules; retry once with the validation error.",
      "Handle refusals and truncation (stop reason) before trusting output.",
    ],
    mistakes: [
      "Required fields for information that may not exist, which forces the model to make something up.",
      "Huge nested schemas in one call.",
      "Parsing JSON out of free text with regex.",
      "Not checking for refusals or a length cut-off.",
    ],
    interview: [
      {
        q: "How do you guarantee valid JSON from an LLM?",
        a: "Use the provider's structured output feature with a JSON Schema, generated from a Pydantic model, so decoding is constrained to the schema. Then validate with Pydantic for business rules, handle refusals and truncation, and retry once with the validation errors fed back. Design the schema to help: enums, descriptions, nullable fields for missing data, and a small flat structure.",
      },
      {
        q: "Why put a reasoning field before the answer field?",
        a: "Models generate left to right, so fields written earlier condition later ones. A reasoning field first lets the model work through the problem before committing to a label or answer, which improves accuracy, like chain-of-thought inside a structured format.",
      },
    ],
    practice: [
      "Extract `Resume` from 3 real-looking resume texts (write them yourself), including one missing email.",
      "Add a validator that `total_experience_years <= 50`, and test the retry path by using a tricky input.",
    ],
  },

  streaming: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Without streaming, users stare at a spinner for 5–20 seconds. With streaming, words appear within a second. It's expected in every chat product, and it's full-stack work, which is where your MERN experience helps. This lesson goes from the SDK to FastAPI to React.",
    sections: [
      {
        h: "Why streaming matters",
        blocks: [
          "The total generation time is the same, but **time to first token (TTFT)** drops from the full response time to well under a second. Perceived speed is what users feel. Streaming also lets users stop generation early, and lets you show progress for long answers.",
        ],
      },
      {
        h: "Streaming from the SDK",
        blocks: [
          {
            lang: "python",
            code: `# OpenAI
stream = client.chat.completions.create(model="gpt-4o-mini", messages=messages, stream=True)
for chunk in stream:
    delta = chunk.choices[0].delta.content if chunk.choices else None
    if delta:
        print(delta, end="", flush=True)

# Anthropic
with anthropic_client.messages.stream(model="claude-opus-5", max_tokens=16000, messages=messages) as s:
    for text in s.text_stream:
        print(text, end="", flush=True)
    final = s.get_final_message()          # full message + usage at the end`,
          },
          "Async versions (`AsyncOpenAI`, `AsyncAnthropic`) work the same with `async for`. Use them in FastAPI.",
        ],
      },
      {
        h: "Server-Sent Events from FastAPI",
        blocks: [
          "**SSE** is a simple one-way protocol over plain HTTP: the server keeps the response open and writes lines like `data: ...\\n\\n`. It's what LLM APIs use and it's the easiest way to stream to a browser. (WebSockets are two-way and better for voice or collaborative features, but they're overkill for chat.)",
          {
            lang: "python",
            code: `import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

app = FastAPI()
client = AsyncOpenAI()

class ChatIn(BaseModel):
    messages: list[dict]

async def token_events(messages: list[dict]):
    try:
        stream = await client.chat.completions.create(
            model="gpt-4o-mini", messages=messages, stream=True,
            stream_options={"include_usage": True},
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'type': 'token', 'text': chunk.choices[0].delta.content})}\\n\\n"
            if chunk.usage:
                yield f"data: {json.dumps({'type': 'usage', 'tokens': chunk.usage.total_tokens})}\\n\\n"
        yield f"data: {json.dumps({'type': 'done'})}\\n\\n"
    except Exception:
        yield f"data: {json.dumps({'type': 'error', 'message': 'Generation failed'})}\\n\\n"

@app.post("/chat/stream")
async def chat_stream(body: ChatIn):
    return StreamingResponse(
        token_events(body.messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )`,
          },
          {
            note: "Once streaming starts, the HTTP status is already 200. Errors mid-stream must be sent as an event (`type: error`) that the client handles, not as an HTTP error code.",
          },
        ],
      },
      {
        h: "Reading the stream in React",
        blocks: [
          "The browser's `EventSource` only supports GET, and chat needs POST with a body, so use `fetch` and read the body stream yourself.",
          {
            lang: "javascript",
            code: `async function streamChat(messages, onToken, signal) {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,                                   // AbortController lets the user press Stop
  });
  if (!res.ok) throw new Error("HTTP " + res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\\n\\n");
    buffer = events.pop();                    // keep the incomplete tail
    for (const evt of events) {
      if (!evt.startsWith("data: ")) continue;
      const msg = JSON.parse(evt.slice(6));
      if (msg.type === "token") onToken(msg.text);
      if (msg.type === "error") throw new Error(msg.message);
    }
  }
}`,
          },
          {
            warn: "Network chunks don't line up with events. One `read()` can contain half an event or three events. Always buffer and split on the blank line (`\\n\\n`), as above.",
          },
        ],
      },
      {
        h: "Production gotchas",
        blocks: [
          {
            list: [
              "**Proxy buffering:** Nginx and some load balancers buffer responses, so everything arrives at the end. Send `X-Accel-Buffering: no` and disable buffering for that route.",
              "**Timeouts:** idle timeouts on load balancers (e.g. AWS ALB defaults to 60 seconds) can cut long streams. Raise them or send periodic comment lines (`: ping`).",
              "**Cancellation:** when the user presses Stop or closes the tab, stop the upstream LLM call too, or you keep paying for tokens nobody sees. In FastAPI, check `await request.is_disconnected()` inside the generator.",
              "**Saving the answer:** accumulate the full text while streaming, and save it to the database when the stream finishes.",
              "**Rendering:** re-rendering Markdown on every token can lag; batch UI updates (e.g. every 50 ms).",
            ],
          },
        ],
      },
    ],
    revise: [
      "Streaming cuts time to first token; total time is similar.",
      "OpenAI: `stream=True`, read `chunk.choices[0].delta.content`. Anthropic: `messages.stream(...)` + `text_stream`, `get_final_message()`.",
      "FastAPI: `StreamingResponse(async_generator, media_type=\"text/event-stream\")`, events as `data: {json}\\n\\n`.",
      "Browser: `fetch` + `res.body.getReader()` + buffer and split on `\\n\\n`. `AbortController` for Stop.",
      "Errors mid-stream are sent as events. Disable proxy buffering; watch idle timeouts; cancel upstream on disconnect.",
    ],
    mistakes: [
      "Parsing each network chunk as one complete event.",
      "Using `EventSource` for a POST chat endpoint.",
      "Forgetting to disable proxy buffering, so streaming works locally but not in production.",
      "Not cancelling the LLM call when the client disconnects.",
    ],
    interview: [
      {
        q: "How would you stream an LLM response to the browser?",
        a: "The backend calls the LLM with streaming enabled and relays tokens as Server-Sent Events from an async generator (FastAPI StreamingResponse, text/event-stream). The frontend POSTs with fetch and reads the response body stream, buffering and splitting on event boundaries, appending tokens to the UI, with an AbortController for Stop. In production: disable proxy buffering, handle idle timeouts, send errors as events, cancel upstream on disconnect, and persist the final message when the stream ends.",
      },
      {
        q: "SSE vs WebSockets for a chatbot?",
        a: "SSE is one-way server-to-client over normal HTTP, simple, works with existing auth and load balancers, and matches the request-then-stream pattern of chat. WebSockets are bidirectional and suit real-time voice, collaborative editing or server-initiated messages, but add connection management complexity. For standard chat, SSE is the pragmatic choice.",
      },
    ],
    practice: [
      "Build the FastAPI SSE endpoint and test it with `curl -N -X POST ...` to watch tokens arrive.",
      "Add a Stop button in React using AbortController, and confirm the server stops the upstream call.",
    ],
  },

  tools: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "**Tool calling** (function calling) lets a model ask your code to do something: look up an order, query a database, search the web. The model doesn't run anything itself. It returns a structured request, you run the function, and you send the result back. This is the foundation of agents (Days 13–15).",
    sections: [
      {
        h: "How it works",
        blocks: [
          {
            list: [
              "You send the user's message **plus tool definitions**: name, description, JSON Schema of the parameters.",
              "The model decides whether a tool is needed. If so, it replies with a **tool call**: tool name + arguments as JSON, instead of (or alongside) text.",
              "**Your code** runs the function with those arguments.",
              "You send the **tool result** back in a new message.",
              "The model uses the result to write the final answer, or calls another tool.",
            ],
            ordered: true,
          },
          {
            lang: "text",
            code: `User: "Where is my order 4521?"
  → model: tool_call get_order_status({"order_id": "4521"})
  → your code: {"status": "shipped", "eta": "2026-09-27", "courier": "Delhivery"}
  → model: "Your order 4521 has shipped with Delhivery and should arrive by 27 September."`,
          },
        ],
      },
      {
        h: "OpenAI example: the full loop",
        blocks: [
          {
            lang: "python",
            code: `import json
from openai import OpenAI
client = OpenAI()

def get_order_status(order_id: str) -> dict:
    return {"order_id": order_id, "status": "shipped", "eta": "2026-09-27"}   # pretend DB lookup

TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_order_status",
        "description": "Get the current status and delivery estimate of a customer's order.",
        "parameters": {
            "type": "object",
            "properties": {"order_id": {"type": "string", "description": "Order number, digits only"}},
            "required": ["order_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}]
REGISTRY = {"get_order_status": get_order_status}

def run(user_text: str) -> str:
    messages = [{"role": "user", "content": user_text}]
    for _ in range(5):                                   # safety cap on tool rounds
        r = client.chat.completions.create(model="gpt-4o-mini", messages=messages, tools=TOOLS)
        msg = r.choices[0].message
        if not msg.tool_calls:
            return msg.content
        messages.append(msg)                             # the assistant turn with tool_calls
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            try:
                result = REGISTRY[call.function.name](**args)
            except Exception as e:
                result = {"error": str(e)}               # let the model see and recover
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    return "Sorry, I couldn't complete that."`,
          },
        ],
      },
      {
        h: "The same with Claude",
        blocks: [
          {
            lang: "python",
            code: `import anthropic
client = anthropic.Anthropic()
tools = [{
    "name": "get_order_status",
    "description": "Get the current status and delivery estimate of a customer's order.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string"}},
        "required": ["order_id"],
    },
}]

messages = [{"role": "user", "content": "Where is my order 4521?"}]
while True:
    r = client.messages.create(model="claude-opus-5", max_tokens=16000, tools=tools, messages=messages)
    if r.stop_reason != "tool_use":
        break
    messages.append({"role": "assistant", "content": r.content})
    results = []
    for block in r.content:
        if block.type == "tool_use":
            out = get_order_status(**block.input)
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(out)})
    messages.append({"role": "user", "content": results})      # all results in ONE user message

print("".join(b.text for b in r.content if b.type == "text"))`,
          },
          "Differences to notice: Claude uses `input_schema` and `tool_use`/`tool_result` content blocks, and tool results go back in a **user** message. OpenAI uses a separate `tool` role with `tool_call_id`. The loop is identical. SDKs also offer helpers that run this loop for you (for example Anthropic's tool runner); write it by hand once so you know what they do.",
        ],
      },
      {
        h: "Writing good tools",
        blocks: [
          {
            list: [
              "**Descriptions are prompts.** Say what the tool does, when to use it, and what it returns. The model picks tools based on this text.",
              "**Few, focused tools** beat many overlapping ones. Five clear tools work better than twenty.",
              "**Strict schemas:** required fields, enums, `additionalProperties: false`, and strict mode where supported, so arguments always match.",
              "**Validate arguments anyway.** Treat them like user input: they came from a model that may have read untrusted text.",
              "**Return errors as results** (`{\"error\": \"order not found\"}`) so the model can recover or ask the user, instead of crashing the loop.",
              "**Cap the loop** (max rounds) and log every call.",
              "**Parallel calls:** the model may request several tools at once. Run them concurrently and return all results together.",
            ],
          },
          {
            warn: "Tools that **change** things (refunds, emails, deleting data) need guardrails: permission checks in your code, limits, and often human confirmation. Never let the model's choice alone authorise an action (Days 14 and 16).",
          },
        ],
      },
    ],
    revise: [
      "The model never runs tools. It returns a tool name + JSON arguments; your code runs it and sends the result back.",
      "Loop: call → tool calls? → run → append results → call again, until a normal answer (with a max-rounds cap).",
      "OpenAI: `tools=[{type: function, function: {name, description, parameters}}]`, results in `role: tool` with `tool_call_id`.",
      "Claude: `tools=[{name, description, input_schema}]`, `stop_reason == \"tool_use\"`, `tool_result` blocks in one user message.",
      "Good tools: clear descriptions, few and focused, strict schemas, validate arguments, return errors as results.",
      "State-changing tools need permission checks and human confirmation.",
    ],
    mistakes: [
      "Assuming the model executes the function.",
      "Vague tool descriptions, so the model picks the wrong tool or none.",
      "No loop cap, allowing runaway tool calls and cost.",
      "Trusting tool arguments without validation or permission checks.",
    ],
    interview: [
      {
        q: "How does function calling work under the hood?",
        a: "Tool names, descriptions and JSON Schemas are added to the model's context in a special format. The model has been trained to emit a structured tool call (name plus JSON arguments) when a tool would help, and providers often constrain the arguments to the schema. The application parses the call, executes the real function, appends the result as a tool message, and calls the model again, which then answers or calls more tools.",
      },
      {
        q: "How do you make tool use safe?",
        a: "Validate arguments against the schema and business rules, enforce authorisation in code based on the real user (not the model's claims), use least-privilege tools, require human confirmation for destructive or financial actions, cap iterations and cost, log every call, and treat tool outputs from external sources as untrusted data that could contain prompt injection.",
      },
    ],
    practice: [
      "Add a second tool `get_refund_policy(category)` and ask a question that needs both tools.",
      "Make one tool raise an exception and check that the model handles the error result gracefully.",
    ],
  },

  reliability: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "LLM APIs fail in ways normal APIs rarely do: 30-second latencies, rate limits, overloaded errors, context-length errors, cut-off outputs. This lesson turns a working demo into a dependable service, and compares the SDKs you'll meet.",
    sections: [
      {
        h: "Timeouts",
        blocks: [
          "Set timeouts explicitly on every client. Choose them based on expected output length: a classification should finish in seconds, a long report may need minutes (and should be streamed).",
          {
            lang: "python",
            code: `from openai import OpenAI
import anthropic

openai_client = OpenAI(timeout=30.0, max_retries=2)
claude = anthropic.Anthropic(timeout=60.0, max_retries=3)

# per-request override
claude.with_options(timeout=10.0).messages.create(...)`,
          },
        ],
      },
      {
        h: "Retries with backoff",
        blocks: [
          "The official SDKs already retry connection errors, 408, 409, 429 and 5xx with exponential backoff (2 retries by default). Know that, so you don't wrap them in a second retry layer that multiplies attempts. For extra control, or for calls without an SDK, use the `tenacity` library.",
          {
            lang: "python",
            code: `from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception_type
import anthropic

@retry(
    retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError,
                                   anthropic.InternalServerError)),
    wait=wait_random_exponential(min=1, max=30),
    stop=stop_after_attempt(5),
)
def ask(prompt: str) -> str: ...`,
          },
          {
            lang: "python",
            code: `try:
    r = claude.messages.create(model="claude-opus-5", max_tokens=16000, messages=msgs)
except anthropic.BadRequestError as e:        # 400: prompt too long, bad params. Don't retry.
    ...
except anthropic.AuthenticationError:         # 401: bad key
    ...
except anthropic.RateLimitError:              # 429: slow down (SDK already retried)
    ...
except anthropic.APIStatusError as e:         # other HTTP errors (5xx, overloaded)
    ...
except anthropic.APIConnectionError:          # network problems
    ...`,
            caption: "Catch from most specific to least specific. The OpenAI SDK has matching classes (`openai.RateLimitError`, `openai.BadRequestError`, ...).",
          },
        ],
      },
      {
        h: "Rate limits",
        blocks: [
          "Providers limit **requests per minute** and **tokens per minute** (input and output may be separate), per model and per account tier. Response headers tell you what's left.",
          {
            list: [
              "Cap concurrency with a semaphore (Day 2) sized to your limits.",
              "Queue non-urgent work and use **batch APIs** (OpenAI and Anthropic offer ~50% cheaper asynchronous batches) for evals and bulk processing.",
              "Spread load across models or providers with a fallback.",
              "Protect your own API with per-user rate limits so one user can't burn your quota.",
            ],
          },
        ],
      },
      {
        h: "Token budgets",
        blocks: [
          {
            list: [
              "**Check input size before calling.** Count tokens and trim history or context to stay within the window, leaving room for the answer.",
              "**Set `max_tokens` deliberately:** large enough to avoid cut-offs, small enough to cap cost. Check the stop reason; if it's the length limit, handle it (continue, or tell the user).",
              "**Per-user and per-day budgets:** track usage in your DB and refuse or downgrade to a cheaper model past the limit.",
              "**Log `usage` from every response** with user ID, feature and model. This is how you find what's expensive.",
            ],
          },
          {
            lang: "python",
            code: `def trim_history(messages: list[dict], max_tokens: int, count) -> list[dict]:
    system, rest = messages[0], messages[1:]
    while rest and count([system, *rest]) > max_tokens:
        rest = rest[2:]                  # drop the oldest user/assistant pair
    return [system, *rest]`,
          },
        ],
      },
      {
        h: "Fallbacks",
        blocks: [
          "When your primary model fails or is overloaded, fall back to another model or provider. Keep your code provider-agnostic behind one interface (today's adapter build task), so a fallback is a config change.",
          {
            lang: "python",
            code: `async def complete_with_fallback(prompt: str) -> str:
    for provider in [primary, secondary]:
        try:
            return await provider.complete(prompt, timeout=20)
        except (RateLimited, ProviderDown, TimeoutError) as e:
            logger.warning("provider %s failed: %s", provider.name, e)
    raise ServiceUnavailable("all providers failed")`,
          },
          {
            note: "Gateways like LiteLLM or OpenRouter give you one OpenAI-style API over many providers, with fallbacks and cost tracking built in. They're widely used; build your own adapter once so you understand what they do.",
          },
        ],
      },
      {
        h: "The SDKs at a glance",
        blocks: [
          {
            table: {
              head: ["", "OpenAI", "Anthropic", "Google Gemini"],
              rows: [
                ["Package", "`openai`", "`anthropic`", "`google-genai`"],
                ["Client", "`OpenAI()` / `AsyncOpenAI()`", "`Anthropic()` / `AsyncAnthropic()`", "`genai.Client()` (`client.aio` for async)"],
                ["Main call", "`chat.completions.create` (also `responses.create`)", "`messages.create`", "`models.generate_content`"],
                ["Structured output", "`chat.completions.parse(response_format=)`", "`messages.parse(output_format=)`", "`response_schema=` in config"],
                ["Streaming", "`stream=True`", "`messages.stream(...)`", "`generate_content_stream`"],
                ["Built-in retries", "Yes (2)", "Yes (2)", "Configurable"],
                ["Cloud versions", "Azure OpenAI", "AWS Bedrock, Google Vertex", "Vertex AI"],
              ],
            },
          },
          "Many other providers (Groq, Together, DeepSeek, local Ollama, and Gemini itself) offer **OpenAI-compatible** endpoints: you can use the `openai` SDK with a different `base_url` and key.",
        ],
      },
    ],
    revise: [
      "Set explicit timeouts; stream long outputs.",
      "SDKs retry 408/409/429/5xx and connection errors (2 retries by default); don't double-wrap. Use tenacity for custom retry.",
      "Catch specific errors: 400 = fix the request, 401 = key, 429 = slow down, 5xx = retry/fallback.",
      "Rate limits are requests and tokens per minute: semaphores, queues, batch APIs, per-user limits.",
      "Token budgets: count and trim input, set `max_tokens`, check the stop reason, log `usage` per user and feature.",
      "Fallbacks via a provider-agnostic interface; gateways like LiteLLM exist.",
    ],
    mistakes: [
      "No timeouts, so requests hang.",
      "Retrying 400 context-length errors.",
      "Stacking your own retries on the SDK's, turning 3 attempts into 9.",
      "Not logging token usage, so cost spikes are a mystery.",
    ],
    interview: [
      {
        q: "Your LLM feature randomly fails with 429s and 529s during peak hours. What do you do?",
        a: "Confirm which limits are hit (requests or tokens per minute) from the error and headers. Add or tune retries with exponential backoff and jitter, respecting Retry-After; cap concurrency with a semaphore or queue sized to the limits; move non-urgent traffic to batch APIs; reduce tokens per request; add a fallback model or provider behind a common interface; request higher limits; and add per-user rate limiting and monitoring on error rate and latency.",
      },
      {
        q: "How do you control LLM costs per user?",
        a: "Log token usage per request with user and feature, enforce per-user daily or monthly budgets in the database, trim context and cap max_tokens, route simple requests to cheaper models, cache repeated answers and use prompt caching for stable prefixes, and alert on anomalies.",
      },
    ],
    practice: [
      "Set a 1-second timeout on purpose and handle the timeout error gracefully.",
      "Write `trim_history` using tiktoken and test it with a 50-message conversation.",
      "Log model, input tokens, output tokens, latency and estimated cost for every call in your app.",
    ],
  },

  "stream-chat": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Build a real streaming chat app: FastAPI backend, React frontend, conversation history in a database, and a Stop button. This is the first piece of your portfolio, and the UI you'll reuse for DocChat.",
    sections: [
      {
        h: "Architecture",
        blocks: [
          {
            lang: "text",
            code: `React (Vite)                          FastAPI                          LLM API
─────────────                         ───────                          ───────
ChatWindow ──POST /chat/stream──▶ load history (DB) ──stream=True──▶ model
   ▲  tokens via SSE  ◀──────────── relay tokens as SSE  ◀──────────── tokens
   │                                save final answer + usage (DB)
Stop button ── AbortController ──▶ detect disconnect → stop upstream`,
          },
          {
            list: [
              "`POST /conversations` → create a conversation, return its id.",
              "`GET /conversations/{id}/messages` → history for the UI.",
              "`POST /conversations/{id}/stream` with `{content}` → saves the user message, streams the answer, saves the assistant message.",
            ],
          },
        ],
      },
      {
        h: "Backend core",
        blocks: [
          {
            lang: "python",
            code: `# app/routers/chat.py
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.deps import DB, CurrentUser, LLM
from app import repo

router = APIRouter(prefix="/conversations", tags=["chat"])
SYSTEM = "You are a helpful assistant. Be concise and use Markdown for code."

class UserMessage(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

def sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\\n\\n"

@router.post("/{conv_id}/stream")
async def stream(conv_id: int, body: UserMessage, request: Request,
                 db: DB, user: CurrentUser, llm: LLM):
    await repo.assert_owner(db, conv_id, user.id)
    await repo.add_message(db, conv_id, "user", body.content)
    history = await repo.recent_messages(db, conv_id, limit=20)
    messages = [{"role": "system", "content": SYSTEM}, *history]

    async def events():
        parts: list[str] = []
        try:
            async for token in llm.stream(messages):
                if await request.is_disconnected():
                    break                                  # user pressed Stop / closed tab
                parts.append(token)
                yield sse({"type": "token", "text": token})
            yield sse({"type": "done"})
        except Exception:
            yield sse({"type": "error", "message": "The assistant failed. Please retry."})
        finally:
            if parts:
                await repo.add_message(db, conv_id, "assistant", "".join(parts))

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})`,
          },
          "`llm.stream(messages)` is an async generator in `app/services/llm.py` wrapping the SDK. Keep the SDK out of the router so you can swap providers (today's adapter task) and fake it in tests.",
        ],
      },
      {
        h: "Frontend core",
        blocks: [
          {
            lang: "javascript",
            code: `function useChat(conversationId) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const controller = useRef(null);

  async function send(content) {
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    controller.current = new AbortController();
    try {
      await streamChat(conversationId, content, (token) =>
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy.at(-1), content: copy.at(-1).content + token };
          return copy;
        }), controller.current.signal);
    } catch (e) {
      if (e.name !== "AbortError") setMessages((m) => [...m, { role: "error", content: e.message }]);
    } finally {
      setStreaming(false);
    }
  }
  const stop = () => controller.current?.abort();
  return { messages, send, stop, streaming };
}`,
            caption: "`streamChat` is the SSE reader from the streaming lesson. Render assistant messages with a Markdown renderer such as react-markdown.",
          },
        ],
      },
      {
        h: "Done when…",
        blocks: [
          {
            list: [
              "Tokens appear within about a second, and the Stop button halts generation (check server logs).",
              "Refreshing the page reloads the conversation from the database.",
              "Errors show a friendly message with a retry option.",
              "Token usage and latency are logged per request.",
              "The README has a GIF of it working and an architecture diagram.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Save the user message → build history → stream → save the assistant message at the end (in `finally`).",
      "Check `request.is_disconnected()` to stop paying for abandoned streams.",
      "Keep the SDK behind a service interface; routers stay thin.",
      "Frontend: optimistic user message, empty assistant bubble filled token by token, AbortController for Stop.",
    ],
    practice: [
      "Add conversation titles generated by the model from the first message (a cheap, non-streaming call).",
    ],
  },

  extractor: {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Build a resume extractor: paste messy resume text (or upload a PDF) and get clean, validated JSON. Resume parsing is a classic Indian GenAI interview assignment, and it exercises structured output, schema design, validation and retries.",
    sections: [
      {
        h: "The schema",
        blocks: [
          {
            lang: "python",
            code: `from datetime import date
from pydantic import BaseModel, Field, field_validator

class Job(BaseModel):
    company: str
    title: str
    start: str | None = Field(description="YYYY-MM, null if unknown")
    end: str | None = Field(description="YYYY-MM, or 'present', null if unknown")
    highlights: list[str] = Field(default_factory=list, description="Max 3 short achievements")

class Resume(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = Field(None, description="Digits with country code if present, e.g. +91...")
    location: str | None = None
    skills: list[str] = Field(description="Technical skills, lowercase, deduplicated")
    jobs: list[Job]
    education: list[str] = Field(default_factory=list)

    @field_validator("skills")
    @classmethod
    def dedupe(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(s.strip().lower() for s in v if s.strip()))`,
          },
        ],
      },
      {
        h: "PDF to text",
        blocks: [
          {
            lang: "python",
            code: `# uv add pypdf
from pypdf import PdfReader

def pdf_text(path: str) -> str:
    return "\\n".join(page.extract_text() or "" for page in PdfReader(path).pages)`,
          },
          "Text extraction from PDFs is imperfect (columns, tables, scanned images). For scanned resumes you'd need OCR, or a multimodal model that accepts the PDF directly. Mention this limitation in your README.",
        ],
      },
      {
        h: "Extraction with validation and retry",
        blocks: [
          "Use the `extract()` helper from the structured output lesson with the `Resume` model, then add a FastAPI endpoint `POST /resumes/parse` that accepts either text or a PDF upload and returns the `Resume` JSON.",
          {
            lang: "python",
            code: `SYSTEM = """You extract resume data into the given schema.
- Copy values exactly as written; don't infer missing contact details.
- Use null for anything not present.
- Dates as YYYY-MM."""

@router.post("/resumes/parse", response_model=Resume)
async def parse_resume(file: UploadFile | None = None, text: str | None = Form(None)):
    if file:
        raw = pdf_text_from_bytes(await file.read())
    elif text:
        raw = text
    else:
        raise HTTPException(400, "Send a PDF file or text")
    return await extract(raw[:30_000], Resume)`,
          },
        ],
      },
      {
        h: "Evaluate it",
        blocks: [
          "Write 5 resumes yourself (varied formats, one missing email, one with a career gap, one in a table-like layout), and the expected JSON for each. Write a small script that runs the extractor and scores field accuracy. This tiny eval turns \"it seems to work\" into \"94% field accuracy\", which is a strong line for your resume.",
        ],
      },
    ],
    revise: [
      "Nullable fields prevent invented data; descriptions define formats.",
      "Validators clean data (dedupe, lowercase) after the model.",
      "PDF text extraction is lossy; scanned PDFs need OCR or multimodal models.",
      "Measure field accuracy on a small hand-labelled set.",
    ],
    practice: [
      "Add `total_experience_months` computed in Python from the jobs, not by the model. Explain why that's better.",
    ],
  },

  adapter: {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Put every LLM provider behind one interface. Your app code calls `llm.complete()` or `llm.stream()` and never imports a provider SDK directly. Switching models, adding a fallback or faking the LLM in tests becomes a config change. Interviewers love this design question.",
    sections: [
      {
        h: "The interface",
        blocks: [
          {
            lang: "python",
            code: `# app/services/llm/base.py
from typing import AsyncIterator, Protocol
from dataclasses import dataclass

@dataclass
class Completion:
    text: str
    input_tokens: int
    output_tokens: int
    model: str

class LLMProvider(Protocol):
    name: str
    async def complete(self, system: str, messages: list[dict], max_tokens: int = 4096) -> Completion: ...
    def stream(self, system: str, messages: list[dict], max_tokens: int = 4096) -> AsyncIterator[str]: ...`,
          },
          "`Protocol` is structural typing (like a TypeScript interface): any class with these methods fits, without inheriting from anything.",
        ],
      },
      {
        h: "Two implementations",
        blocks: [
          {
            lang: "python",
            code: `# app/services/llm/openai_provider.py
from openai import AsyncOpenAI

class OpenAIProvider:
    name = "openai"
    def __init__(self, model: str):
        self.client, self.model = AsyncOpenAI(), model

    async def complete(self, system, messages, max_tokens=4096):
        r = await self.client.chat.completions.create(
            model=self.model, max_tokens=max_tokens,
            messages=[{"role": "system", "content": system}, *messages])
        return Completion(r.choices[0].message.content, r.usage.prompt_tokens,
                          r.usage.completion_tokens, self.model)

    async def stream(self, system, messages, max_tokens=4096):
        s = await self.client.chat.completions.create(
            model=self.model, max_tokens=max_tokens, stream=True,
            messages=[{"role": "system", "content": system}, *messages])
        async for chunk in s:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content`,
          },
          {
            lang: "python",
            code: `# app/services/llm/anthropic_provider.py
from anthropic import AsyncAnthropic

class AnthropicProvider:
    name = "anthropic"
    def __init__(self, model: str):
        self.client, self.model = AsyncAnthropic(), model

    async def complete(self, system, messages, max_tokens=4096):
        r = await self.client.messages.create(
            model=self.model, max_tokens=max_tokens, system=system, messages=messages)
        text = "".join(b.text for b in r.content if b.type == "text")
        return Completion(text, r.usage.input_tokens, r.usage.output_tokens, self.model)

    async def stream(self, system, messages, max_tokens=4096):
        async with self.client.messages.stream(
            model=self.model, max_tokens=max_tokens, system=system, messages=messages) as s:
            async for text in s.text_stream:
                yield text`,
          },
        ],
      },
      {
        h: "Factory, fallback and fake",
        blocks: [
          {
            lang: "python",
            code: `# app/services/llm/__init__.py
from app.config import settings

def build_provider(spec: str) -> LLMProvider:
    vendor, model = spec.split(":", 1)            # e.g. "anthropic:claude-opus-5"
    return {"openai": OpenAIProvider, "anthropic": AnthropicProvider}[vendor](model)

class FallbackProvider:
    name = "fallback"
    def __init__(self, providers: list[LLMProvider]):
        self.providers = providers
    async def complete(self, system, messages, max_tokens=4096):
        last = None
        for p in self.providers:
            try:
                return await p.complete(system, messages, max_tokens)
            except Exception as e:                 # narrow this to provider errors in real code
                last = e
        raise last

class FakeProvider:                                # tests: fast, free, deterministic
    name = "fake"
    async def complete(self, system, messages, max_tokens=4096):
        return Completion("fake answer", 10, 2, "fake")
    async def stream(self, system, messages, max_tokens=4096):
        for word in "fake streamed answer".split():
            yield word + " "

def get_llm() -> LLMProvider:                      # FastAPI dependency
    return FallbackProvider([build_provider(s) for s in settings.llm_providers])`,
          },
          "Config then becomes: `LLM_PROVIDERS=[\"anthropic:claude-opus-5\",\"openai:gpt-4o-mini\"]`. Switching is an environment variable, not a code change.",
        ],
      },
      {
        h: "Talking about it in interviews",
        blocks: [
          {
            list: [
              "**Why:** avoid lock-in, enable fallbacks, A/B test models, and test without API calls.",
              "**Trade-off:** a lowest-common-denominator interface can hide provider-specific features (prompt caching options, special tools). Allow provider-specific options through an escape hatch rather than pretending all providers are identical.",
              "**Alternatives:** LiteLLM or LangChain's chat model abstraction give this out of the box; you built it to understand and control it.",
            ],
          },
        ],
      },
    ],
    revise: [
      "One `LLMProvider` protocol with `complete` and `stream`; each vendor is an adapter.",
      "Factory from config strings like `vendor:model`; fallback wraps several providers; a fake provider for tests.",
      "App code never imports a vendor SDK directly.",
      "Trade-off: common interface vs provider-specific features; allow an escape hatch.",
    ],
    practice: [
      "Add a Gemini adapter using `google-genai`.",
      "Swap your stream-chat app to use `get_llm()` and prove switching providers needs only an env change.",
    ],
  },
};

// Append deeper sections (d04-deep.js) to the original lessons.
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
  "api-basics": apiBasics,
  roles: deepen(base.roles, deepRoles),
  prompting: deepen(base.prompting, deepPrompting),
  "prompt-craft": promptCraft,
  structured: deepen(base.structured, deepStructured),
  streaming: deepen(base.streaming, deepStreaming),
  tools: deepen(base.tools, deepTools),
  multimodal,
  injection,
  "cost-control": costControl,
  reliability: deepen(base.reliability, deepReliability),
  "stream-chat": base["stream-chat"],
  extractor: base.extractor,
  adapter: base.adapter,
  "prompt-lab": promptLab,
  "vision-extract": visionExtract,
};
