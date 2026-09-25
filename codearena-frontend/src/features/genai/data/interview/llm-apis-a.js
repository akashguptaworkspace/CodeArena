// Day 4 interview bank, part 1: APIs & SDKs, conversations, prompting, structured output, streaming. Assembled in d04.js.

export const apiQs = {
  title: "LLM APIs and SDKs",
  questions: [
    {
      id: "what-happens-api-call",
      q: "What actually happens when your backend calls an LLM API?",
      level: "Basic",
      common: true,
      answer:
        "It's an HTTPS POST with a JSON body (model, messages, settings) and an API key header. The provider tokenizes the input, runs the model and returns JSON with the generated content, a stop reason and token usage, or streams tokens as Server-Sent Events. Errors come back as HTTP status codes: 400 bad request, 401 auth, 429 rate limit, 5xx or overloaded. SDKs wrap this with types, retries, timeouts and streaming helpers.",
    },
    {
      id: "provider-differences",
      q: "What are the main differences between the OpenAI, Anthropic and Gemini APIs?",
      level: "Intermediate",
      common: true,
      answer:
        "OpenAI Chat Completions puts the system prompt in the messages list and returns `choices[0].message`; Anthropic's Messages API takes `system` as a separate parameter, requires `max_tokens`, and returns a list of content blocks; Gemini uses `contents` with `parts`, a `system_instruction`, and calls the assistant role `model`. Tool calling differs too: OpenAI has a `tool` role with `tool_call_id`, Anthropic sends `tool_result` blocks in a user message. Stop reasons and usage field names differ. The concepts are the same, so an adapter layer can hide the differences.",
    },
    {
      id: "openai-compatible",
      q: "What does \"OpenAI-compatible API\" mean and why does it matter?",
      level: "Basic",
      answer:
        "Many providers and servers (Groq, Together, DeepSeek, OpenRouter, vLLM, Ollama and Gemini's compatibility endpoint) accept the same request and response format as OpenAI's Chat Completions. You can use the `openai` SDK with a different `base_url` and key, so switching providers or running models locally needs no code changes, which makes gateways, fallbacks and local development easy.",
    },
    {
      id: "chat-vs-responses",
      q: "Chat Completions vs OpenAI's Responses API?",
      level: "Intermediate",
      answer:
        "Chat Completions is stateless (you resend history every call) and is the de facto industry format. The Responses API takes instructions and input, can store conversation state server-side and continue via `previous_response_id`, and supports hosted tools like web search, file search and code interpreter. I'd use Chat Completions for portable code and Responses for OpenAI-only agentic apps that benefit from hosted tools.",
    },
    {
      id: "api-history",
      q: "How have LLM APIs evolved since 2020?",
      level: "Intermediate",
      answer:
        "From a single-prompt Completions endpoint (GPT-3, 2020), to role-based Chat Completions (2023), then function calling (2023), JSON mode, schema-constrained structured outputs and prompt caching (2024), and agent-oriented APIs with hosted tools, server-side state, reasoning-effort controls and MCP connectors (2024–25). The trend is from text-in/text-out towards platforms for tools and agents.",
    },
    {
      id: "api-keys-frontend",
      q: "Why must LLM API keys never be in the frontend, and how do you architect around that?",
      level: "Basic",
      common: true,
      answer:
        "Anything in a browser or mobile bundle can be extracted, so the key would be stolen and your bill drained. The client calls your backend, which authenticates the user, applies rate limits and budgets, builds the prompt server-side, calls the provider with a secret key from environment/secret storage, and logs usage. Use separate keys per environment and spending limits in the provider console.",
    },
    {
      id: "stop-reasons",
      q: "Why do you check the stop reason on every response?",
      level: "Basic",
      common: true,
      answer:
        "It tells you whether the output is complete and usable: a natural end, a length limit (truncated text or invalid JSON), a tool call to execute, a stop sequence, or a refusal/safety stop. Code that ignores it shows half answers, parses broken JSON, or misses tool calls. Handle each case explicitly and log it.",
    },
    {
      id: "max-tokens",
      q: "How do you choose max_tokens?",
      level: "Intermediate",
      answer:
        "It's a cap on output (including thinking tokens for reasoning models), not a target, and you only pay for what's generated. Set it high enough that normal answers never truncate (generous for thinking models), and low enough to bound worst-case cost and latency. Control typical length through instructions, monitor average output tokens, and check the stop reason for truncation.",
    },
    {
      id: "model-pinning",
      q: "Should production code use a model alias or a pinned version?",
      level: "Intermediate",
      answer:
        "Prefer a pinned, dated snapshot where available, so behaviour doesn't change under you when the alias moves to a new version. Keep the model ID in configuration, re-run your eval set before upgrading, and track provider deprecation schedules so you migrate before retirement.",
    },
    {
      id: "sdk-retries",
      q: "What do the official SDKs do for retries, and what's the risk of adding your own?",
      level: "Intermediate",
      answer:
        "The OpenAI and Anthropic SDKs retry connection errors, 408, 409, 429 and 5xx with exponential backoff (two retries by default) and respect retry hints. Wrapping them in another retry layer multiplies attempts (3 × 3 = 9), increasing latency and load during an outage. Configure `max_retries` on the client, or disable it if you implement retries yourself.",
    },
  ],
};

