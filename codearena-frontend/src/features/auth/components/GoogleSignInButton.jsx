import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "@/config/env";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise = null;

// Loads Google Identity Services once for the whole app.
function loadGoogleScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load Google sign-in. Check your connection or ad blocker."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Google's official "Sign in with Google" button. On success Google hands us an ID token
 * (`credential`), which `onCredential` sends to our API to verify.
 */
export function GoogleSignInButton({ onCredential, onError, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [width, setWidth] = useState(320);

  // Google's button has a fixed pixel width (200–400); match it to the available space.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.min(400, Math.floor(entry.contentRect.width)))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      onError?.("Google sign-in isn't configured (VITE_GOOGLE_CLIENT_ID is missing).");
      return;
    }
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
          ux_mode: "popup",
          context: "signin",
          itp_support: true,
        });
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: dark ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width,
        });
      })
      .catch((err) => !cancelled && onError?.(err.message));
    return () => {
      cancelled = true;
    };
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", minHeight: 44, display: "flex", justifyContent: "center", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}
      aria-busy={disabled}
    />
  );
}
