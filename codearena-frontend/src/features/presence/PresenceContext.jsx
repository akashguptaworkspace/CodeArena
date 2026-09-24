import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { PRESENCE_URL } from "@/config/env";
import { getClientId } from "./clientId";

const PresenceContext = createContext({ live: false, total: null });

const pageKey = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

/**
 * One WebSocket for the whole app. Tells the presence server which page this tab is on
 * (and when the tab is hidden), and keeps the latest sitewide online total it sends back.
 * Reconnects with exponential backoff; while disconnected, `live` is false and nothing is shown.
 */
export function PresenceProvider({ children }) {
  const { pathname } = useLocation();
  const page = pageKey(pathname);
  const [live, setLive] = useState(false);
  const [total, setTotal] = useState(null);
  const socketRef = useRef(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  // Announce the current page, or leave if the tab isn't visible.
  const announce = () => {
    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    if (document.visibilityState === "hidden") ws.send(JSON.stringify({ type: "leave" }));
    else ws.send(JSON.stringify({ type: "join", page: pageRef.current, clientId: getClientId() }));
  };

  useEffect(() => {
    if (!PRESENCE_URL) return undefined;
    let retry = 0;
    let timer = null;
    let stopped = false;

    const connect = () => {
      const ws = new WebSocket(PRESENCE_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setLive(true);
        announce();
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "total") setTotal(message.count);
        } catch {
          /* ignore malformed messages */
        }
      };
      ws.onclose = () => {
        setLive(false);
        setTotal(null);
        if (stopped) return;
        const delay = Math.min(30_000, 1000 * 2 ** retry) * (0.75 + Math.random() * 0.5);
        retry += 1;
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    document.addEventListener("visibilitychange", announce);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", announce);
      socketRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- announce only reads refs

  // Page changed: move this tab to the new page.
  useEffect(announce, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PresenceContext.Provider value={{ live, total }}>{children}</PresenceContext.Provider>;
}

/** Live sitewide count of people on CodeArena right now, or null when presence isn't available. */
export function useOnlineCount() {
  const { live, total } = useContext(PresenceContext);
  return live ? total : null;
}