export const conversationQs = {
  title: "Roles, conversations and memory",
  questions: [
    {
      id: "roles",
      q: "Explain the system, user and assistant roles.",
      level: "Basic",
      common: true,
      answer:
        "System (or developer) messages are the application's standing instructions: role, rules, format, boundaries. User messages are the end user's input plus any per-request data your code adds. Assistant messages are the model's previous replies, which you send back to maintain the conversation. Tool results are a fourth kind: a `tool` role in OpenAI, `tool_result` blocks in a user message in Claude.",
    },
    {
      id: "stateless",
      q: "LLM APIs are stateless. How does a chatbot remember?",
      level: "Basic",
      common: true,
      answer:
        "The application stores the conversation (in a database, per conversation and user) and resends the relevant history with each request. As chats grow, it trims old turns, summarises them, or retrieves relevant past messages to stay within the context window and budget. Some APIs offer server-side state (e.g. OpenAI Responses with previous_response_id), but you still decide what to keep.",
    },
    {
      id: "memory-strategies",
      q: "Compare conversation memory strategies.",
      level: "Intermediate",
      common: true,
      answer:
        "Full history is simplest but grows cost and latency until it hits the limit. A sliding window keeps the last N turns but forgets early facts. Summary plus recent turns keeps key facts cheaply at the cost of detail. Retrieval memory embeds past messages and fetches relevant ones for very long histories. Long-term user memory stores stable facts in a profile, which raises privacy and correctness questions. Most products combine a window with a rolling summary.",
    },
    {
      id: "store-conversations",
      q: "How would you store chat conversations in a database?",
      level: "Intermediate",
      answer:
        "A conversations table (id, user_id, title, rolling summary, timestamps) and a messages table (conversation_id, role, content as JSON to support tool calls and images, model, token counts, created_at), indexed by conversation and id. Every read is scoped to the conversation owner to prevent IDOR, and retention and deletion policies handle personal data.",
    },
    {
      id: "system-vs-user-content",
      q: "What should go in the system prompt vs the user message?",
      level: "Basic",
      common: true,
      answer:
        "The system prompt holds stable developer instructions: identity, task, rules, format and safety boundaries. Per-request data (the user's question, retrieved documents, user profile, today's date) goes in the user message, clearly tagged as data. That keeps untrusted content from gaining developer authority (a prompt-injection defence) and keeps the system prompt stable for prompt caching.",
    },
    {
      id: "developer-role",
      q: "What is the developer role in OpenAI's API?",
      level: "Advanced",
      answer:
        "On newer OpenAI models, developer messages carry the application's instructions, replacing the old system role, to make the instruction hierarchy explicit: platform/model-provider rules first, then developer instructions, then user messages. Practically, treat it like a system prompt.",
    },
  ],
};

