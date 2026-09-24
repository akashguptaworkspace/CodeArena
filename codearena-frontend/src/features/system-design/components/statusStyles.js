// One colour per design stage, shared by bars, legends and the status select.
export const STATUS_COLORS = {
  studied: "var(--medium)",
  practised: "var(--accent)",
  ready: "var(--easy)",
};

export const statusSegments = (counts) => [
  { value: counts.ready, color: STATUS_COLORS.ready },
  { value: counts.practised, color: STATUS_COLORS.practised },
  { value: counts.studied, color: STATUS_COLORS.studied },
];
