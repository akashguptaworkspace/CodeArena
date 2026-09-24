import styles from "./Stack.module.css";

/**
 * Vertical rhythm without per-component margins.
 * gap: section (between page sections) | stack (inside a section) | tight
 */
export function Stack({ as: Component = "div", gap = "stack", className = "", ...props }) {
  return <Component className={`${styles.root} ${styles[gap]} ${className}`} {...props} />;
}
