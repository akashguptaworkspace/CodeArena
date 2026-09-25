// Day 5 interview bank, part 1: search fundamentals, embedding models, similarity, vector databases. Assembled in d05.js.

export const searchQs = {
  title: "Search fundamentals",
  questions: [
    {
      id: "why-not-btree",
      q: "Why can't a normal database index do semantic search?",
      level: "Basic",
      common: true,
      answer:
        "B-tree and hash indexes answer exact or range lookups on ordered scalar values. Semantic search asks for the nearest vectors in a space with hundreds or thousands of dimensions, which has no single ordering a B-tree can use. It needs approximate nearest-neighbour indexes such as HNSW or IVF, which vector databases or extensions like pgvector provide.",
    },
    {
      id: "inverted-index",
      q: "How does keyword search stay fast over millions of documents?",
      level: "Basic",
      answer:
        "With an inverted index: a map from each term to a posting list of documents containing it (often with counts and positions). A query only reads the posting lists for its terms and scores those candidate documents, so it never scans the whole collection. That's the core of Lucene, Elasticsearch and OpenSearch.",
    },
    {
      id: "tfidf-bm25",
      q: "Explain TF-IDF and how BM25 improves on it.",
      level: "Intermediate",
      common: true,
      answer:
        "TF-IDF weights a term by how often it appears in a document (TF) and how rare it is across documents (IDF). BM25 keeps IDF but makes term frequency saturate, so the tenth mention adds little (parameter k1), and normalises by document length so long documents don't win just by containing more words (parameter b). It's the default ranking in most keyword search engines.",
    },
    {
      id: "bm25-vs-dense",
      q: "BM25 vs dense retrieval: when does each win?",
      level: "Intermediate",
      common: true,
      answer:
        "BM25 wins on exact tokens (product codes, error ids, names, rare jargon, exact phrases) and is cheap and explainable. Dense retrieval wins on meaning: paraphrases, synonyms, vague questions and other languages, but can miss exact identifiers and negation. Because they fail differently, production systems combine them in hybrid search and compare both on labelled queries.",
    },
    {
      id: "vocab-mismatch",
      q: "What is the vocabulary mismatch problem?",
      level: "Basic",
      answer:
        "Users and documents describe the same thing with different words (\"money back\" vs \"refund\", \"login\" vs \"password\"), so keyword search finds nothing even though the answer exists. Classic fixes were stemming, synonym lists and query expansion; dense embeddings address it by matching meaning.",
    },
    {
      id: "stemming",
      q: "What are stemming and lemmatisation, and why do they matter for search?",
      level: "Basic",
      answer:
        "Both reduce words to a base form so different forms match: stemming chops suffixes by rules (\"returning\" → \"return\"), lemmatisation uses vocabulary and grammar (\"better\" → \"good\"). Without them, \"refunds\" and \"refund\" are different tokens for BM25. They can also over-merge words, so their effect should be measured.",
    },
    {
      id: "search-history",
      q: "How has search evolved to today's vector databases?",
      level: "Intermediate",
      answer:
        "From the vector space model and IDF in the 1960s–70s, to BM25 in the 1990s and inverted-index engines like Lucene and Elasticsearch, then word embeddings (2013), efficient ANN indexes like HNSW and FAISS (2016–17), neural models in web search and dense passage retrieval (2019–20), dedicated vector databases, and now vector support in mainstream databases with hybrid keyword-plus-vector search as the norm.",
    },
    {
      id: "sparse-dense",
      q: "What's the difference between sparse and dense vectors?",
      level: "Intermediate",
      answer:
        "Sparse vectors have one dimension per vocabulary term and are mostly zeros (BM25, TF-IDF, learned sparse models like SPLADE); they're searched with inverted indexes and excel at exact terms. Dense vectors are short (hundreds to thousands of dimensions) with every value used, produced by embedding models, searched with ANN indexes, and capture meaning.",
    },
  ],
};

