import { DIFFICULTIES } from "@/features/dsa/data/problems";
import { shiftDay } from "@/shared/utils/dates";

export function overallStats(problems, progress) {
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { total: 0, solved: 0 }]));
  let solved = 0;
  let coreTotal = 0;
  let coreSolved = 0;

  for (const problem of problems) {
    const isSolved = Boolean(progress.solved[problem.id]);
    byDifficulty[problem.difficulty].total += 1;
    if (isSolved) {
      solved += 1;
      byDifficulty[problem.difficulty].solved += 1;
    }
    if (problem.core) {
      coreTotal += 1;
      if (isSolved) coreSolved += 1;
    }
  }

  return {
    total: problems.length,
    solved,
    remaining: problems.length - solved,
    byDifficulty,
    core: { total: coreTotal, solved: coreSolved },
    flagged: Object.keys(progress.flagged).length,
  };
}

export const topicSolvedCount = (topic, progress) =>
  topic.problems.reduce((n, p) => n + (progress.solved[p.id] ? 1 : 0), 0);

export function solvedCountByDay(progress) {
  const counts = {};
  for (const day of Object.values(progress.solved)) counts[day] = (counts[day] || 0) + 1;
  return counts;
}

// Consecutive days with at least one solve, ending today (or yesterday, so the streak
// isn't shown as broken before the user has had a chance to practise today).
export function currentStreak(countsByDay, today) {
  let day = countsByDay[today] ? today : shiftDay(today, -1);
  let streak = 0;
  while (countsByDay[day]) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
}

// The last `days` days, oldest first, for the activity strip.
export function recentActivity(countsByDay, today, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const day = shiftDay(today, i - days + 1);
    return { day, count: countsByDay[day] || 0 };
  });
}
