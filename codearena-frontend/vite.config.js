import react from "@vitejs/plugin-react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { MODULES } from "./src/config/modules.js";

const escapeAttr = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// The preview tags for one page. "/" uses the DSA module's card, which is the site's main entry point.
function pageMeta(module, appUrl, path = module.path) {
  const { share } = module;
  return {
    PAGE_TITLE: `${module.title} · CodeArena`,
    PAGE_DESCRIPTION: share.pageDescription ?? share.description,
    PAGE_URL: `${appUrl}${path}`,
    OG_TITLE: share.title,
    OG_DESCRIPTION: share.description,
    OG_IMAGE: `${appUrl}${share.image}`,
    OG_IMAGE_ALT: share.imageAlt,
  };
}

const fill = (html, meta) =>
  Object.entries(meta).reduce((out, [key, value]) => out.replaceAll(`%${key}%`, escapeAttr(value)), html);

/**
 * Link previews (LinkedIn, WhatsApp, X, Slack) come from <meta> tags, and preview crawlers don't run
 * JavaScript, so a single-page app would show the same card for every URL. At build time this writes
 * one copy of index.html per module (dist/genai/index.html, dist/sql/index.html, ...) with that
 * module's title, description and image; nginx serves it for /genai and every page under it.
 * In dev, index.html gets the default (DSA) card.
 */
function shareMetaPlugin(appUrl) {
  const defaultModule = MODULES.find((m) => m.id === "dsa");
  let outDir = "dist";
  let isBuild = false;

  return {
    name: "share-meta",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      isBuild = config.command === "build";
    },
    // In builds, keep the per-page placeholders until closeBundle (after Vite adds the asset tags).
    transformIndexHtml(html) {
      const withUrl = html.replaceAll("%APP_URL%", appUrl);
      return isBuild ? withUrl : fill(withUrl, pageMeta(defaultModule, appUrl, "/dsa"));
    },
    // `vite preview` behaves like nginx.conf: /genai and /genai/... get dist/genai/index.html.
    configurePreviewServer(server) {
      const moduleDirs = new Set(MODULES.map((m) => m.path.replace(/^\//, "")));
      server.middlewares.use((req, _res, next) => {
        const match = req.url?.match(/^\/([a-z0-9-]+)(\/[^.?]*)?(\?.*)?$/);
        if (match && moduleDirs.has(match[1])) req.url = `/${match[1]}/index.html`;
        next();
      });
    },
    closeBundle() {
      if (!isBuild) return;
      const template = readFileSync(join(outDir, "index.html"), "utf8");
      for (const module of MODULES.filter((m) => m.share && m.status === "live")) {
        const dir = join(outDir, module.path.replace(/^\//, ""));
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.html"), fill(template, pageMeta(module, appUrl)));
      }
      writeFileSync(join(outDir, "index.html"), fill(template, pageMeta(defaultModule, appUrl, "/dsa")));
    },
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
