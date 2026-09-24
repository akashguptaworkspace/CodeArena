import { useMemo } from "react";
import { ALL_PROBLEMS } from "@/features/dsa/data/problems";
import { useProgressState } from "@/features/progress/ProgressContext";
import { HLD_BASE, LLD_BASE } from "@/features/system-design/data/catalog";

const DESIGN_QUESTIONS = [...HLD_BASE, ...LLD_BASE];

// Headline progress for each live module, keyed by module id.
export function useModuleProgress() {
  const { progress } = useProgressState();

  return useMemo(
    () => ({
      dsa: {
        done: ALL_PROBLEMS.filter((p) => progress.solved[p.id]).length,
        total: ALL_PROBLEMS.length,
        label: "solved",
      },
      "system-design": {
        done: DESIGN_QUESTIONS.filter((q) => progress.design[q.id] === "ready").length,
        total: DESIGN_QUESTIONS.length,
        label: "interview-ready",
      },
    }),
    [progress],
  );
}
