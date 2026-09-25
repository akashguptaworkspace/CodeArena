// Day 6 interview bank: chains, runnables and LCEL. Picks questions from topic banks (see ../pick.js).
import { groupNamed, questionGroup } from "../pick.js";
import frameworks from "./frameworks.js";
import lcChains from "./langchain-chains.js";

export default {
  title: "Chains, runnables and LCEL interview questions",
  intro:
    "The LangChain core round: what chains are and the kinds you can build, why runnables exist, the runnable primitives, LCEL and the Runnable interface, memory, what changed in LangChain 1.0, debugging, testing and production, scenarios and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [
    ...lcChains.groups,
    questionGroup("LCEL and the Runnable interface", frameworks, ["lcel", "runnable-interface", "streaming-lc", "batch"]),
    questionGroup("Versions and memory", frameworks, ["v1-changes", "old-tutorials", "memory-lc"]),
    groupNamed(frameworks, "Debugging, testing and production"),
    questionGroup("Scenario questions", frameworks, ["scenario-import-error", "scenario-slow-chain", "scenario-migrate"]),
    questionGroup("Live coding questions", frameworks, ["lc-router", "lc-fake-test"]),
  ],
};
