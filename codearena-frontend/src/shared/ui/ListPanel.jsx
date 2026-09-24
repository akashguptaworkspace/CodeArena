import styles from "./ListPanel.module.css";

// Bordered list of rows (problems, questions). Rows are <li> children and get dividers automatically.
export function ListPanel({ children, className = "" }) {
  return <ul className={`${styles.panel} ${className}`}>{children}</ul>;
}
