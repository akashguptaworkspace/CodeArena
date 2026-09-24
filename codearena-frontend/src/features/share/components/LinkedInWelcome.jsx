import { useState } from "react";
import { Button } from "@/shared/ui";
import styles from "./LinkedInWelcome.module.css";

const DISMISS_KEY = "practice-ground:linkedin-welcome-dismissed";

// Shown once to visitors who arrived from a LinkedIn post, pointing them at the fastest start.
export function LinkedInWelcome({ onShowCore }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className={styles.banner} aria-label="Welcome">
      <div>
        <p className={styles.title}>Welcome from LinkedIn</p>
        <p className={styles.text}>
          Short on time? Start with the Core problems. It's free, and your progress saves automatically.
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          size="sm"
          onClick={() => {
            onShowCore();
            dismiss();
          }}
        >
          Show Core problems
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </aside>
  );
}
