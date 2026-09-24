import { usePageOnlineCount } from "./PresenceContext";
import styles from "./OnlineIndicator.module.css";

// "● 12 online": real-time count of people viewing this page. Hidden when presence is unavailable.
export function OnlineIndicator() {
  const count = usePageOnlineCount();
  if (!count) return null;

  const label = count === 1 ? "You're the only one on this page right now" : `${count} people on this page right now`;
  return (
    <span className={styles.pill} title={label} aria-label={label}>
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">
        <b>{count.toLocaleString()}</b> online
      </span>
    </span>
  );
}
