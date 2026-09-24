import styles from "./IconButton.module.css";

// Square icon-only button. `label` is required: it's the accessible name and tooltip.
export function IconButton({ label, pressed, tone = "default", children, ...props }) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${styles[tone]}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...props}
    >
      {children}
    </button>
  );
}
