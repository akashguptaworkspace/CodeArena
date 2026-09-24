import { useAuth } from "@/features/auth/AuthContext";
import { useProgressState } from "@/features/progress/ProgressContext";
import styles from "./SaveStatus.module.css";

// `compact` shows a short label for the phone top bar; the full text stays available to screen readers.
export function SaveStatus({ compact = false }) {
  const { isRemote } = useAuth();
  const { pendingSaves, saveError } = useProgressState();

  let tone = "saved";
  let text = isRemote ? "Saved to your account" : "Saved in this browser";
  let short = "Saved";
  if (pendingSaves > 0) {
    tone = "saving";
    text = short = "Saving…";
  } else if (saveError) {
    tone = "error";
    text = "Last change not saved";
    short = "Not saved";
  }

  return (
    <span className={styles.status} data-tone={tone} role="status" title={text}>
      {compact ? (
        <>
          <span aria-hidden="true">{short}</span>
          <span className="visually-hidden">{text}</span>
        </>
      ) : (
        text
      )}
    </span>
  );
}
