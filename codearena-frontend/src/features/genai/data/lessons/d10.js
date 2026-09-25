// Day 10 lessons: Advanced RAG and LlamaIndex. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import advancedRag from "./advanced-rag.js";
import frameworks from "./frameworks.js";

export default {
  ...pickLessons(advancedRag, ["hybrid", "rerank", "query-rewrite", "parent-doc", "multimodal", "acl", "hybrid-rerank", "test-set"]),
  ...pickLessons(frameworks, ["llamaindex", "frameworks-compare"]),
};
