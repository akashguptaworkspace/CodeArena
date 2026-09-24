import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { IS_REMOTE } from "@/config/env";
import { onUnauthorized } from "@/shared/api/apiClient";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { authService } from "./authService";

const GUEST_USER = { id: "guest", name: "Guest" };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Local mode has a single guest user; remote mode restores the session from the refresh cookie.
  const [user, setUser] = useState(IS_REMOTE ? null : GUEST_USER);
  // "signed-out" is a guest: they can browse everything, and are asked to sign in only when saving.
  const [status, setStatus] = useState(IS_REMOTE ? "checking" : "signed-in"); // checking | signed-in | signed-out
  const [sessionError, setSessionError] = useState(null);
  // The sign-in popup. `reason` completes "Sign in to …", e.g. "save your solved problems".
  const [signInPrompt, setSignInPrompt] = useState(null); // null | { reason }

  useEffect(() => {
    if (!IS_REMOTE) return;
    onUnauthorized(() => {
      tokenStorage.clear();
      setUser(null);
      setStatus("signed-out");
    });

    let cancelled = false;
    authService
      .restoreSession()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus(me ? "signed-in" : "signed-out");
      })
      .catch((err) => {
        if (cancelled) return;
        setSessionError(err.message);
        setStatus("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async (credential) => {
    const me = await authService.signInWithGoogle(credential);
    setSessionError(null);
    setUser(me);
    setStatus("signed-in");
    setSignInPrompt(null);
  }, []);

  const requestSignIn = useCallback((reason = null) => setSignInPrompt({ reason }), []);
  const closeSignInPrompt = useCallback(() => setSignInPrompt(null), []);

  const signOut = useCallback(async () => {
    await authService.signOut().catch(() => {});
    setUser(null);
    setStatus("signed-out");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      sessionError,
      isRemote: IS_REMOTE,
      isGuest: IS_REMOTE && status === "signed-out",
      signInPrompt,
      requestSignIn,
      closeSignInPrompt,
      signInWithGoogle,
      signOut,
    }),
    [user, status, sessionError, signInPrompt, requestSignIn, closeSignInPrompt, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
