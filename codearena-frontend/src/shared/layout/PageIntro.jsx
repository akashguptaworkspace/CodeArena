import styles from "./PageIntro.module.css";

// Page heading block: small eyebrow, big title, short explanation.
// `actions` (optional) sits to the right of the title, e.g. share buttons.
export function PageIntro({ eyebrow, title, actions, children }) {
  return (
    <header className={styles.intro}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      {actions ? (
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.actions}>{actions}</div>
        </div>
      ) : (
        <h1 className={styles.title}>{title}</h1>
      )}
      {children && <div className={styles.lede}>{children}</div>}
    </header>
  );
}
