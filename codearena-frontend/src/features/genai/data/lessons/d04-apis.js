// Day 4: how LLM APIs work, multimodal inputs, cost control. Merged into d04.js. Shape: see ./index.js

export const apiBasics = {
  minutes: 90,
  level: "Beginner",
  intro:
    "Before prompts and frameworks, understand the plumbing. An LLM API is just an HTTPS endpoint that takes JSON and returns JSON (or a stream of events). This lesson shows the raw requests for OpenAI, Claude and Gemini, what the SDKs add on top, how to handle keys safely as a MERN developer, how the APIs evolved from 2020 to today, and the parameters you'll set on every call.",
  sections: [
    {
      h: "An LLM API is an ordinary HTTP API",
      blocks: [
        {
          lang: "text",
          code: `Your backend ── HTTPS POST (JSON: model, messages, settings) + API key ──▶ Provider
             ◀── 200 OK (JSON: generated content, stop reason, usage) ──────────
             or  ◀── text/event-stream (tokens as they're generated) ──────────
             or  ◀── 4xx / 5xx error (bad request, auth, rate limit, overloaded) ─`,
        },
        "Everything you know from calling Razorpay, Stripe or any REST API applies: authentication headers, JSON bodies, status codes, timeouts, retries and rate limits. The differences are that responses are slow (seconds, not milliseconds), billed per token, non-deterministic, and often streamed.",
      ],
    },
    {
      h: "The raw requests, provider by provider",
      blocks: [
        {
          lang: "bash",
          code: `# OpenAI: Chat Completions
curl https://api.openai.com/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a concise tutor."},
      {"role": "user", "content": "What is an API key?"}
    ]
  }'`,
        },
        {
          lang: "bash",
          code: `# Anthropic (Claude): Messages API
curl https://api.anthropic.com/v1/messages \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 16000,
    "system": "You are a concise tutor.",
    "messages": [{"role": "user", "content": "What is an API key?"}]
  }'`,
        },
        {
          lang: "bash",
          code: `# Google Gemini: generateContent
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "system_instruction": {"parts": [{"text": "You are a concise tutor."}]},
    "contents": [{"role": "user", "parts": [{"text": "What is an API key?"}]}]
  }'`,
        },
        {
          table: {
            head: ["", "OpenAI", "Anthropic", "Gemini"],
            rows: [
              ["Auth header", "`Authorization: Bearer <key>`", "`x-api-key: <key>` + `anthropic-version`", "`x-goog-api-key: <key>`"],
              ["Endpoint", "`/v1/chat/completions` (and `/v1/responses`)", "`/v1/messages`", "`/v1beta/models/{model}:generateContent`"],
              ["Messages field", "`messages` with `content` strings or parts", "`messages` with `content` strings or blocks", "`contents` with `parts`"],
              ["System prompt", "A `system`/`developer` message", "Top-level `system`", "`system_instruction`"],
              ["Output limit", "Optional (`max_completion_tokens`)", "**Required** (`max_tokens`)", "Optional (`maxOutputTokens`)"],
            ],
          },
        },
      ],
    },
    {
      h: "Reading a response",
      blocks: [
        {
          lang: "json",
          code: `// Anthropic response (trimmed). OpenAI and Gemini have the same ingredients in different places.
{
  "id": "msg_01XyZ...",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-5",
  "content": [
    {"type": "text", "text": "An API key is a secret string that identifies your app..."}
  ],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 24, "output_tokens": 61}
}`,
        },
        {
          table: {
            head: ["Ingredient", "OpenAI", "Anthropic", "Gemini"],
            rows: [
              ["Generated text", "`choices[0].message.content`", "`content[]` blocks of type `text`", "`candidates[0].content.parts[].text`"],
              ["Why it stopped", "`finish_reason`: `stop`, `length`, `tool_calls`, `content_filter`", "`stop_reason`: `end_turn`, `max_tokens`, `tool_use`, `stop_sequence`, `refusal`", "`finishReason`: `STOP`, `MAX_TOKENS`, `SAFETY`, ..."],
              ["Token usage", "`usage.prompt_tokens`, `completion_tokens`", "`usage.input_tokens`, `output_tokens`", "`usageMetadata`"],
              ["Request ID (for support)", "`x-request-id` header", "`request-id` header (`message._request_id` in Python)", "Response metadata"],
            ],
          },
        },
        {
          warn: "Always check the stop reason before trusting the output. `length` / `max_tokens` means the answer was cut off; `refusal` or safety reasons mean the content may be empty or partial.",
        },
      ],
    },
    {
      h: "What the SDKs add",
      blocks: [
        "You could use `httpx` for everything (you learned it on Day 2). The official SDKs are thin, typed wrappers that save you work:",
        {
          lang: "python",
          code: `# The same Claude call with plain httpx: it's just HTTP
import os, httpx

r = httpx.post(
    "https://api.anthropic.com/v1/messages",
    headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
    json={"model": "claude-opus-5", "max_tokens": 16000,
          "messages": [{"role": "user", "content": "What is an API key?"}]},
    timeout=60,
)
r.raise_for_status()
print(r.json()["content"][0]["text"])`,
        },
        {
          table: {
            head: ["SDK feature", "Why it matters"],
            rows: [
              ["Typed request/response objects", "Autocomplete and fewer typos (`r.usage.input_tokens`)"],
              ["Automatic retries with backoff", "429s and 5xx handled for you (2 retries by default)"],
              ["Timeouts and connection pooling", "Sensible defaults, reuse of connections"],
              ["Streaming helpers", "`text_stream`, `get_final_message()`: no manual SSE parsing"],
              ["Structured output helpers", "`.parse()` methods that return Pydantic objects"],
              ["Async clients", "`AsyncOpenAI`, `AsyncAnthropic`, `client.aio` for FastAPI"],
            ],
          },
        },
        {
          lang: "bash",
          code: `uv add openai anthropic google-genai python-dotenv`,
        },
        "Many providers (Groq, Together, DeepSeek, OpenRouter, local Ollama and vLLM, and Gemini's compatibility endpoint) accept the **OpenAI format**, so the `openai` SDK works with them by changing `base_url` and the key. That's what your `llm.py` helper does.",
      ],
    },
    {
      h: "API keys: the MERN developer's rules",
      blocks: [
        {
          list: [
            "**Never call an LLM API directly from React.** Anything in the browser bundle is public, so your key would be stolen within hours and your bill drained. The browser calls *your* FastAPI/Express backend; the backend holds the key.",
            "Keep keys in environment variables (pydantic-settings, `.env` in `.gitignore`), and in a secret manager in production.",
            "Use **separate keys per environment** (dev, staging, prod) and per project, so you can revoke one without breaking everything.",
            "Set **spending limits and alerts** in each provider console on day one.",
            "Rotate keys regularly and immediately if one leaks (GitHub scans for leaked keys, and so do attackers).",
            "Your backend must also authenticate *your* users and rate-limit them, otherwise your endpoint becomes a free LLM proxy for the internet.",
          ],
        },
      ],
    },
    {
      h: "How LLM APIs evolved (and why the shapes look the way they do)",
      blocks: [
        {
          table: {
            head: ["When", "Milestone", "What changed"],
            rows: [
              ["2020", "OpenAI API launches with GPT-3: the **Completions** endpoint", "Send a `prompt` string, get a continuation. Prompting meant writing the start of a document"],
              ["2022", "Instruction-tuned models (text-davinci-003)", "Prompts could be instructions instead of document starts"],
              ["Mar 2023", "**Chat Completions** (`gpt-3.5-turbo`, then GPT-4); Anthropic releases Claude via API", "Role-based `messages` replace a single prompt string: the format everyone copied"],
              ["Jun 2023", "**Function calling** in OpenAI's API", "Models return structured tool calls; the start of agents"],
              ["Nov 2023", "JSON mode; the Assistants API (later superseded)", "Valid JSON guaranteed, but not your schema"],
              ["Late 2023–2024", "Anthropic's **Messages API** and Google's **Gemini API**; Claude tool use", "Content blocks (text, image, tool_use) instead of plain strings"],
              ["Aug 2024", "OpenAI **Structured Outputs**; Anthropic **prompt caching**", "Schema-constrained JSON; cheaper repeated prefixes"],
              ["Nov 2024", "**Model Context Protocol (MCP)**", "A standard way to plug tools and data into any model (Day 13)"],
              ["Mar 2025", "OpenAI **Responses API** and Agents SDK", "Built-in tools, server-side conversation state, agent-oriented design"],
              ["2025–26", "Reasoning controls (effort, thinking budgets), structured outputs across providers, tool runners, batch and caching everywhere", "APIs become agent platforms"],
            ],
          },
        },
        {
          lang: "text",
          code: `2020 Completions:  prompt="Q: What is an API key?\\nA:"             → "An API key is ..."
2023 Chat:         messages=[{role: "user", content: "What is..."}] → {role: "assistant", content: "..."}
2025 Responses:    input="What is...", tools=[web_search]            → output items: search call, message`,
        },
        "Chat Completions is still the lingua franca of the industry because so many providers and tools copy it. Learn it first, then the provider-native APIs.",
      ],
    },
    {
      h: "OpenAI: Chat Completions vs the Responses API",
      blocks: [
        {
          lang: "python",
          code: `from openai import OpenAI
client = OpenAI()

# Chat Completions: you send and store the whole conversation
r = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "system", "content": "Be concise."},
              {"role": "user", "content": "Explain SSE in one line."}],
)
print(r.choices[0].message.content)

# Responses API: instructions + input; can keep state server-side
r1 = client.responses.create(model="gpt-4o-mini", instructions="Be concise.",
                             input="Explain SSE in one line.")
print(r1.output_text)
r2 = client.responses.create(model="gpt-4o-mini", input="Now compare it with WebSockets.",
                             previous_response_id=r1.id)     # continues the conversation
print(r2.output_text)`,
        },
        {
          table: {
            head: ["", "Chat Completions", "Responses API"],
            rows: [
              ["Conversation state", "You resend history every call", "Optional server-side state via `previous_response_id`"],
              ["Built-in tools", "Your own functions only", "Also hosted tools (web search, file search, code interpreter)"],
              ["Compatibility", "Copied by most other providers", "OpenAI-specific"],
              ["Use it for", "Portable code, OpenAI-compatible providers", "OpenAI-only apps that want hosted tools and agents"],
            ],
          },
        },
      ],
    },
    {
      h: "Parameters you'll set on almost every call",
      blocks: [
        {
          table: {
            head: ["Parameter", "OpenAI", "Anthropic", "Gemini", "Advice"],
            rows: [
              ["Model", "`model`", "`model`", "URL / `model=`", "Keep it in config; pin versions for production"],
              ["Output cap", "`max_completion_tokens`", "`max_tokens` (required)", "`max_output_tokens`", "Generous enough to avoid truncation, especially with thinking; check the stop reason"],
              ["Randomness", "`temperature`, `top_p`", "Older models only", "`temperature`, `top_p`", "Many newest reasoning models reject these; steer with prompts and effort"],
              ["Reasoning depth", "`reasoning_effort` (reasoning models)", "`output_config={\"effort\": ...}` / `thinking`", "`thinking_config`", "Lower effort = faster and cheaper"],
              ["Stop strings", "`stop`", "`stop_sequences`", "`stop_sequences`", "Rarely needed with structured output"],
              ["Metadata", "`user`, `metadata`", "`metadata={\"user_id\": ...}`", "Labels", "Helps providers with abuse detection and your own tracing"],
            ],
          },
        },
        {
          note: "The newest Claude models think adaptively by default, and thinking tokens count toward `max_tokens`. A small `max_tokens` (like 256) can cut an answer off before it starts. The Claude docs use generous caps like 16,000; you only pay for tokens actually generated.",
        },
        {
          tip: "Model IDs: use an **alias** (e.g. `claude-opus-5`) while developing, and a **pinned, dated snapshot** where the provider offers one in production, so behaviour doesn't change under you. Track provider deprecation notices; old models are retired on a schedule.",
        },
      ],
    },
  ],
  revise: [
    "LLM APIs are HTTPS + JSON (or SSE): auth header, model, messages, settings → content, stop reason, usage.",
    "Auth: OpenAI `Authorization: Bearer`; Anthropic `x-api-key` + `anthropic-version`; Gemini `x-goog-api-key`.",
    "Anthropic requires `max_tokens` and a top-level `system`; Gemini uses `contents`/`parts` and `system_instruction`.",
    "Always check the stop reason; log usage and request IDs.",
    "SDKs add types, retries, timeouts, streaming and parse helpers. OpenAI-compatible endpoints work with the `openai` SDK via `base_url`.",
    "Never call LLM APIs from the browser; keys live on the backend, per environment, with spending limits.",
    "Evolution: Completions (2020) → Chat Completions (2023) → function calling → JSON mode → Structured Outputs & caching (2024) → Responses API & MCP (2024–25).",
    "Responses API: server-side state (`previous_response_id`) and hosted tools; Chat Completions is the portable standard.",
  ],
  mistakes: [
    "Putting an API key in React or a mobile app bundle.",
    "One shared production key for every service and developer.",
    "A tiny `max_tokens` with a thinking model, giving empty or truncated answers.",
    "Ignoring the stop reason and request ID when debugging.",
  ],
  interview: [
    {
      q: "Why shouldn't a React app call the OpenAI or Claude API directly?",
      a: "Anything shipped to the browser is public, so the API key would be exposed and abused. The frontend should call your backend, which authenticates the user, enforces rate limits and budgets, adds system prompts and context server-side, calls the provider with a secret key, and logs usage.",
    },
    {
      q: "What's the difference between OpenAI's Chat Completions and Responses APIs?",
      a: "Chat Completions is stateless: you send the full message list every call; it's the format most other providers copy. The Responses API takes instructions and input, can keep conversation state server-side via previous_response_id, and supports hosted tools like web search and file search, making it more agent-oriented but OpenAI-specific.",
    },
  ],
  practice: [
    "Make the same request with curl to two providers and compare the JSON responses field by field.",
    "Rewrite one SDK call using plain httpx, then list three things the SDK was doing for you.",
  ],
};

