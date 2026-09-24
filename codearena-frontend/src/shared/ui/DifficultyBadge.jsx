import { Badge } from "./Badge";

const TONES = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
  Beginner: "easy",
  Intermediate: "medium",
  Advanced: "hard",
};

// Works for DSA difficulty (Easy/Medium/Hard) and design level (Beginner/Intermediate/Advanced).
export function DifficultyBadge({ difficulty }) {
  return <Badge tone={TONES[difficulty] || "neutral"}>{difficulty}</Badge>;
}
