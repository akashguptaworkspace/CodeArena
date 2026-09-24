import * as progress from "../services/progress.service.js";
import { rubricSize } from "../utils/catalog.js";
import { HttpError } from "../utils/HttpError.js";

// GET /api/progress
export async function getProgress(req, res) {
  res.json(await progress.getProgress(req.userId));
}

// PATCH /api/progress/problems/:problemId  { solvedOn?, flagged? }
export async function updateProblem(req, res) {
  await progress.updateProblem(req.userId, req.params.problemId, req.body);
  res.status(204).end();
}

// PATCH /api/progress/settings  { dailyGoal }
export async function updateSettings(req, res) {
  await progress.updateSettings(req.userId, req.body);
  res.status(204).end();
}

// PATCH /api/progress/design/:questionId  { status }
export async function setDesignStatus(req, res) {
  await progress.setDesignStatus(req.userId, req.params.questionId, req.body.status);
  res.status(204).end();
}

// PUT /api/progress/design/:questionId/attempt  { notes, covered, revealed }
export async function saveDesignAttempt(req, res) {
  const { questionId } = req.params;
  const size = rubricSize(questionId);
  if (req.body.covered.some((i) => i >= size)) {
    throw HttpError.badRequest(`covered: this question has ${size} key points (0–${size - 1})`);
  }
  const covered = [...new Set(req.body.covered)].sort((a, b) => a - b);
  await progress.saveDesignAttempt(req.userId, questionId, { ...req.body, covered });
  res.status(204).end();
}

// DELETE /api/progress/design/:questionId/attempt
export async function deleteDesignAttempt(req, res) {
  await progress.deleteDesignAttempt(req.userId, req.params.questionId);
  res.status(204).end();
}
