import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { ListPanel, SectionHeader } from "@/shared/ui";
import { ProblemRow } from "./ProblemRow";
import styles from "./TopicSection.module.css";

export function TopicSection({ topic }) {
  const { progress } = useProgressState();
  const { toggleSolved, toggleFlagged } = useProgressActions();

  return (
    <section id={topic.id} className={styles.section} aria-labelledby={`${topic.id}-heading`}>
      <SectionHeader
        id={`${topic.id}-heading`}
        title={topic.title}
        meta={`${topic.solvedCount} / ${topic.problems.length} solved`}
        description={topic.tip}
      />
      <ListPanel>
        {topic.visibleProblems.map((problem) => (
          <ProblemRow
            key={problem.id}
            problem={problem}
            solvedOn={progress.solved[problem.id] || null}
            flagged={Boolean(progress.flagged[problem.id])}
            onToggleSolved={toggleSolved}
            onToggleFlagged={toggleFlagged}
          />
        ))}
      </ListPanel>
    </section>
  );
}
