import styles from "./PageContainer.module.css";

// Centred content column with the page gutter. `narrow` is for single forms (sign-in).
export function PageContainer({ children, narrow = false }) {
  return <div className={`${styles.container} ${narrow ? styles.narrow : ""}`}>{children}</div>;
}
