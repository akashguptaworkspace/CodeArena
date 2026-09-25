// Day 4 interview bank: LLM APIs, prompt engineering, structured output, streaming, tools, security, operations. Shape: see ./index.js
import { apiQs, conversationQs, promptQs, structuredQs, streamingQs } from "./d04-a.js";
import { toolQs, multimodalQs, securityQs, opsQs, designQs, ecosystemQs, codingQs } from "./d04-b.js";

export default {
  title: "LLM APIs and prompt engineering interview questions",
  intro:
    "The practical round for GenAI developer roles: how LLM APIs and SDKs work, conversations and memory, prompt engineering and context engineering, structured output, streaming to a frontend, tool calling, multimodal inputs, prompt injection and security, reliability and cost, design scenarios, and live-coding tasks you may be asked to write on the spot. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [apiQs, conversationQs, promptQs, structuredQs, streamingQs, toolQs, multimodalQs, securityQs, opsQs, ecosystemQs, designQs, codingQs],
};
