import styles from "./FlowDiagram.module.css";

/**
 * Numbered step-by-step flow: who calls whom and what happens.
 * steps: [[from, to, description], ...]
 */
export function FlowDiagram({ steps, label = "Flow" }) {
  return (
    <ol className={styles.flow} aria-label={label}>
      {steps.map(([from, to, description], i) => (
        <li key={i} className={styles.step}>
          <span className={styles.index} aria-hidden="true">
            {i + 1}
          </span>
          <div className={styles.body}>
            <p className={styles.actors}>
              <span className={styles.actor}>{from}</span>
              <span className={styles.arrow} aria-label="to">
                →
              </span>
              <span className={styles.actor}>{to}</span>
            </p>
            <p className={styles.description}>{description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
