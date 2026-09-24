import { WebSocketServer } from "ws";
import { PresenceStore } from "./presenceStore.js";

const HEARTBEAT_MS = 30_000; // drop connections that stop answering pings
const BROADCAST_MS = 500; // group total changes so a burst of joins/leaves sends one update
const MAX_PAGE_LENGTH = 200;
const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/;

// Only accept plain app paths like "/dsa" or "/system-design/hld/hld-url-shortener".
const normalizePage = (page) => {
  if (typeof page !== "string" || page.length > MAX_PAGE_LENGTH || !page.startsWith("/")) return null;
  if (!/^[A-Za-z0-9/_-]*$/.test(page)) return null;
  return page.length > 1 ? page.replace(/\/+$/, "") : page;
};

/**
 * Live presence over WebSockets.
 *
 * Client → server   { type: "join", page: "/dsa", clientId: "<uuid>" }
 *                   { type: "leave" }                 (tab hidden)
 * Server → client   { type: "total", count: 142 }     (sitewide distinct-client count, same for every page)
 *
 * Per-page membership is still tracked (for /health monitoring), it's just no longer sent to clients.
 *
 * Runs on one process. To run several instances behind a load balancer, move PresenceStore
 * into Redis (a hash per page with expiring members) and fan out updates with Redis pub/sub.
 */
export function attachPresence(httpServer, { path = "/presence", allowedOrigins = [] } = {}) {
  const store = new PresenceStore();
  /** @type {Map<string, Set<import("ws").WebSocket>>} page -> sockets currently on it (monitoring only) */
  const sockets = new Map();
  let totalDirty = false;
  let lastTotal = 0;

  const wss = new WebSocketServer({
    server: httpServer,
    path,
    maxPayload: 1024,
    verifyClient: ({ origin }) => allowedOrigins.length === 0 || allowedOrigins.includes(origin),
  });

  const send = (ws, message) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  };

  const leavePage = (ws) => {
    const { page, clientId } = ws.presence;
    if (!page) return;
    sockets.get(page)?.delete(ws);
    if (sockets.get(page)?.size === 0) sockets.delete(page);
    store.leave(page, clientId);
    totalDirty = true;
    ws.presence.page = null;
  };

  const joinPage = (ws, page) => {
    leavePage(ws);
    ws.presence.page = page;
    if (!sockets.has(page)) sockets.set(page, new Set());
    sockets.get(page).add(ws);
    store.join(page, ws.presence.clientId);
    totalDirty = true;
    // The newcomer always needs the current total, even if it didn't change.
    send(ws, { type: "total", count: store.totalClients() });
  };

  wss.on("connection", (ws) => {
    ws.presence = { clientId: null, page: null, alive: true };
    ws.on("pong", () => {
      ws.presence.alive = true;
    });

    ws.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (message?.type === "join") {
        const page = normalizePage(message.page);
        if (!page || typeof message.clientId !== "string" || !CLIENT_ID.test(message.clientId)) return;
        // A connection keeps the client id it first announced.
        ws.presence.clientId ??= message.clientId;
        joinPage(ws, page);
      } else if (message?.type === "leave") {
        leavePage(ws);
      }
    });

    ws.on("close", () => leavePage(ws));
    ws.on("error", () => leavePage(ws));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.presence.alive) {
        ws.terminate(); // triggers "close" → leavePage
        continue;
      }
      ws.presence.alive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref(); // timers alone shouldn't keep the process alive

  const broadcaster = setInterval(() => {
    if (!totalDirty) return;
    totalDirty = false;
    const total = store.totalClients();
    if (total === lastTotal) return;
    lastTotal = total;
    for (const ws of wss.clients) send(ws, { type: "total", count: total });
  }, BROADCAST_MS);
  broadcaster.unref();

  wss.on("close", () => {
    clearInterval(heartbeat);
    clearInterval(broadcaster);
  });

  return {
    wss,
    stats: () => ({ connections: wss.clients.size, onlineUsers: store.totalClients(), pages: store.snapshot() }),
  };
}
