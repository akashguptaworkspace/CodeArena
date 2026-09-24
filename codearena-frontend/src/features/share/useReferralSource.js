import { useState } from "react";

const KEY = "practice-ground:referral";

function detect() {
  const params = new URLSearchParams(window.location.search);
  const utm = (params.get("utm_source") || params.get("ref") || "").toLowerCase();
  if (utm.includes("linkedin")) return "linkedin";
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host.endsWith("linkedin.com") || host === "lnkd.in") return "linkedin";
  } catch {
    /* invalid referrer */
  }
  return null;
}

/**
 * Where this visit came from ("linkedin" or null). Remembered for the browser session so it
 * survives navigation after the landing page drops the ?utm_source.
 */
export function useReferralSource() {
  const [source] = useState(() => {
    try {
      const found = detect() || sessionStorage.getItem(KEY);
      if (found) sessionStorage.setItem(KEY, found);
      return found;
    } catch {
      return detect();
    }
  });
  return source;
}
