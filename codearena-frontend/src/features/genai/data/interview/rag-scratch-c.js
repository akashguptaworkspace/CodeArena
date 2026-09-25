// Day 6 interview bank, part 3: evaluation basics, security and privacy, production, scenarios. Assembled in d06.js.

export const ragEvalQs = {
  title: "Evaluating RAG (basics)",
  questions: [
    {
      id: "eval-rag",
      q: "How do you evaluate a RAG system?",
      level: "Intermediate",
      common: true,
      answer:
        "Separately evaluate retrieval (recall@k, MRR on labelled question → source pairs) and generation (faithfulness to the retrieved sources, answer correctness against reference answers, relevance, citation accuracy), plus refusal accuracy on unanswerable questions. Use a golden set built from real questions, run it on every change, and add production signals like thumbs up/down and fallback rates. Day 11 covers tools like RAGAS and LLM-as-judge.",
    },
    {
      id: "faithfulness",
      q: "What is faithfulness (groundedness)?",
      level: "Intermediate",
      common: true,
      answer:
        "Whether every claim in the answer is supported by the retrieved sources. An answer can be correct but unfaithful (true from the model's own knowledge, not the sources) or faithful but wrong (the sources were outdated). Faithfulness is measured by checking claims against the context, with an LLM judge, NLI models or quote verification.",
    },
    {
      id: "golden-set",
      q: "What goes into a golden dataset for RAG?",
      level: "Intermediate",
      answer:
        "Realistic questions (from logs, tickets and experts), their expected source documents or pages, reference answers or key facts, and tags for type (factual, multi-hop, table, follow-up, Hindi, unanswerable). Start with 30–50, grow with every production failure, and keep a held-out portion.",
    },
    {
      id: "offline-online",
      q: "Offline vs online evaluation for RAG?",
      level: "Intermediate",
      answer:
        "Offline: a fixed golden set scored automatically on every prompt, model or retrieval change, before release. Online: production signals like thumbs up/down, follow-up rephrasings, fallback and escalation rates, citation clicks, and sampled human review, which catch issues the golden set doesn't cover. Failures found online feed back into the offline set.",
    },
    {
      id: "measure-refusals",
      q: "How do you measure \"I don't know\" behaviour?",
      level: "Intermediate",
      answer:
        "Include answerable and unanswerable questions in the eval set and compute two rates: correct refusals on unanswerable questions and wrong refusals on answerable ones. Tune the retrieval threshold and prompt to the balance your domain needs (legal and medical refuse more readily than shopping).",
    },
  ],
};

export const ragSecurityQs = {
  title: "Security and privacy in RAG",
  questions: [
    {
      id: "rag-data-leak",
      q: "How can a RAG system leak data, and how do you prevent it?",
      level: "Intermediate",
      common: true,
      answer:
        "Missing or wrong permission filters let users retrieve others' documents; caches or conversation history shared across users; prompt injection that makes the bot reveal other retrieved content; and logs containing sensitive text. Prevent it with permission filters inside retrieval based on server-side identity, tenant-scoped caches, isolation tests, output sanitisation, masked logs and least-privilege tools.",
    },
    {
      id: "pii-rag",
      q: "How do you handle personal data (PII) in documents you index?",
      level: "Intermediate",
      answer:
        "Classify documents at ingestion, restrict sensitive ones to authorised users via metadata filters, mask or redact PII that answers don't need (Aadhaar, PAN, phone numbers), keep embeddings and chunks in your region if required, avoid logging raw content, and ensure deletions remove chunks and vectors, in line with India's DPDP Act.",
    },
    {
      id: "upload-security",
      q: "What checks do you do on uploaded files?",
      level: "Basic",
      answer:
        "Allow only expected types (check content type and magic bytes, e.g. %PDF), cap size and page count, store under generated names in object storage (never user-supplied paths), scan for malware where required, parse in isolated workers with timeouts, and treat extracted text as untrusted input for prompt-injection purposes.",
    },
    {
      id: "rag-tools-risk",
      q: "Why is it risky to give a RAG chatbot powerful tools?",
      level: "Advanced",
      answer:
        "Retrieved documents can contain injected instructions, so a bot that reads them and can also send emails, issue refunds or change records may be steered into harmful actions. Keep document-answering bots read-only where possible, and require authorisation checks in code and human confirmation for any state-changing tool.",
    },
  ],
};