export const promptQs = {
  title: "Prompt engineering",
  questions: [
    {
      id: "what-prompt-engineering",
      q: "What is prompt engineering, really?",
      level: "Basic",
      common: true,
      answer:
        "Designing the instructions, context and examples a model receives so it reliably produces the output you need, and testing that it does. It's mostly clear communication (task, audience, constraints, format, success criteria) plus the right context and an evaluation loop, not magic phrases.",
    },
    {
      id: "zero-few-shot",
      q: "Zero-shot vs few-shot prompting?",
      level: "Basic",
      common: true,
      answer:
        "Zero-shot gives only instructions; few-shot adds a few input→output examples so the model copies the format, labelling style and judgement. Few-shot fixes inconsistent formats and borderline decisions quickly. Use 3–5 diverse examples covering edge cases and balanced labels, and remember they cost tokens every call.",
    },
    {
      id: "few-shot-vs-finetune",
      q: "Few-shot prompting vs fine-tuning?",
      level: "Intermediate",
      common: true,
      answer:
        "Few-shot is instant, flexible and needs no training, but costs tokens on every call and is limited by context. Fine-tuning bakes behaviour into the weights: consistent format or style at high volume with shorter prompts and often a smaller model, but it needs data, training time and retraining to change, and it doesn't reliably add knowledge. Start with prompting (and dynamic few-shot); fine-tune when prompts can't hit the quality or cost target.",
    },
    {
      id: "cot",
      q: "What is chain-of-thought prompting, and when does it help?",
      level: "Intermediate",
      common: true,
      answer:
        "Asking the model to reason step by step before answering, so intermediate steps condition the final answer. It helps standard models on multi-step maths, logic and multi-hop questions, at the cost of extra output tokens and latency. Keep reasoning separate from the answer (tags or a JSON field). Reasoning models already think internally, so you give them goals and set effort instead.",
    },
    {
      id: "delimiters",
      q: "Why use delimiters like XML tags in prompts?",
      level: "Basic",
      answer:
        "They clearly separate instructions from data (documents, emails, user input) and from each other, so the model doesn't confuse pasted content with instructions, you can reference sections by name, and templates stay readable. They also help, though don't guarantee, resistance to prompt injection when paired with rules that tagged content is data.",
    },
    {
      id: "production-prompt",
      q: "What does a good production system prompt contain?",
      level: "Intermediate",
      common: true,
      answer:
        "Identity and audience, the task, what context will arrive and that it's data, rules with the reasons behind them (including what to do when unsure), tool usage guidance, output format (length, structure, language), and a few examples including edge cases. It's short enough to maintain, versioned, and tested against an eval set.",
    },
    {
      id: "outdated-tricks",
      q: "Which prompt engineering habits are outdated with modern models?",
      level: "Advanced",
      answer:
        "Magic expert phrases, shouting rules in capitals (modern models over-apply them), \"respond only in JSON\" plus regex parsing (use structured outputs), prefilling the assistant turn (unsupported on many newer models), telling reasoning models to think step by step, and giant rule lists. What still works: clear goals, relevant context, good examples, explicit success criteria and evals.",
    },
    {
      id: "context-engineering",
      q: "What is context engineering?",
      level: "Intermediate",
      common: true,
      answer:
        "Deciding what goes into the context window on each call: instructions, retrieved knowledge, memory, tool definitions and results, and task state. The aim is the smallest, most relevant, clearly labelled and well-ordered context within a token budget. For RAG and agents it matters more than the wording of instructions.",
    },
    {
      id: "prompt-chaining",
      q: "When would you use prompt chaining instead of one prompt?",
      level: "Intermediate",
      answer:
        "When a task involves distinct jobs (extract, decide, write) that interfere in one prompt. A chain gives each step a focused prompt and schema, lets you put deterministic code (lookups, rules, validation) between steps, use cheaper models for easy steps, and debug and test each step. The cost is more calls and latency.",
    },
    {
      id: "self-critique",
      q: "Does asking an LLM to check its own work help?",
      level: "Intermediate",
      answer:
        "Often, if the check is a separate call with explicit, checkable criteria and the relevant sources: e.g. a reviewer that returns pass/fail with problems, followed by one revision. Vague \"double-check your answer\" in the same call helps little. It adds cost and latency, so use it for high-stakes outputs and confirm with evals that it improves results.",
    },
    {
      id: "dynamic-few-shot",
      q: "What is dynamic few-shot prompting?",
      level: "Advanced",
      answer:
        "Instead of fixed examples, you store many labelled examples with embeddings and, for each request, retrieve the few most similar to the input to include as examples. It gives relevant demonstrations for varied inputs without a huge prompt, and it's a cheap alternative to fine-tuning for classification and extraction.",
    },
    {
      id: "reasoning-model-prompts",
      q: "How do you prompt a reasoning model differently?",
      level: "Intermediate",
      answer:
        "Give the goal, constraints, available context and what a good result looks like, and let it plan; don't script its steps or ask it to think step by step. Control depth and cost with the reasoning effort or thinking settings rather than temperature, and still use structured outputs for machine-read results.",
    },
    {
      id: "prompt-versioning",
      q: "How do you manage prompts in a team?",
      level: "Intermediate",
      common: true,
      answer:
        "Prompts live in files or a prompt registry, versioned in Git and reviewed like code, with variables filled from templates. Each response is logged with the prompt version. A test set runs on every change, comparing versions on accuracy, format validity, latency and cost. Tools like Langfuse or LangSmith help with versioning, tracing and comparing runs.",
    },
    {
      id: "debug-prompt",
      q: "A prompt works on your examples but fails in production. What do you do?",
      level: "Intermediate",
      common: true,
      answer:
        "Collect real failing cases from logs and add them to the test set. Categorise failures (format, missing knowledge, ignored rule, bad judgement, tool choice), form one hypothesis per category, change one thing at a time, and re-run the whole set to avoid regressions. Often the fix isn't wording: it's better context, structured output, examples of the borderline cases, or code-side validation.",
    },
    {
      id: "multilingual-prompts",
      q: "How would you prompt for users who write in Hindi or Hinglish?",
      level: "Intermediate",
      answer:
        "Keep instructions in English, state the reply-language rule explicitly (reply in the user's language and script; Hinglish in, Hinglish out), keep amounts, names and codes unchanged, and include examples in the target languages. Test with real user text, including Roman-script Hindi, and budget for higher token counts in Indic scripts.",
    },
  ],
};

