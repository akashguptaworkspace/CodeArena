import { useState } from "react";
import { Button, Card } from "@/shared/ui";
import styles from "./RevealGate.module.css";

// Encourages an attempt first, but never blocks: an empty attempt gets a gentle confirm step.
const DEFAULT_HINT =
  "Reveal the model answer to compare: components, the step-by-step flow and the key decisions. Then tick what you covered to get your score.";

export function RevealGate({ hasNotes, onReveal, noun = "design", hint = DEFAULT_HINT }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <Card variant="dashed" className={styles.gate}>
        <p className={styles.title}>You haven't written {noun === "answer" ? "an" : "a"} {noun} yet</p>
        <p className={styles.text}>
          You'll learn much more by trying first, even for 10 minutes. Reveal the answer anyway?
        </p>
        <div className={styles.actions}>
          <Button onClick={onReveal}>Reveal anyway</Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            I'll try first
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="dashed" className={styles.gate}>
      <p className={styles.title}>Done with your {noun}?</p>
      <p className={styles.text}>{hint}</p>
      <div className={styles.actions}>
        <Button onClick={() => (hasNotes ? onReveal() : setConfirming(true))}>Reveal model answer</Button>
      </div>
    </Card>
  );
}
