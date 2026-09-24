import { useProgressActions } from "@/features/progress/ProgressContext";
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from "@/features/progress/progressModel";
import { Card, IconButton, MinusIcon, PlusIcon, ProgressBar } from "@/shared/ui";
import styles from "./DailyGoalCard.module.css";

const formatDay = (dayKey) =>
  new Date(`${dayKey}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export function DailyGoalCard({ today, streak, activity }) {
  const { setDailyGoal } = useProgressActions();
  const met = today.solved >= today.goal;
  const maxCount = Math.max(1, ...activity.map((a) => a.count));

  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Today</h2>
        <div className={styles.goal}>
          <span className={styles.goalLabel}>Daily goal</span>
          <IconButton
            label="Lower daily goal"
            onClick={() => setDailyGoal(today.goal - 1)}
            disabled={today.goal <= MIN_DAILY_GOAL}
          >
            <MinusIcon />
          </IconButton>
          <span className={styles.goalValue} aria-live="polite">
            {today.goal}
          </span>
          <IconButton
            label="Raise daily goal"
            onClick={() => setDailyGoal(today.goal + 1)}
            disabled={today.goal >= MAX_DAILY_GOAL}
          >
            <PlusIcon />
          </IconButton>
        </div>
      </div>

      <p className={styles.count}>
        {today.solved}
        <small> / {today.goal} solved</small>
      </p>
      <ProgressBar
        total={today.goal}
        label={`${today.solved} of ${today.goal} solved today`}
        segments={[{ value: Math.min(today.solved, today.goal), color: met ? "var(--easy)" : "var(--accent)" }]}
      />
      <p className={styles.note}>
        {met ? "Goal met for today." : `${today.goal - today.solved} more to hit today's goal.`}{" "}
        {streak > 0 ? (
          <strong>
            {streak}-day streak
          </strong>
        ) : (
          "Solve one today to start a streak."
        )}
      </p>

      <div className={styles.activity} aria-label="Problems solved in the last 14 days">
        {activity.map((a) => (
          <span
            key={a.day}
            className={styles.cell}
            style={{ "--level": a.count === 0 ? 0 : 0.25 + (a.count / maxCount) * 0.75 }}
            title={`${formatDay(a.day)}: ${a.count} solved`}
          />
        ))}
      </div>
      <p className={styles.caption}>Last 14 days</p>
    </Card>
  );
}
