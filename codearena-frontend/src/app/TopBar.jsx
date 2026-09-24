import { Link } from "react-router";
import { APP_NAME } from "@/config/app";
import { useAuth } from "@/features/auth/AuthContext";
import { OnlineIndicator } from "@/features/presence/OnlineIndicator";
import { SaveStatus } from "@/features/progress/components/SaveStatus";
import { useProgressState } from "@/features/progress/ProgressContext";
import { Button } from "@/shared/ui";
import styles from "./TopBar.module.css";

// Phone and tablet header (< 1024px). Navigation lives in the bottom TabBar.
export function TopBar() {
  const { user, isRemote, isGuest, requestSignIn, signOut } = useAuth();
  const { status } = useProgressState();

  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          CA
        </span>
        {APP_NAME}
      </Link>
      <div className={styles.end}>
        <OnlineIndicator />
        {status === "ready" && !isGuest && <SaveStatus compact />}
        {isRemote && user && (
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        )}
        {isGuest && (
          <Button variant="secondary" size="sm" onClick={() => requestSignIn()}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
