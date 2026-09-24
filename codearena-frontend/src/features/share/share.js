import { APP_URL } from "@/config/env";

// Tagged links let you see in analytics how many visitors came from shared LinkedIn posts.
export const campaignUrl = (path, campaign) =>
  `${APP_URL}${path}?utm_source=linkedin&utm_medium=social&utm_campaign=${encodeURIComponent(campaign)}`;

// LinkedIn's share dialog only accepts a URL; the post text is taken from the page's preview tags.
export const linkedInShareUrl = (url) =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

// Short message for the native share sheet (WhatsApp, Telegram…). Mentions the user's own
// progress when they have some: shares with real numbers get more clicks than a bare link.
export function dsaShareText({ solved, total }) {
  const progress = solved > 0 ? ` I've solved ${solved} of ${total} so far.` : "";
  return `DSA 200: ${total} LeetCode problems grouped by pattern for product-company interviews. Free.${progress}`;
}
