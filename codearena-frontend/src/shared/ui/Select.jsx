import styles from "./Select.module.css";

// Native select with an accessible label. options: [{ value, label }]
export function Select({ id, label, hideLabel = true, options, value, onChange, tone }) {
  return (
    <span className={styles.wrap}>
      <label htmlFor={id} className={hideLabel ? "visually-hidden" : styles.label}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        data-tone={tone}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
