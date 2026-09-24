import styles from "./Card.module.css";

/**
 * The one container style for the app.
 * size:        sm | md | lg        (padding from --card-pad-*)
 * variant:     default | flat | dashed
 * interactive: adds hover lift, for cards that are links
 */
export function Card({ as: Component = "div", size = "md", variant = "default", interactive = false, className = "", ...props }) {
  return (
    <Component
      className={`${styles.card} ${styles[size]} ${styles[variant]} ${interactive ? styles.interactive : ""} ${className}`}
      {...props}
    />
  );
}
