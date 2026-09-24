import { ProgressBar } from "./ProgressBar";
import styles from "./ProgressTileGrid.module.css";

/**
 * Grid of small linked tiles, each with a count and a bar.
 * items: [{ id, title, done, total, href, segments? }]
 * `segments` overrides the default single bar (for multi-stage progress).
 */
export function ProgressTileGrid({ items, label }) {
  return (
    <nav className={styles.grid} aria-label={label}>
      {items.map((item) => {
        const complete = item.done === item.total;
        return (
          <a key={item.id} href={item.href} className={styles.item}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.count}>
              {item.done} / {item.total}
            </span>
            <ProgressBar
              size="sm"
              total={item.total}
              label={`${item.title}: ${item.done} of ${item.total}`}
              segments={item.segments || [{ value: item.done, color: complete ? "var(--easy)" : "var(--accent)" }]}
            />
          </a>
        );
      })}
    </nav>
  );
}
