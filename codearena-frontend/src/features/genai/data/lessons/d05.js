// Day 5 lessons: LLM apps 2: prompts, structured output and parsers. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import llmApis from "./llm-apis.js";
import lcPrompts from "./langchain-prompts.js";

export default {
  ...pickLessons(llmApis, ["prompting", "prompt-craft", "structured", "injection", "extractor", "vision-extract", "prompt-lab"]),
  ...lcPrompts,
};
