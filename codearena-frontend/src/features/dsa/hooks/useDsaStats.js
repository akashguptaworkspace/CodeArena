import { useMemo } from "react";
import { ALL_PROBLEMS } from "@/features/dsa/data/problems";
import { useProgressState } from "@/features/progress/ProgressContext";
import { currentStreak, overallStats, recentActivity, solvedCountByDay } from "@/features/dsa/utils/stats";
import { useToday } from "@/shared/hooks/useToday";

export function useDsaStats() {
  const { progress } = useProgressState();
  const today = useToday();

  return useMemo(() => {
    const countsByDay = solvedCountByDay(progress);
    return {
      overall: overallStats(ALL_PROBLEMS, progress),
      today: {
        day: today,
        solved: countsByDay[today] || 0,
        goal: progress.dailyGoal,
      },
      streak: currentStreak(countsByDay, today),
      activity: recentActivity(countsByDay, today, 14),
    };
  }, [progress, today]);
}
