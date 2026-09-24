// Node.js question bank: 100 backend interview questions.
//
// Each question has two halves:
//   Shown up front:   title, scenario (how the interviewer asks it), optional code
//   Hidden until the student reveals it:
//     answer { summary, points, code?, pitfalls? }   the model answer (content/*.js)
//     rubric                                          key points used for the self-check score
//     twist                                           the follow-up interviewers typically add
//
// Progress reuses the design stages and attempts, keyed by the `node-` prefixed id.

import async from "./content/async";
import data from "./content/data";
import http from "./content/http";
import modulesStreams from "./content/modulesStreams";
import performance from "./content/performance";
import runtime from "./content/runtime";
import securityOps from "./content/securityOps";
import { NODE_BASE } from "./catalog";

const CONTENT = { ...runtime, ...async, ...modulesStreams, ...performance, ...http, ...data, ...securityOps };

export const NODE_QUESTIONS = NODE_BASE.map((question) => ({
  ...question,
  ...CONTENT[question.id],
  path: `/nodejs/${question.id}`,
}));

export const getNodeQuestion = (id) => NODE_QUESTIONS.find((q) => q.id === id) || null;

export const NODE_TRACK = {
  id: "node",
  title: "Node.js",
  short: "Node.js",
  path: "/nodejs",
  questions: NODE_QUESTIONS,
  attemptNoun: "answer",
  notesPrompt:
    "Answer as you would out loud in the interview before revealing: the one-line definition, how it works underneath, a real example or code, trade-offs, and what goes wrong in production.",
  notesPlaceholder: "e.g.\n- Short answer…\n- How it works…\n- Example / code…\n- Trade-offs and gotchas…",
};
