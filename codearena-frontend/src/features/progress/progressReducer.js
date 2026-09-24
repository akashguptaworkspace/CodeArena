import { emptyProgress } from "./progressModel";

export const initialProgressState = {
  status: "idle", // idle | loading | ready | error
  progress: emptyProgress(),
  loadError: null,
  pendingSaves: 0,
  saveError: null,
};

export const ProgressActions = {
  LOAD_START: "LOAD_START",
  LOAD_SUCCESS: "LOAD_SUCCESS",
  LOAD_ERROR: "LOAD_ERROR",
  SET_SOLVED: "SET_SOLVED",
  SET_FLAGGED: "SET_FLAGGED",
  SET_DAILY_GOAL: "SET_DAILY_GOAL",
  SET_DESIGN_STATUS: "SET_DESIGN_STATUS",
  SET_DESIGN_ATTEMPT: "SET_DESIGN_ATTEMPT",
  SAVE_START: "SAVE_START",
  SAVE_SUCCESS: "SAVE_SUCCESS",
  SAVE_ERROR: "SAVE_ERROR",
  DISMISS_SAVE_ERROR: "DISMISS_SAVE_ERROR",
};

const withEntry = (map, key, value) => {
  const next = { ...map };
  if (value) next[key] = value;
  else delete next[key];
  return next;
};

export function progressReducer(state, action) {
  switch (action.type) {
    case ProgressActions.LOAD_START:
      return { ...state, status: "loading", loadError: null };
    case ProgressActions.LOAD_SUCCESS:
      return { ...state, status: "ready", progress: action.progress };
    case ProgressActions.LOAD_ERROR:
      return { ...state, status: "error", loadError: action.error };

    case ProgressActions.SET_SOLVED:
      return {
        ...state,
        progress: { ...state.progress, solved: withEntry(state.progress.solved, action.problemId, action.solvedOn) },
      };
    case ProgressActions.SET_FLAGGED:
      return {
        ...state,
        progress: { ...state.progress, flagged: withEntry(state.progress.flagged, action.problemId, action.flagged) },
      };
    case ProgressActions.SET_DAILY_GOAL:
      return { ...state, progress: { ...state.progress, dailyGoal: action.dailyGoal } };
    case ProgressActions.SET_DESIGN_STATUS:
      return {
        ...state,
        progress: { ...state.progress, design: withEntry(state.progress.design, action.questionId, action.status) },
      };

    case ProgressActions.SET_DESIGN_ATTEMPT:
      return {
        ...state,
        progress: {
          ...state.progress,
          designAttempts: withEntry(state.progress.designAttempts, action.questionId, action.attempt),
        },
      };

    case ProgressActions.SAVE_START:
      return { ...state, pendingSaves: state.pendingSaves + 1 };
    case ProgressActions.SAVE_SUCCESS:
      return { ...state, pendingSaves: state.pendingSaves - 1 };
    case ProgressActions.SAVE_ERROR:
      return { ...state, pendingSaves: state.pendingSaves - 1, saveError: action.error };
    case ProgressActions.DISMISS_SAVE_ERROR:
      return { ...state, saveError: null };

    default:
      throw new Error(`Unknown progress action: ${action.type}`);
  }
}
