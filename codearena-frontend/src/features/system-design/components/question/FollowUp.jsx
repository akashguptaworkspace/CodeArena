import { useState } from "react";
import { Button, Card } from "@/shared/ui";
import styles from "./FollowUp.module.css";

// The interviewer's follow-up, plus actions to hide the answer or start over.
export function FollowUp({ twist, onHide, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Card as="section" className={styles.card} aria-labelledby="followup-heading">
      <p className={styles.eyebrow}>Interviewer's follow-up</p>
      <h2 id="followup-heading" className={styles.twist}>
        {twist}
      </h2>
      <p className={styles.hint}>Add your answer to your notes, then check it against the decisions above.</p>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onHide}>
          Hide answer
        </Button>
        {confirmReset ? (
          <span className={styles.confirm}>
            Clear your notes and ticks?
            <Button variant="secondary" size="sm" onClick={onReset}>
              Yes, start fresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            Start a fresh attempt
          </Button>
        )}
      </div>
    </Card>
  );
}
