import styles from "./Button.module.css";

/**
 * variant: primary | secondary | ghost | link
 * size:    md | sm
 */
export function Button({ variant = "primary", size = "md", type = "button", className = "", ...props }) {
  return <button type={type} className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`} {...props} />;
}
