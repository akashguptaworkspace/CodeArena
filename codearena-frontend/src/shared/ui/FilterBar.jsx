import styles from "./FilterBar.module.css";

// Sticky row of filter controls above a list. The last child stretches to fill the row.
export function FilterBar({ children }) {
  return <div className={styles.toolbar}>{children}</div>;
}
