// Day 13 lessons: Agents 2: AI agents, ReAct and create_agent. Content lives in topic files; this file only picks it (see ../pick.js).
import { pickLessons } from "../pick.js";
import agentBasics from "./agent-basics.js";
import frameworks from "./frameworks.js";
import lcAgents from "./agents-react.js";

export default {
  ...pickLessons(agentBasics, ["react", "workflows", "planning", "failures", "raw-agent"]),
  ...pickLessons(frameworks, ["lc-tools", "lc-offline-lab"]),
  ...lcAgents,
};
