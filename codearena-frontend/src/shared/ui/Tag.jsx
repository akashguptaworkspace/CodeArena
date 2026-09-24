import styles from "./Tag.module.css";

export function Tag({ children, title }) {
  return (
    <span className={styles.tag} title={title}>
      {children}
    </span>
  );
}
