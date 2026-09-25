// Day 4 lessons: LLM apps 1: APIs, open models and LangChain. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import llmApis from "./llm-apis.js";
import lcBasics from "./langchain-basics.js";

export default {
  ...pickLessons(llmApis, ["api-basics", "roles", "streaming", "multimodal", "reliability", "cost-control", "adapter", "stream-chat"]),
  ...lcBasics,
};
