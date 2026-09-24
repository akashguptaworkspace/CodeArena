import { WebSocketServer } from "ws";
import { PresenceStore } from "./presenceStore.js";

const HEARTBEAT_MS = 30_000; // drop connections that stop answering pings
const BROADCAST_MS = 500; // group count changes so a burst of joins sends one update per page
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
 * Server → client   { type: "count", page: "/dsa", count: 12 }
 *
 * Runs on one process. To run several instances behind a load balancer, move PresenceStore
 * into Redis (a hash per page with expiring members) and fan out updates with Redis pub/sub.
 */
export function attachPresence(httpServer, { path = "/presence", allowedOrigins = [] } = {}) {
  const store = new PresenceStore();
  /** @type {Map<string, Set<import("ws").WebSocket>>} page -> sockets currently on it */
  const sockets = new Map();
  const dirtyPages = new Set();

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
    if (store.leave(page, clientId)) dirtyPages.add(page);
    ws.presence.page = null;
  };

  const joinPage = (ws, page) => {
    leavePage(ws);
    ws.presence.page = page;
    if (!sockets.has(page)) sockets.set(page, new Set());
    sockets.get(page).add(ws);
    if (store.join(page, ws.presence.clientId)) dirtyPages.add(page);
    // The newcomer always needs the current number, even if it didn't change.
    send(ws, { type: "count", page, count: store.count(page) });
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
    for (const page of dirtyPages) {
      const count = store.count(page);
      for (const ws of sockets.get(page) ?? []) send(ws, { type: "count", page, count });
    }
    dirtyPages.clear();
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
