import { memo } from "react";
import { leetcodeUrl } from "@/features/dsa/data/problems";
import { DifficultyBadge, FlagIcon, IconButton, Tag } from "@/shared/ui";
import styles from "./ProblemRow.module.css";

// Memoised: with 200 rows, only the row whose props changed re-renders on a toggle.
export const ProblemRow = memo(function ProblemRow({ problem, solvedOn, flagged, onToggleSolved, onToggleFlagged }) {
  const checkboxId = `solved-${problem.id}`;

  return (
    <li className={`${styles.row} ${solvedOn ? styles.solved : ""}`}>
      <input
        id={checkboxId}
        type="checkbox"
        className={styles.checkbox}
        checked={Boolean(solvedOn)}
        onChange={() => onToggleSolved(problem.id)}
        aria-label={`Mark ${problem.title} as solved`}
        title={solvedOn ? `Solved on ${solvedOn}` : undefined}
      />
      <span className={styles.number}>#{problem.number}</span>
      <span className={styles.title}>
        <a href={leetcodeUrl(problem.id)} target="_blank" rel="noopener noreferrer">
          {problem.title}
        </a>
        {problem.core && <Tag title="Do these first">Core</Tag>}
      </span>
      <DifficultyBadge difficulty={problem.difficulty} />
      <IconButton
        tone="flag"
        label={flagged ? `Remove redo flag from ${problem.title}` : `Flag ${problem.title} to redo`}
        pressed={flagged}
        onClick={() => onToggleFlagged(problem.id)}
      >
        <FlagIcon />
      </IconButton>
    </li>
  );
});
