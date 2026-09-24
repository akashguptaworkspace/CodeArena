import { createContext, useContext, useMemo } from "react";
import { PAYWALL_ENABLED } from "@/config/env";
import { getModule } from "@/config/modules";
import { useAuth } from "@/features/auth/AuthContext";

const AccessContext = createContext(null);

/**
 * Decides which modules the current user can open.
 * Remote mode: the backend returns `user.entitlements` (module ids the user has paid for).
 *
 * This is UX only. Real protection must be on the server: paid content should be served by the API
 * to entitled users, not bundled into the frontend. See docs/ROADMAP.md → "Subscriptions".
 */
export function AccessProvider({ children }) {
  const { user } = useAuth();

  const value = useMemo(() => {
    const owned = new Set(user?.entitlements || []);

    const canAccess = (moduleId) => {
      const module = getModule(moduleId);
      if (!module) return false;
      if (module.access === "free" || !PAYWALL_ENABLED) return true;
      return owned.has(moduleId);
    };

    return { canAccess, paywallEnabled: PAYWALL_ENABLED };
  }, [user]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside <AccessProvider>");
  return ctx;
}
