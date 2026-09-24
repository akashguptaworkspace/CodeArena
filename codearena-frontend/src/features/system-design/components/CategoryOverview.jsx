import { categoryAnchor } from "@/features/system-design/utils/designFilters";
import { ProgressTileGrid } from "@/shared/ui";
import { statusSegments } from "./statusStyles";

export function CategoryOverview({ trackId, categories }) {
  const items = categories.map((c) => ({
    id: c.category,
    title: c.category,
    href: `#${categoryAnchor(trackId, c.category)}`,
    done: c.counts.ready,
    total: c.total,
    segments: statusSegments(c.counts),
  }));
  return <ProgressTileGrid items={items} label="Categories" />;
}
