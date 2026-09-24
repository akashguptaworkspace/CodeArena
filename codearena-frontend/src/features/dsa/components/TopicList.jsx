import { Stack } from "@/shared/layout/Stack";
import { EmptyState } from "@/shared/ui";
import { TopicSection } from "./TopicSection";

export function TopicList({ topics, onClearFilters }) {
  if (topics.length === 0) {
    return <EmptyState message="No problems match these filters." actionLabel="Clear filters" onAction={onClearFilters} />;
  }

  return (
    <Stack gap="section">
      {topics.map((topic) => (
        <TopicSection key={topic.id} topic={topic} />
      ))}
    </Stack>
  );
}
