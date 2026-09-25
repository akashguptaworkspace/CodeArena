// Day 18: GenAI system design. Shape: see ./index.js
export default {
  framework: {
    minutes: 70,
    level: "Advanced",
    intro:
      "GenAI system design rounds ask you to design an LLM-powered product in 45–60 minutes. Interviewers look for structure, sensible trade-offs, and awareness of quality, cost, latency and safety. Use the same framework every time so you never freeze.",
    sections: [
      {
        h: "The framework (45 minutes)",
        blocks: [
          {
            table: {
              head: ["Step", "Time", "What to cover"],
              rows: [
                ["1. Requirements", "5 min", "Users, use cases, functional scope; scale (users, QPS, documents); latency target; accuracy bar; languages; compliance and privacy"],
                ["2. High-level design", "5 min", "Boxes and arrows: clients, API, ingestion, retrieval, LLM, data stores, observability"],
                ["3. Data & ingestion", "7 min", "Sources, parsing, chunking, embeddings, index, metadata, ACLs, updates and deletes"],
                ["4. Query path", "8 min", "Query understanding, retrieval (hybrid), reranking, prompt, model choice, tools/agents, streaming, citations"],
                ["5. Quality & evaluation", "6 min", "Golden set, retrieval and generation metrics, LLM judges, human review, feedback loop"],
                ["6. Safety & guardrails", "5 min", "Access control, prompt injection, PII, content filters, human approval for actions"],
                ["7. Scale, cost & latency", "6 min", "Estimates, caching, routing, batching, rate limits, fallbacks, autoscaling"],
                ["8. Monitoring & iteration", "3 min", "Tracing, dashboards, alerts, A/B tests, rollout"],
              ],
            },
          },
          {
            tip: "Say the framework out loud at the start (\"I'll cover requirements, architecture, ingestion, query path, evaluation, safety, then scale and cost\"). It shows structure and lets the interviewer steer you to what they care about.",
          },
        ],
      },
      {
        h: "Step 1: requirements questions to ask",
        blocks: [
          {
            list: [
              "Who are the users and what are the top 3 tasks?",
              "How many users, questions per day, peak QPS? How many documents, how big, how often do they change?",
              "Latency target: first token under 2 s? Full answer under 10 s?",
              "What happens if the answer is wrong? (Sets the accuracy bar and need for citations, refusals, human review.)",
              "Permissions: does everyone see everything?",
              "Languages (English, Hindi, regional, Hinglish)? Channels (web, WhatsApp, voice)?",
              "Data residency, PII, compliance (DPDP Act, RBI rules for fintech, HIPAA-like rules for health)?",
              "Build vs buy constraints: cloud provider, approved model vendors, budget.",
            ],
          },
        ],
      },
      {
        h: "Back-of-envelope estimates",
        blocks: [
          {
            lang: "text",
            code: `10,000 employees × 5 questions/day = 50,000 questions/day ≈ 0.6 QPS average, ~5 QPS peak
Per question: 3,000 input + 300 output tokens
Daily tokens: 150M input + 15M output
Cost: (150 × input price per M) + (15 × output price per M) per day → compare model tiers

Corpus: 200,000 documents × 10 chunks = 2M chunks × 1,536 dims × 4 B ≈ 12 GB vectors (+ index)`,
          },
          "Estimates drive decisions: at 5 QPS peak, one well-configured API service is plenty; the LLM bill, not servers, is the main cost, so caching and model routing matter most.",
        ],
      },
      {
        h: "Trade-offs to mention",
        blocks: [
          {
            table: {
              head: ["Decision", "Options and trade-off"],
              rows: [
                ["Model", "Large (quality) vs small (cost, latency); API vs self-hosted (privacy, cost at scale)"],
                ["Retrieval", "Vector only vs hybrid + rerank (quality vs latency)"],
                ["Workflow vs agent", "Predictable and cheap vs flexible"],
                ["Freshness", "Real-time ingestion (events) vs batch re-indexing"],
                ["Vector store", "pgvector (simplicity) vs dedicated (scale, features)"],
                ["Safety", "Stricter refusals (fewer errors) vs helpfulness"],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "Framework: requirements → high-level design → ingestion → query path → evaluation → safety → scale/cost/latency → monitoring.",
      "Ask about users, scale, latency, accuracy bar, permissions, languages, compliance.",
      "Estimate QPS, tokens, cost and vector storage; let numbers drive choices.",
      "Name trade-offs explicitly: model size/hosting, retrieval depth, workflow vs agent, freshness, store, safety.",
    ],
    interview: [
      {
        q: "How do you structure a GenAI system design answer?",
        a: "Clarify requirements and scale first, sketch the high-level architecture, then go deep on the data ingestion pipeline and the query path (retrieval, reranking, prompting, model choice, tools, streaming). Then cover how quality is evaluated, safety and access control, and scaling with cost and latency estimates, finishing with monitoring and iteration. I state trade-offs at each decision and adapt depth to what the interviewer probes.",
      },
    ],
    practice: [
      "Memorise the 8 steps. Explain them aloud in under 60 seconds.",
    ],
  },

  latency: {
    minutes: 45,
    level: "Advanced",
    intro:
      "Latency is where many GenAI designs fall apart: a 12-second answer feels broken. Interviewers probe how you'd hit a target like \"first token under 1.5 seconds\". This lesson gives you the latency budget and the architectural tools, including queues for heavy ingestion.",
    sections: [
      {
        h: "A latency budget",
        blocks: [
          {
            table: {
              head: ["Step", "Budget", "How to keep it"],
              rows: [
                ["Auth + request handling", "20 ms", "Stateless API, cached permission lookups"],
                ["Query rewrite (optional)", "200 ms", "Small fast model; skip when not a follow-up"],
                ["Embedding", "50–150 ms", "Nearby region; cache frequent queries"],
                ["Hybrid retrieval", "30–80 ms", "Indexes in memory; concurrent vector + keyword"],
                ["Rerank", "100–300 ms", "Rerank 20–30 candidates; GPU or API"],
                ["LLM first token", "300–800 ms", "Smaller prompt, fast model, prompt caching, streaming"],
                ["**Total to first token**", "**~1–1.5 s**", ""],
              ],
            },
          },
        ],
      },
      {
        h: "Techniques",
        blocks: [
          {
            list: [
              "**Stream** everything user-facing.",
              "**Parallelise** independent steps (retrieval sources, tool calls, guard checks) with `asyncio.gather`.",
              "**Speculate:** start retrieval while the query rewrite runs, or run a guardrail check alongside generation and stop the stream if it fails.",
              "**Shrink prompts:** fewer, better chunks; summarised history; short system prompts; prompt caching for stable prefixes.",
              "**Right-size models:** fast models for routing, rewriting and simple answers; big models only when needed.",
              "**Cache:** exact and semantic caches for frequent questions; cached embeddings.",
              "**Show progress:** for agents, stream step updates so waiting feels shorter.",
            ],
          },
        ],
      },
      {
        h: "Async queues for ingestion and long jobs",
        blocks: [
          "Anything slow and not user-blocking goes through a queue: document ingestion, re-embedding, batch summarisation, nightly evals.",
          {
            lang: "text",
            code: `Upload → S3 → event → SQS/Kafka ──▶ ingestion workers (autoscaled) ──▶ vector DB
                                   └─▶ dead-letter queue → alert
Status: job table → UI polls or receives SSE/WebSocket updates`,
          },
          {
            list: [
              "Workers are idempotent (safe to retry) and rate-limited to protect embedding API quotas.",
              "Priorities: a user's own fresh upload before a bulk re-index.",
              "Batch APIs (~50% cheaper) for large offline jobs where latency doesn't matter.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Budget each step; target ~1–1.5 s to first token for RAG chat.",
      "Stream, parallelise, speculate, shrink prompts, right-size models, cache, show progress.",
      "Queues for ingestion and long jobs: idempotent autoscaled workers, DLQ, status updates, batch APIs.",
    ],
    interview: [
      {
        q: "How do you keep answers fresh when documents change daily?",
        a: "Event-driven incremental ingestion: source systems or S3 emit change events into a queue; workers re-parse only changed documents, delete their old chunks by document id and insert new ones, updating metadata and ACLs; deletions remove chunks promptly. A periodic reconciliation job catches missed events. Chunks carry version and date metadata so retrieval can prefer the latest, caches are invalidated for affected content, and freshness lag is monitored.",
      },
    ],
    practice: [
      "Write a latency budget for DocChat from your traces and identify the step furthest over budget.",
    ],
  },

  tenancy: {
    minutes: 40,
    level: "Advanced",
    intro:
      "Enterprise and B2B GenAI systems serve many customers (tenants) and many roles within each. Isolation, access control, PII handling and audit logs are always part of the design discussion, and weak answers here fail otherwise good designs.",
    sections: [
      {
        h: "Tenant isolation models",
        blocks: [
          {
            table: {
              head: ["Model", "How", "Pros", "Cons"],
              rows: [
                ["Shared index + tenant filter", "Every chunk has `tenant_id`; every query filters on it", "Simple, efficient", "One missed filter = leak; noisy neighbours"],
                ["Namespace / collection per tenant", "Separate collections in the same cluster", "Stronger isolation, easy per-tenant deletes", "Many collections to manage"],
                ["Database / cluster per tenant", "Dedicated infra for large or regulated tenants", "Strongest isolation, custom residency", "Cost, ops overhead"],
              ],
            },
          },
          "A common answer: shared infrastructure with enforced tenant filters for most customers, dedicated namespaces or clusters for large or regulated ones. Enforce the tenant filter in one data-access layer so no code path can skip it.",
        ],
      },
      {
        h: "Access control, PII and audit",
        blocks: [
          {
            list: [
              "**Document ACLs** copied onto chunks at ingestion, synced from the source system; filtered at retrieval (Day 10).",
              "**Identity from SSO/auth**, never from the prompt; tools act as the user.",
              "**PII:** classify and mask before external model calls where required; choose providers and regions matching residency rules; limit log retention.",
              "**Audit logs:** who asked what, which documents and tools were used, what actions were approved; immutable and searchable.",
              "**Per-tenant controls:** usage quotas and budgets, model allow-lists, custom system prompts, data deletion on request.",
              "**Caches** keyed by tenant and permission scope.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Isolation: shared index + enforced tenant filter, per-tenant namespaces, or dedicated infra; mix by customer tier.",
      "ACLs on chunks, identity from auth, PII masking and residency, audit logs, per-tenant quotas, scoped caches.",
      "Enforce tenant filters centrally in the data-access layer.",
    ],
    interview: [
      {
        q: "Design a document Q&A bot for 10,000 employees with permissions.",
        a: "Requirements: SSO users, documents from SharePoint/Drive/Confluence with existing permissions, English plus Hindi, first token under 2 s, answers with citations. Ingestion: connectors pull documents and ACLs, events trigger incremental updates through a queue; parse, chunk by headings, embed, and store in a hybrid index with ACL, source and version metadata. Query: resolve the user's groups from SSO, condense follow-ups, hybrid retrieval filtered by ACL, rerank to top 5, grounded prompt with citations and an \"I don't know\" rule, streamed from a mid-size model with prompt caching. Quality: golden set, retrieval and faithfulness metrics, feedback buttons, weekly review. Safety: ACL filtering before prompting, injection-aware prompts, PII masking in logs, audit trail. Scale: ~50K questions/day ≈ 5 QPS peak, so cost is dominated by tokens; add caching, model routing and monitoring of latency, cost and feedback.",
      },
    ],
    practice: [
      "Draw the isolation design for a B2B SaaS with 300 small customers and 2 large regulated banks.",
    ],
  },

  "three-designs": {
    minutes: 180,
    level: "Advanced",
    intro:
      "Practise three classic GenAI design questions, 45 minutes each, on a whiteboard or in Excalidraw, using the framework. Outlines are below to check yourself against **after** you've done your own attempt. Try first; then compare.",
    sections: [
      {
        h: "Design 1: enterprise document Q&A",
        blocks: [
          "Prompt: *\"Design an internal assistant that answers employee questions from company documents (HR, IT, policies) for a 10,000-person company.\"*",
          {
            list: [
              "Requirements: SSO, permissions, freshness, citations, English + Hindi, latency target, cost budget.",
              "Ingestion: connectors + ACL sync, event-driven queue, parsing (tables, scanned PDFs), heading-aware chunking, embeddings, hybrid index.",
              "Query: condense, ACL-filtered hybrid retrieval, rerank, grounded prompt, streaming, citations, fallback to \"contact HR\".",
              "Eval: golden set per department, faithfulness, refusal accuracy, feedback loop.",
              "Safety: ACL before prompt, PII, injection in documents, audit.",
              "Scale & cost: QPS and token estimates, caching FAQs, model routing.",
            ],
          },
        ],
      },
      {
        h: "Design 2: e-commerce support copilot",
        blocks: [
          "Prompt: *\"Design an AI assistant that handles customer support for an e-commerce company with 5 million monthly users.\"*",
          {
            list: [
              "Scope: order status, returns and refunds, product questions, escalation to humans; channels (app, web, WhatsApp).",
              "Architecture: intent router → fixed flows for common intents (order status via API) + RAG for policies + an agent only for multi-step cases.",
              "Actions: refunds and cancellations via tools with business rules in code, approval thresholds, idempotency keys.",
              "Scale: peak sale-day traffic (10× spikes), rate limits, caching, small models for routing, queues.",
              "Quality: containment rate (resolved without human), CSAT, escalation accuracy, wrong-refund rate.",
              "Safety: identity verification before account data, PII, prompt injection via product reviews or messages.",
            ],
          },
        ],
      },
      {
        h: "Design 3: text-to-SQL analytics assistant",
        blocks: [
          "Prompt: *\"Design a tool that lets business users ask questions of the company's data warehouse in plain English.\"*",
          {
            list: [
              "Schema understanding: curated semantic layer (table and column descriptions, metrics definitions, example queries) retrieved per question; don't dump the whole schema.",
              "Generation: LLM writes SQL with few-shot examples of similar past questions; validate (parse, allow-listed tables, no writes, LIMIT), dry-run or EXPLAIN, execute with a read-only role and timeouts.",
              "Self-correction: on SQL errors, feed the error back for one or two retries.",
              "Answer: result table + chart + plain-language summary + the SQL shown for transparency.",
              "Security: row- and column-level permissions enforced by the warehouse for the user's role; PII columns masked.",
              "Quality: golden set of question → correct result (compare results, not SQL text); metric definitions governance; user feedback.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Doc Q&A: ACL-aware ingestion + hybrid RAG + citations + freshness.",
      "Support copilot: router + fixed flows + RAG + tools with coded business rules; spikes; containment metrics.",
      "Text-to-SQL: semantic layer retrieval, validated read-only SQL, self-correction, show SQL, warehouse-enforced permissions, result-based evals.",
    ],
    practice: [
      "Do each design in 45 minutes on a timer, then compare with the outline and note what you missed.",
    ],
  },

  record: {
    minutes: 60,
    level: "Beginner",
    intro:
      "Record yourself explaining one of the designs, then watch it back. It's uncomfortable, and it's the fastest way to fix rambling, filler words and gaps before a real interviewer sees them.",
    sections: [
      {
        h: "How to do it",
        blocks: [
          {
            list: [
              "Pick Design 1 or 2. Set a 20-minute timer and record your screen and voice (Loom, OBS or Zoom) while drawing in Excalidraw.",
              "Start with requirements questions, stating reasonable assumptions aloud since nobody will answer.",
              "Watch at 1.5× speed and score yourself below.",
              "Record again tomorrow after fixing the top two issues.",
            ],
            ordered: true,
          },
        ],
      },
      {
        h: "Self-review checklist",
        blocks: [
          {
            table: {
              head: ["Check", "Yes / No"],
              rows: [
                ["Stated the framework up front", ""],
                ["Asked or assumed scale and latency numbers", ""],
                ["Diagram was readable and labelled", ""],
                ["Covered ingestion AND query path", ""],
                ["Explained how quality is measured", ""],
                ["Covered access control and prompt injection", ""],
                ["Gave cost / latency estimates", ""],
                ["Named at least 3 trade-offs with reasons", ""],
                ["Few filler words; didn't ramble on one component", ""],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "Record, watch at 1.5×, score against the checklist, re-record after fixing the top two issues.",
    ],
    practice: [
      "Share the recording with a friend or mentor and ask for one piece of blunt feedback.",
    ],
  },
};
