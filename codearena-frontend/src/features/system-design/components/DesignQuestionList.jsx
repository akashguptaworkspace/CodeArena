import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { categoryAnchor } from "@/features/system-design/utils/designFilters";
import { Stack } from "@/shared/layout/Stack";
import { EmptyState, ListPanel, SectionHeader } from "@/shared/ui";
import { DesignQuestionRow } from "./DesignQuestionRow";
import styles from "./DesignQuestionList.module.css";

export function DesignQuestionList({ trackId, groups, totalsByCategory, onClearFilters }) {
  const { progress } = useProgressState();
  const { setDesignStatus } = useProgressActions();

  if (groups.length === 0) {
    return <EmptyState message="No questions match these filters." actionLabel="Clear filters" onAction={onClearFilters} />;
  }

  return (
    <Stack gap="section">
      {groups.map((group) => {
        const anchor = categoryAnchor(trackId, group.category);
        const totals = totalsByCategory[group.category];
        return (
          <section key={group.category} id={anchor} className={styles.group} aria-labelledby={`${anchor}-h`}>
            <SectionHeader id={`${anchor}-h`} title={group.category} meta={`${totals.counts.ready} / ${totals.total} ready`} />
            <ListPanel>
              {group.items.map((q) => (
                <DesignQuestionRow
                  key={q.id}
                  question={q}
                  status={progress.design[q.id] || null}
                  attempt={progress.designAttempts[q.id] || null}
                  onStatusChange={setDesignStatus}
                />
              ))}
            </ListPanel>
          </section>
        );
      })}
    </Stack>
  );
}