export const embeddingModelQs = {
  title: "Embedding models",
  questions: [
    {
      id: "choose-model",
      q: "How do you choose an embedding model for a RAG system?",
      level: "Intermediate",
      common: true,
      answer:
        "Shortlist from the MTEB retrieval scores for my language, then evaluate candidates on a labelled set of real queries with recall@k and MRR. Also weigh language coverage (Hindi, Hinglish), max input tokens versus chunk size, dimensions and storage, latency and throughput, data privacy (API vs self-hosted), licence and total embedding cost. The winner on my own data decides, not the leaderboard.",
    },
    {
      id: "bi-cross",
      q: "Bi-encoder vs cross-encoder?",
      level: "Intermediate",
      common: true,
      answer:
        "A bi-encoder embeds query and document separately, so documents are embedded once and searched in milliseconds with ANN; it's used for first-stage retrieval. A cross-encoder reads the query and a document together and scores relevance, which is more accurate but must run for every pair, so it's used to rerank the top candidates.",
    },
    {
      id: "contrastive",
      q: "How are embedding models trained?",
      level: "Advanced",
      answer:
        "Usually a pretrained transformer encoder is fine-tuned with contrastive learning on (query, relevant passage) pairs: the loss pulls each pair together and pushes apart the other passages in the batch (in-batch negatives) and deliberately chosen hard negatives. Data comes from search logs, Q&A sites, titles and abstracts, and increasingly LLM-generated pairs.",
    },
    {
      id: "mteb",
      q: "What is MTEB and how should you use it?",
      level: "Intermediate",
      answer:
        "The Massive Text Embedding Benchmark scores models across tasks like retrieval, reranking, STS, classification and clustering in many languages. Use the retrieval scores for your language to shortlist, considering model size, dimensions, max tokens and licence, and remember models can be tuned towards the benchmark, so always confirm on your own queries.",
    },
    {
      id: "prefixes",
      q: "Why do some embedding models need prefixes like \"query:\" and \"passage:\"?",
      level: "Intermediate",
      common: true,
      answer:
        "They were trained asymmetrically: short queries and long passages are embedded with different prefixes or instructions (E5 uses query:/passage:, BGE has a query instruction, Nomic uses search_query:/search_document:). Omitting them doesn't error but quietly lowers retrieval quality, so wrap embedding in separate embed_query and embed_documents functions.",
    },
    {
      id: "matryoshka",
      q: "What are Matryoshka embeddings and why are they useful?",
      level: "Intermediate",
      answer:
        "Models trained so the leading dimensions carry the most information, allowing vectors to be truncated (e.g. 1,536 → 256) and re-normalised with modest quality loss. They trade a little recall for large savings in storage, memory and search latency. OpenAI's text-embedding-3 exposes it via a dimensions parameter.",
    },
    {
      id: "late-interaction",
      q: "What are late-interaction models like ColBERT?",
      level: "Advanced",
      answer:
        "Instead of one vector per text, they keep one vector per token. The score sums, for each query token, its best match among the document's token vectors (MaxSim). This captures fine-grained matches and is often more accurate than single-vector retrieval, at the cost of much more storage and specialised indexes.",
    },
    {
      id: "learned-sparse",
      q: "What is learned sparse retrieval (e.g. SPLADE)?",
      level: "Advanced",
      answer:
        "A model outputs a weight for each vocabulary term, including related terms not in the text (expansion), producing a sparse vector usable with inverted indexes. It keeps keyword-style precision and efficiency while adding some semantic matching, and it's a common component of hybrid systems.",
    },
    {
      id: "multilingual",
      q: "How do you handle retrieval for Hindi and Hinglish users?",
      level: "Intermediate",
      common: true,
      answer:
        "Use a multilingual embedding model (such as bge-m3, multilingual-e5 or a multilingual API model) so Hindi, Hinglish and English land in a shared space, and evaluate recall per language, including Roman-script Hindi. If quality is weak, options are translating queries before retrieval, storing translations of documents, hybrid search for exact terms, or fine-tuning on domain pairs.",
    },
    {
      id: "fine-tune-embeddings",
      q: "When and how would you fine-tune an embedding model?",
      level: "Advanced",
      common: true,
      answer:
        "When a strong general model still misses domain jargon or language patterns on my labelled set. I'd gather a few thousand (query, relevant passage) pairs from logs, FAQs or LLM-generated questions, fine-tune a small open model with a contrastive loss like MultipleNegativesRankingLoss, and compare recall@k on a held-out set. If it wins, re-embed the corpus with a versioned blue-green re-index.",
    },
    {
      id: "api-vs-open",
      q: "API embedding models vs self-hosted open models?",
      level: "Intermediate",
      answer:
        "APIs are easy, high quality and cheap per token, but data leaves your infrastructure, you depend on the provider's availability and model lifecycle, and changes force re-embedding. Open models run in your VPC for privacy, can be fine-tuned and have no per-token cost, but need GPUs or CPUs, serving (e.g. TEI) and ops work. High volume, strict privacy or custom domains favour self-hosting.",
    },
    {
      id: "embedding-versioning",
      q: "Why must you store the embedding model version with each vector?",
      level: "Basic",
      answer:
        "Vectors from different models (or even versions) live in incompatible spaces, so queries must be embedded with the same model as the documents. Recording the model and version lets you detect mismatches, re-embed selectively, and run blue-green migrations safely.",
    },
  ],
};

