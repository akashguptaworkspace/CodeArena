// Day 9: RAG evaluation + ship Project 1. Shape: see ./index.js
export default {
  ragas: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "Yesterday you measured **retrieval**. Today you measure the **answers**: are they faithful to the sources, relevant to the question, and was the right context retrieved? RAGAS is the most widely used library for this, and its metric names come up constantly in interviews.",
    sections: [
      {
        h: "What can go wrong, and the metric for each",
        blocks: [
          {
            table: {
              head: ["Metric", "Question it answers", "Needs a reference answer?"],
              rows: [
                ["**Faithfulness**", "Is every claim in the answer supported by the retrieved context? (hallucination check)", "No"],
                ["**Answer relevancy**", "Does the answer actually address the question?", "No"],
                ["**Context precision**", "Are the relevant chunks ranked near the top of what was retrieved?", "Usually yes"],
                ["**Context recall**", "Did retrieval find all the information needed for the reference answer?", "Yes"],
                ["Answer correctness", "Does the answer match the reference answer?", "Yes"],
              ],
            },
          },
          "Read them as a diagnosis: low **context recall** means fix retrieval; high context recall but low **faithfulness** means the generator ignores or invents beyond the context; low **answer relevancy** means the answer wanders or refuses unnecessarily.",
        ],
      },
      {
        h: "How faithfulness is computed",
        blocks: [
          "These metrics are mostly computed by an LLM acting as a grader. Faithfulness, for example:",
          {
            list: [
              "An LLM breaks the answer into individual claims (\"Interns get 6 casual leaves\", \"They must apply 2 days in advance\").",
              "For each claim, an LLM checks whether the retrieved context supports it.",
              "Faithfulness = supported claims ÷ total claims.",
            ],
            ordered: true,
          },
          "Answer relevancy works by generating questions from the answer and measuring how similar they are to the original question. Context precision and recall compare retrieved chunks against the reference answer.",
        ],
      },
      {
        h: "Running RAGAS",
        blocks: [
          {
            lang: "python",
            code: `# uv add ragas langchain-openai
from ragas import EvaluationDataset, evaluate
from ragas.metrics import Faithfulness, ResponseRelevancy, LLMContextPrecisionWithReference, LLMContextRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

rows = []
for case in eval_cases:                          # your 30 questions, with reference answers
    result = rag_answer(case["question"])        # your pipeline: answer + retrieved chunk texts
    rows.append({
        "user_input": case["question"],
        "response": result["answer"],
        "retrieved_contexts": [c["text"] for c in result["chunks"]],
        "reference": case["reference_answer"],
    })

judge = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", temperature=0))
emb = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))
scores = evaluate(
    EvaluationDataset.from_list(rows),
    metrics=[Faithfulness(), ResponseRelevancy(), LLMContextPrecisionWithReference(), LLMContextRecall()],
    llm=judge, embeddings=emb,
)
print(scores)                      # averages per metric
df = scores.to_pandas()            # per-question scores: sort by faithfulness to find failures`,
            caption: "RAGAS has renamed classes between versions. If an import fails, check the docs for your installed version; the concepts are stable.",
          },
          {
            tip: "Add a `reference_answer` to each of your 30 test questions (one or two sentences, written by you). It unlocks context recall and correctness, which are the most informative metrics.",
          },
        ],
      },
      {
        h: "Using scores responsibly",
        blocks: [
          {
            list: [
              "Scores come from an LLM judge, so they're noisy. Compare configurations on the **same** dataset and judge model, and read the lowest-scoring examples yourself.",
              "Track metrics over time in a table (or a tool like Langfuse, LangSmith or Braintrust).",
              "Alternatives and complements: DeepEval (pytest-style LLM tests), TruLens, promptfoo, and custom judges (next lesson).",
            ],
          },
        ],
      },
    ],
    revise: [
      "Faithfulness = claims supported by context (hallucination). Answer relevancy = addresses the question.",
      "Context precision = relevant chunks ranked high. Context recall = retrieval found everything needed (needs a reference).",
      "Low recall → fix retrieval; good recall but low faithfulness → fix generation.",
      "Metrics use an LLM judge: noisy; compare on the same data and judge; read failures.",
    ],
    mistakes: [
      "Reporting one average without looking at failing examples.",
      "Comparing scores computed with different judge models.",
      "No reference answers, so you can't measure context recall.",
    ],
    interview: [
      {
        q: "How do you evaluate a RAG system?",
        a: "Separately evaluate retrieval and generation on a curated test set of real questions with relevant sources and reference answers. Retrieval: hit rate/recall@k and MRR. Generation: faithfulness (claims supported by context), answer relevancy, and correctness against references, typically with an LLM judge via RAGAS or a custom rubric, spot-checked by humans. Include unanswerable questions to test refusals. Run it on every change, and in production add user feedback, sampling of live traffic for judge scoring, and monitoring of latency and cost.",
      },
      {
        q: "Faithfulness vs answer relevancy?",
        a: "Faithfulness measures whether the answer's claims are supported by the retrieved context: it catches hallucination. Answer relevancy measures whether the answer addresses the user's question: it catches evasive or off-topic answers. An answer can be faithful but irrelevant (quotes the context without answering), or relevant but unfaithful (answers confidently using facts not in the context).",
      },
    ],
    practice: [
      "Add reference answers to your 30 questions and run RAGAS with four metrics.",
      "Find the 3 lowest-faithfulness answers and diagnose each.",
    ],
  },

  judge: {
    minutes: 45,
    level: "Intermediate",
    intro:
      "Most real GenAI quality checks use an **LLM as a judge**: a model grading outputs against a rubric. It scales far better than human review, but it has known biases. Building a good judge, and knowing its limits, is a core skill.",
    sections: [
      {
        h: "Golden datasets",
        blocks: [
          "A **golden dataset** is a curated set of inputs with expected outputs or grading criteria, used as the benchmark for every change.",
          {
            list: [
              "Start with 30–100 examples covering the main use cases and known hard cases.",
              "Sources: real user queries (anonymised), support tickets, subject-matter experts, and failures from production.",
              "Label carefully: reference answers, required facts, sources, and \"should refuse\" flags.",
              "Version it in the repo (JSONL) and never tune prompts on the same examples you report scores on; keep a held-out portion.",
            ],
          },
        ],
      },
      {
        h: "Writing a judge",
        blocks: [
          "Good judges grade one clear criterion at a time, give reasoning before the score, and use a small, well-defined scale.",
          {
            lang: "python",
            code: `from typing import Literal
from pydantic import BaseModel, Field

class Verdict(BaseModel):
    reasoning: str = Field(description="Brief justification, citing specific claims")
    unsupported_claims: list[str]
    score: Literal[1, 2, 3] = Field(description="3 = fully supported, 2 = minor unsupported detail, 1 = major unsupported claim")

JUDGE = """You grade whether an answer is supported by the provided context.
Only the context counts as evidence; ignore your own knowledge.
List every claim in the answer that the context does not support, then score:
3 = all claims supported; 2 = only minor details unsupported; 1 = any important claim unsupported."""

def judge_faithfulness(context: str, answer: str) -> Verdict:
    return judge_llm.structured(
        system=JUDGE,
        user=f"<context>\\n{context}\\n</context>\\n<answer>\\n{answer}\\n</answer>",
        schema=Verdict,
    )`,
          },
          {
            list: [
              "**Binary or 3-point scales** are more consistent than 1–10.",
              "**Pairwise comparison** (\"Is A or B better?\") is often more reliable than absolute scores when comparing two prompt versions.",
              "**Reference-based** judging (compare with a reference answer) is more reliable than open-ended judging.",
            ],
          },
        ],
      },
      {
        h: "Known biases",
        blocks: [
          {
            table: {
              head: ["Bias", "What happens", "Mitigation"],
              rows: [
                ["Position bias", "Prefers the first (or second) option in pairwise comparisons", "Run both orders; count only consistent wins"],
                ["Verbosity bias", "Prefers longer answers", "Rubric rewards concision; compare similar lengths"],
                ["Self-preference", "Rates outputs from its own model family higher", "Use a different model family as judge"],
                ["Leniency / inconsistency", "Scores drift or cluster in the middle", "Clear rubric, few-shot graded examples, low temperature"],
              ],
            },
          },
          "**Validate the judge:** have a human grade 30–50 examples, then check how often the judge agrees. If agreement is low, improve the rubric before trusting its scores.",
        ],
      },
    ],
    revise: [
      "Golden dataset: curated, labelled, versioned, with a held-out part; grows from production failures.",
      "Judge: one criterion, reasoning before score, small scale, structured output, low temperature.",
      "Pairwise and reference-based judging are more reliable than open-ended absolute scores.",
      "Biases: position, verbosity, self-preference, inconsistency. Mitigate and validate against human labels.",
    ],
    interview: [
      {
        q: "What are the risks of LLM-as-judge?",
        a: "Judges have biases: position bias in pairwise comparisons, preference for longer answers, favouring outputs from their own model family, and inconsistent or lenient scoring. They can also miss domain errors they don't know about. Mitigations: specific rubrics with one criterion at a time, reasoning before scoring, small scales, swapping order in pairwise tests, a different model family as judge, and validating agreement with human labels before relying on it.",
      },
    ],
    practice: [
      "Write the faithfulness judge above and grade 10 of your DocChat answers; grade them yourself too and compute agreement.",
    ],
  },

  "cost-latency": {
    minutes: 35,
    level: "Intermediate",
    intro:
      "Quality isn't the only number. Every RAG query has a cost and a latency, and product teams care about both. Measure them per request and per stage, so you can make trade-offs with data.",
    sections: [
      {
        h: "Measuring per stage",
        blocks: [
          {
            lang: "python",
            code: `import time
from contextlib import contextmanager

@contextmanager
def timed(stats: dict, name: str):
    start = time.perf_counter()
    yield
    stats[name] = round((time.perf_counter() - start) * 1000)

async def answer_with_stats(question: str, user):
    stats: dict = {}
    with timed(stats, "condense_ms"):
        query = await condense(...)
    with timed(stats, "retrieve_ms"):
        chunks = await retrieve_v2(query, user.id)
    with timed(stats, "generate_ms"):
        result = await generate(question, chunks)
    stats.update(input_tokens=result.input_tokens, output_tokens=result.output_tokens,
                 cost_usd=price(result), model=result.model)
    logger.info("rag_request %s", stats)
    return result, stats`,
          },
          "Also record **time to first token** for streamed answers, which is what users feel. Report **p50 and p95**, never just the average; the slow tail is what users complain about.",
        ],
      },
      {
        h: "Cost per query",
        blocks: [
          {
            table: {
              head: ["Component", "Example cost per query"],
              rows: [
                ["Query embedding", "Negligible"],
                ["Condense / rewrite (small model)", "Very small"],
                ["Reranking (API)", "Small, per search"],
                ["Generation: 3,000 input + 400 output tokens", "The largest part by far"],
              ],
            },
          },
          "Levers, roughly in order of impact: fewer or shorter chunks in the prompt, a smaller model where quality allows, caching (repeated questions, prompt caching for the system prompt), shorter answers, and routing easy questions to cheaper paths.",
          {
            tip: "Put a \"cost per 1,000 questions\" and \"p95 latency\" line in your README next to your quality metrics. Showing the three together is how senior engineers talk about systems.",
          },
        ],
      },
    ],
    revise: [
      "Time every stage; log tokens, cost and model per request.",
      "Report p50/p95 and time to first token.",
      "Generation dominates cost: fewer/shorter chunks, smaller models, caching, shorter answers, routing.",
    ],
    interview: [
      {
        q: "How would you reduce the cost of a RAG system by half?",
        a: "Measure where tokens go first. Typically: send fewer, better chunks by improving retrieval and reranking; trim chat history; cap answer length; use a smaller model for easy questions with routing; cache frequent questions (semantic cache keyed by permissions) and use prompt caching for static prefixes; and batch offline work. Validate each change against the eval set so quality holds.",
      },
    ],
    practice: [
      "Add per-stage timing and cost logging to DocChat; run your 30 questions and compute p50/p95 and cost per 1,000 questions.",
    ],
  },

  "ragas-run": {
    minutes: 120,
    level: "Intermediate",
    intro:
      "Run a full evaluation of DocChat and publish the results in the README. By the end you'll have a reproducible `eval/run.py` and a scores table: evidence that your system works, which most candidates can't show.",
    sections: [
      {
        h: "The eval script",
        blocks: [
          {
            lang: "python",
            code: `# eval/run.py  →  uv run python -m eval.run --mode hybrid_rerank
import argparse, json, datetime
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", default="hybrid_rerank")
    args = p.parse_args()

    cases = [json.loads(l) for l in open("eval/questions.jsonl", encoding="utf-8")]
    retrieval = evaluate_retrieval(cases, mode=args.mode)       # hit rate, MRR (Day 8)
    rows = run_pipeline(cases, mode=args.mode)                  # answers + contexts
    gen = run_ragas(rows)                                       # faithfulness, relevancy, ...
    refusals = refusal_accuracy(cases, rows)                    # unanswerable handled correctly?

    report = {"date": datetime.date.today().isoformat(), "mode": args.mode,
              **retrieval, **gen, **refusals}
    Path("eval/results").mkdir(exist_ok=True)
    Path(f"eval/results/{report['date']}-{args.mode}.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()`,
          },
        ],
      },
      {
        h: "The README table",
        blocks: [
          {
            lang: "markdown",
            code: `## Evaluation (30 questions, judge: gpt-4o-mini)

| Retrieval mode | Hit@5 | MRR | Faithfulness | Answer relevancy | Correct refusals |
|---|---|---|---|---|---|
| vector | 0.72 | 0.58 | 0.84 | 0.88 | 4/5 |
| hybrid + rerank | 0.90 | 0.79 | 0.91 | 0.90 | 5/5 |`,
            caption: "Example numbers. Use your own results, even if they're less impressive; honest numbers with analysis beat perfect ones.",
          },
          "Below the table, write two or three sentences on what improved and what's still failing (and why). That analysis is what interviewers ask about.",
        ],
      },
    ],
    revise: [
      "One command runs retrieval metrics, generation metrics and refusal accuracy, and saves dated results.",
      "Publish a comparison table plus a short failure analysis.",
    ],
    practice: [
      "Add a CI job (GitHub Actions) that runs the retrieval metrics on every pull request.",
    ],
  },

  "docchat-ui": {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Make DocChat look and feel like a product. You're a MERN developer, so this is where you stand out from candidates who only have notebooks: a clean Next.js front end with auth, streaming and clickable citations.",
    sections: [
      {
        h: "Features",
        blocks: [
          {
            list: [
              "**Auth:** sign up / log in (your FastAPI JWT, or a provider like Clerk or Auth.js). Store the token securely, send it on each request.",
              "**Documents page:** upload with drag and drop, progress, status badges (processing / ready / failed), delete.",
              "**Chat:** streaming answers rendered as Markdown, citations `[1]` rendered as clickable chips that open a side panel with the source name, page and snippet.",
              "**Conversation list** in a sidebar; new chat button.",
              "**Feedback:** thumbs up/down per answer, saved to the backend. This becomes production eval data.",
              "**Empty, loading and error states** for everything.",
            ],
          },
        ],
      },
      {
        h: "Next.js notes",
        blocks: [
          {
            list: [
              "Use the App Router with client components for the chat (it needs state and streaming).",
              "Call FastAPI directly from the browser (enable CORS for your domain), or proxy through a Next.js route handler if you want to hide the backend URL. For streaming through a proxy, pass the response body through unchanged.",
              "Put the API base URL in an environment variable (`NEXT_PUBLIC_API_URL`).",
              "Generate TypeScript types from FastAPI's `/openapi.json` so frontend and backend stay in sync.",
            ],
          },
          {
            lang: "javascript",
            code: `// Turn "[1][3]" markers into citation chips
function renderWithCitations(text, sources, onOpen) {
  return text.split(/(\\[\\d+\\])/g).map((part, i) => {
    const m = part.match(/^\\[(\\d+)\\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const src = sources.find((s) => s.n === Number(m[1]));
    return src ? <button key={i} className="cite" onClick={() => onOpen(src)}>{m[1]}</button> : null;
  });
}`,
          },
        ],
      },
    ],
    revise: [
      "Auth, document management with statuses, streaming Markdown chat, clickable citations, conversation list, feedback.",
      "Design empty, loading and error states.",
      "Typed client from OpenAPI; API URL in env.",
    ],
    practice: [
      "Show the retrieval mode and latency of each answer in a small debug panel (hidden behind a toggle).",
    ],
  },

  "docchat-deploy": {
    minutes: 150,
    level: "Intermediate",
    intro:
      "Deploy DocChat so anyone can try it from a link, and record a 2-minute demo. A live link in your resume gets clicked; a GitHub repo alone often doesn't. On Day 16 you'll deploy to AWS properly; today, ship quickly on a simple platform.",
    sections: [
      {
        h: "A simple deployment",
        blocks: [
          {
            table: {
              head: ["Part", "Quick option", "Notes"],
              rows: [
                ["Postgres + pgvector", "Neon or Supabase (free tiers include pgvector)", "Run your migrations against it"],
                ["FastAPI backend", "Render, Railway or Fly.io from your Dockerfile", "Set env vars in the dashboard"],
                ["Next.js frontend", "Vercel", "Set `NEXT_PUBLIC_API_URL`"],
                ["Uploaded files", "S3 or Cloudflare R2", "Don't rely on the container's disk; it's wiped on redeploy"],
              ],
            },
          },
          {
            warn: "A public demo with your API key can be abused. Add per-user rate limits and a daily token budget, cap upload size and document count per user, and set a spending limit in your LLM provider's dashboard.",
          },
        ],
      },
      {
        h: "Production checklist",
        blocks: [
          {
            list: [
              "Secrets only in the platform's environment settings; `.env` never committed.",
              "CORS restricted to your frontend domain.",
              "`/health` endpoint used by the platform's health check.",
              "Logs visible in the platform dashboard (with request IDs).",
              "A seeded demo account with sample documents, so visitors can try it without uploading anything.",
            ],
          },
        ],
      },
      {
        h: "The demo video",
        blocks: [
          {
            list: [
              "**0:00–0:15:** the problem (\"Employees can't find answers in 200 pages of HR policy\").",
              "**0:15–1:15:** upload a document, ask 3 questions including a follow-up and an unanswerable one, click a citation.",
              "**1:15–1:45:** architecture diagram in one slide: hybrid retrieval, reranker, streaming.",
              "**1:45–2:00:** the eval table and what you'd do next.",
            ],
            ordered: true,
          },
          "Record with Loom or OBS, put the link at the top of the README, and post it on LinkedIn with a short write-up. **Project 1 is done.**",
        ],
      },
    ],
    revise: [
      "Neon/Supabase (pgvector) + Render/Railway (API) + Vercel (Next.js) + S3/R2 (files).",
      "Protect the public demo: rate limits, token budgets, upload caps, provider spending limit.",
      "Secrets in env, CORS locked, health check, logs, demo account.",
      "2-minute video: problem → demo → architecture → results.",
    ],
    practice: [
      "Ask a friend to use the live demo without instructions and note where they got stuck.",
    ],
  },
};