export const multimodal = {
  minutes: 75,
  level: "Intermediate",
  intro:
    "Modern models read images, PDFs and (with the right models) audio, not just text. In Indian product companies this powers invoice and GST-bill extraction, KYC document checks, insurance claim photos, handwritten forms and voice bots in Indian languages. This lesson shows how to send images and PDFs to OpenAI, Claude and Gemini, how audio fits in, what it costs, and how to make the results trustworthy.",
  sections: [
    {
      h: "How images become tokens",
      blocks: [
        "A vision model splits an image into patches, turns each patch into an embedding (like a token), and processes them alongside text tokens. So images **cost tokens**, and more pixels means more tokens.",
        {
          list: [
            "Claude's documentation gives a rule of thumb of roughly `width × height / 750` tokens per image (after any resizing), so a 1000×1000 image is about 1,300 tokens.",
            "OpenAI offers a `detail` setting (`low` for a cheap fixed cost, `high` for fine text).",
            "Very large images are downscaled by the provider anyway; resize yourself to the smallest size where the text is still readable to save tokens and time.",
          ],
        },
      ],
    },
    {
      h: "Sending an image: three providers",
      blocks: [
        {
          lang: "python",
          code: `import base64
from pathlib import Path

def b64(path: str) -> str:
    return base64.standard_b64encode(Path(path).read_bytes()).decode()

QUESTION = "What is the total amount and the GSTIN on this bill?"`,
        },
        {
          lang: "python",
          code: `# OpenAI: an image_url part with a data URL
from openai import OpenAI
r = OpenAI().chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": [
        {"type": "text", "text": QUESTION},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64('bill.jpg')}"}},
    ]}],
)
print(r.choices[0].message.content)`,
        },
        {
          lang: "python",
          code: `# Claude: an image content block (put images before the question)
import anthropic
r = anthropic.Anthropic().messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64("bill.jpg")}},
        {"type": "text", "text": QUESTION},
    ]}],
)
print(next(b.text for b in r.content if b.type == "text"))`,
        },
        {
          lang: "python",
          code: `# Gemini: pass bytes as a Part
from google import genai
from google.genai import types
r = genai.Client().models.generate_content(
    model="gemini-2.5-flash",
    contents=[types.Part.from_bytes(data=Path("bill.jpg").read_bytes(), mime_type="image/jpeg"), QUESTION],
)
print(r.text)`,
        },
        "Images can also be given as public URLs on most providers. For private user uploads, send base64 from your backend (or use the provider's file upload APIs) rather than exposing files publicly.",
      ],
    },
    {
      h: "PDFs: extract text, or send the document",
      blocks: [
        {
          table: {
            head: ["Approach", "How", "Good for", "Weak at"],
            rows: [
              ["Text extraction", "`pypdf` / `pdfplumber`, then send text", "Digital PDFs with simple layout; cheapest", "Scans, tables, multi-column layouts, charts"],
              ["OCR first", "Tesseract, cloud OCR, then send text", "Scanned documents at scale", "Layout, handwriting; adds a pipeline step"],
              ["**Send the PDF to a multimodal model**", "Document/file input", "Mixed text, tables, charts and scans in one step", "Cost (each page is text + image tokens), page limits"],
            ],
          },
        },
        {
          lang: "python",
          code: `# Claude: a document block
r = anthropic.Anthropic().messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    messages=[{"role": "user", "content": [
        {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64("policy.pdf")}},
        {"type": "text", "text": "List every exclusion in this insurance policy."},
    ]}],
)

# Gemini: the same Part.from_bytes with mime_type="application/pdf"
r = genai.Client().models.generate_content(
    model="gemini-2.5-flash",
    contents=[types.Part.from_bytes(data=Path("policy.pdf").read_bytes(), mime_type="application/pdf"),
              "List every exclusion in this insurance policy."],
)`,
          caption: "OpenAI also accepts PDF files as input parts on recent models; check its current docs for the exact shape.",
        },
        {
          tip: "For RAG over many documents (Days 5–9) you still extract and chunk text; multimodal input shines for one-off analysis of a few complex documents, or to parse pages text extraction gets wrong.",
        },
      ],
    },
    {
      h: "Audio and voice",
      blocks: [
        {
          table: {
            head: ["Task", "Options"],
            rows: [
              ["Speech-to-text (STT)", "OpenAI transcription models (`whisper-1`, newer `gpt-4o-transcribe`), open Whisper, Deepgram, Google; **Sarvam** and AI4Bharat models for Indian languages"],
              ["Text-to-speech (TTS)", "OpenAI TTS, ElevenLabs, Google, Sarvam (Indian voices)"],
              ["Audio understanding", "Gemini accepts audio directly; some OpenAI models take audio input"],
              ["Real-time voice agents", "Speech-to-speech realtime APIs, or a pipeline STT → LLM → TTS"],
            ],
          },
        },
        {
          lang: "python",
          code: `from openai import OpenAI
client = OpenAI()
with open("customer_call.mp3", "rb") as f:
    transcript = client.audio.transcriptions.create(model="whisper-1", file=f)
print(transcript.text)       # then summarise, classify or extract with a normal chat call`,
        },
        "Voice-first users are a large share of India's next internet users, so STT/TTS quality in Hindi, Tamil, Bengali and code-mixed speech is a real product differentiator. Test with real accents and background noise.",
      ],
    },
    {
      h: "Making multimodal extraction trustworthy",
      blocks: [
        {
          list: [
            "**Use structured output** (a Pydantic schema) instead of free text, with nullable fields for anything that may be unreadable.",
            "**Validate in code:** GSTIN and PAN formats with regex, dates parse, line items sum to the total, amounts are positive.",
            "**Ask for evidence:** e.g. a `confidence` field or the raw text snippet each value was read from, and send low-confidence results to human review.",
            "**Pre-process images:** fix rotation, crop borders, keep resolution readable.",
            "**Watch for hallucinated fields:** blurry digits are \"read\" confidently. Never auto-approve payments or KYC on model output alone.",
          ],
        },
        {
          warn: "Aadhaar, PAN, bank statements and medical documents are sensitive personal data under India's DPDP Act. Minimise what you send, mask what you don't need, use enterprise terms with no training on your data, set retention limits, and log access.",
        },
      ],
    },
    {
      h: "Beyond input: generating images",
      blocks: [
        "Image generation (OpenAI's image models, Google's Imagen, open models like Stable Diffusion and Flux) uses separate endpoints. It's useful for marketing and design tools, but most GenAI developer roles focus on understanding inputs (vision, documents, speech) rather than generating images.",
      ],
    },
  ],
  revise: [
    "Images become patch tokens and cost tokens (Claude ≈ width × height / 750); resize to the smallest readable size.",
    "OpenAI: `image_url` part (data URL). Claude: `image` block with base64 source. Gemini: `types.Part.from_bytes`.",
    "PDFs: extract text (cheap, digital PDFs), OCR (scans), or send the document to a multimodal model (complex layouts).",
    "Audio: STT (Whisper, gpt-4o-transcribe, Sarvam for Indic) → LLM → TTS, or realtime speech-to-speech APIs.",
    "Trust: structured output, code validation (GSTIN, sums), evidence/confidence, human review, no auto-approval.",
    "Sensitive documents: minimise, mask, retention limits, DPDP Act compliance.",
  ],
  mistakes: [
    "Sending huge phone photos at full resolution, paying for tokens that add nothing.",
    "Trusting numbers read from blurry images without validation.",
    "Sending full KYC documents to an API when only one field is needed.",
  ],
  interview: [
    {
      q: "How would you build invoice extraction from photos?",
      a: "Accept the upload on the backend, pre-process (rotate, resize), send it to a vision model with a Pydantic schema for structured output (vendor, GSTIN, date, line items, taxes, total, with nullable fields), then validate in code: GSTIN format, dates, line items summing to the total. Low-confidence or failing validations go to human review. I'd measure field-level accuracy on a labelled set of real invoices and track cost per document.",
    },
    {
      q: "Text extraction vs sending a PDF to a multimodal model?",
      a: "Text extraction is cheap and fine for digital PDFs with simple layouts, and it's what you chunk for RAG. Multimodal document input handles scans, tables, charts and complex layouts in one step but costs more per page. Many systems combine them: extract text where it works and fall back to multimodal parsing for pages that fail.",
    },
  ],
  practice: [
    "Photograph a restaurant bill and extract the total, GSTIN and line items with a vision model; validate the sum in Python.",
  ],
};

