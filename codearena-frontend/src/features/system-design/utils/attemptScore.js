// How much of the model answer's key points the student says they covered.
export function attemptScore(question, attempt) {
  const total = question.rubric.length;
  const covered = attempt?.covered?.filter((i) => i >= 0 && i < total).length ?? 0;
  const percent = total ? Math.round((covered / total) * 100) : 0;
  const tone = percent >= 80 ? "easy" : percent >= 50 ? "medium" : "hard";
  return { covered, total, percent, tone };
}

export const STATUS_OPTIONS = (statuses) => [
  { value: "", label: "Not started" },
  ...statuses.map(({ value, label }) => ({ value, label })),
];
