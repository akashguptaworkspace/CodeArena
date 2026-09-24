import styles from "./TextField.module.css";

export function TextField({ id, label, hideLabel = false, error, className = "", ...inputProps }) {
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : styles.label}>
        {label}
      </label>
      <input id={id} className={styles.input} aria-invalid={Boolean(error)} {...inputProps} />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
