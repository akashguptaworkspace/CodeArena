// Day 12 interview bank: tools and tool calling. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import agentTools from "./agent-tools.js";
import frameworks from "./frameworks.js";
import llmApis from "./llm-apis.js";

export default {
  title: "Tools and tool calling interview questions",
  intro:
    "The bridge from chatbots to agents: what a tool is and what the model sees, built-in and custom tools in LangChain, tool binding, tool calling and tool execution, function calling across providers (tool choice, parallel calls, errors, safety), a risky-tool scenario and a live-coding tool loop. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...agentTools.groups,
    questionGroup("Tools in LangChain", frameworks, ["tool-decorator", "bind-tools"]),
    groupNamed(llmApis, "Tool and function calling"),
    questionGroup("Scenario and live coding", llmApis, ["refund-bot-risk", "lc-tool-loop"]),
  ],
};
