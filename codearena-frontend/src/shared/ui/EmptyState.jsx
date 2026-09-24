import { Button } from "./Button";
import styles from "./EmptyState.module.css";

export function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className={styles.empty}>
      <p>{message}</p>
      {actionLabel && (
        <Button variant="link" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
