// Day 3: How LLMs work — history, intuition and internals. Shape: see ./index.js
import { history, mlBasics } from "./d03-history.js";
import { attention, embeddings, tokens } from "./d03-core.js";
import { inference, landscape, limits, sampling, training } from "./d03-models.js";
import { glossary } from "./d03-glossary.js";
import { attentionNumpy, bigramLm, tokenizerBpe } from "./d03-builds.js";

const builds = {
  "cost-calc": {
    minutes: 120,
    level: "Beginner",
    intro:
      "Build a small token counter and cost calculator: paste a prompt, choose the expected answer length, and see the tokens and monthly cost across three models. It practises Python, makes token economics concrete, and is something you'll actually use when estimating projects.",
    sections: [
      {
        h: "What it does",
        blocks: [
          {
            lang: "bash",
            code: `uv run python -m costcalc --file prompt.txt --output-tokens 400 --calls-per-day 5000

Input tokens:   2,184     Output tokens: 400    Calls/month: 150,000
Model              Per call      Per month
small-model        $0.00057      $85.14
mid-model          $0.00946      $1,419.00
large-model        $0.02946      $4,419.00`,
          },
        ],
      },
      {
        h: "Price table as data",
        blocks: [
          "Keep prices in a JSON file, not in code, because they change. Fill in real numbers from each provider's pricing page on the day you build it, and record the date.",
          {
            lang: "json",
            code: `{
  "updated": "2026-09-24",
  "models": [
    {"name": "small-model", "input_per_m": 0.15, "output_per_m": 0.60, "tokenizer": "o200k_base"},
    {"name": "mid-model",   "input_per_m": 2.50, "output_per_m": 10.00, "tokenizer": "o200k_base"},
    {"name": "large-model", "input_per_m": 3.00, "output_per_m": 15.00, "tokenizer": "o200k_base"}
  ]
}`,
            caption: "Example numbers. Replace them with current official prices and real model names.",
          },
        ],
      },
      {
        h: "The code",
        blocks: [
          {
            lang: "python",
            code: `# costcalc/__main__.py
import argparse, json
from dataclasses import dataclass
from pathlib import Path
import tiktoken

@dataclass(frozen=True)
class Model:
    name: str
    input_per_m: float
    output_per_m: float
    tokenizer: str = "o200k_base"

    def cost(self, tokens_in: int, tokens_out: int) -> float:
        return tokens_in / 1e6 * self.input_per_m + tokens_out / 1e6 * self.output_per_m

def load_models(path: Path) -> list[Model]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Model(**m) for m in data["models"]]

def count_tokens(text: str, encoding: str) -> int:
    return len(tiktoken.get_encoding(encoding).encode(text))

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--file", type=Path, required=True)
    p.add_argument("--output-tokens", type=int, default=300)
    p.add_argument("--calls-per-day", type=int, default=1000)
    p.add_argument("--prices", type=Path, default=Path(__file__).parent / "prices.json")
    a = p.parse_args()

    text = a.file.read_text(encoding="utf-8")
    models = load_models(a.prices)
    calls = a.calls_per_day * 30
    tokens_in = count_tokens(text, models[0].tokenizer)

    print(f"Input tokens: {tokens_in:>7,}   Output tokens: {a.output_tokens:,}   Calls/month: {calls:,}")
    print(f"{'Model':<18}{'Per call':>12}{'Per month':>14}")
    for m in sorted(models, key=lambda m: m.cost(tokens_in, a.output_tokens)):
        per_call = m.cost(tokens_in, a.output_tokens)
        print(f"{m.name:<18}{per_call:>12.5f}{per_call * calls:>14,.2f}")

if __name__ == "__main__":
    main()`,
          },
        ],
      },
      {
        h: "Extensions that make it portfolio-worthy",
        blocks: [
          {
            list: [
              "Show the **input/output share** of cost, so you see when long answers dominate.",
              "Add a **cached input** price and a `--cached-fraction` option to model prompt caching savings.",
              "Add a `--compare-hindi` flag that tokenizes an English and a Hindi version of the same text.",
              "Wrap it in a FastAPI endpoint and a tiny React page. You know how to build that part quickly.",
              "Write unit tests for `Model.cost` with hand-calculated numbers.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Prices live in data (JSON), with an \"updated\" date; never hard-code them.",
      "Cost = input/1M × input price + output/1M × output price, per call × calls.",
      "tiktoken gives estimates; provider `usage` fields give exact counts.",
    ],
    practice: [
      "Run it on one of your real prompts and note which model you'd choose at 1K vs 100K calls a day.",
    ],
  },

  "temp-notebook": {
    minutes: 90,
    level: "Beginner",
    intro:
      "Run an experiment and write up what you observe. You'll call a model with the same prompts at temperature 0, 0.7 and 1.2, several times each, and record the differences. Doing it yourself builds intuition that's far stronger than reading about it, and the notebook is a nice artifact for GitHub.",
    sections: [
      {
        h: "Setup",
        blocks: [
          {
            lang: "bash",
            code: `uv add openai python-dotenv pandas
uv add --dev ipykernel
# create experiments/temperature.ipynb in VS Code and select the .venv kernel`,
          },
          {
            tip: "No paid key yet? Gemini's API has a free tier for learning, and it offers an OpenAI-compatible endpoint, so this code works by changing `base_url` and the model name. You can also use a local model with Ollama (Day 15).",
          },
        ],
      },
      {
        h: "The experiment",
        blocks: [
          {
            lang: "python",
            code: `from openai import OpenAI
from dotenv import load_dotenv
import pandas as pd

load_dotenv()
client = OpenAI()
MODEL = "gpt-4o-mini"      # any chat model you have access to

PROMPTS = {
    "factual": "In one sentence, what is the capital of Australia?",
    "extraction": 'Extract the city as JSON {"city": ...}: "I moved from Pune to Bengaluru last year."',
    "creative": "Write a one-line tagline for a chai startup.",
    "code": "Write a Python one-liner that reverses a string s.",
}
TEMPS = [0, 0.7, 1.2]
RUNS = 5

rows = []
for kind, prompt in PROMPTS.items():
    for t in TEMPS:
        for run in range(RUNS):
            r = client.chat.completions.create(
                model=MODEL, temperature=t, max_tokens=80,
                messages=[{"role": "user", "content": prompt}],
            )
            rows.append({"kind": kind, "temp": t, "run": run,
                         "text": r.choices[0].message.content.strip()})

df = pd.DataFrame(rows)
summary = df.groupby(["kind", "temp"])["text"].nunique().unstack()
summary      # how many distinct answers out of 5, per prompt and temperature`,
          },
        ],
      },
      {
        h: "What to write down",
        blocks: [
          "Add a Markdown cell under the results and answer these in your own words:",
          {
            list: [
              "How many distinct answers did each prompt produce at each temperature?",
              "Did temperature 0 always give identical answers? If not, why might that be?",
              "At 1.2, did the factual or extraction answers ever become wrong or badly formatted?",
              "Which temperature would you use for each of the four prompt types in production, and why?",
              "Estimate the cost of this experiment from the `usage` field of the responses.",
            ],
            ordered: true,
          },
          "Push the notebook with outputs to GitHub. It shows you test assumptions with data instead of guessing, which is exactly the habit GenAI teams want.",
        ],
      },
    ],
    revise: [
      "Measure, don't guess: same prompt × several temperatures × several runs.",
      "Low temperature for factual, extraction and code tasks; higher for creative tasks.",
      "Temperature 0 is near-deterministic, not guaranteed identical.",
    ],
    practice: [
      "Repeat the experiment with top-p = 0.5 at temperature 1.0 and compare.",
    ],
  },
};

export default {
  history,
  "ml-basics": mlBasics,
  tokens,
  embeddings,
  attention,
  training,
  inference,
  sampling,
  limits,
  landscape,
  glossary,
  "tokenizer-bpe": tokenizerBpe,
  "bigram-lm": bigramLm,
  "attention-numpy": attentionNumpy,
  ...builds,
};