export const structuredQs = {
  title: "Structured output",
  questions: [
    {
      id: "guarantee-json",
      q: "How do you guarantee valid JSON from an LLM?",
      level: "Basic",
      common: true,
      answer:
        "Use the provider's structured output feature with a JSON Schema (generated from a Pydantic model), which constrains decoding so the output matches the schema. Then validate with Pydantic for business rules, handle refusals and truncation via the stop reason, and retry once with the validation errors if needed. Design the schema to help: enums, descriptions, nullable fields and a flat structure.",
    },
    {
      id: "json-mode-vs-structured",
      q: "JSON mode vs structured outputs vs tool-based extraction?",
      level: "Intermediate",
      common: true,
      answer:
        "JSON mode only guarantees syntactically valid JSON, not your keys or types. Structured outputs constrain generation to your schema. Tool-based extraction defines a tool whose arguments are the schema (with strict mode) and reads the arguments, which was the common approach before native structured outputs and is still useful when the model should choose between several output shapes.",
    },
    {
      id: "constrained-decoding",
      q: "How does constrained decoding work?",
      level: "Advanced",
      answer:
        "At each generation step, the server masks out tokens that would make the output invalid under a grammar compiled from the JSON Schema, so only valid continuations can be sampled. The result is guaranteed to parse and match the schema. It supports a subset of JSON Schema, and it doesn't guarantee the values are correct, only well-formed.",
    },
    {
      id: "schema-design",
      q: "How do you design schemas that models fill correctly?",
      level: "Intermediate",
      common: true,
      answer:
        "Enums for anything you branch on, descriptions on fields (meaning, units, formats), nullable fields for information that may be missing so the model doesn't invent values, a reasoning field before judgement fields, correct types (ints, floats, ISO dates validated later), and small flat schemas; split large extractions into several calls.",
    },
    {
      id: "strict-mode-rules",
      q: "What limitations do strict JSON schemas have?",
      level: "Advanced",
      answer:
        "Providers support a subset of JSON Schema: typically all properties must be required with additionalProperties false, optional fields must be expressed as nullable, and some keywords (certain formats, numeric or length bounds, complex combinators, deep recursion) may be unsupported or ignored. So keep schemas simple and enforce the rest with Pydantic validators after parsing.",
    },
    {
      id: "validation-retry",
      q: "The model returns data that passes the schema but breaks a business rule. What do you do?",
      level: "Intermediate",
      answer:
        "Validate with Pydantic custom validators or code checks (dates in order, totals matching items), and on failure retry once with the validation errors fed back as a message. If it still fails, fall back: return partial data with flags, route to human review, or error clearly. Compute derived values (totals, durations) in code rather than asking the model.",
    },
    {
      id: "classification-design",
      q: "How would you design an LLM classifier's output?",
      level: "Intermediate",
      answer:
        "A structured schema with a short reasoning field first, the label as an enum including an other/unsure option, optional secondary labels as a list for multi-label cases, and a categorical confidence used to route low-confidence items to humans. Measure accuracy and a confusion matrix on a labelled set and refine the label definitions that get confused.",
    },
  ],
};

