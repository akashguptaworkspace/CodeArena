// Day 6 interview bank, part 1: RAG fundamentals, parsing, chunking, the retrieval pipeline. Assembled in d06.js.

export const ragBasicsQs = {
  title: "RAG fundamentals",
  questions: [
    {
      id: "explain-rag",
      q: "Explain RAG end to end.",
      level: "Basic",
      common: true,
      answer:
        "Offline, documents are loaded and parsed, cleaned, split into chunks with metadata, embedded and stored in a vector index (often with a keyword index too). At query time the question (condensed with chat history if needed) is embedded, the most relevant chunks are retrieved with filters like the user's permissions, optionally reranked, and placed as numbered sources in a prompt that tells the LLM to answer only from them and cite them. The answer is returned with citations, and the system is evaluated on retrieval and answer quality.",
      followups: ["Where can each step go wrong?", "How would you evaluate it?"],
    },
    {
      id: "why-rag",
      q: "Why do we need RAG?",
      level: "Basic",
      common: true,
      answer:
        "LLMs don't know private or recent information, store knowledge approximately and can hallucinate. RAG supplies relevant, current, private information at question time, so answers are grounded and citable, access control can be enforced per user, and updating knowledge means re-indexing documents rather than retraining a model.",
    },
    {
      id: "rag-vs-finetune",
      q: "RAG vs fine-tuning?",
      level: "Intermediate",
      common: true,
      answer:
        "RAG adds knowledge at inference time: best for private, changing or large document sets, with citations and permissions. Fine-tuning changes behaviour: consistent style, format, tone, narrow tasks, or making a small model competitive, but it's poor at adding or updating facts and gives no citations. They combine well: RAG for facts, fine-tuning or prompting for how answers are written.",
    },
    {
      id: "rag-vs-long-context",
      q: "Why not just put all documents into a long-context model?",
      level: "Intermediate",
      common: true,
      answer:
        "Cost and latency scale with input tokens on every request; models use very long contexts imperfectly (lost in the middle, context rot); corpora often exceed any window; and RAG lets you enforce per-user access control and cite exact sources. Long context complements RAG: for a few large documents, or to send bigger retrieved sections.",
    },
    {
      id: "rag-history",
      q: "Where did RAG come from?",
      level: "Intermediate",
      answer:
        "It grew out of open-domain question answering (retrieve documents, then read them), e.g. DrQA in 2017. In 2020 Google's REALM and Facebook AI's RAG paper (Lewis et al.) trained retrievers with generators and coined the name. After ChatGPT, frameworks like LangChain and LlamaIndex made it an application pattern for any LLM, and newer variants include Self-RAG, Corrective RAG, GraphRAG, Contextual Retrieval and agentic RAG.",
    },
    {
      id: "rag-variants",
      q: "Name some RAG variants and when you'd use them.",
      level: "Intermediate",
      answer:
        "Naive RAG for simple FAQs; advanced RAG (query rewriting, hybrid search, reranking) for production quality; conversational RAG for chat; parent-document retrieval when chunks need surrounding context; Self-RAG or Corrective RAG to check retrieved relevance and retry; GraphRAG for multi-hop and global questions over entities; agentic RAG when an agent must decide which sources to query, possibly several times; multimodal RAG for images and tables.",
    },
    {
      id: "when-not-rag",
      q: "When is RAG the wrong tool?",
      level: "Intermediate",
      answer:
        "When the answer comes from live structured data (order status, balances): use tool or API calls or SQL instead. When the task is about style or format rather than knowledge: prompting or fine-tuning. When the whole corpus is small enough to fit comfortably in the prompt and access control doesn't matter. And for aggregate questions (\"how many contracts expire this quarter?\"), which need structured queries rather than top-k chunks.",
    },
    {
      id: "rag-components",
      q: "What are the main components of a production RAG system?",
      level: "Basic",
      answer:
        "Ingestion (loaders, parsers, cleaning, chunking, embedding, indexing as background jobs), storage (vector and keyword indexes with metadata and permissions), retrieval (query condensation or rewriting, filtered search, hybrid, reranking), generation (grounded prompt, LLM, citations, fallback), an API and UI with streaming, and cross-cutting evaluation, tracing, monitoring, access control and cost control.",
    },
    {
      id: "rag-hallucination",
      q: "Does RAG eliminate hallucination?",
      level: "Intermediate",
      common: true,
      answer:
        "No. It reduces it by giving the model the right information, but the model can still ignore or misread sources, blend in outside knowledge, or answer when retrieval failed. You also need strict grounding instructions, an \"I don't know\" path, citations and quote verification, low temperature where supported, and faithfulness evals and monitoring.",
    },
    {
      id: "rag-cost",
      q: "What drives the cost of a RAG system?",
      level: "Intermediate",
      answer:
        "Per query: LLM input tokens (system prompt plus retrieved chunks plus history), output tokens, and any extra calls (condensation, reranking, verification). One-off or periodic: embedding the corpus and re-embedding on changes. Ongoing: vector database memory and hosting. Retrieved context usually dominates input tokens, so fewer, better chunks and prompt caching matter most.",
    },
  ],
};

