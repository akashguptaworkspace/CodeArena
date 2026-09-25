// Day 19 practice: system design in code, and the coding round. Exercises live in ./genai-design.js and ./coding-round.js.
import codingRound, { SETUP_EXTRAS as CODING_SETUP } from "./coding-round.js";
import design from "./genai-design.js";

export default {
  intro:
    "Design exercises that turn system-design talk into code (capacity and cost estimates, a latency budget, a tenant-safe data layer, an ingestion queue with a dead-letter list, a text-to-SQL safety validator, diagrams from code), then twelve interview-style problems: nine classic DSA patterns and three GenAI-flavoured live-coding tasks. Time yourself: 15 minutes for Easy, 25 for Medium. Say the complexity out loud before checking the solution.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day19 && cd ~/genai-practice/day19
uv init --no-readme .
uv add sqlglot pytest`,
    },
    ...CODING_SETUP,
  ],
  groups: [...design.groups, ...codingRound.groups],
};
