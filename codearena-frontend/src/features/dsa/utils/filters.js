export const VIEW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "core", label: "Core" },
  { value: "unsolved", label: "Unsolved" },
  { value: "flagged", label: "Flagged" },
];

export const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

export const DEFAULT_FILTERS = { view: "all", difficulty: "all", query: "" };

export function matchesFilters(problem, filters, progress) {
  if (filters.difficulty !== "all" && problem.difficulty !== filters.difficulty) return false;

  switch (filters.view) {
    case "core":
      if (!problem.core) return false;
      break;
    case "unsolved":
      if (progress.solved[problem.id]) return false;
      break;
    case "flagged":
      if (!progress.flagged[problem.id]) return false;
      break;
    default:
      break;
  }

  const q = filters.query.trim().toLowerCase();
  if (q) {
    return problem.title.toLowerCase().includes(q) || String(problem.number) === q.replace(/^#/, "");
  }
  return true;
}
