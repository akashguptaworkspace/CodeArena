import { apiRequest, refreshAccessToken } from "@/shared/api/apiClient";
import { tokenStorage } from "@/shared/api/tokenStorage";

// Backend contract: docs/API.md → "Auth". Sign-in is Google-only.
export const authService = {
  /** Exchange the Google ID token (from the Google button) for our session. */
  async signInWithGoogle(credential) {
    const { accessToken, user } = await apiRequest("/api/auth/google", { method: "POST", body: { credential } });
    tokenStorage.set(accessToken);
    return user;
  },

  /** On page load: use the refresh cookie (if any) to restore the session. Returns null if signed out. */
  async restoreSession() {
    try {
      const { user } = await refreshAccessToken();
      return user;
    } catch (err) {
      if (err.status === 401) return null;
      throw err;
    }
  },

  async signOut() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      tokenStorage.clear();
    }
  },
};