export const parsingQs = {
  title: "Loading and parsing documents",
  questions: [
    {
      id: "pdf-hard",
      q: "Why is extracting text from PDFs hard?",
      level: "Basic",
      common: true,
      answer:
        "A PDF stores positioned glyphs for printing, not paragraphs or reading order. Parsers must rebuild words, lines and order from coordinates, so two-column layouts interleave, tables flatten into streams of numbers, headers and footers mix into text, and scanned PDFs have no text at all.",
    },
    {
      id: "tables-images",
      q: "How do you handle tables and images in PDFs for RAG?",
      level: "Intermediate",
      common: true,
      answer:
        "Use a table-aware parser (pdfplumber, Docling, a document AI service or a vision model) to extract tables as Markdown or row-wise text, keep each table whole with its caption, repeat headers when splitting large tables, and optionally embed an LLM summary for retrieval. For images and charts, caption them with a vision model or OCR, embed the description, and keep a link to the page image so a multimodal model can read it at answer time.",
    },
    {
      id: "scanned",
      q: "How do you handle scanned documents?",
      level: "Intermediate",
      answer:
        "Detect pages with little or no extractable text and route only those to OCR (Tesseract with the right language packs, or a cloud OCR service) or a vision-capable model. Check OCR quality, especially for Indian languages and handwriting, and store a confidence or source flag so low-quality pages can be reviewed.",
    },
    {
      id: "parser-choice",
      q: "How would you choose a document parser?",
      level: "Intermediate",
      answer:
        "Collect 10–20 representative, difficult documents (tables, columns, scans, forms), run candidate parsers (pypdf, PyMuPDF, pdfplumber, Docling, Unstructured, a hosted parser, a vision model), and read the outputs side by side. Weigh accuracy on your layouts, speed and cost per page, licence, and self-hosting needs; then confirm with retrieval evals.",
    },
    {
      id: "metadata-at-load",
      q: "What metadata should you capture at load time?",
      level: "Basic",
      answer:
        "Source id and title, page and section or heading path, URL, document type, version and effective date, author or owner, tenant and access level, language, ingestion time and a content hash. It's needed for citations, filtering, permissions, freshness and re-indexing, and it's hard to recover later.",
    },
    {
      id: "html-cleaning",
      q: "What do you remove when loading web pages?",
      level: "Basic",
      answer:
        "Navigation, headers, footers, sidebars, cookie banners, scripts, styles and ads, keeping the main content (and its headings) ideally as Markdown. Boilerplate repeated on every page otherwise gets retrieved for many unrelated questions and wastes context.",
    },
  ],
};

export const chunkingQs = {
  title: "Chunking",
  questions: [
    {
      id: "why-chunk",
      q: "Why do we chunk documents?",
      level: "Basic",
      common: true,
      answer:
        "A whole document's embedding blends many topics, so specific questions match it poorly; embedding models have input limits; and sending whole documents wastes context and cost. Chunks small enough to be about one idea, but large enough to make sense alone, give precise retrieval and compact prompts.",
    },
    {
      id: "chunk-size",
      q: "How do you choose chunk size and overlap?",
      level: "Intermediate",
      common: true,
      answer:
        "Start from the document structure and question types: FAQs as one Q&A per chunk, policies by section, long prose around 300–800 tokens with 10–20% overlap using recursive or heading-aware splitting. Then compare a few settings on a labelled retrieval set (recall@k, MRR) and on answer quality, and pick the best. Prepending heading paths and parent-document retrieval soften the precision-versus-context trade-off.",
    },
    {
      id: "small-vs-large",
      q: "What are the trade-offs of small vs large chunks?",
      level: "Basic",
      common: true,
      answer:
        "Small chunks give precise embeddings and cheap prompts but may lack the context needed to answer (the answer continues in the next paragraph). Large chunks carry context but their embeddings blend topics, they rank lower for specific questions, and they use more tokens and suffer from lost-in-the-middle.",
    },
    {
      id: "overlap",
      q: "Why use overlap between chunks?",
      level: "Basic",
      answer:
        "So information cut at a chunk boundary appears whole in at least one chunk; without overlap, a sentence or answer split across two chunks may never be retrievable intact. It costs extra chunks and some duplicate context; recursive splitting on natural boundaries reduces how much overlap you need.",
    },
    {
      id: "recursive-splitting",
      q: "What is recursive character/text splitting?",
      level: "Basic",
      answer:
        "Splitting on the largest natural separator first (sections, then paragraphs, then sentences, then words) and only recursing to smaller separators when a piece is still too long, merging small pieces up to the size limit. Chunks end on natural boundaries as often as possible. It's the practical default in most frameworks.",
    },
    {
      id: "structure-aware",
      q: "What is structure-aware chunking?",
      level: "Intermediate",
      answer:
        "Splitting by the document's own structure (Markdown or HTML headings, legal clauses, code functions, FAQ entries) and carrying the heading path as metadata, often prepended to the chunk text before embedding. It keeps related text together and gives short chunks their topic context.",
    },
    {
      id: "semantic-chunking",
      q: "What is semantic chunking and is it worth it?",
      level: "Intermediate",
      answer:
        "Splitting where embedding similarity between consecutive sentences drops, i.e. at topic shifts. It can help unstructured text like transcripts, but costs an embedding per sentence and threshold tuning, and for documents with headings, structure-aware chunking is usually as good. Decide with a retrieval eval.",
    },
    {
      id: "contextual-chunks",
      q: "What is contextual chunk enrichment?",
      level: "Advanced",
      common: true,
      answer:
        "Adding context to what you embed: at minimum the document title and heading path; at most an LLM-written sentence or two situating the chunk in the document (Anthropic's Contextual Retrieval). It fixes chunks like \"This must be submitted within 7 days\" that are meaningless alone, and substantially reduces retrieval failures, especially combined with BM25 and reranking.",
    },
    {
      id: "chunk-special",
      q: "How do you chunk tables, code and FAQs?",
      level: "Intermediate",
      answer:
        "Tables whole, or row groups with the header and caption repeated; code by functions or classes with the file path and signature; FAQs one question plus answer per chunk; contracts by clauses keeping their numbering; transcripts by topic or time window. Generic fixed-size splitting breaks all of these.",
    },
    {
      id: "chunk-ids",
      q: "How should chunks be identified?",
      level: "Intermediate",
      answer:
        "With deterministic ids built from tenant, document, page or section and position (or a hash), so re-indexing a document replaces its chunks rather than duplicating them and deletes can target them. Label eval data at a level that survives re-chunking, like document and page or an answer phrase.",
    },
  ],
};

