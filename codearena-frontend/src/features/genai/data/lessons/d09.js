// Day 9 lessons: RAG 3: RAG end to end, a YouTube chatbot and DocChat. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import ragScratch from "./rag-scratch.js";
import frameworks from "./frameworks.js";
import ragEndToEnd from "./rag-end-to-end.js";

export default {
  ...pickLessons(ragScratch, ["rag-why", "pipeline", "grounding", "citations", "history", "rag-failures", "docchat-v1", "rag-tests"]),
  ...pickLessons(frameworks, ["docchat-langchain", "compare-readme"]),
  ...ragEndToEnd,
};
