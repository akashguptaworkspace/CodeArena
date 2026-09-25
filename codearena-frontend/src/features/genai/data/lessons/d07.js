// Day 7 lessons: RAG 1: document loaders and text splitters. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import ragScratch from "./rag-scratch.js";
import ragLoad from "./rag-loaders.js";

export default {
  ...pickLessons(ragScratch, ["loading", "chunking", "chunk-lab"]),
  ...ragLoad,
};
