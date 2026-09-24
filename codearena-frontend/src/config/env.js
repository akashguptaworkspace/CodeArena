// When VITE_API_URL is set, progress is saved to your Node.js backend. Visitors browse as guests and
// are asked to sign in (SignInDialog) only when they save something.
// When it is empty, the app runs fully in the browser (localStorage) as a single guest user.
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const IS_REMOTE = API_URL.length > 0;

// When true, paid modules are locked unless the user owns them (see features/access).
// Keep it false until payments are live, so every finished module stays usable.
export const PAYWALL_ENABLED = import.meta.env.VITE_ENABLE_PAYWALL === "true";

// Public site URL for share links. Falls back to wherever the app is running.
export const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");

// WebSocket URL of the presence server (codearena-backend). Empty = the "online now" indicator is hidden.
export const PRESENCE_URL = import.meta.env.VITE_PRESENCE_URL || "";

// Google Identity Services client ID (same value as GOOGLE_CLIENT_ID on the server).
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
