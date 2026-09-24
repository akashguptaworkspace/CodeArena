import styles from "./LoadingState.module.css";

export function LoadingState({ message = "Loading…" }) {
  return (
    <p className={styles.loading} role="status">
      {message}
    </p>
  );
}
