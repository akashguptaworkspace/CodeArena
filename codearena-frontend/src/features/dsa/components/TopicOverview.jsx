import { TOPICS } from "@/features/dsa/data/problems";
import { useProgressState } from "@/features/progress/ProgressContext";
import { topicSolvedCount } from "@/features/dsa/utils/stats";
import { ProgressTileGrid } from "@/shared/ui";

export function TopicOverview() {
  const { progress } = useProgressState();

  const items = TOPICS.map((topic) => ({
    id: topic.id,
    title: topic.title,
    href: `#${topic.id}`,
    done: topicSolvedCount(topic, progress),
    total: topic.problems.length,
  }));

  return <ProgressTileGrid items={items} label="Topics" />;
}
