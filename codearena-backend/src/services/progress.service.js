import { UniqueConstraintError } from "sequelize";
import { DesignAttempt, DesignProgress, ProblemProgress, User } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";

/**
 * Insert-or-update on the (user, item) unique key. If two requests insert the same row at the
 * same moment (e.g. two devices), the loser's insert hits the unique index and becomes an update.
 */
async function upsertRow(Model, where, values) {
  const existing = await Model.findOne({ where });
  if (existing) return existing.update(values);
  try {
    return await Model.create({ ...where, ...values });
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
    return Model.update(values, { where });
  }
}

/** Everything the frontend's ProgressContext needs, in the shape described in docs/API.md. */
export async function getProgress(userId) {
  const [user, problems, designs, attempts] = await Promise.all([
    User.findByPk(userId, { attributes: ["dailyGoal"] }),
    ProblemProgress.findAll({ where: { userId } }),
    DesignProgress.findAll({ where: { userId } }),
    DesignAttempt.findAll({ where: { userId } }),
  ]);
  if (!user) throw HttpError.unauthorized();

  const solved = {};
  const flagged = {};
  for (const p of problems) {
    if (p.solvedOn) solved[p.problemId] = p.solvedOn;
    if (p.flagged) flagged[p.problemId] = true;
  }

  return {
    solved,
    flagged,
    dailyGoal: user.dailyGoal,
    design: Object.fromEntries(designs.map((d) => [d.questionId, d.status])),
    designAttempts: Object.fromEntries(
      attempts.map((a) => [a.questionId, { notes: a.notes, covered: a.covered, revealed: a.revealed }]),
    ),
  };
}

/** Partial update of one problem; deletes the row when it's neither solved nor flagged. */
export async function updateProblem(userId, problemId, patch) {
  const existing = await ProblemProgress.findOne({ where: { userId, problemId } });
  const next = {
    solvedOn: patch.solvedOn !== undefined ? patch.solvedOn : (existing?.solvedOn ?? null),
    flagged: patch.flagged !== undefined ? patch.flagged : (existing?.flagged ?? false),
  };

  if (!next.solvedOn && !next.flagged) {
    if (existing) await existing.destroy();
    return;
  }
  await upsertRow(ProblemProgress, { userId, problemId }, next);
}

export async function updateSettings(userId, { dailyGoal }) {
  await User.update({ dailyGoal }, { where: { id: userId } });
}

export async function setDesignStatus(userId, questionId, status) {
  if (!status) {
    await DesignProgress.destroy({ where: { userId, questionId } });
    return;
  }
  await upsertRow(DesignProgress, { userId, questionId }, { status });
}

export async function saveDesignAttempt(userId, questionId, attempt) {
  await upsertRow(DesignAttempt, { userId, questionId }, attempt);
}

export async function deleteDesignAttempt(userId, questionId) {
  await DesignAttempt.destroy({ where: { userId, questionId } });
}
