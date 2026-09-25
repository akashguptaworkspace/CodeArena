// Day 17 practice: open models and fine-tuning. Exercises live in ./open-models.js.
import openModels, { SETUP_EXTRAS } from "./open-models.js";

export default {
  intro:
    "Seven exercises with open models on your own laptop: Hugging Face pipelines, chatting with a small model through `transformers`, benchmarking Ollama, memory and LoRA parameter calculators, preparing a clean fine-tuning dataset, and evaluating a fine-tuned model against its base.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day17 && cd ~/genai-practice/day17
uv init --no-readme .
uv add transformers torch accelerate openai python-dotenv pydantic
cp ../day03/llm.py ../day03/.env .
# Ollama: install from ollama.com, then
ollama pull qwen2.5:1.5b`,
    },
    ...SETUP_EXTRAS,
  ],
  groups: openModels.groups,
};
