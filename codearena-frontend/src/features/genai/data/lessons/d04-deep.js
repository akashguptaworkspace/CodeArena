// Day 4: extra depth appended to the original lessons in d04.js (roles, prompting, structured,
// streaming, tools, reliability). Each entry adds minutes, sections, revise points and interview Q&A.

export const deepRoles = {
  minutes: 30,
  sections: [
    {
      h: "Roles in detail across providers",
      blocks: [
        {
          table: {
            head: ["Detail", "OpenAI", "Anthropic", "Gemini"],
            rows: [
              ["Developer instructions", "`system`, or `developer` on newer (reasoning) models", "Top-level `system` parameter", "`system_instruction`"],
              ["Model's turns", "`assistant`", "`assistant`", "`model`"],
              ["Tool results", "`tool` role with `tool_call_id`", "`tool_result` blocks inside a `user` message", "`function_response` parts"],
              ["Ordering rules", "Flexible", "First message must be `user`; consecutive same-role messages are merged", "Alternating `user` / `model` contents"],
            ],
          },
        },
        "OpenAI introduced the `developer` role for its reasoning models to make the chain of command explicit: platform rules > developer instructions > user messages. Conceptually it's the same as a system prompt.",
      ],
    },
    {
      h: "Messages aren't just strings: content blocks",
      blocks: [
        "`content` can be a plain string or a **list of blocks**, which is how images, documents, tool calls and tool results travel in the same conversation.",
        {
          lang: "python",
          code: `messages = [
    {"role": "user", "content": [
        {"type": "text", "text": "Is this bill's total correct?"},
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}},
    ]},
    {"role": "assistant", "content": [
        {"type": "text", "text": "Let me add up the items."},
        {"type": "tool_use", "id": "toolu_01", "name": "calculator", "input": {"expression": "249+499+99"}},
    ]},
    {"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": "toolu_01", "content": "847"},
    ]},
]`,
          caption: "Anthropic's block format. OpenAI uses `content` parts (`text`, `image_url`) plus separate `tool_calls` and `tool` messages.",
        },
      ],
    },
    {
      h: "Storing conversations in your database",
      blocks: [
        "You'll build this in the stream-chat project. A simple, production-friendly schema:",
        {
          lang: "sql",
          code: `CREATE TABLE conversations (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  title       TEXT,
  summary     TEXT,                          -- rolling summary of older turns
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content          JSONB NOT NULL,           -- string or content blocks
  model            TEXT,
  input_tokens     INT,
  output_tokens    INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON messages (conversation_id, id);`,
        },
        {
          list: [
            "Store **content as JSON** so tool calls, images and future block types fit without migrations.",
            "Record model and token usage per assistant message for cost analysis.",
            "Always load history **scoped to the conversation and its owner**, never by conversation id alone (IDOR, Day 2).",
          ],
        },
      ],
    },
    {
      h: "Conversation memory strategies",
      blocks: [
        {
          table: {
            head: ["Strategy", "How", "Good for", "Trade-off"],
            rows: [
              ["Full history", "Send everything", "Short chats", "Cost and latency grow every turn; hits the context limit"],
              ["Sliding window", "Last N turns or last K tokens", "Most chatbots", "Forgets early details (the user's name, the order id)"],
              ["Summary + recent", "Rolling summary of older turns + last few turns verbatim", "Long support or tutoring chats", "Summaries lose detail; an extra call now and then"],
              ["Retrieval memory", "Embed past messages; retrieve the relevant ones", "Very long histories, assistants", "More infrastructure; retrieval can miss"],
              ["Long-term user memory", "Store facts (\"prefers Hindi\", \"vegetarian\") in a profile", "Personal assistants", "Privacy, consent and correctness of stored facts"],
            ],
          },
        },
        {
          lang: "python",
          code: `KEEP_RECENT = 6

async def build_context(conv, messages: list[dict]) -> list[dict]:
    older, recent = messages[:-KEEP_RECENT], messages[-KEEP_RECENT:]
    if older and conv.summary_upto < len(older):
        conv.summary = await summarise(conv.summary, older[conv.summary_upto:])   # cheap model
        conv.summary_upto = len(older)
    context = []
    if conv.summary:
        context.append({"role": "user", "content": f"<conversation_summary>{conv.summary}</conversation_summary>"})
        context.append({"role": "assistant", "content": "Noted."})
    return context + recent`,
          caption: "Summary + recent. The summary goes in as labelled context, not in the system prompt, so the system prompt stays cacheable.",
        },
      ],
    },
  ],
  revise: [
    "OpenAI `developer` role = system instructions for newer models; Gemini calls the assistant `model`; Claude merges consecutive same-role messages.",
    "Content can be a list of blocks: text, image, document, tool_use, tool_result.",
    "Store messages as JSON with model and token usage; load history scoped to the owner.",
    "Memory: full history, sliding window, summary + recent, retrieval memory, long-term profile.",
  ],
  interview: [
    {
      q: "How would you handle memory for a chatbot with very long conversations?",
      a: "Keep the last few turns verbatim, and maintain a rolling summary of older turns generated by a cheap model and stored in the database; include it as labelled context. For assistants that need to recall specific past details, embed past messages and retrieve the relevant ones per turn. Stable facts about the user can go in a profile with consent. Throughout, count tokens and budget each part of the context.",
    },
  ],
};

