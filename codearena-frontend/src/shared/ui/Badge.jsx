import styles from "./Badge.module.css";

// Small coloured label. tone: easy | medium | hard | neutral
export function Badge({ tone = "neutral", children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
