// Day 10 interview bank: LlamaIndex and choosing frameworks. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";

export default {
  title: "LlamaIndex and framework choice interview questions",
  intro:
    "LlamaIndex concepts and advanced retrieval, and how to choose (or avoid) a framework. Advanced RAG itself (hybrid search, reranking, query rewriting) is covered in the Day 8 and Day 9 banks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    groupNamed(frameworks, "LlamaIndex"),
    groupNamed(frameworks, "Choosing frameworks"),
    questionGroup("Live coding questions", frameworks, ["lc-llamaindex"]),
  ],
};
