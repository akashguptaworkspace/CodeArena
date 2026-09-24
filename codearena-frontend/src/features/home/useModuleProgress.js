import { useMemo } from "react";
import { ALL_PROBLEMS } from "@/features/dsa/data/problems";
import { GENAI_TASKS } from "@/features/genai/data/plan";
import { NODE_BASE } from "@/features/nodejs/data/catalog";
import { useProgressState } from "@/features/progress/ProgressContext";
import { SQL_CONCEPT_BASE, SQL_QUERY_BASE } from "@/features/sql/data/catalog";
import { HLD_BASE, LLD_BASE } from "@/features/system-design/data/catalog";

const DESIGN_QUESTIONS = [...HLD_BASE, ...LLD_BASE];
const SQL_QUESTIONS = [...SQL_QUERY_BASE, ...SQL_CONCEPT_BASE];

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
      nodejs: {
        done: NODE_BASE.filter((q) => progress.design[q.id] === "ready").length,
        total: NODE_BASE.length,
        label: "interview-ready",
      },
      sql: {
        done: SQL_QUESTIONS.filter((q) => progress.design[q.id] === "ready").length,
        total: SQL_QUESTIONS.length,
        label: "interview-ready",
      },
      genai: {
        done: GENAI_TASKS.filter((t) => progress.design[t.id] === "ready").length,
        total: GENAI_TASKS.length,
        label: "tasks done",
      },
    }),
    [progress],
  );
}
