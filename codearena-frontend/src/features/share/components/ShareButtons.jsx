import { useState } from "react";
import { CheckIcon, LinkedInIcon, ShareIcon } from "@/shared/ui";
import { linkedInShareUrl } from "../share";
import styles from "./ShareButtons.module.css";

/**
 * Two round icon buttons:
 *   LinkedIn → LinkedIn's share dialog.
 *   Share    → the phone's native share sheet; on desktop, copies the link and shows a tick.
 */
export function ShareButtons({ url, title, text }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: nothing else to do without a prompt */
    }
  };

  return (
    <div className={styles.group}>
      <a
        className={`${styles.button} ${styles.linkedin}`}
        href={linkedInShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <LinkedInIcon />
      </a>
      <button
        type="button"
        className={`${styles.button} ${copied ? styles.done : ""}`}
        onClick={share}
        aria-label={copied ? "Link copied" : "Share link"}
        title={copied ? "Link copied" : "Share link"}
      >
        {copied ? <CheckIcon /> : <ShareIcon />}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
