// Day 6 lessons: LLM apps 3: chains, runnables and LCEL. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import frameworks from "./frameworks.js";
import lcChains from "./langchain-chains.js";

export default {
  ...pickLessons(frameworks, ["lcel", "memory", "lc-overview", "lc-observability"]),
  ...lcChains,
};
