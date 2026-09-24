import { useMemo } from "react";
import { DESIGN_STATUSES } from "@/features/system-design/data/systemDesign";
import { useProgressState } from "@/features/progress/ProgressContext";
import { groupByCategory, matchesDesignFilters } from "@/features/system-design/utils/designFilters";

const emptyCounts = () => Object.fromEntries(DESIGN_STATUSES.map((s) => [s.value, 0]));

function countStatuses(questions, design) {
  const counts = emptyCounts();
  for (const q of questions) {
    const status = design[q.id];
    if (status) counts[status] += 1;
  }
  return counts;
}

// Everything the System Design page needs for one track (HLD or LLD).
export function useDesignTrack(track, filters) {
  const { progress } = useProgressState();
  const { design } = progress;

  return useMemo(() => {
    const all = track.questions;
    const core = all.filter((q) => q.core);
    const nextUp = core.find((q) => design[q.id] !== "ready") || all.find((q) => design[q.id] !== "ready") || null;

    return {
      total: all.length,
      counts: countStatuses(all, design),
      core: { total: core.length, ready: core.filter((q) => design[q.id] === "ready").length },
      nextUp,
      categories: groupByCategory(all).map((group) => ({
        category: group.category,
        total: group.items.length,
        counts: countStatuses(group.items, design),
      })),
      visibleGroups: groupByCategory(all.filter((q) => matchesDesignFilters(q, filters, design))),
    };
  }, [track, filters, design]);
}
