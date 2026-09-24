import { NavLink } from "react-router";
import { LockIcon, MODULE_ICONS } from "@/shared/ui";

import { useNavItems } from "./useNavItems";
import styles from "./TabBar.module.css";

// Phone and tablet navigation (< 1024px), fixed to the bottom like a native app.
// Fits up to 5–6 entries; past that, switch the last slot to a "More" sheet.
export function TabBar() {
  const items = useNavItems();

  return (
    <nav aria-label="Modules" className={styles.bar}>
      {items.map((item) => {
        const Icon = MODULE_ICONS[item.icon];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""} ${item.soon ? styles.soon : ""}`}
            aria-label={`${item.label}${item.locked ? " (paid)" : ""}${item.soon ? " (coming soon)" : ""}`}
          >
            <span className={styles.iconWrap}>
              <Icon />
              {item.locked && (
                <span className={styles.lock}>
                  <LockIcon />
                </span>
              )}
            </span>
            <span className={styles.label}>{item.shortLabel}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
