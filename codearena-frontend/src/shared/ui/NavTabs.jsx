import { NavLink } from "react-router";
import styles from "./NavTabs.module.css";

/**
 * Route-driven tabs. items: [{ to, label, end?, icon?, badge? }]
 * variant "primary" = app navigation, "secondary" = tabs inside a page.
 */
export function NavTabs({ items, label, variant = "primary" }) {
  return (
    <nav aria-label={label} className={`${styles.tabs} ${styles[variant]}`}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? styles.active : "")}>
          {item.icon}
          {item.label}
          {item.badge && <span className={styles.badge}>{item.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
