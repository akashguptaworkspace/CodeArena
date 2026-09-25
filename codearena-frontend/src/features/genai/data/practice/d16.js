// Day 16 practice: production skills and the job search. Exercises live in ./production.js and ./job-search.js.
import jobSearch, { SETUP_EXTRAS as JOB_SETUP } from "./job-search.js";
import production from "./production.js";

export default {
  intro:
    "Production-skills exercises first: mask PII, red-team a bot with prompt injections and measure leaks, add a topic guard and an output check, build exact and semantic caches, make LLM calls survive outages with a circuit breaker, and trace everything in Langfuse. Then small Python tools for your own job search: analyse job descriptions, score your resume against a JD, sharpen resume bullets, track applications, generate a README skeleton and draft follow-ups.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day16/jds && cd ~/genai-practice/day16
uv init --no-readme .
uv add openai python-dotenv numpy pydantic pytest langfuse
cp ../day03/llm.py ../day03/.env .`,
    },
    ...JOB_SETUP,
  ],
  groups: [...production.groups, ...jobSearch.groups],
};
