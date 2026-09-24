import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

// Link previews (LinkedIn, WhatsApp, X) need absolute URLs in the <meta> tags, so the public
// site URL is injected into index.html at build time from VITE_APP_URL.
function shareMetaPlugin(appUrl) {
  return {
    name: "share-meta",
    transformIndexHtml: (html) => html.replaceAll("%APP_URL%", appUrl),
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appUrl = (env.VITE_APP_URL || "http://localhost:5173").replace(/\/$/, "");
  if (command === "build" && !env.VITE_APP_URL) {
    console.warn("\n[share-meta] VITE_APP_URL is not set: link previews will point at localhost.\n");
  }

  return {
    plugins: [react(), shareMetaPlugin(appUrl)],
    resolve: {
      // `@/…` always means `src/…`, so imports don't break when files move between features.
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
