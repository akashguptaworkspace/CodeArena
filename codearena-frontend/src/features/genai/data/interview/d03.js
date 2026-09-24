// Day 3 interview bank: how LLMs work (history, ML, tokens, embeddings, transformers, training, inference, limits). Shape: see ./index.js
import { historyQs, mlQs, tokenQs, embeddingQs, transformerQs } from "./d03-a.js";
import { trainingQs, inferenceQs, samplingQs, limitsQs, modelQs, scenarioQs, codingQs } from "./d03-b.js";

export default {
  title: "LLM fundamentals interview questions",
  intro:
    "The conceptual round every GenAI interview has: the history from n-grams to reasoning models, machine-learning basics, tokens, embeddings, transformers and attention, how models are trained and served, sampling, hallucinations and other limits, choosing models, estimation scenarios and small live-coding tasks (softmax, top-p, attention, history trimming). Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [historyQs, mlQs, tokenQs, embeddingQs, transformerQs, trainingQs, inferenceQs, samplingQs, limitsQs, modelQs, scenarioQs, codingQs],
};
