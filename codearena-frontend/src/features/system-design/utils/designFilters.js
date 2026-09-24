export const DESIGN_VIEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "core", label: "Core" },
  { value: "notReady", label: "Not ready" },
  { value: "ready", label: "Ready" },
];

export const LEVEL_OPTIONS = [
  { value: "all", label: "Any level" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

export const DEFAULT_DESIGN_FILTERS = { view: "all", level: "all", query: "" };

export function matchesDesignFilters(question, filters, design) {
  if (filters.level !== "all" && question.level !== filters.level) return false;

  const status = design[question.id];
  if (filters.view === "core" && !question.core) return false;
  if (filters.view === "notReady" && status === "ready") return false;
  if (filters.view === "ready" && status !== "ready") return false;

  const q = filters.query.trim().toLowerCase();
  if (q) {
    return (
      question.title.toLowerCase().includes(q) ||
      question.category.toLowerCase().includes(q) ||
      question.scenario.toLowerCase().includes(q)
    );
  }
  return true;
}

// Preserve the data file's order while grouping into categories.
export function groupByCategory(questions) {
  const groups = new Map();
  for (const question of questions) {
    if (!groups.has(question.category)) groups.set(question.category, []);
    groups.get(question.category).push(question);
  }
  return [...groups].map(([category, items]) => ({ category, items }));
}

export const categoryAnchor = (track, category) =>
  `${track}-${category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-")}`;
