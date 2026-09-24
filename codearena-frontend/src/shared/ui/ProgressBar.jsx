import styles from "./ProgressBar.module.css";

/**
 * Stacked horizontal bar.
 * segments: [{ value, color }] — widths are value / total.
 */
export function ProgressBar({ segments, total, label, size = "md" }) {
  const safeTotal = total > 0 ? total : 1;
  return (
    <div className={`${styles.track} ${styles[size]}`} role="img" aria-label={label}>
      {segments.map((segment, i) => (
        <span
          key={i}
          className={styles.fill}
          style={{ width: `${(segment.value / safeTotal) * 100}%`, background: segment.color }}
        />
      ))}
    </div>
  );
}
