// Day 13 interview bank: AI agents. Picks questions from topic banks (see ../pick.js).
import { questionGroup } from "../pick.js";
import agentsReact from "./agents-react.js";
import frameworks from "./frameworks.js";

export default {
  title: "AI agents interview questions",
  intro:
    "What makes something an agent, ReAct, the agent loop, AgentExecutor vs create_agent, middleware, memory and human approval in LangChain 1.x, when to reach for LangGraph, and scenario and live-coding questions. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...agentsReact.groups,
    questionGroup("Agents in LangChain 1.x", frameworks, ["create-agent", "middleware", "hitl", "agent-limits", "lc-vs-langgraph"]),
    questionGroup("Scenario and live coding", frameworks, ["scenario-agent-wrong-tool", "lc-agent"]),
  ],
};
