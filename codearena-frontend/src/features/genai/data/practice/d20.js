// Day 20 practice: final drills. Exercises live in ./mock-interviews.js.
import mocks from "./mock-interviews.js";

export default {
  intro:
    "Five final drills that mix everything: two timed builds from an empty folder, two \"find the bugs\" challenges in RAG and agent code (a common interview format), and a small tool to run your own mock interview sessions from the question bank.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day20 && cd ~/genai-practice/day20
uv init --no-readme .
uv add openai python-dotenv numpy
cp ../day03/llm.py ../day03/.env . && cp -r ../day07/docs .`,
    },
  ],
  groups: mocks.groups,
};
