import { useOnlineCount } from "./PresenceContext";
import styles from "./OnlineIndicator.module.css";

// "● 12 online": real-time sitewide count of people on CodeArena. Hidden when presence is unavailable.
export function OnlineIndicator() {
  const count = useOnlineCount();
  if (!count) return null;

  const label = count === 1 ? "You're the only one on CodeArena right now" : `${count} people on CodeArena right now`;
  return (
    <span className={styles.pill} title={label} aria-label={label}>
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">
        <b>{count.toLocaleString()}</b> online
      </span>
    </span>
  );
}
