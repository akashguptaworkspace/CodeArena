import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { clampGoal, EMPTY_ATTEMPT, emptyProgress, normalizeAttempt } from "./progressModel";
import { getProgressStore } from "./progressService";
import { initialProgressState, ProgressActions, progressReducer } from "./progressReducer";
import { toDayKey } from "@/shared/utils/dates";
import { useAuth } from "@/features/auth/AuthContext";

// State and actions live in separate contexts: components that only trigger changes
// (e.g. every ProblemRow) don't re-render when progress data changes.
const ProgressStateContext = createContext(null);
const ProgressActionsContext = createContext(null);

export function ProgressProvider({ children }) {
  const { user, signInPrompt, requestSignIn } = useAuth();
  const [state, dispatch] = useReducer(progressReducer, initialProgressState);

  // No store = guest. Guests see empty progress; anything that would be saved asks them to sign in.
  const store = useMemo(() => (user ? getProgressStore(user) : null), [user]);

  // Latest progress for action callbacks, so they can stay stable (no re-creation per change).
  const progressRef = useRef(state.progress);
  progressRef.current = state.progress;

  // Design attempts: notes change on every keystroke, so their saves are debounced per question.
  const attemptTimers = useRef({});
  const pendingAttempts = useRef({});
  const savedAttempts = useRef({});
  // Which store `state.progress` came from, so nothing acts on a guest's progress with a user's store.
  const loadedFrom = useRef(undefined);

  const load = useCallback(async () => {
    savedAttempts.current = {};
    pendingAttempts.current = {};
    loadedFrom.current = undefined;
    if (!store) {
      loadedFrom.current = null;
      dispatch({ type: ProgressActions.LOAD_SUCCESS, progress: emptyProgress() });
      return;
    }
    dispatch({ type: ProgressActions.LOAD_START });
    try {
      const progress = await store.load();
      loadedFrom.current = store;
      dispatch({ type: ProgressActions.LOAD_SUCCESS, progress });
    } catch (err) {
      dispatch({ type: ProgressActions.LOAD_ERROR, error: err.message });
    }
  }, [store]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Guest → sign-in → finish what they started.
   * `intent(actions, progress)` runs once the signed-in user's progress has loaded. Intents are
   * written against that fresh progress (e.g. "make sure it's solved", not "toggle"), so replaying
   * never undoes something the account already had.
   */
  const pendingIntent = useRef(null);
  const actionsRef = useRef(null);

  const runAfterSignIn = useCallback(
    (reason, intent) => {
      const guestProgress = progressRef.current;
      // Answers a guest opened are kept too, so the page they're on looks the same after sign-in.
      const revealed = Object.keys(guestProgress.designAttempts).filter((id) => guestProgress.designAttempts[id]?.revealed);
      pendingIntent.current = (actions, progress) => {
        for (const id of revealed) {
          if (!progress.designAttempts[id]?.revealed) actions.updateDesignAttempt(id, { revealed: true });
          if (!progress.design[id]) actions.setDesignStatus(id, "studied");
        }
        intent?.(actions, progress);
      };
      requestSignIn(reason);
    },
    [requestSignIn],
  );

  // Popup dismissed without signing in: forget the pending action.
  useEffect(() => {
    if (!signInPrompt && !user) pendingIntent.current = null;
  }, [signInPrompt, user]);

  useEffect(() => {
    if (!store || state.status !== "ready" || loadedFrom.current !== store || !pendingIntent.current) return;
    const intent = pendingIntent.current;
    pendingIntent.current = null;
    intent(actionsRef.current, progressRef.current);
  }, [store, state.status]);

  // Optimistic update: apply locally, persist, roll back if the save fails.
  const persist = useCallback(
    async (apply, rollback, save) => {
      dispatch(apply);
      dispatch({ type: ProgressActions.SAVE_START });
      try {
        await save();
        dispatch({ type: ProgressActions.SAVE_SUCCESS });
      } catch (err) {
        dispatch(rollback);
        dispatch({ type: ProgressActions.SAVE_ERROR, error: err.message });
      }
    },
    [],
  );

  const toggleSolved = useCallback(
    (problemId) => {
      if (!store) {
        return runAfterSignIn("save your solved problems", (actions, progress) => {
          if (!progress.solved[problemId]) actions.toggleSolved(problemId);
        });
      }
      const previous = progressRef.current.solved[problemId] || null;
      const next = previous ? null : toDayKey();
      persist(
        { type: ProgressActions.SET_SOLVED, problemId, solvedOn: next },
        { type: ProgressActions.SET_SOLVED, problemId, solvedOn: previous },
        () => store.setSolved(problemId, next),
      );
    },
    [persist, store, runAfterSignIn],
  );

  const toggleFlagged = useCallback(
    (problemId) => {
      if (!store) {
        return runAfterSignIn("flag problems to revisit", (actions, progress) => {
          if (!progress.flagged[problemId]) actions.toggleFlagged(problemId);
        });
      }
      const previous = Boolean(progressRef.current.flagged[problemId]);
      persist(
        { type: ProgressActions.SET_FLAGGED, problemId, flagged: !previous },
        { type: ProgressActions.SET_FLAGGED, problemId, flagged: previous },
        () => store.setFlagged(problemId, !previous),
      );
    },
    [persist, store, runAfterSignIn],
  );

  const setDailyGoal = useCallback(
    (goal) => {
      if (!store) return runAfterSignIn("set your daily goal", (actions) => actions.setDailyGoal(goal));
      const previous = progressRef.current.dailyGoal;
      const next = clampGoal(goal);
      if (next === previous) return;
      persist(
        { type: ProgressActions.SET_DAILY_GOAL, dailyGoal: next },
        { type: ProgressActions.SET_DAILY_GOAL, dailyGoal: previous },
        () => store.setDailyGoal(next),
      );
    },
    [persist, store, runAfterSignIn],
  );

  const setDesignStatus = useCallback(
    (questionId, status) => {
      if (!store) {
        return runAfterSignIn("track your system design progress", (actions) => actions.setDesignStatus(questionId, status));
      }
      const previous = progressRef.current.design[questionId] || null;
      const next = status || null;
      if (next === previous) return;
      persist(
        { type: ProgressActions.SET_DESIGN_STATUS, questionId, status: next },
        { type: ProgressActions.SET_DESIGN_STATUS, questionId, status: previous },
        () => store.setDesignStatus(questionId, next),
      );
    },
    [persist, store, runAfterSignIn],
  );

  const saveAttempt = useCallback(
    async (questionId) => {
      clearTimeout(attemptTimers.current[questionId]);
      delete attemptTimers.current[questionId];
      const attempt = pendingAttempts.current[questionId] ?? null;
      const rollbackTo = savedAttempts.current[questionId] ?? null;
      dispatch({ type: ProgressActions.SAVE_START });
      try {
        await store.setDesignAttempt(questionId, attempt);
        savedAttempts.current[questionId] = attempt;
        dispatch({ type: ProgressActions.SAVE_SUCCESS });
      } catch (err) {
        pendingAttempts.current[questionId] = rollbackTo;
        dispatch({ type: ProgressActions.SET_DESIGN_ATTEMPT, questionId, attempt: rollbackTo });
        dispatch({ type: ProgressActions.SAVE_ERROR, error: err.message });
      }
    },
    [store],
  );

  const rememberSaved = (questionId) => {
    if (!(questionId in savedAttempts.current)) {
      savedAttempts.current[questionId] = progressRef.current.designAttempts[questionId] || null;
    }
  };

  /**
   * Merge `patch` into a question's attempt. The UI updates immediately; the save runs now,
   * or after `debounceMs` of quiet (used while typing notes).
   */
  const updateDesignAttempt = useCallback(
    (questionId, patch, { debounceMs = 0 } = {}) => {
      if (!store) {
        const current = progressRef.current.designAttempts[questionId] || null;
        // Opening or hiding the model answer is just viewing: guests can do it without an account.
        if (Object.keys(patch).every((key) => key === "revealed")) {
          const next = patch.revealed ? normalizeAttempt({ ...(current || EMPTY_ATTEMPT), revealed: true }) : null;
          dispatch({ type: ProgressActions.SET_DESIGN_ATTEMPT, questionId, attempt: next });
          return;
        }
        return runAfterSignIn("save your self-check", (actions, progress) => {
          const saved = progress.designAttempts[questionId];
          const merged = { ...patch };
          if (patch.covered) merged.covered = [...new Set([...(saved?.covered ?? []), ...patch.covered])];
          actions.updateDesignAttempt(questionId, merged);
        });
      }
      rememberSaved(questionId);
      const base =
        questionId in pendingAttempts.current
          ? pendingAttempts.current[questionId]
          : progressRef.current.designAttempts[questionId] || null;
      const next = normalizeAttempt({ ...(base || EMPTY_ATTEMPT), ...patch });
      pendingAttempts.current[questionId] = next;
      dispatch({ type: ProgressActions.SET_DESIGN_ATTEMPT, questionId, attempt: next });

      clearTimeout(attemptTimers.current[questionId]);
      if (debounceMs > 0) attemptTimers.current[questionId] = setTimeout(() => saveAttempt(questionId), debounceMs);
      else saveAttempt(questionId);
    },
    [saveAttempt, store, runAfterSignIn],
  );

  // Save immediately if a debounced save is waiting (e.g. when the notes box loses focus).
  const flushDesignAttempt = useCallback(
    (questionId) => {
      if (attemptTimers.current[questionId]) saveAttempt(questionId);
    },
    [saveAttempt],
  );

  // Clear notes, ticks and the reveal so the student can attempt the question again from scratch.
  const resetDesignAttempt = useCallback(
    (questionId) => {
      if (!store) {
        dispatch({ type: ProgressActions.SET_DESIGN_ATTEMPT, questionId, attempt: null });
        return;
      }
      rememberSaved(questionId);
      pendingAttempts.current[questionId] = null;
      dispatch({ type: ProgressActions.SET_DESIGN_ATTEMPT, questionId, attempt: null });
      saveAttempt(questionId);
    },
    [saveAttempt, store],
  );

  // Don't lose typed notes if the tab is hidden or closed mid-debounce.
  useEffect(() => {
    const flushAll = () => Object.keys(attemptTimers.current).forEach((id) => saveAttempt(id));
    const onVisibility = () => document.visibilityState === "hidden" && flushAll();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushAll);
    };
  }, [saveAttempt]);

  const dismissSaveError = useCallback(() => dispatch({ type: ProgressActions.DISMISS_SAVE_ERROR }), []);

  const actions = useMemo(
    () => ({
      toggleSolved,
      toggleFlagged,
      setDailyGoal,
      setDesignStatus,
      updateDesignAttempt,
      flushDesignAttempt,
      resetDesignAttempt,
      runAfterSignIn,
      reload: load,
      dismissSaveError,
    }),
    [
      toggleSolved,
      toggleFlagged,
      setDailyGoal,
      setDesignStatus,
      updateDesignAttempt,
      flushDesignAttempt,
      resetDesignAttempt,
      runAfterSignIn,
      load,
      dismissSaveError,
    ],
  );
  actionsRef.current = actions;

  return (
    <ProgressActionsContext.Provider value={actions}>
      <ProgressStateContext.Provider value={state}>{children}</ProgressStateContext.Provider>
    </ProgressActionsContext.Provider>
  );
}

export function useProgressState() {
  const ctx = useContext(ProgressStateContext);
  if (!ctx) throw new Error("useProgressState must be used inside <ProgressProvider>");
  return ctx;
}

export function useProgressActions() {
  const ctx = useContext(ProgressActionsContext);
  if (!ctx) throw new Error("useProgressActions must be used inside <ProgressProvider>");
  return ctx;
}
