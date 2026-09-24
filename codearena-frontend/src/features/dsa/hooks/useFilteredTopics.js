import { useMemo } from "react";
import { TOPICS } from "@/features/dsa/data/problems";
import { useProgressState } from "@/features/progress/ProgressContext";
import { matchesFilters } from "@/features/dsa/utils/filters";
import { topicSolvedCount } from "@/features/dsa/utils/stats";

// Topics with only the problems that pass the current filters; empty topics are dropped.
export function useFilteredTopics(filters) {
  const { progress } = useProgressState();

  return useMemo(
    () =>
      TOPICS.map((topic) => ({
        ...topic,
        solvedCount: topicSolvedCount(topic, progress),
        visibleProblems: topic.problems.filter((p) => matchesFilters(p, filters, progress)),
      })).filter((topic) => topic.visibleProblems.length > 0),
    [filters, progress],
  );
}
