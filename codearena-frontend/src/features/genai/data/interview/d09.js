// Day 9 interview bank: RAG end to end. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import ragEndToEnd from "./rag-end-to-end.js";
import ragScratch from "./rag-scratch.js";

export default {
  title: "RAG interview questions",
  intro:
    "The most asked GenAI interview topic: what RAG is and why, the three limits of an LLM, fine-tuning vs in-context learning, RAG vs long context, retrieval and context assembly, grounded prompts, citations and \"I don't know\", conversational RAG, RAG with LangChain, evaluating, debugging and securing RAG, production concerns, scenarios, design questions and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...ragEndToEnd.groups,
    groupNamed(ragScratch, "RAG fundamentals"),
    groupNamed(ragScratch, "Retrieval and context assembly"),
    groupNamed(ragScratch, "Grounding, citations and refusals"),
    groupNamed(ragScratch, "Conversational RAG"),
    questionGroup("RAG with LangChain", frameworks, ["rag-chain-sources", "lc-rag-sources"]),
    groupNamed(frameworks, "Production RAG with frameworks"),
    groupNamed(ragScratch, "Evaluating RAG (basics)"),
    groupNamed(frameworks, "Evaluating framework-based apps"),
    groupNamed(ragScratch, "Debugging and improving RAG"),
    groupNamed(ragScratch, "Security and privacy in RAG"),
    groupNamed(ragScratch, "Production RAG"),
    groupNamed(ragScratch, "Scenario questions"),
    groupNamed(ragScratch, "Design questions"),
    questionGroup("Live coding questions", ragScratch, ["lc-build-prompt", "lc-citations", "lc-retrieve", "lc-condense", "lc-mmr"]),
  ],
};
