// Day 7 interview bank: document loaders and text splitters. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import ragLoaders from "./rag-loaders.js";
import ragScratch from "./rag-scratch.js";

export default {
  title: "Document loading and chunking interview questions",
  intro:
    "The first stage of every RAG system: LangChain Documents and loaders, parsing hard PDFs (tables, scans, layouts), why and how to split text, chunk size and overlap, recursive, structure-aware and semantic splitting, and a live-coding chunker. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...ragLoaders.groups,
    questionGroup("Documents and splitters in LangChain", frameworks, ["document", "splitters"]),
    groupNamed(ragScratch, "Loading and parsing documents"),
    groupNamed(ragScratch, "Chunking"),
    questionGroup("Live coding questions", ragScratch, ["lc-chunker"]),
  ],
};