export const costControl = {
  minutes: 80,
  level: "Intermediate",
  intro:
    "A demo that costs ₹2 per request can become a ₹20 lakh monthly bill at scale. Interviewers ask \"How would you cut the cost of this feature by half?\" in almost every GenAI round. This lesson turns the cost levers from Day 3 into code: counting tokens, prompt caching on each provider, batch APIs, model routing, response caching, output control and per-user budgets.",
  sections: [
    {
      h: "Where the money goes",
      blocks: [
        {
          lang: "text",
          code: `cost per request = (uncached input × input price) + (cached input × cached price) + (output × output price)
monthly cost     = cost per request × requests per month

Typical RAG request: 1,500 system+tools │ 2,500 retrieved chunks │ 300 history │ 50 question │ 400 answer`,
        },
        "Before optimising, **measure**: log model, input/cached/output tokens, latency and feature name for every call, and find the few features and prompts that dominate the bill.",
      ],
    },
    {
      h: "Counting tokens before you send",
      blocks: [
        {
          lang: "python",
          code: `# OpenAI models: estimate locally
import tiktoken
enc = tiktoken.get_encoding("o200k_base")
print(len(enc.encode(prompt_text)))

# Claude: exact count from the API (free to call), including system and tools
import anthropic
count = anthropic.Anthropic().messages.count_tokens(
    model="claude-opus-5", system=SYSTEM, messages=messages,
)
print(count.input_tokens)

# Gemini
from google import genai
print(genai.Client().models.count_tokens(model="gemini-2.5-flash", contents=prompt_text).total_tokens)`,
        },
        "Use counts to trim history and context *before* hitting the context limit, and to estimate costs in tests.",
      ],
    },
    {
      h: "Prompt caching on each provider",
      blocks: [
        "Caching reuses the processed prefix of a prompt (the KV cache from Day 3). It's usually the single biggest saving for chatbots, RAG with a long system prompt, and agents with many tools.",
        {
          table: {
            head: ["Provider", "How it works", "How to see it"],
            rows: [
              ["OpenAI", "**Automatic** for long prompts (1,024+ tokens) with a repeated prefix", "`usage.prompt_tokens_details.cached_tokens`"],
              ["Anthropic", "Opt in with `cache_control`: top-level for automatic caching of the last cacheable block, or on specific blocks; minimum cacheable length varies by model (512–4,096 tokens)", "`usage.cache_read_input_tokens`, `cache_creation_input_tokens`"],
              ["Gemini", "Implicit caching on recent models, plus explicit context caches you create and reference", "`usage_metadata.cached_content_token_count`"],
            ],
          },
        },
        {
          lang: "python",
          code: `import anthropic
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    cache_control={"type": "ephemeral"},          # cache the prompt up to the last cacheable block
    system=LONG_POLICY_HANDBOOK,                  # thousands of tokens, identical on every call
    messages=[{"role": "user", "content": question}],
)
u = response.usage
print(u.cache_creation_input_tokens, u.cache_read_input_tokens, u.input_tokens)
# 1st call: tokens written to cache (slightly pricier). Later calls within the TTL: read at ~10% of the price.`,
        },
        {
          list: [
            "Caching is a **prefix match**: any change early in the prompt invalidates everything after it.",
            "Put stable things first (system prompt, tool definitions, documents), variable things last (the question).",
            "Silent cache-breakers: a timestamp or user name in the system prompt, tools in a different order, `json.dumps` without `sort_keys=True` on data you embed.",
            "Caches expire (minutes by default on most providers), so savings come from steady traffic.",
          ],
        },
      ],
    },
    {
      h: "Batch APIs: half price for work that can wait",
      blocks: [
        "Evaluations, nightly summaries, tagging a million reviews: none of these need an answer in two seconds. Batch APIs process requests asynchronously (usually within hours) at about **50% off**.",
        {
          lang: "python",
          code: `import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

client = anthropic.Anthropic()
batch = client.messages.batches.create(requests=[
    Request(custom_id=f"review-{r.id}", params=MessageCreateParamsNonStreaming(
        model="claude-opus-5", max_tokens=16000,
        messages=[{"role": "user", "content": f"Classify the sentiment (positive/negative/mixed): {r.text}"}],
    ))
    for r in reviews
])
# later: poll client.messages.batches.retrieve(batch.id) until processing_status == "ended",
# then iterate client.messages.batches.results(batch.id) and match results by custom_id`,
        },
        "OpenAI's batch API works the same way: upload a JSONL file of requests (`purpose=\"batch\"`), create a batch with `completion_window=\"24h\"`, then download the output file.",
      ],
    },
    {
      h: "Model routing and cascades",
      blocks: [
        {
          list: [
            "**Routing:** send each request to the cheapest model that can handle it. Rules (\"order status questions → small model\") or a small classifier decide.",
            "**Cascade:** try a small model first; escalate to a large model only when validation fails, confidence is low, or the user asks for more.",
            "**Right effort:** for reasoning models, use low effort for easy turns and high effort only where accuracy pays.",
          ],
        },
        {
          lang: "python",
          code: `def answer(question: str) -> str:
    draft = small_model(question, schema=Answer)            # cheap and fast
    if draft.confidence >= 0.8 and passes_checks(draft):
        return draft.text
    return large_model(question, schema=Answer).text        # escalate the hard 10–20%`,
        },
      ],
    },
    {
      h: "Response caching (exact and semantic)",
      blocks: [
        {
          table: {
            head: ["Cache", "Key", "Hit when", "Risk"],
            rows: [
              ["Exact", "hash(model + prompt + settings)", "Identical request", "Low; include every input in the key"],
              ["Semantic", "Embedding of the question", "A new question is very similar to a past one", "Serving a wrong answer to a subtly different question (\"refund for order 12\" vs \"order 21\")"],
            ],
          },
        },
        {
          lang: "python",
          code: `import hashlib, json

def cache_key(model: str, messages: list[dict], **settings) -> str:
    raw = json.dumps({"m": model, "msgs": messages, "s": settings}, sort_keys=True)
    return "llm:" + hashlib.sha256(raw.encode()).hexdigest()

async def cached_complete(redis, model, messages, **settings):
    key = cache_key(model, messages, **settings)
    if hit := await redis.get(key):
        return json.loads(hit)
    result = await complete(model, messages, **settings)
    await redis.set(key, json.dumps(result), ex=24 * 3600)
    return result`,
        },
        {
          warn: "Never share cached answers across users when the answer depends on user data or permissions. Include the user or tenant in the key, or cache only public, generic answers.",
        },
      ],
    },
    {
      h: "Controlling output length",
      blocks: [
        {
          list: [
            "Output tokens cost 3–5× input: ask for concise answers explicitly (\"2–4 sentences\").",
            "Structured output is usually shorter than prose and needs no parsing.",
            "Set `max_tokens` as a safety cap (generous enough for thinking models), and monitor the average output length per feature.",
            "Don't ask for reasoning in the output when you don't show it; use the model's effort setting instead.",
          ],
        },
      ],
    },
    {
      h: "Budgets, dashboards and alerts",
      blocks: [
        {
          lang: "python",
          code: `# One row per LLM call (Postgres table or structured log)
{"ts": "...", "user_id": 42, "feature": "support_chat", "model": "claude-opus-5",
 "input_tokens": 3120, "cached_tokens": 2600, "output_tokens": 180,
 "latency_ms": 2140, "cost_usd": 0.0061, "prompt_version": "support-v7", "status": "ok"}`,
        },
        {
          list: [
            "Aggregate daily cost per feature, per model and per user; alert on spikes.",
            "Enforce per-user daily limits (free vs paid plans) before calling the model.",
            "Set hard spending limits in provider consoles as a last line of defence.",
          ],
        },
      ],
    },
    {
      h: "Worked example: cutting a bill in half",
      blocks: [
        {
          table: {
            head: ["Change", "Effect on a support bot"],
            rows: [
              ["Cache the 3,000-token system prompt + tools", "~60–80% of input tokens now billed at cache-read prices"],
              ["Retrieve 4 chunks instead of 8", "Input tokens −35%, often better answers"],
              ["Route order-status questions (40% of traffic) to a small model", "Those requests ~10× cheaper"],
              ["\"Answer in 2–4 sentences\"", "Output tokens −40%"],
              ["Nightly ticket tagging via the batch API", "That workload −50%"],
            ],
          },
        },
        "Verify each change with your eval set so quality doesn't silently drop, and report the savings with numbers. That's exactly the story interviewers want to hear.",
      ],
    },
  ],
  revise: [
    "Cost = uncached input + cached input + output (each × price). Measure per feature before optimising.",
    "Count first: tiktoken (OpenAI), `messages.count_tokens` (Claude), `models.count_tokens` (Gemini).",
    "Prompt caching: OpenAI automatic (1,024+ tokens), Anthropic `cache_control`, Gemini implicit/explicit. Stable prefix first; beware silent cache-breakers.",
    "Batch APIs ≈ 50% off for work that can wait hours.",
    "Routing and cascades: cheapest capable model; escalate on low confidence or failed validation.",
    "Response caching: exact (safe) vs semantic (risky); scope keys by user/tenant.",
    "Control output length; log every call; per-user budgets; provider spending limits.",
  ],
  mistakes: [
    "Optimising blindly without per-feature usage logs.",
    "A timestamp at the top of the system prompt that breaks caching on every call.",
    "Semantic caching answers that leak one user's data to another.",
    "Cutting costs without re-running evals.",
  ],
  interview: [
    {
      q: "How would you reduce the LLM cost of a feature by 50%?",
      a: "First measure: log tokens and cost per call by feature and prompt. Then: enable prompt caching with a stable prefix, trim retrieved context and history, route easy requests to a smaller model or cascade, shorten outputs with explicit length instructions and structured output, cache repeated responses where safe, lower reasoning effort, and move offline work to batch APIs. Validate each change against an eval set so quality holds, and track cost per request on a dashboard.",
    },
    {
      q: "What is prompt caching and what breaks it?",
      a: "Providers reuse the processed prefix of a prompt they've recently seen, billing it at a large discount and cutting latency. It's a prefix match, so anything that changes early in the prompt breaks it: timestamps or user details in the system prompt, reordered tools, non-deterministic serialisation of embedded JSON, or switching models. Put stable content first and variable content last.",
    },
  ],
  practice: [
    "Call Claude twice with a long identical system prompt and `cache_control`, and print the cache usage fields each time.",
    "Estimate your stream-chat app's monthly cost at 1,000 daily users, then list three changes that would halve it.",
  ],
};
