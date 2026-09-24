/**
 * Who is on which page, counted by distinct client (browser), not by connection:
 * one person with three tabs on the same page counts once.
 * Pure data structure, no networking, so it's easy to test.
 */
export class PresenceStore {
  constructor() {
    /** @type {Map<string, Map<string, number>>} page -> clientId -> open connections */
    this.pages = new Map();
  }

  /** Returns true if the page's distinct-client count changed. */
  join(page, clientId) {
    let clients = this.pages.get(page);
    if (!clients) {
      clients = new Map();
      this.pages.set(page, clients);
    }
    const connections = clients.get(clientId) || 0;
    clients.set(clientId, connections + 1);
    return connections === 0;
  }

  /** Returns true if the page's distinct-client count changed. */
  leave(page, clientId) {
    const clients = this.pages.get(page);
    const connections = clients?.get(clientId);
    if (!connections) return false;
    if (connections > 1) {
      clients.set(clientId, connections - 1);
      return false;
    }
    clients.delete(clientId);
    if (clients.size === 0) this.pages.delete(page);
    return true;
  }

  count(page) {
    return this.pages.get(page)?.size ?? 0;
  }

  /** { "/dsa": 12, ... } for monitoring. */
  snapshot() {
    return Object.fromEntries([...this.pages].map(([page, clients]) => [page, clients.size]));
  }

  totalClients() {
    const all = new Set();
    for (const clients of this.pages.values()) for (const id of clients.keys()) all.add(id);
    return all.size;
  }
}
