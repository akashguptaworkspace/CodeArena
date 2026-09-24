import { Card } from "@/shared/ui";
import styles from "./ProblemStatement.module.css";

// Only what an interviewer would say up front: the situation, what it must do, and the limits.
export function ProblemStatement({ question, track }) {
  return (
    <Card size="lg" as="section" className={styles.card} aria-labelledby="problem-heading">
      <h2 id="problem-heading" className={styles.heading}>
        The problem
      </h2>
      <p className={styles.scenario}>{question.scenario}</p>
      <div className={styles.columns}>
        <div>
          <h3 className={styles.label}>It must</h3>
          <ul className={styles.list}>
            {question.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.label}>{track.constraintsLabel}</h3>
          <ul className={styles.list}>
            {question.constraints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
