import { Button } from "@/shared/ui";
import { ModuleNotice } from "./ModuleNotice";
import styles from "./Paywall.module.css";

export function Paywall({ module }) {
  return (
    <ModuleNotice
      eyebrow="Paid module"
      module={module}
      actions={
        // Checkout isn't built yet (see docs/ROADMAP.md → "Subscriptions"), so the button stays disabled.
        <Button disabled title="Payments aren't live yet">
          Unlock for ₹{module.priceInr}
        </Button>
      }
    >
      <p className={styles.price}>
        <strong>₹{module.priceInr}</strong> one-time · lifetime access to {module.title}
      </p>
      <p className={styles.note}>Payments aren't live yet. This module will unlock here once they are.</p>
    </ModuleNotice>
  );
}
