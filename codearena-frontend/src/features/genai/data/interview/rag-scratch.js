// Day 6 interview bank: RAG from scratch (fundamentals, parsing, chunking, retrieval, grounding, conversations, debugging). Shape: see ./index.js
import { ragBasicsQs, parsingQs, chunkingQs, pipelineQs } from "./d06-a.js";
import { groundingQs, convoRagQs, debugRagQs, ragDesignQs, ragCodingQs } from "./d06-b.js";
import { ragEvalQs, ragSecurityQs, ragProdQs, ragScenarioQs } from "./d06-c.js";

export default {
  title: "RAG interview questions",
  intro:
    "The most asked GenAI interview topic: what RAG is and why, RAG vs fine-tuning vs long context, parsing documents, chunking, retrieval and context assembly, grounded prompts, citations and \"I don't know\", conversational RAG, debugging wrong answers, design questions and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [ragBasicsQs, parsingQs, chunkingQs, pipelineQs, groundingQs, convoRagQs, ragEvalQs, debugRagQs, ragSecurityQs, ragProdQs, ragScenarioQs, ragDesignQs, ragCodingQs],
};