export const pipelineQs = {
  title: "Retrieval and context assembly",
  questions: [
    {
      id: "choose-k",
      q: "How many chunks (k) should you send to the LLM?",
      level: "Basic",
      common: true,
      answer:
        "Typically 3–8, decided by evaluation: increase k until recall@k stops improving meaningfully, then weigh the cost, latency and noise of extra chunks. With a reranker, retrieve more candidates (20–50) and send only the top few after reranking.",
    },
    {
      id: "threshold",
      q: "Should you use a similarity threshold in RAG?",
      level: "Intermediate",
      answer:
        "It's useful to skip the LLM when nothing relevant is found, returning a fallback cheaply and safely. But embedding scores are model-specific and noisy, so tune the threshold on labelled relevant and irrelevant pairs, revisit it when the model changes, and combine it with the LLM's grounded \"I don't know\" rule or a reranker score.",
    },
    {
      id: "mmr",
      q: "What is MMR and when is it useful?",
      level: "Intermediate",
      answer:
        "Maximal Marginal Relevance selects chunks that are relevant to the query but dissimilar to chunks already selected, balanced by a lambda parameter. It's useful when the top results are near-duplicates (repeated boilerplate, multiple document versions), so the limited context covers more distinct information.",
    },
    {
      id: "chunk-order",
      q: "Does the order of retrieved chunks in the prompt matter?",
      level: "Intermediate",
      answer:
        "Yes. Models attend better to the start and end of long contexts, so the most relevant chunks should be first or last rather than in the middle; test both on your eval set. Keeping adjacent chunks from the same document in reading order also helps comprehension. Put the question after the documents.",
    },
    {
      id: "token-budget",
      q: "How do you keep the RAG prompt within budget?",
      level: "Intermediate",
      answer:
        "Allocate fixed token budgets for the system prompt, history, retrieved chunks and the answer; pack chunks best-first until the budget is used, skipping oversized ones; deduplicate; trim history with a window or summary; and count tokens with the provider's tokenizer before calling.",
    },
    {
      id: "permissions",
      q: "How do you enforce document permissions in RAG?",
      level: "Intermediate",
      common: true,
      answer:
        "Store access metadata (tenant, owner, groups) on every chunk and apply the permission filter inside the vector query using the authenticated user's identity from the server, never from the prompt. Test isolation, keep permissions in sync when they change, and apply the same rules to caches, logs and conversation history.",
    },
    {
      id: "multi-hop",
      q: "How do you handle questions that need information from several documents?",
      level: "Advanced",
      common: true,
      answer:
        "Retrieve more broadly and rerank; decompose the question into sub-questions and retrieve for each (multi-query); iterate retrieval in an agentic loop where the model decides what to look up next; or for entity-centric multi-hop questions, use a knowledge graph (GraphRAG). Evaluate multi-hop questions separately, since they fail more.",
    },
    {
      id: "aggregate-questions",
      q: "A user asks \"How many of our contracts expire this quarter?\". Can RAG answer it?",
      level: "Advanced",
      answer:
        "Not reliably with top-k retrieval, because the answer requires scanning all contracts, not the most similar chunks. Extract structured fields (party, expiry date, value) into a database at ingestion, and answer aggregates with SQL (possibly generated by the LLM as a tool call), using RAG for questions about specific contract text.",
    },
  ],
};
