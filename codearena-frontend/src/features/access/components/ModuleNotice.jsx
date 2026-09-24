import { Link } from "react-router";
import { Card, MODULE_ICONS } from "@/shared/ui";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import styles from "./ModuleNotice.module.css";

// Shared layout for the Coming soon and paywall screens.
export function ModuleNotice({ eyebrow, module, children, actions }) {
  useDocumentTitle(module.title);
  const Icon = MODULE_ICONS[module.icon];
  return (
    <Card size="lg" className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <Icon />
      </span>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{module.title}</h1>
      <p className={styles.summary}>{module.summary}</p>
      <ul className={styles.highlights}>
        {module.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      {children}
      <div className={styles.actions}>
        {actions}
        <Link to="/dsa" className={styles.back}>
          Keep practising DSA 200 (free)
        </Link>
      </div>
    </Card>
  );
}
