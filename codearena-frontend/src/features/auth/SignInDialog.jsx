import { useEffect, useRef, useState } from "react";
import { Banner } from "@/shared/feedback/Banner";
import { Button } from "@/shared/ui";
import { useAuth } from "./AuthContext";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import styles from "./SignInDialog.module.css";

/**
 * Sign-in popup. Guests browse freely; this opens only when they do something that needs saving
 * (or press "Sign in"). Whatever they were doing is finished for them after sign-in — see
 * `runAfterSignIn` in ProgressContext.
 */
export function SignInDialog() {
  const { signInPrompt, closeSignInPrompt, signInWithGoogle, sessionError } = useAuth();
  const dialogRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const open = Boolean(signInPrompt);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setError(null);
      setBusy(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCredential = async (credential) => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle(credential);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const message = error || sessionError;
  const reason = signInPrompt?.reason;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="sign-in-title"
      // Esc and the "Not now" button both land here.
      onClose={closeSignInPrompt}
      // Click on the backdrop (outside the card) closes it.
      onClick={(e) => e.target === e.currentTarget && !busy && closeSignInPrompt()}
    >
      {open && (
        <div className={styles.card}>
          <div className={styles.logo} aria-hidden="true">
            CA
          </div>
          <h2 id="sign-in-title" className={styles.title}>
            {reason ? `Sign in to ${reason}` : "Sign in to CodeArena"}
          </h2>
          <p className={styles.sub}>Free with Google. Your progress is saved to your account and follows you to any device.</p>

          {message && <Banner>{message}</Banner>}

          <div className={styles.google}>
            <GoogleSignInButton onCredential={handleCredential} onError={setError} disabled={busy} />
          </div>
          {busy && (
            <p className={styles.status} role="status">
              Signing you in…
            </p>
          )}

          <Button variant="ghost" size="sm" onClick={closeSignInPrompt} disabled={busy}>
            Not now
          </Button>
          <p className={styles.privacy}>We only use your name, email and profile photo. We never post anything for you.</p>
        </div>
      )}
    </dialog>
  );
}
