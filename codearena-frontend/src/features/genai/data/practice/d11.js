// Day 11 practice: RAG evaluation. Exercises live in ./rag-eval.js.
import ragEval, { SETUP_EXTRAS } from "./rag-eval.js";

export default {
  intro:
    "Eight exercises on measuring quality: a golden dataset, LLM judges for faithfulness and correctness, judge-vs-human agreement, refusal accuracy, latency and cost stats, RAGAS, and a feedback endpoint. After today, every change you make can be measured.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day11 && cd ~/genai-practice/day11
uv init --no-readme .
uv add openai python-dotenv numpy tiktoken pydantic "fastapi[standard]"
cp ../day03/llm.py ../day03/.env . && cp -r ../day07/docs ../day07/chunks.py ../day09/rag.py ../day09/safe.py .`,
    },
    ...SETUP_EXTRAS,
  ],
  groups: ragEval.groups,
};
