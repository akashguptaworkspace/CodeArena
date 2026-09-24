import styles from "./PageIntro.module.css";

// Page heading block: small eyebrow, big title, short explanation.
export function PageIntro({ eyebrow, title, children }) {
  return (
    <header className={styles.intro}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={styles.title}>{title}</h1>
      {children && <div className={styles.lede}>{children}</div>}
    </header>
  );
}