export const streamingQs = {
  title: "Streaming",
  questions: [
    {
      id: "why-stream",
      q: "Why stream LLM responses?",
      level: "Basic",
      common: true,
      answer:
        "Total generation time is similar, but time to first token drops from many seconds to under one, so the app feels fast. Streaming also lets users stop generation early, shows progress on long answers, and avoids request timeouts on very long outputs.",
    },
    {
      id: "stream-browser",
      q: "How would you stream an LLM response to a React frontend?",
      level: "Intermediate",
      common: true,
      answer:
        "The FastAPI backend calls the LLM with streaming and relays tokens as Server-Sent Events from an async generator (`StreamingResponse`, `text/event-stream`). React POSTs with fetch and reads `response.body` with a reader, buffering and splitting on blank lines, appending tokens to state, with an AbortController for Stop. In production: disable proxy buffering, heartbeat for idle timeouts, send errors as events, cancel upstream on disconnect and save the final message.",
    },
    {
      id: "sse-vs-websocket",
      q: "SSE vs WebSockets for a chatbot?",
      level: "Intermediate",
      common: true,
      answer:
        "SSE is one-way server-to-client over plain HTTP: simple, works with existing auth, proxies and load balancers, and fits request-then-stream chat. WebSockets are bidirectional and suit real-time voice, collaborative editing or server-initiated pushes, but need connection management and scaling work. For standard chat, SSE is the pragmatic choice.",
    },
    {
      id: "sse-format",
      q: "What does the SSE wire format look like?",
      level: "Intermediate",
      answer:
        "A `text/event-stream` response containing events made of `field: value` lines (`data:`, optionally `event:`, `id:`, `retry:`) terminated by a blank line; lines starting with a colon are comments, often used as keep-alive pings. OpenAI streams JSON chunks in `data:` lines ending with `data: [DONE]`; Anthropic uses named events like `content_block_delta` and `message_stop`.",
    },
    {
      id: "stream-errors",
      q: "How do you handle an error that happens in the middle of a stream?",
      level: "Intermediate",
      answer:
        "Once streaming starts the HTTP status is already 200, so errors must be sent as an in-band event (e.g. `{\"type\":\"error\"}`) that the client handles by showing a message and a retry option. Server-side, catch exceptions in the generator, log them with the request id, save whatever partial answer is useful, and make sure the upstream LLM stream is closed.",
    },
    {
      id: "stream-gotchas",
      q: "Streaming works locally but arrives all at once in production. Why?",
      level: "Intermediate",
      common: true,
      answer:
        "Something in between is buffering the response: Nginx or another reverse proxy, a load balancer, a CDN, or compression middleware. Disable buffering for the route (e.g. `X-Accel-Buffering: no`, proxy_buffering off), avoid gzip on event streams, and check load-balancer idle timeouts, sending heartbeat comments during long pauses.",
    },
    {
      id: "stream-cancel",
      q: "What should happen when the user closes the tab during a stream?",
      level: "Intermediate",
      answer:
        "The server should detect the disconnect (in FastAPI, `await request.is_disconnected()` or cancellation of the generator) and stop consuming the upstream LLM stream, so you stop paying for tokens nobody reads. Save the partial answer if the product needs it, and log the cancellation.",
    },
    {
      id: "stream-tools",
      q: "How do you stream when the model calls tools?",
      level: "Advanced",
      answer:
        "Stream text deltas as they arrive, but accumulate tool-call argument fragments until each tool call is complete. When the turn ends with tool calls, send a status event to the UI, run the tools (in parallel if independent), append the results and start the next streamed call, repeating until a final answer. The SDKs' final-message helpers assemble tool calls for you.",
    },
  ],
};
