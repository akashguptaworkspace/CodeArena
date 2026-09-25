// Interview questions: RAG from scratch (fundamentals, parsing, chunking, retrieval, grounding, conversations, debugging). Picked into day files (d04.js, …); shape: see ./index.js
import { ragBasicsQs, parsingQs, chunkingQs, pipelineQs } from "./rag-scratch-a.js";
import { groundingQs, convoRagQs, debugRagQs, ragDesignQs, ragCodingQs } from "./rag-scratch-b.js";
import { ragEvalQs, ragSecurityQs, ragProdQs, ragScenarioQs } from "./rag-scratch-c.js";

export default {
  groups: [ragBasicsQs, parsingQs, chunkingQs, pipelineQs, groundingQs, convoRagQs, ragEvalQs, debugRagQs, ragSecurityQs, ragProdQs, ragScenarioQs, ragDesignQs, ragCodingQs],
};