export const similarityQs = {
  title: "Similarity and scores",
  questions: [
    {
      id: "normalisation",
      q: "Why normalise embeddings?",
      level: "Basic",
      common: true,
      answer:
        "With unit-length vectors, cosine similarity equals the dot product (fast, a single matrix multiply) and Euclidean distance gives the same ranking. It also makes scores comparable across documents of different lengths. Many models already return normalised vectors; after truncating (Matryoshka) you must re-normalise.",
    },
    {
      id: "threshold",
      q: "How would you decide a similarity threshold for \"no relevant result\"?",
      level: "Intermediate",
      common: true,
      answer:
        "Scores are model-specific and often compressed, so there's no universal number. I'd plot scores for labelled relevant and irrelevant pairs, pick a threshold where they separate, validate it on held-out data and re-check it after any model change. Often a reranker score or the LLM's grounded \"I don't know\" behaviour is a more reliable gate than a raw embedding threshold.",
    },
    {
      id: "metric-mismatch",
      q: "What happens if the vector DB uses a different distance metric than the model expects?",
      level: "Intermediate",
      answer:
        "Rankings can be wrong, especially with unnormalised vectors: dot product favours long vectors, Euclidean behaves differently from cosine. Configure the collection with the metric recommended in the model card (usually cosine), and normalise vectors to make the common metrics agree.",
    },
    {
      id: "negation",
      q: "Why do embeddings struggle with negation and numbers?",
      level: "Intermediate",
      answer:
        "Sentence embeddings compress meaning into one vector dominated by topic words, so \"refundable\" and \"non-refundable\" or \"orders above 5,000\" and \"below 5,000\" end up close together. Mitigations: hybrid search, metadata filters for structured facts, rerankers that read the full text, and letting the LLM read the retrieved text carefully.",
    },
    {
      id: "hubness",
      q: "Why might the same few documents appear in results for many unrelated queries?",
      level: "Advanced",
      answer:
        "In high-dimensional spaces some points become \"hubs\" close to many others, and generic, boilerplate-heavy chunks (headers, disclaimers, tables of contents) often end up near everything. Fix it by cleaning boilerplate before embedding, deduplicating, adding context to chunks, using hybrid search and reranking, and monitoring which chunks are retrieved most often.",
    },
  ],
};

export const vectorDbQs = {
  title: "Vector databases",
  questions: [
    {
      id: "what-vector-db",
      q: "What does a vector database provide beyond a vector index library?",
      level: "Basic",
      common: true,
      answer:
        "A library like FAISS or hnswlib gives fast nearest-neighbour search in memory. A vector database adds storage and persistence, CRUD (upserts and deletes), metadata payloads and filtering, APIs, replication and sharding, backups and snapshots, access control, and often hybrid search and quantisation options.",
    },
    {
      id: "choose-db",
      q: "Which vector database would you choose, and why?",
      level: "Intermediate",
      common: true,
      answer:
        "It depends on scale and the existing stack. With Postgres already in place and up to a few million vectors, pgvector keeps one system with SQL filters, joins and transactions. On MongoDB Atlas, Atlas Vector Search. For very large scale, advanced filtering, sparse/hybrid vectors or self-hosting, Qdrant, Milvus or Weaviate; for zero ops, Pinecone. For prototypes, Chroma. I'd benchmark recall, latency and filtering on our data before committing.",
    },
    {
      id: "pgvector-vs-dedicated",
      q: "pgvector vs a dedicated vector database?",
      level: "Intermediate",
      common: true,
      answer:
        "pgvector keeps vectors next to relational data: transactions, joins with users and permissions, existing backups, managed hosting like RDS, and one less system to sync, ideal up to a few million vectors. Dedicated databases offer better performance at large scale, richer filtering, quantisation, sparse and hybrid vectors, and horizontal scaling, at the cost of another system to run and keep consistent.",
    },
    {
      id: "pgvector-ops",
      q: "What do pgvector's operators <->, <=> and <#> mean?",
      level: "Basic",
      answer:
        "`<->` is Euclidean (L2) distance, `<=>` is cosine distance (1 − cosine similarity) and `<#>` is negative inner product. You order by the distance ascending and must use the matching operator class in the index (e.g. `vector_cosine_ops` for `<=>`) for the index to be used.",
    },
    {
      id: "record-shape",
      q: "What would you store with each vector in a RAG index?",
      level: "Basic",
      answer:
        "A stable id; the vector; the chunk text; source document id, title, page or section and URL for citations; tenant or owner and access tags for filtering; timestamps and version; the embedding model version; and a content hash to detect changes. Store only the personal data you truly need.",
    },
    {
      id: "chroma-prod",
      q: "Is Chroma suitable for production?",
      level: "Intermediate",
      answer:
        "It's excellent for prototypes, notebooks and small apps, and it has a client-server mode and hosted offering. For large, multi-tenant, high-availability production workloads, teams more often choose pgvector, Qdrant, Weaviate, Milvus or a managed service with mature filtering, replication, backups and monitoring. Evaluate against your scale and ops requirements.",
    },
    {
      id: "mongodb-atlas",
      q: "How does vector search work in MongoDB Atlas?",
      level: "Intermediate",
      answer:
        "You define a vector search index on an embedding field (with dimensions and similarity) plus optional filter fields, then query with a `$vectorSearch` aggregation stage specifying the query vector, numCandidates, limit and a filter, projecting the score with `$meta: \"vectorSearchScore\"`. It suits MERN apps that want vectors next to their documents.",
    },
    {
      id: "namespaces",
      q: "What are namespaces or partitions in a vector database used for?",
      level: "Intermediate",
      answer:
        "They split one index into isolated groups, commonly one per tenant or per data type, so queries only search within the chosen namespace. This simplifies tenant isolation and deletes, and can improve performance, at the cost of harder cross-namespace queries.",
    },
  ],
};
