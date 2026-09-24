// Shape shared by every progress store and by the backend API.
//
// {
//   solved:    { [problemId]: "YYYY-MM-DD" }   // local date the problem was solved
//   flagged:   { [problemId]: true }            // marked to redo
//   dailyGoal: number                           // problems per day the user aims for
//   design:    { [questionId]: "studied" | "practised" | "ready" }   // system design stage
//   designAttempts: { [questionId]: DesignAttempt }                   // the student's own attempt
// }
//
// DesignAttempt = {
//   notes:    string     // what the student wrote before looking at the answer
//   covered:  number[]   // indexes of rubric points they ticked after revealing
//   revealed: boolean    // has the model answer been opened
// }

export const DEFAULT_DAILY_GOAL = 5;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 20;

export const emptyProgress = () => ({
  solved: {},
  flagged: {},
  dailyGoal: DEFAULT_DAILY_GOAL,
  design: {},
  designAttempts: {},
});

export const EMPTY_ATTEMPT = Object.freeze({ notes: "", covered: [], revealed: false });

// Returns a clean attempt, or null when there's nothing worth storing.
export function normalizeAttempt(raw) {
  if (!raw || typeof raw !== "object") return null;
  const attempt = {
    notes: typeof raw.notes === "string" ? raw.notes : "",
    covered: Array.isArray(raw.covered) ? [...new Set(raw.covered.filter(Number.isInteger))].sort((a, b) => a - b) : [],
    revealed: Boolean(raw.revealed),
  };
  return attempt.notes || attempt.covered.length || attempt.revealed ? attempt : null;
}

export function normalizeProgress(raw) {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  return {
    solved: raw.solved && typeof raw.solved === "object" ? { ...raw.solved } : base.solved,
    flagged: raw.flagged && typeof raw.flagged === "object" ? { ...raw.flagged } : base.flagged,
    dailyGoal: clampGoal(raw.dailyGoal ?? base.dailyGoal),
    design: raw.design && typeof raw.design === "object" ? { ...raw.design } : base.design,
    designAttempts: normalizeAttempts(raw.designAttempts),
  };
}

export const clampGoal = (n) =>
  Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(Number(n) || DEFAULT_DAILY_GOAL)));

function normalizeAttempts(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw)) {
    const attempt = normalizeAttempt(value);
    if (attempt) out[id] = attempt;
  }
  return out;
}