export const ragProdQs = {
  title: "Production RAG",
  questions: [
    {
      id: "ingestion-async",
      q: "Why should document ingestion run in the background?",
      level: "Basic",
      answer:
        "Parsing, OCR and embedding a large document can take seconds to minutes and may fail; doing it in the upload request risks timeouts and a poor user experience. Return 202 Accepted with a document id, process it in a queue worker with retries, track status (processing, ready, failed), and let the UI poll or receive an update.",
    },
    {
      id: "streaming-sources",
      q: "How do you stream a RAG answer and still show sources?",
      level: "Intermediate",
      answer:
        "Stream answer tokens as SSE events; when generation finishes, parse and validate citations and send a final \"sources\" event with the cited documents, pages and snippets. Optionally send the retrieved sources at the start as a \"searching\" status. Save the final answer and citations to history.",
    },
    {
      id: "rag-caching",
      q: "What can you cache in a RAG system?",
      level: "Intermediate",
      answer:
        "Embeddings of documents (by content hash) and of frequent queries, retrieval results for popular questions, full answers for identical questions scoped by tenant and permissions (invalidated when documents change), and the stable system prompt via provider prompt caching. Never share caches across users when answers depend on their permissions.",
    },
    {
      id: "rag-monitoring",
      q: "What would you monitor for a production RAG system?",
      level: "Intermediate",
      answer:
        "Latency per stage and end to end, error rates, token usage and cost per query, fallback and escalation rates, feedback scores, top retrieval scores over time, ingestion lag and failures, index size, the most-retrieved chunks, and a scheduled golden-set evaluation to catch quality drift.",
    },
    {
      id: "rag-versioning",
      q: "What needs versioning in a RAG system?",
      level: "Advanced",
      answer:
        "Documents (with effective dates), the chunking configuration, the embedding model, the index (blue-green collections), prompts, the LLM model version and evaluation datasets. Log these versions with every answer so any response can be reproduced and regressions traced to a change.",
    },
  ],
};

export const ragScenarioQs = {
  title: "Scenario questions",
  questions: [
    {
      id: "scenario-wrong-page",
      q: "Citations point to the wrong page. What could cause it?",
      level: "Intermediate",
      answer:
        "Page numbers lost or shifted during parsing (chunks spanning pages, cover pages not counted, PDF page labels vs physical pages), chunk metadata assigned incorrectly, or the model citing the wrong document index. Check chunk metadata against the source, keep page boundaries or page ranges in chunks, and validate citation indexes in code.",
    },
    {
      id: "scenario-generic",
      q: "The bot answers from general knowledge instead of the company's documents. Fix it.",
      level: "Intermediate",
      common: true,
      answer:
        "Strengthen grounding: explicit \"only from the documents\" rules with an exact fallback, a retrieval threshold that skips the LLM when nothing relevant is found, structured answers with verified quotes, and faithfulness checks in evals. Also check retrieval, since the bot often falls back on general knowledge when the right chunks weren't retrieved.",
    },
    {
      id: "scenario-long-docs",
      q: "Users upload 500-page manuals and complain answers miss details. What do you change?",
      level: "Advanced",
      answer:
        "Verify parsing quality on those manuals, switch to structure-aware chunking with heading paths, add contextual chunk text, use hybrid search and a reranker over more candidates, try parent-document retrieval to give the model surrounding sections, and handle document-wide questions (summaries, \"list all X\") with a separate summarisation or map-reduce path instead of top-k.",
    },
    {
      id: "scenario-summary",
      q: "A user asks \"Summarise this 100-page report\". Does your RAG pipeline handle it?",
      level: "Intermediate",
      answer:
        "Top-k retrieval returns a few chunks, not the whole report, so the summary would be partial. Detect summarisation intents and route them to a different path: map-reduce summarisation over sections, hierarchical summaries precomputed at ingestion, or a long-context model if the document fits.",
    },
    {
      id: "scenario-new-doc",
      q: "A new policy was uploaded an hour ago but the bot still quotes the old one. Walk through the checks.",
      level: "Intermediate",
      answer:
        "Check the document's ingestion status and errors; confirm new chunks exist in the index with the right tenant and effective date; confirm old version chunks were removed or are filtered as superseded; test retrieval for the question directly; and check response caches for stale answers. Then fix the broken step and add monitoring for it.",
    },
  ],
};
