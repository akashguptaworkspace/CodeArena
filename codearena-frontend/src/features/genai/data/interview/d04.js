// Day 4 interview bank: LLM APIs, LangChain basics and models. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import lcBasics from "./langchain-basics.js";
import llmApis from "./llm-apis.js";

export default {
  title: "LLM APIs, LangChain and models interview questions",
  intro:
    "The first practical round: what really happens in an LLM API call, roles and conversation memory, why LangChain exists and its components, chat models vs LLMs, open vs closed models and running them locally, embeddings in LangChain, streaming to a frontend, multimodal inputs, reliability and cost, design scenarios and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    groupNamed(llmApis, "LLM APIs and SDKs"),
    groupNamed(llmApis, "Roles, conversations and memory"),
    ...lcBasics.groups,
    questionGroup("LangChain packages and setup", frameworks, ["what-langchain", "packages", "init-chat-model"]),
    groupNamed(llmApis, "Streaming"),
    groupNamed(llmApis, "Multimodal inputs"),
    groupNamed(llmApis, "Reliability, cost and operations"),
    groupNamed(llmApis, "Frameworks and the wider ecosystem"),
    questionGroup("Design and scenario questions", llmApis, ["design-support-bot", "switch-provider", "slow-chat", "multilingual-bot"]),
    questionGroup("Live coding questions", llmApis, ["lc-chat-loop", "lc-sse-endpoint", "lc-sse-client", "lc-retry-backoff", "lc-fallback"]),
  ],
};
