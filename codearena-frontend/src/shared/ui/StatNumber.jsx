import styles from "./StatNumber.module.css";

// Big headline number: "42 / 200" with a caption underneath.
export function StatNumber({ value, of, caption, size = "lg" }) {
  return (
    <p className={`${styles.stat} ${styles[size]}`}>
      <span className={styles.value}>
        {value}
        {of !== undefined && <span className={styles.of}> / {of}</span>}
      </span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </p>
  );
}
