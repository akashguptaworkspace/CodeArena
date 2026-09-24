import { API_URL } from "@/config/env";
import { tokenStorage } from "./tokenStorage";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Called when the session can't be recovered, so the auth layer can show the sign-in page.
let unauthorizedHandler = null;
export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

// A hung request (bad network, dropped connection) would otherwise leave callers waiting
// forever — e.g. the session check on load, stuck on "Checking your session…".
const REQUEST_TIMEOUT_MS = 10_000;

async function send(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => timeoutController.abort(), { once: true });

  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include", // sends the refresh-token cookie to /api/auth/*
      signal: timeoutController.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // caller cancelled it themselves
    throw new ApiError("Can't reach the server. Check your connection.", 0, null);
  } finally {
    clearTimeout(timeoutId);
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function postRefresh() {
  const res = await send("/api/auth/refresh", { method: "POST" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || "Please sign in again.", res.status, data);
  tokenStorage.set(data.accessToken);
  return data;
}

// One refresh at a time: if several requests get 401 together, they all wait for the same refresh.
let refreshing = null;
export function refreshAccessToken() {
  refreshing ??= postRefresh()
    .catch(async (err) => {
      // Another tab rotated the cookie a moment ago; the browser now has the new one, so retry once.
      if (err.body?.code !== "stale_refresh") throw err;
      await wait(400);
      return postRefresh();
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * JSON request to the API. If the access token has expired (401), refreshes it once using the
 * refresh cookie and retries; if that fails too, the user is signed out.
 */
export async function apiRequest(path, options = {}) {
  let response = await send(path, options);

  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    try {
      await refreshAccessToken();
      response = await send(path, options);
    } catch {
      /* fall through to the 401 handling below */
    }
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler && !path.startsWith("/api/auth/")) unauthorizedHandler();
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, data);
  }
  return data;
}
