import { Card, ProgressBar, StatNumber } from "@/shared/ui";
import styles from "./OverallProgress.module.css";

const DIFFICULTY_COLORS = { Easy: "var(--easy)", Medium: "var(--medium)", Hard: "var(--hard)" };

export function OverallProgress({ overall, dailyGoal }) {
  const { solved, total, remaining, byDifficulty, core, flagged } = overall;
  const days = Math.ceil(remaining / dailyGoal);

  return (
    <Card className={styles.card}>
      <h2 className="visually-hidden">Overall progress</h2>
      <StatNumber value={solved} of={total} caption="problems solved" />
      <div className={styles.detail}>
        <ProgressBar
          total={total}
          label={`${solved} of ${total} solved`}
          segments={Object.entries(byDifficulty).map(([d, s]) => ({ value: s.solved, color: DIFFICULTY_COLORS[d] }))}
        />
        <dl className={styles.legend}>
          {Object.entries(byDifficulty).map(([d, s]) => (
            <div key={d} style={{ "--c": DIFFICULTY_COLORS[d] }}>
              <dt>{d}</dt>
              <dd>
                {s.solved}/{s.total}
              </dd>
            </div>
          ))}
          <div>
            <dt>Core</dt>
            <dd>
              {core.solved}/{core.total}
            </dd>
          </div>
          <div>
            <dt>Flagged</dt>
            <dd>{flagged}</dd>
          </div>
        </dl>
        <p className={styles.pace}>
          {remaining > 0 ? (
            <>
              <strong>{remaining} left</strong> · about {days} {days === 1 ? "day" : "days"} at {dailyGoal} a day
            </>
          ) : (
            <>
              <strong>All {total} done.</strong> Redo your flagged problems and start mock interviews.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
