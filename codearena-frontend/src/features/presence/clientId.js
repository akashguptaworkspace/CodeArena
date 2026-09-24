const KEY = "practice-ground:client-id";

const random = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/**
 * Anonymous, per-browser id so the presence server counts people rather than tabs.
 * Not tied to the user's account and never sent anywhere else.
 */
export function getClientId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = random();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return random(); // storage blocked: counted per tab instead
  }
}
