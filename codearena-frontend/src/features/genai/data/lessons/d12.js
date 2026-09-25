// Day 12 lessons: Agents 1: tools and tool calling. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import llmApis from "./llm-apis.js";
import lcTools from "./agent-tools.js";

export default {
  ...pickLessons(llmApis, ["tools"]),
  ...lcTools,
};
