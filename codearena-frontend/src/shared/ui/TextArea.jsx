import styles from "./TextArea.module.css";

export function TextArea({ id, label, hideLabel = false, hint, className = "", ...props }) {
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : styles.label}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      <textarea id={id} className={styles.textarea} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
    </div>
  );
}
