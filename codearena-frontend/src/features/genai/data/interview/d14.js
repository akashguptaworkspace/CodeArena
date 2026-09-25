// Day 14 interview bank: LangGraph. Picks questions from topic banks (see ../pick.js).
import { groupNamed } from "../pick.js";
import frameworks from "./frameworks.js";

export default {
  title: "LangGraph interview questions",
  intro:
    "The basics of LangGraph every agent interview touches: what it is, when a graph beats a chain, state, checkpointers and human-in-the-loop. Pair these with the Day 14 lessons, which go deeper. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [groupNamed(frameworks, "LangGraph basics (preview)")],
};
