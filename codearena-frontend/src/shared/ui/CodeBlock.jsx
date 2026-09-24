import styles from "./CodeBlock.module.css";

export function CodeBlock({ code, label = "Code" }) {
  return (
    <pre className={styles.block} aria-label={label} tabIndex={0}>
      <code>{code}</code>
    </pre>
  );
}
