// Day 6: why RAG, grounded prompting, RAG failure modes. Merged into d06.js. Shape: see ./index.js

export const ragWhy = {
  minutes: 70,
  level: "Beginner",
  intro:
    "Retrieval-augmented generation (RAG) is the most asked-about GenAI pattern in Indian interviews, and the core of most enterprise GenAI products: chat with your documents, support bots, internal search assistants. Before building it, understand where it came from, what problem it solves, how it compares with fine-tuning, long context and tools, and the family of RAG variants you'll hear named.",
  sections: [
    {
      h: "The problem RAG solves",
      blocks: [
        "An LLM only knows what was in its training data, up to its knowledge cutoff, and it stores that knowledge approximately. It doesn't know your company's HR policy, yesterday's price list, or a customer's order history, and when asked, it may confidently invent an answer.",
        "RAG's idea is simple: **at question time, retrieve the relevant information and put it in the prompt**, then ask the model to answer from it. The model becomes a reader and writer over *your* data, instead of a memory of the internet.",
        {
          lang: "text",
          code: `Without RAG:  "What is our maternity leave policy?" → model guesses from general knowledge ✗
With RAG:     retrieve "HR Policy 2026 > Leave > Maternity" → model answers from it, citing page 12 ✓`,
        },
      ],
    },
    {
      h: "A short history of RAG",
      blocks: [
        {
          table: {
            head: ["When", "Milestone", "What it added"],
            rows: [
              ["1970s–2010s", "Open-domain question answering systems (e.g. IBM Watson on Jeopardy, 2011)", "Retrieve documents, then extract an answer: the old ancestor of RAG"],
              ["2017", "\"Reading Wikipedia to Answer Open-Domain Questions\" (DrQA, Facebook)", "A retriever plus a neural reader over Wikipedia"],
              ["2020", "**REALM** (Google) and the **RAG** paper (Lewis et al., Facebook AI)", "Retriever and generator trained together; the name \"retrieval-augmented generation\""],
              ["2021", "**RETRO** (DeepMind)", "A model that retrieves from trillions of tokens while generating"],
              ["2022–23", "ChatGPT plus LangChain and LlamaIndex make \"chat with your PDF\" mainstream", "RAG becomes an application pattern rather than a model architecture: any LLM + any retriever"],
              ["2023–24", "Self-RAG, Corrective RAG (CRAG), Microsoft **GraphRAG**, Anthropic's **Contextual Retrieval**", "Models that decide when to retrieve, check retrieved results, use knowledge graphs, and add context to chunks"],
              ["2024–26", "**Agentic RAG**, deep-research agents, long-context models, MCP connectors", "Retrieval becomes one tool an agent can call repeatedly"],
            ],
          },
        },
        "Today, \"RAG\" usually means the application pattern: your own pipeline around a hosted or open LLM. That's what you'll build.",
      ],
    },
    {
      h: "RAG vs fine-tuning vs long context vs tools",
      blocks: [
        {
          table: {
            head: ["Approach", "Best for", "Weak at"],
            rows: [
              ["**RAG**", "Private, changing or large knowledge; citations; per-user permissions", "Needs good retrieval; multi-hop and aggregate questions are hard"],
              ["**Fine-tuning**", "Style, format, tone, narrow tasks, smaller cheaper models", "Adding or updating facts; no citations; retraining to change"],
              ["**Long context**", "A few large documents analysed at once", "Cost and latency per call; lost-in-the-middle; can't hold a whole company's data"],
              ["**Tools / APIs**", "Live, structured data (order status, stock, balances) and actions", "Unstructured knowledge in documents"],
            ],
          },
        },
        {
          tip: "These combine. A support bot might use RAG for policies, a tool for order status, a fine-tuned small model for classification, and long context to read one long contract. In interviews, say which piece solves which part of the problem.",
        },
      ],
    },
    {
      h: "The anatomy of a RAG system",
      blocks: [
        {
          lang: "text",
          code: `INDEXING (offline, when documents change)
  sources → load/parse → clean → chunk (+ metadata) → embed → vector store (+ keyword index)

QUERYING (online, per question)
  question + history → condense/rewrite → retrieve (filters: user, tenant) → rerank
    → build grounded prompt (numbered sources) → LLM → answer + citations → log + feedback

EVALUATION (continuous)
  labelled questions → retrieval metrics (recall@k) + answer metrics (faithfulness, correctness)`,
        },
        {
          table: {
            head: ["Component", "Its job", "Covered on"],
            rows: [
              ["Loader / parser", "Turn files into clean text with page and section metadata", "Today"],
              ["Chunker", "Split into retrievable pieces that make sense alone", "Today"],
              ["Embedder + vector store", "Find chunks by meaning, filtered by permissions", "Day 5"],
              ["Query rewriting, hybrid search, reranking", "Improve what gets retrieved", "Today (condensing), Day 8"],
              ["Prompt builder", "Grounded prompt with numbered sources and rules", "Today"],
              ["LLM + citations", "Answer only from sources, cite them, say \"I don't know\"", "Today"],
              ["Evals and monitoring", "Prove it works and keeps working", "Day 9"],
            ],
          },
        },
      ],
    },
    {
      h: "RAG variants you'll hear named",
      blocks: [
        {
          table: {
            head: ["Variant", "Idea"],
            rows: [
              ["Naive RAG", "Embed the question, take the top-k chunks, answer. What most tutorials build"],
              ["Advanced RAG", "Adds query rewriting, hybrid search, reranking, better chunking, contextual chunk text"],
              ["Conversational RAG", "Condenses follow-up questions using chat history before retrieval"],
              ["Parent-document / small-to-big", "Retrieve small chunks, send their larger parent section to the LLM"],
              ["Self-RAG / Corrective RAG", "The system judges whether retrieved chunks are relevant and retrieves again or falls back to web search if not"],
              ["GraphRAG", "Builds a knowledge graph of entities and relations to answer multi-hop and \"summarise everything about X\" questions"],
              ["Agentic RAG", "An agent decides when and what to retrieve, possibly several times, across several sources"],
              ["Multimodal RAG", "Retrieves images, tables and page screenshots, answered by a vision-capable model"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "RAG = retrieve relevant information at question time and put it in the prompt; the LLM answers from it with citations.",
    "History: open-domain QA → DrQA (2017) → REALM and the RAG paper (2020) → RETRO (2021) → LangChain/LlamaIndex app pattern (2023) → Self-RAG, CRAG, GraphRAG, Contextual Retrieval → agentic RAG.",
    "RAG for private/changing knowledge and citations; fine-tuning for style and narrow tasks; long context for a few big documents; tools for live data and actions. They combine.",
    "Pipeline: indexing (load, clean, chunk, embed, store) → querying (condense, retrieve with filters, rerank, grounded prompt, LLM, citations) → evaluation.",
    "Variants: naive, advanced, conversational, parent-document, Self-RAG/CRAG, GraphRAG, agentic, multimodal.",
  ],
  mistakes: [
    "Proposing fine-tuning to teach a model company documents.",
    "Treating RAG as only \"embed and search\" and ignoring parsing, permissions and evaluation.",
  ],
  interview: [
    {
      q: "What is RAG and why is it needed?",
      a: "Retrieval-augmented generation retrieves relevant information from your own data at question time and includes it in the prompt, so the LLM answers from current, private, citable sources instead of its training memory. It addresses knowledge cutoffs, private data and hallucination, supports per-user permissions, and avoids retraining when documents change.",
    },
    {
      q: "RAG vs fine-tuning: when do you use each?",
      a: "RAG for knowledge: private, frequently changing or large document sets where you need citations and access control. Fine-tuning for behaviour: consistent style or format, narrow classification or extraction, or making a smaller model perform well on a specific task. They're complementary; many systems use RAG for facts and fine-tuning (or just prompting) for how answers are written.",
    },
    {
      q: "What are some advanced RAG variants?",
      a: "Advanced RAG adds query rewriting, hybrid search and reranking; parent-document retrieval sends larger context around small matched chunks; Self-RAG and Corrective RAG check retrieved relevance and retry or fall back; GraphRAG uses a knowledge graph for multi-hop and global questions; agentic RAG lets an agent decide when and where to retrieve, possibly iteratively; multimodal RAG retrieves images and tables for vision models.",
    },
  ],
  practice: [
    "Draw the full RAG architecture for a college admission FAQ bot from memory, labelling each component with a technology choice.",
  ],
};

export const grounding = {
  minutes: 75,
  level: "Intermediate",
  intro:
    "Retrieval puts the right chunks in the prompt; the **grounded prompt** decides whether the model actually uses them faithfully. This lesson is about prompting specifically for RAG: how to format sources, where to put them, the rules that keep answers faithful, how to handle conflicting or outdated sources, answer styles for different products, and the structured-output variant that makes citations verifiable.",
  sections: [
    {
      h: "The anatomy of a grounded prompt",
      blocks: [
        {
          lang: "python",
          code: `SYSTEM = """You are the HR assistant for Acme India. Employees ask about company policies.

Answer using ONLY the documents in <documents>. They are the company's official policies.
- Cite the supporting document after each claim, like [2] or [1][3].
- If the documents don't answer the question, reply exactly:
  "I couldn't find this in the policy documents." and suggest contacting hr@acme.example.
- If documents conflict, prefer the one with the latest effective date and mention the conflict.
- Never use outside knowledge about labour law or other companies.
- Reply in the employee's language (English or Hindi), in at most 5 sentences."""

def user_prompt(chunks: list[dict], question: str) -> str:
    docs = "\\n\\n".join(
        f'<document index="{i}" title="{c["title"]}" page="{c["page"]}" effective="{c["effective_date"]}">\\n'
        f'{c["text"]}\\n</document>'
        for i, c in enumerate(chunks, start=1))
    return f"<documents>\\n{docs}\\n</documents>\\n\\nQuestion: {question}"`,
        },
        {
          table: {
            head: ["Element", "Why"],
            rows: [
              ["Role and audience", "Sets tone and scope (employees, customers, doctors...)"],
              ["\"Only the documents\" rule", "The core grounding instruction"],
              ["Numbered, tagged sources with metadata", "Lets the model cite and reason about title, page and date"],
              ["Exact fallback sentence", "Code can detect refusals; users get a useful next step"],
              ["Conflict rule", "Real document sets contain old and new versions"],
              ["Scope limits", "Stops outside knowledge leaking in"],
              ["Format and language", "Fits the UI and the user"],
            ],
          },
        },
      ],
    },
    {
      h: "Formatting and ordering the context",
      blocks: [
        {
          list: [
            "**Documents first, question last.** Models answer more accurately when the question comes after the material, and a stable document-first layout also plays well with caching of long contexts.",
            "**Tag each source** with an index and useful metadata (title, section, page, date). Don't make the model guess where a chunk came from.",
            "**Order by relevance** (best first, or best last to avoid lost-in-the-middle; test on your eval set). Keep chunks from the same document in reading order when they're adjacent.",
            "**Deduplicate** near-identical chunks so you don't waste tokens or bias the answer.",
            "**Budget tokens**: a fixed allowance for sources (e.g. 3,000 tokens) keeps cost predictable.",
          ],
        },
        {
          warn: "Retrieved documents go in the **user** message, never the system prompt: they're data, possibly written by outsiders (uploaded files, web pages), and must not carry developer authority. Tell the model that instructions inside documents are not instructions (prompt injection, Day 4).",
        },
      ],
    },
    {
      h: "Conflicting, outdated and partial sources",
      blocks: [
        {
          table: {
            head: ["Situation", "Handling"],
            rows: [
              ["Two versions of a policy", "Store `effective_date` / `version` metadata; filter out superseded versions at retrieval time when possible; otherwise instruct the model to prefer the latest and mention the conflict"],
              ["Sources partially answer", "Answer the covered part, state clearly what isn't covered"],
              ["Sources disagree without dates", "Present both views with citations rather than picking silently"],
              ["Question needs a calculation", "Let the model show the inputs from sources; compute in code or with a tool when exactness matters"],
            ],
          },
        },
      ],
    },
    {
      h: "Answer styles for different products",
      blocks: [
        {
          table: {
            head: ["Product", "Style"],
            rows: [
              ["Support bot", "Short, friendly, steps as a list, one or two citations, escalation option"],
              ["Internal knowledge assistant", "Direct answer first, then details, all claims cited"],
              ["Legal / compliance / medical", "Quote the exact source text, cite precisely, refuse readily, add a disclaimer"],
              ["Research assistant", "Longer synthesis across many sources, grouped by theme, with a sources list"],
              ["Voice assistant", "One or two spoken sentences, no markdown or citation markers (keep citations in the UI)"],
            ],
          },
        },
      ],
    },
    {
      h: "Structured grounded answers",
      blocks: [
        "For high-trust products, ask for structured output with supporting quotes, then verify the quotes in code before showing the answer.",
        {
          lang: "python",
          code: `from pydantic import BaseModel, Field

class Claim(BaseModel):
    text: str = Field(description="One sentence of the answer")
    source: int = Field(description="Index of the supporting document")
    quote: str = Field(description="Exact words from that document that support the sentence")

class GroundedAnswer(BaseModel):
    answerable: bool
    claims: list[Claim]

def verify(answer: GroundedAnswer, chunks: list[dict]) -> list[str]:
    problems = []
    for c in answer.claims:
        if not 1 <= c.source <= len(chunks):
            problems.append(f"cites missing document {c.source}")
        elif " ".join(c.quote.split()).lower() not in " ".join(chunks[c.source - 1]["text"].split()).lower():
            problems.append(f"quote not found in document {c.source}: {c.quote[:60]}")
    return problems`,
        },
        "Whitespace and case are normalised before matching; use fuzzy matching (e.g. `rapidfuzz`) if models paraphrase slightly. Claims that fail verification can be dropped, regenerated, or flagged.",
      ],
    },
  ],
  revise: [
    "Grounded prompt: role, \"only the documents\", numbered tagged sources, exact fallback, conflict rule, scope limits, format and language.",
    "Documents first, question last; tag sources with metadata; order and dedupe; budget tokens.",
    "Retrieved text goes in the user message and is data, not instructions.",
    "Versions: effective-date metadata, filter superseded docs, prefer latest and mention conflicts; partial answers stated as partial.",
    "Match answer style to the product (support, internal, legal, research, voice).",
    "Structured claims with quotes, verified in code, for high-trust answers.",
  ],
  mistakes: [
    "Putting retrieved documents in the system prompt.",
    "No instruction for conflicting or outdated documents.",
    "Letting the model \"fill gaps\" with general knowledge in regulated domains.",
  ],
  interview: [
    {
      q: "How do you write the prompt for a RAG system?",
      a: "A system prompt with the assistant's role and audience, a strict rule to answer only from the provided documents, citation instructions, an exact fallback sentence when the answer isn't there, rules for conflicting sources, and format and language requirements. The user message contains the retrieved chunks as numbered, tagged documents with metadata, followed by the question. Retrieved text is treated as data, not instructions.",
    },
    {
      q: "How do you handle conflicting documents in RAG?",
      a: "Prevent it where possible with version and effective-date metadata, filtering out superseded documents at retrieval time. Otherwise include dates in the source tags and instruct the model to prefer the latest effective document and mention the conflict, or present both views with citations when there's no clear winner. Track such cases in evals.",
    },
  ],
  practice: [
    "Take your RAG prompt and add an effective-date conflict rule; test it with an old and a new version of the same policy.",
  ],
};

export const ragFailures = {
  minutes: 70,
  level: "Intermediate",
  intro:
    "\"Your RAG gives wrong answers. Debug it.\" is one of the most common GenAI interview questions, and the most common production task. Good engineers don't tweak prompts at random; they locate the failing stage with traces and fix that stage. This lesson gives you a catalogue of failure points (based on published research and practice) and a repeatable debugging method.",
  sections: [
    {
      h: "Where RAG fails",
      blocks: [
        "A 2024 study of real RAG systems (Barnett et al., \"Seven Failure Points When Engineering a Retrieval Augmented Generation System\") catalogued the ways they break. Expanded with common production issues:",
        {
          table: {
            head: ["#", "Failure point", "What you see", "Typical fixes"],
            rows: [
              ["1", "**Missing content**: the answer isn't in the indexed data", "Confident wrong answer or a refusal", "Add the document; good \"I don't know\" behaviour; track unanswered questions"],
              ["2", "**Parsing failure**: text extracted badly", "Garbled chunks, tables as soup, empty scanned pages", "Better parser, OCR, Markdown conversion, look at the text"],
              ["3", "**Missed top-ranked documents**: relevant chunk exists but isn't retrieved", "Right document never appears in sources", "Chunking, better embeddings, hybrid search, query rewriting, higher k + reranking"],
              ["4", "**Not in context**: retrieved but dropped by a limit or dedupe", "It was in top-20 but not in the prompt", "Reranking, token budgets, parent-document retrieval"],
              ["5", "**Not extracted**: in the prompt, but the model missed it", "Sources contain the answer, the answer doesn't", "Less noise, better ordering, clearer prompt, stronger model"],
              ["6", "**Wrong format**: ignores the requested structure", "Missing citations, wrong length, broken JSON", "Structured output, examples, validation"],
              ["7", "**Incorrect specificity**: too general or too detailed", "Vague or rambling answers", "Answer-style instructions, examples"],
              ["8", "**Incomplete**: only part of a multi-part answer", "Covers one of three asked points", "Query decomposition, more retrieval for each sub-question"],
              ["9", "**Wrong permissions or stale data**", "Old policy quoted; another team's document", "Filters, versions, index freshness monitoring"],
              ["10", "**Follow-up failure**", "Second question in a chat retrieves nothing", "Query condensation, check the rewritten query"],
            ],
          },
        },
      ],
    },
    {
      h: "A step-by-step debugging method",
      blocks: [
        {
          list: [
            "**Reproduce** with the exact question, user, conversation and index version. Save it as a test case.",
            "**Check the data:** is the answer in the source documents at all? (Search the raw files.) If not: failure 1.",
            "**Check the parsed text and chunks:** does a chunk contain the answer, readably? If not: parsing (2) or chunking.",
            "**Check the query actually used for retrieval** (after condensation/rewriting). Is it sensible?",
            "**Check retrieval:** is the answer chunk in the top-k? In the top-50? Look at its rank and score. If absent: failure 3.",
            "**Check the final prompt:** did the chunk survive reranking, dedupe and token limits? If not: failure 4.",
            "**Check generation:** with the right chunk in the prompt, is the answer faithful and complete? If not: failures 5–8.",
            "**Fix one stage, then re-run the whole eval set,** not just this question.",
          ],
          ordered: true,
        },
      ],
    },
    {
      h: "Traces make debugging possible",
      blocks: [
        "Log a trace for every RAG request so you can answer those questions in minutes instead of hours:",
        {
          lang: "python",
          code: `import json, logging, time, uuid

log = logging.getLogger("rag")

def answer_with_trace(question: str, user, history: list[dict]) -> dict:
    trace = {"trace_id": str(uuid.uuid4()), "user_id": user.id, "question": question, "t0": time.time()}
    trace["query"] = condense(history, question)
    hits = retrieve(trace["query"], owner_id=user.id, k=20)
    trace["retrieved"] = [{"id": h["id"], "score": round(h["score"], 3)} for h in hits]
    chunks = select_for_prompt(hits, token_budget=3000)
    trace["in_prompt"] = [c["id"] for c in chunks]
    result = generate(question, chunks, history)
    trace |= {"answer": result["answer"], "cited": result["cited"], "prompt_version": PROMPT_VERSION,
              "model": MODEL, "latency_s": round(time.time() - trace["t0"], 2)}
    log.info(json.dumps(trace))
    return result | {"trace_id": trace["trace_id"]}`,
          caption: "Return the trace id to the UI so a user's \"this answer is wrong\" report points straight at the trace.",
        },
        "Tools like Langfuse, LangSmith and Arize Phoenix store and visualise such traces; the fields are what matter.",
      ],
    },
    {
      h: "Worked example",
      blocks: [
        {
          lang: "text",
          code: `Report: "Bot said interns get 12 casual leaves. Policy says 6."

1. Data:       HR Policy §4.3 says interns get 6. ✓ present
2. Chunks:     chunk hr:p12:c3 = "...Interns: 6 casual leaves per year..." ✓ readable
3. Query:      "What about interns?" (follow-up) → rewritten to "What about interns?" ✗ not condensed!
4. Retrieval:  top-5 = employee leave chunks (12 leaves); the intern chunk ranked 31st
Root cause:    condensation step skipped when history came from a restored session
Fix:           load history before condensing; add a regression test with this conversation
Verify:        re-run the eval set: follow-up questions 11/15 → 14/15`,
        },
      ],
    },
  ],
  revise: [
    "Failure points: missing content, parsing, missed retrieval, not in context, not extracted, wrong format, wrong specificity, incomplete, permissions/stale data, follow-up failures.",
    "Debug in order: reproduce → data → parsed chunks → rewritten query → retrieval rank → final prompt → generation; fix one stage, re-run all evals.",
    "Trace every request: query, rewritten query, retrieved ids and scores, prompt chunks, answer, citations, versions, latency; return a trace id.",
  ],
  mistakes: [
    "Tweaking the prompt before checking whether the right chunk was even retrieved.",
    "Fixing one reported question without adding it to the eval set.",
    "No traces, so every bug report starts from zero.",
  ],
  interview: [
    {
      q: "Your RAG system gives wrong answers. How do you debug it?",
      a: "Reproduce the exact case, then walk the pipeline with traces: is the answer in the source data; was it parsed and chunked readably; what query was actually used after rewriting; is the right chunk in the top-k (and at what rank); did it survive reranking and token limits into the prompt; and with it in the prompt, is the answer faithful and complete. Fix the failing stage (data, parsing, chunking, retrieval, context assembly, or generation), add the case to the eval set, and re-run all evals to avoid regressions.",
    },
    {
      q: "What would you log for each RAG request?",
      a: "A trace id, user and tenant, the original question and the rewritten query, retrieved chunk ids with scores and ranks, which chunks made it into the prompt, prompt and model versions, the answer, the citations, token usage, latency per stage, and user feedback. With personal data masked and access restricted.",
    },
  ],
  practice: [
    "Take three wrong answers from your DocChat and classify each using the failure table and the debugging steps.",
  ],
};
