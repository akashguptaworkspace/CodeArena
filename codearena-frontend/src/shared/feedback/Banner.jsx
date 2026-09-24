import { Button } from "@/shared/ui";
import styles from "./Banner.module.css";

export function Banner({ tone = "error", children, actionLabel, onAction }) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <p>{children}</p>
      {actionLabel && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
