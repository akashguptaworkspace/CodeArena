import { Outlet } from "react-router";
import { useProgressActions, useProgressState } from "@/features/progress/ProgressContext";
import { OnlineIndicator } from "@/features/presence/OnlineIndicator";
import { Banner } from "@/shared/feedback/Banner";
import { LoadingState } from "@/shared/feedback/LoadingState";
import { PageContainer } from "@/shared/layout/PageContainer";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

/**
 * Signed-in layout.
 *   ≥ 1024px: sidebar + content
 *   < 1024px: top bar + content + bottom tab bar
 * Loading and save errors are handled here once for every page.
 */
export function AppShell() {
  const { status, loadError, saveError } = useProgressState();
  const { reload, dismissSaveError } = useProgressActions();

  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>
      <div className={styles.topbar}>
        <TopBar />
      </div>

      <main className={styles.main}>
        <PageContainer>
          <div className={styles.utilityBar}>
            <OnlineIndicator />
          </div>
          {status === "error" && (
            <Banner actionLabel="Try again" onAction={reload}>
              Couldn't load your progress: {loadError}
            </Banner>
          )}
          {(status === "loading" || status === "idle") && <LoadingState message="Loading your progress…" />}
          {status === "ready" && (
            <>
              {saveError && (
                <div className={styles.saveError}>
                  <Banner actionLabel="Dismiss" onAction={dismissSaveError}>
                    Your last change wasn't saved and has been undone: {saveError}
                  </Banner>
                </div>
              )}
              <Outlet />
            </>
          )}
        </PageContainer>
      </main>

      <div className={styles.tabbar}>
        <TabBar />
      </div>
    </div>
  );
}
