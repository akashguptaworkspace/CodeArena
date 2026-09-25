// Day 7 interview bank: LangChain (1.x), LlamaIndex and choosing frameworks. Shape: see ./index.js
import { lcBasicsQs, lcRagQs, lcAgentQs, lcOpsQs } from "./d07-a.js";
import { llamaQs, frameworkChoiceQs, lcScenarioQs, lcCodingQs } from "./d07-b.js";
import { lcPromptQs, langgraphPreviewQs, lcProdRagQs, lcEvalQs } from "./d07-c.js";

export default {
  title: "LangChain and LlamaIndex interview questions",
  intro:
    "The frameworks round: LangChain fundamentals and LCEL, what changed in LangChain 1.0, RAG with LangChain, tools, agents, memory and middleware, debugging and testing, LlamaIndex concepts and advanced retrieval, choosing (or avoiding) a framework, scenarios and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [lcBasicsQs, lcPromptQs, lcRagQs, lcAgentQs, langgraphPreviewQs, lcOpsQs, lcProdRagQs, llamaQs, frameworkChoiceQs, lcEvalQs, lcScenarioQs, lcCodingQs],
};
