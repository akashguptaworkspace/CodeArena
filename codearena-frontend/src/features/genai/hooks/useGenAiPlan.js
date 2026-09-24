import { useCallback, useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { GENAI_DAYS, GENAI_TASKS } from "@/features/genai/data/plan";

// A task counts as done when its entry in `progress.design` is "ready" (same storage as the other modules).
export const isTaskDone = (progress, taskId) => progress.design[taskId] === "ready";

export function useGenAiPlan() {
  const { progress } = useProgressState();
  const { setDesignStatus, runAfterSignIn } = useProgressActions();
  const { user } = useAuth();

  const stats = useMemo(() => {
    const done = GENAI_TASKS.filter((t) => isTaskDone(progress, t.id)).length;
    const days = GENAI_DAYS.map((day) => {
      const tasks = [...day.learn, ...day.build];
      const doneCount = tasks.filter((t) => isTaskDone(progress, t.id)).length;
      return { id: day.id, done: doneCount, total: tasks.length, complete: doneCount === tasks.length };
    });
    const byDay = Object.fromEntries(days.map((d) => [d.id, d]));
    const nextDay = GENAI_DAYS.find((d) => !byDay[d.id].complete) || null;
    return {
      done,
      total: GENAI_TASKS.length,
      daysComplete: days.filter((d) => d.complete).length,
      byDay,
      nextDay,
    };
  }, [progress]);

  const toggleTask = useCallback(
    (taskId) => {
      if (!user) {
        return runAfterSignIn("save your GenAI plan progress", (actions, saved) => {
          if (!isTaskDone(saved, taskId)) actions.setDesignStatus(taskId, "ready");
        });
      }
      setDesignStatus(taskId, isTaskDone(progress, taskId) ? null : "ready");
    },
    [user, progress, setDesignStatus, runAfterSignIn],
  );

  return { progress, stats, toggleTask };
}
