// Day 5 interview bank: prompts, structured output and parsers. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import lcPrompts from "./langchain-prompts.js";
import llmApis from "./llm-apis.js";

export default {
  title: "Prompts, structured output and parsers interview questions",
  intro:
    "The input and output round: LangChain prompt templates and messages, prompt engineering and context engineering, structured output (with_structured_output, TypedDict vs Pydantic vs JSON Schema, JSON mode vs strict schemas), output parsers, prompt injection and LLM security, design scenarios and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...lcPrompts.groups,
    groupNamed(frameworks, "Prompts, messages and parsing"),
    groupNamed(llmApis, "Prompt engineering"),
    groupNamed(llmApis, "Structured output"),
    questionGroup("Structured output in LangChain", frameworks, ["structured-output"]),
    groupNamed(llmApis, "Prompt injection and LLM security"),
    questionGroup("Design and scenario questions", llmApis, ["design-extraction-service", "json-breaks", "prompt-change-regression"]),
    questionGroup("Live coding questions", llmApis, ["lc-structured", "lc-sanitise"]),
  ],
};
