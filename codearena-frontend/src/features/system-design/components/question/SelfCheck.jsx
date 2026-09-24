import { attemptScore } from "@/features/system-design/utils/attemptScore";
import { Button, Card, ProgressBar } from "@/shared/ui";
import styles from "./SelfCheck.module.css";

const TONE_COLORS = { easy: "var(--easy)", medium: "var(--medium)", hard: "var(--hard)" };

function verdict(percent) {
  if (percent >= 80) return "Strong answer. Redo it from scratch in a few days to make it interview-ready.";
  if (percent >= 50) return "Good start. Study the points you missed, then try again in a couple of days.";
  return "Study the model answer carefully, then attempt this question again from a blank page.";
}

// Student ticks which key points their own design covered; the score shows how close they were.
export function SelfCheck({ question, attempt, status, onToggle, onMarkPractised, noun = "design" }) {
  const covered = new Set(attempt?.covered ?? []);
  const score = attemptScore(question, attempt);
  const canSuggestPractised = score.percent >= 50 && (!status || status === "studied");

  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="check-heading">
      <div className={styles.head}>
        <div>
          <h2 id="check-heading" className={styles.heading}>
            How close were you?
          </h2>
          <p className={styles.sub}>Tick each key point your own {noun} covered.</p>
        </div>
        <p className={styles.score} style={{ "--c": TONE_COLORS[score.tone] }}>
          <span className={styles.percent}>{score.percent}%</span>
          <span className={styles.fraction}>
            {score.covered} / {score.total} covered
          </span>
        </p>
      </div>

      <ProgressBar
        total={score.total}
        label={`${score.covered} of ${score.total} key points covered`}
        segments={[{ value: score.covered, color: TONE_COLORS[score.tone] }]}
      />

      <ul className={styles.list}>
        {question.rubric.map((point, i) => {
          const id = `rubric-${question.id}-${i}`;
          return (
            <li key={i}>
              <label htmlFor={id} className={`${styles.item} ${covered.has(i) ? styles.checked : ""}`}>
                <input id={id} type="checkbox" checked={covered.has(i)} onChange={() => onToggle(i)} />
                <span>{point}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {score.covered > 0 && (
        <div className={styles.footer}>
          <p className={styles.verdict}>{verdict(score.percent)}</p>
          {canSuggestPractised && (
            <Button variant="secondary" size="sm" onClick={onMarkPractised}>
              Mark as Practised
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