export const deepPrompting = {
  minutes: 20,
  sections: [
    {
      h: "Recipes for common tasks",
      blocks: [
        {
          table: {
            head: ["Task", "Prompt recipe"],
            rows: [
              ["**Classification**", "Closed label set as an enum; definitions of each label with a borderline example; \"other\"/\"unsure\" option; structured output; temperature 0"],
              ["**Extraction**", "Pydantic schema with field descriptions; nullable fields; \"copy values exactly, don't infer\"; validation in code"],
              ["**Summarisation**", "Audience and purpose (\"for a support manager deciding priority\"); length limit; what to include and omit; key facts preserved (amounts, dates, ids)"],
              ["**RAG answer**", "Sources in tags with ids; \"answer only from sources, cite [id]\"; \"say you don't know if not covered\"; question last"],
              ["**Code generation**", "Language, versions and libraries; the surrounding code and interfaces; tests or examples of expected behaviour; \"return only the code block\""],
              ["**Rewriting / tone**", "Target audience and tone with a short example; \"keep all facts and numbers unchanged\"; length"],
              ["**SQL generation**", "Schema (tables, columns, types, relationships), dialect, a few example questions → queries, read-only rule; validate before running"],
            ],
          },
        },
      ],
    },
    {
      h: "Prompt patterns you'll hear named",
      blocks: [
        {
          table: {
            head: ["Pattern", "Idea"],
            rows: [
              ["Persona", "Give the model a role and audience"],
              ["Template", "Show the exact output skeleton to fill"],
              ["Flipped interaction", "The model asks the user clarifying questions first"],
              ["Decomposition", "Split a question into sub-questions, answer each, then combine"],
              ["Self-consistency", "Sample several answers and take the majority"],
              ["Reflection / self-critique", "Generate, critique, revise"],
              ["ReAct", "Interleave reasoning and tool actions (the basis of agents, Day 10)"],
              ["Retrieval-augmented", "Put relevant documents into the prompt (Days 5–9)"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Classification: enum + definitions + other; extraction: schema + nullable + validate; summaries: audience, purpose, length; RAG: sources with ids, cite, IDK, question last.",
    "Named patterns: persona, template, flipped interaction, decomposition, self-consistency, reflection, ReAct, RAG.",
  ],
  interview: [
    {
      q: "How would you prompt an LLM to classify support tickets reliably?",
      a: "A closed label set as an enum in a structured-output schema, a clear definition of each label with a borderline example, an \"other\" option so it isn't forced into a wrong label, optionally a short reasoning field before the label, temperature 0, and a few diverse few-shot examples. Then measure accuracy and a confusion matrix on a labelled test set and iterate on the labels that get confused.",
    },
  ],
};

export const deepStructured = {
  minutes: 30,
  sections: [
    {
      h: "JSON mode vs structured outputs vs tool-based extraction",
      blocks: [
        {
          lang: "python",
          code: `# JSON mode (OpenAI): valid JSON guaranteed, your fields NOT guaranteed.
# The word "JSON" must appear in the messages.
r = client.chat.completions.create(
    model="gpt-4o-mini",
    response_format={"type": "json_object"},
    messages=[{"role": "user", "content": f"Return JSON with keys name and city for: {text}"}],
)
data = json.loads(r.choices[0].message.content)     # may still miss keys or add extras`,
        },
        {
          table: {
            head: ["Technique", "Guarantees", "When"],
            rows: [
              ["JSON mode", "Syntactically valid JSON", "Legacy code, or models without schema support"],
              ["**Structured outputs (JSON schema)**", "Valid JSON matching your schema", "Default choice for data extraction"],
              ["Tool-based extraction", "A \"tool call\" whose arguments match the schema (strict tools)", "Older approach; still useful when the model should choose between several output shapes"],
              ["Local models", "Ollama's `format` parameter accepts a JSON schema; libraries like Outlines constrain open models", "Self-hosted extraction"],
            ],
          },
        },
      ],
    },
    {
      h: "Schema rules in strict mode",
      blocks: [
        "Constrained decoding supports a **subset** of JSON Schema. Know the common rules so your Pydantic models convert cleanly:",
        {
          list: [
            "Every property is **required** and `additionalProperties` is `false`. To make a field optional, make it **nullable** (`str | None`) so the model outputs `null`.",
            "Prefer simple types, enums (`Literal`), arrays and nested objects. Some keywords (certain string formats, numeric bounds, complex `oneOf` combinations) may be unsupported or ignored by a given provider: validate those rules with Pydantic after parsing.",
            "Very large or deeply recursive schemas may be rejected or slow; split big extractions.",
            "The SDK helpers (`.parse()` with a Pydantic model) generate the schema for you; print it once with `Model.model_json_schema()` to see what the model receives.",
          ],
        },
      ],
    },
    {
      h: "Classification and scoring patterns",
      blocks: [
        {
          lang: "python",
          code: `from typing import Literal
from pydantic import BaseModel, Field

class TicketLabel(BaseModel):
    reasoning: str = Field(description="One sentence: which clues decide the label")
    category: Literal["billing", "delivery", "product_quality", "account", "other"]
    secondary: list[Literal["billing", "delivery", "product_quality", "account"]] = Field(
        description="Other applicable categories, possibly empty")
    confidence: Literal["high", "medium", "low"]`,
        },
        {
          list: [
            "`reasoning` first so the model decides after thinking; `other` so it isn't forced into a wrong class.",
            "Multi-label: a list of enums.",
            "Categorical confidence (`high/medium/low`) is more consistent than a made-up 0–1 number; route `low` to humans.",
          ],
        },
      ],
    },
    {
      h: "Refusals, truncation and streaming partial JSON",
      blocks: [
        {
          lang: "python",
          code: `import anthropic

response = anthropic.Anthropic().messages.parse(
    model="claude-opus-5", max_tokens=16000,
    messages=[{"role": "user", "content": f"Extract the ticket fields:\\n{ticket_text}"}],
    output_format=TicketLabel,
)
if response.stop_reason == "refusal":
    raise ValueError("model refused")
if response.stop_reason == "max_tokens":
    raise ValueError("output truncated: raise max_tokens or simplify the schema")
label = response.parsed_output`,
        },
        "Structured output can also be **streamed**: SDKs expose partially-parsed objects as tokens arrive, which is handy for progress UIs (\"extracted 3 of 8 line items...\"). Validate only the final object.",
        {
          note: "**Instructor** is a popular library that wraps many providers' clients to return Pydantic objects with automatic retries on validation errors. Knowing it is useful; knowing how to do it yourself (the retry helper above) is better.",
        },
      ],
    },
  ],
  revise: [
    "JSON mode = valid JSON only; structured outputs = your schema; tool-based extraction = strict tool arguments; Ollama `format` for local models.",
    "Strict schemas: all fields required, `additionalProperties: false`, optional = nullable; validate unsupported rules with Pydantic.",
    "Classification schema: reasoning first, enum with `other`, multi-label lists, categorical confidence.",
    "Check refusal and max_tokens stop reasons before using parsed output; streamed partial objects for progress UIs.",
  ],
  interview: [
    {
      q: "JSON mode vs structured outputs?",
      a: "JSON mode only guarantees syntactically valid JSON, so keys can be missing, extra or wrongly typed. Structured outputs constrain decoding to a JSON Schema you provide, so the output matches your fields and types. I use structured outputs with a Pydantic model, then validate business rules in code and retry with errors if needed.",
    },
  ],
};

export const deepStreaming = {
  minutes: 30,
  sections: [
    {
      h: "The SSE protocol in detail",
      blocks: [
        "Server-Sent Events is a tiny text protocol over a normal HTTP response with `Content-Type: text/event-stream`. Each event is a few `field: value` lines ending with a **blank line**.",
        {
          lang: "text",
          code: `: this line is a comment (useful as a keep-alive ping)

event: token
id: 17
data: {"text": "Hel"}

event: token
id: 18
data: {"text": "lo"}

retry: 3000
event: done
data: {}`,
        },
        {
          table: {
            head: ["Field", "Meaning"],
            rows: [
              ["`data:`", "The payload (several `data:` lines are joined with newlines)"],
              ["`event:`", "Event name; browsers' `EventSource` dispatches by name"],
              ["`id:`", "Event id; `EventSource` sends it back as `Last-Event-ID` when reconnecting"],
              ["`retry:`", "Reconnection delay in ms for `EventSource`"],
              ["`: comment`", "Ignored by clients; used as a heartbeat to keep proxies from timing out"],
            ],
          },
        },
      ],
    },
    {
      h: "What the providers actually send",
      blocks: [
        {
          lang: "text",
          code: `# OpenAI Chat Completions (stream: true)
data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant","content":""}}]}
data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hel"}}]}
data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
data: [DONE]

# Anthropic Messages (stream: true): named events
event: message_start          data: {"type":"message_start","message":{...,"usage":{...}}}
event: content_block_start    data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
event: content_block_delta    data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}
event: content_block_stop     data: {"type":"content_block_stop","index":0}
event: message_delta          data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":42}}
event: message_stop           data: {"type":"message_stop"}`,
          caption: "Trimmed and shown one per line. Run a curl request with `-N` (no buffering) and `\"stream\": true` to see the real thing.",
        },
        "The SDK helpers (`text_stream`, `get_final_message()`) parse these for you. Knowing the raw shape helps when debugging proxies or writing a gateway.",
      ],
    },
    {
      h: "Streaming with tool calls",
      blocks: [
        {
          list: [
            "Tool-call arguments also arrive in pieces: OpenAI sends `delta.tool_calls` fragments (accumulate `function.arguments` strings by `index`); Anthropic sends `input_json_delta` events.",
            "Don't run a tool until its arguments are complete (the block or message finished). SDK helpers like `get_final_message()` give you the assembled tool calls.",
            "In the UI, show a status event (\"Checking your order...\") while tools run, then stream the final answer.",
          ],
        },
        {
          lang: "python",
          code: `async def events(messages):
    while True:
        async with client.messages.stream(model=MODEL, max_tokens=16000, tools=TOOLS, messages=messages) as s:
            async for text in s.text_stream:
                yield sse({"type": "token", "text": text})
            final = await s.get_final_message()
        if final.stop_reason != "tool_use":
            break
        yield sse({"type": "status", "text": "Looking that up..."})
        messages.append({"role": "assistant", "content": final.content})
        messages.append({"role": "user", "content": await run_tools(final.content)})
    yield sse({"type": "done"})`,
          caption: "An SSE generator that streams text, runs tools between rounds, and keeps the user informed.",
        },
      ],
    },
    {
      h: "Testing streaming endpoints",
      blocks: [
        {
          lang: "bash",
          code: `curl -N -X POST http://127.0.0.1:8000/chat/stream \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Count to five slowly"}]}'`,
        },
        {
          lang: "python",
          code: `# pytest: fake the LLM, then read the SSE body
async def test_stream(client, monkeypatch):
    async def fake_stream(messages):
        for t in ["Hel", "lo"]:
            yield t
    monkeypatch.setattr("app.services.llm.stream", fake_stream)
    async with client.stream("POST", "/chat/stream", json={"messages": []}) as r:
        body = "".join([chunk async for chunk in r.aiter_text()])
    assert '"text": "Hel"' in body and '"type": "done"' in body`,
        },
        {
          note: "In the React world, the Vercel AI SDK's `useChat` hook and its streaming protocol are a popular alternative to hand-written readers. It speaks to any backend that implements its protocol, including Python ones. Build the manual version first so you understand it.",
        },
      ],
    },
  ],
  revise: [
    "SSE: `text/event-stream`; events are `data:`/`event:`/`id:`/`retry:` lines ending with a blank line; `:` comments as heartbeats.",
    "OpenAI streams `chat.completion.chunk` objects ending with `data: [DONE]`; Anthropic sends named events (message_start → content_block_delta... → message_delta → message_stop).",
    "Tool-call arguments stream in fragments: accumulate, run tools only when complete, stream status events meanwhile.",
    "Test with `curl -N` and pytest with a fake LLM stream.",
  ],
  interview: [
    {
      q: "How do you stream a response when the model also calls tools?",
      a: "Stream text deltas to the client as they arrive, but accumulate tool-call arguments until the tool-use block is complete. When the turn ends with a tool call, send a status event to the UI, run the tools, append the tool results, and start the next streamed model call, repeating until a normal final answer. Errors and completion are sent as events, and the full transcript is saved at the end.",
    },
  ],
};

export const deepTools = {
  minutes: 35,
  sections: [
    {
      h: "Tool choice: auto, required, none, or a specific tool",
      blocks: [
        {
          table: {
            head: ["Mode", "OpenAI `tool_choice`", "Anthropic `tool_choice`", "Use"],
            rows: [
              ["Model decides", "`\"auto\"`", "`{\"type\": \"auto\"}`", "Default"],
              ["Must call some tool", "`\"required\"`", "`{\"type\": \"any\"}`", "Routing steps where text answers aren't allowed"],
              ["Must call this tool", "`{\"type\": \"function\", \"function\": {\"name\": \"x\"}}`", "`{\"type\": \"tool\", \"name\": \"x\"}`", "Forcing a specific action or extraction"],
              ["No tools", "`\"none\"`", "`{\"type\": \"none\"}`", "Final answer step"],
            ],
          },
        },
        {
          note: "Some of the newest reasoning models don't support forcing a tool (they return an error for forced tool choice). Check the model's docs, and prefer structured outputs when you just need data in a fixed shape.",
        },
      ],
    },
    {
      h: "Parallel tool calls",
      blocks: [
        "Models can request several independent tools in one turn (\"weather in Pune *and* Mumbai\"). Run them concurrently and return all results together, in the next message.",
        {
          lang: "python",
          code: `import asyncio, json

async def run_tools(content_blocks) -> list[dict]:
    calls = [b for b in content_blocks if b.type == "tool_use"]

    async def one(call):
        try:
            result = await REGISTRY[call.name](**call.input)
            return {"type": "tool_result", "tool_use_id": call.id, "content": json.dumps(result)}
        except Exception as e:
            return {"type": "tool_result", "tool_use_id": call.id, "content": str(e), "is_error": True}

    return await asyncio.gather(*(one(c) for c in calls))     # all results, one user message`,
        },
      ],
    },
    {
      h: "Generating tool schemas from Python",
      blocks: [
        "Hand-writing JSON Schemas is error-prone. Generate them from Pydantic models or typed functions.",
        {
          lang: "python",
          code: `from pydantic import BaseModel, Field

class GetOrderStatus(BaseModel):
    """Get the current status and delivery estimate of the user's order."""
    order_id: str = Field(description="Order number, digits only, e.g. 4521")

tool = {
    "name": "get_order_status",
    "description": GetOrderStatus.__doc__,
    "input_schema": GetOrderStatus.model_json_schema(),
}
# When the model calls it, validate the arguments with the same model:
args = GetOrderStatus.model_validate(block.input)`,
        },
        {
          lang: "python",
          code: `# Anthropic's tool runner (beta): schemas from type hints + docstrings, and it runs the loop for you
import anthropic
from anthropic import beta_tool

@beta_tool
def get_order_status(order_id: str) -> str:
    """Get the current status and delivery estimate of the user's order.

    Args:
        order_id: Order number, digits only.
    """
    return json.dumps(lookup(order_id))

runner = anthropic.Anthropic().beta.messages.tool_runner(
    model="claude-opus-5", max_tokens=16000,
    tools=[get_order_status],
    messages=[{"role": "user", "content": "Where is my order 4521?"}],
)
for message in runner:          # each model turn; tools run automatically in between
    final = message
print(next(b.text for b in final.content if b.type == "text"))`,
        },
        {
          lang: "python",
          code: `# Gemini: pass Python functions; the SDK can call them automatically
from google import genai
from google.genai import types

def get_order_status(order_id: str) -> dict:
    """Get the current status and delivery estimate of the user's order."""
    return lookup(order_id)

r = genai.Client().models.generate_content(
    model="gemini-2.5-flash",
    contents="Where is my order 4521?",
    config=types.GenerateContentConfig(tools=[get_order_status]),
)
print(r.text)`,
        },
      ],
    },
    {
      h: "Built-in (server-side) tools",
      blocks: [
        "Providers now host some tools themselves, so you don't implement them:",
        {
          table: {
            head: ["Provider", "Hosted tools (examples)"],
            rows: [
              ["OpenAI (Responses API)", "Web search, file search over uploaded files, code interpreter, remote MCP servers"],
              ["Anthropic", "Web search, web fetch, code execution, and connecting remote MCP servers"],
              ["Google Gemini", "Grounding with Google Search, code execution, URL context"],
            ],
          },
        },
        "Tool names and versions change often; check each provider's current docs. Hosted tools are convenient, but your own tools remain essential for your business data and actions.",
      ],
    },
    {
      h: "Designing tool results",
      blocks: [
        {
          list: [
            "Return **compact, structured** results (JSON with only the useful fields), not whole database rows or HTML pages. Tool results cost input tokens on every later call.",
            "Include identifiers the model may need next (`order_id`, `ticket_id`).",
            "Truncate or paginate large outputs and say so (\"showing 10 of 240 results\").",
            "Return errors as results with a clear message (Anthropic: `is_error: true`) so the model can recover or ask the user.",
            "Treat tool outputs from external sources as untrusted (indirect prompt injection).",
          ],
        },
        "Tool calling in a loop is an **agent**. On Days 10–12 you'll build agents with LangGraph, and on Day 13 you'll expose tools through MCP so any model or app can use them.",
      ],
    },
  ],
  revise: [
    "tool_choice: auto / required (OpenAI) or any (Anthropic) / a specific tool / none. Some newest models reject forced tool choice.",
    "Parallel tool calls: run concurrently (asyncio.gather), return all results in one message.",
    "Generate schemas from Pydantic (`model_json_schema()`) or typed functions; Anthropic's `@beta_tool` + tool runner; Gemini accepts Python functions.",
    "Hosted tools: web search, file search, code execution, MCP connectors.",
    "Tool results: compact, include ids, truncate, errors as results, treat external data as untrusted.",
  ],
  interview: [
    {
      q: "What is tool_choice and when would you force a tool?",
      a: "It controls whether the model may answer in text, must call some tool, must call a specific tool, or may not call tools. Forcing a tool is useful in routing steps or when you need a particular action or argument extraction every time; \"none\" is useful for a final answer step. For just getting data in a shape, structured outputs are now usually the cleaner option, and some newer models don't support forcing.",
    },
  ],
};

export const deepReliability = {
  minutes: 30,
  sections: [
    {
      h: "Idempotency: retries must not double-charge",
      blocks: [
        "Retries are safe for reading, dangerous for writing. If a tool issues a refund and the request times out after the refund succeeded, a retry can refund twice.",
        {
          list: [
            "Give every state-changing operation an **idempotency key** (e.g. `refund:{order_id}:{conversation_id}`) and store it with the result; a repeat returns the stored result.",
            "Payment gateways (Razorpay, Stripe) support idempotency keys; use them.",
            "Record which tool calls already ran in a conversation before re-running a failed turn.",
          ],
        },
      ],
    },
    {
      h: "Circuit breakers and graceful degradation",
      blocks: [
        {
          lang: "python",
          code: `import time

class CircuitBreaker:
    def __init__(self, failures_to_open: int = 5, cooldown: float = 30.0):
        self.failures, self.limit, self.cooldown, self.opened_at = 0, failures_to_open, cooldown, None

    def allow(self) -> bool:
        if self.opened_at and time.monotonic() - self.opened_at < self.cooldown:
            return False                      # open: fail fast, don't hammer a sick provider
        return True

    def record(self, ok: bool) -> None:
        if ok:
            self.failures, self.opened_at = 0, None
        else:
            self.failures += 1
            if self.failures >= self.limit:
                self.opened_at = time.monotonic()`,
        },
        {
          list: [
            "When the primary provider's breaker is open, go straight to the fallback.",
            "Degrade gracefully: a cached answer, a simpler model, a \"we're busy, here's the FAQ\" message, or queue the request, instead of a blank error.",
          ],
        },
      ],
    },
    {
      h: "Observability: trace every LLM call",
      blocks: [
        {
          list: [
            "Log per call: request id, feature, prompt version, model, parameters, token usage, latency (TTFT and total), stop reason, error, user and conversation ids.",
            "For chains and agents, trace the whole request as a tree of spans (retrieval → LLM → tool → LLM). OpenTelemetry has GenAI conventions, and tools like Langfuse, LangSmith and Arize Phoenix visualise LLM traces.",
            "Store prompts and outputs carefully: they can contain personal data. Mask, restrict access and set retention.",
          ],
        },
      ],
    },
    {
      h: "Testing LLM code",
      blocks: [
        {
          table: {
            head: ["Layer", "How to test"],
            rows: [
              ["Your logic (parsing, validation, tools, routing)", "Unit tests with a fake LLM provider: fast, free, deterministic"],
              ["HTTP integration", "Mock the provider's HTTP API (e.g. `respx` for httpx) with recorded responses, including 429s and malformed outputs"],
              ["Prompt and model quality", "Evals on a test set with scores (Day 9), run on prompt/model changes"],
              ["End to end", "A few smoke tests against the real API in CI or before deploys"],
            ],
          },
        },
      ],
    },
    {
      h: "Gateways: one API over many providers",
      blocks: [
        {
          lang: "python",
          code: `# uv add litellm
from litellm import completion

r = completion(
    model="anthropic/claude-opus-5",            # or "openai/gpt-4o-mini", "gemini/gemini-2.5-flash", "ollama/llama3.2"
    messages=[{"role": "user", "content": "Explain idempotency in one line."}],
    max_tokens=16000,
)
print(r.choices[0].message.content)             # OpenAI-shaped response for every provider`,
        },
        "Gateways (LiteLLM, OpenRouter, cloud AI gateways) add routing, fallbacks, budgets, caching and logging in one place. Many companies run one centrally so every team gets keys, limits and cost reports for free.",
      ],
    },
  ],
  revise: [
    "Idempotency keys for state-changing operations so retries can't double-execute.",
    "Circuit breakers fail fast when a provider is unhealthy; degrade gracefully (cache, simpler model, queue, FAQ).",
    "Trace every call: prompt version, model, tokens, latency, stop reason, errors; span trees for chains and agents.",
    "Test layers: fake provider unit tests, mocked HTTP, evals, a few real smoke tests.",
    "Gateways like LiteLLM/OpenRouter give one OpenAI-shaped API with routing, fallbacks and budgets.",
  ],
  interview: [
    {
      q: "How do you test code that calls an LLM?",
      a: "Separate deterministic logic from model behaviour. Unit-test parsing, validation, tools and routing with a fake provider that returns canned outputs, including malformed ones and errors. Mock the HTTP layer to test retries and rate-limit handling. Evaluate prompt and model quality with an eval set and scores rather than exact-match assertions. Keep a few real-API smoke tests before deploys.",
    },
  ],
};
