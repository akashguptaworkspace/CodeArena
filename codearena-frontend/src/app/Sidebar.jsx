import { Link, NavLink } from "react-router";
import { APP_NAME } from "@/config/app";
import { useAuth } from "@/features/auth/AuthContext";
import { SaveStatus } from "@/features/progress/components/SaveStatus";
import { useProgressState } from "@/features/progress/ProgressContext";
import { Button, LockIcon, MODULE_ICONS } from "@/shared/ui";

import { useNavItems } from "./useNavItems";
import styles from "./Sidebar.module.css";

// Desktop navigation (≥ 1024px).
export function Sidebar() {
  const items = useNavItems();
  const { user, isRemote, isGuest, requestSignIn, signOut } = useAuth();
  const { status } = useProgressState();

  return (
    <aside className={styles.sidebar}>
      <Link to="/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          CA
        </span>
        {APP_NAME}
      </Link>

      <nav aria-label="Modules" className={styles.nav}>
        <p className={styles.navLabel}>Practice</p>
        {items.map((item) => {
          const Icon = MODULE_ICONS[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}
            >
              <Icon />
              <span className={styles.linkLabel}>{item.label}</span>
              {item.locked && (
                <span className={styles.lock} title="Paid module">
                  <LockIcon />
                </span>
              )}
              {item.soon && <span className={styles.soon}>Soon</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.footer}>
        {status === "ready" && !isGuest && <SaveStatus />}
        {isRemote && user && (
          <div className={styles.user}>
            {user.avatarUrl && (
              <img className={styles.avatar} src={user.avatarUrl} alt="" referrerPolicy="no-referrer" width="28" height="28" />
            )}
            <span className={styles.userName}>{user.name || user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
        {isGuest && (
          <Button variant="secondary" size="sm" onClick={() => requestSignIn()}>
            Sign in
          </Button>
        )}
      </div>
    </aside>
  );
}
