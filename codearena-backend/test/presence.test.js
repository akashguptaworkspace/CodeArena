import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { WebSocket } from "ws";
import { attachPresence } from "../src/presence/presenceServer.js";
import { PresenceStore } from "../src/presence/presenceStore.js";

test("store counts distinct clients, not connections", () => {
  const store = new PresenceStore();
  assert.equal(store.join("/dsa", "alice-0001"), true);
  assert.equal(store.join("/dsa", "alice-0001"), false); // second tab
  assert.equal(store.join("/dsa", "bob-00001"), true);
  assert.equal(store.count("/dsa"), 2);
  assert.equal(store.leave("/dsa", "alice-0001"), false); // one tab still open
  assert.equal(store.count("/dsa"), 2);
  assert.equal(store.leave("/dsa", "alice-0001"), true);
  assert.equal(store.count("/dsa"), 1);
  assert.equal(store.leave("/dsa", "nobody-001"), false);
});

// ---- End-to-end over real sockets ----
let server;
let presence;
let url;

before(async () => {
  server = http.createServer();
  presence = attachPresence(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `ws://localhost:${server.address().port}/presence`;
});

after(() => {
  presence.wss.close();
  return new Promise((resolve) => server.close(resolve));
});

function connect() {
  const ws = new WebSocket(url);
  ws.latestTotal = null;
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.type === "total") ws.latestTotal = m.count;
  });
  return new Promise((resolve) => ws.on("open", () => resolve(ws)));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const join = (ws, page, clientId) => ws.send(JSON.stringify({ type: "join", page, clientId }));

test("total counts distinct clients across all pages, not per-page or per-connection", async () => {
  const a = await connect();
  const b = await connect();
  const b2 = await connect(); // Bob's second tab

  join(a, "/dsa", "alice-0001");
  join(b, "/dsa", "bob-000001");
  join(b2, "/dsa", "bob-000001");
  await wait(700);
  assert.equal(a.latestTotal, 2, "alice + bob, bob's two tabs count once");

  join(b, "/system-design/hld", "bob-000001"); // Bob's first tab moves page
  await wait(700);
  assert.equal(a.latestTotal, 2, "still just alice + bob, regardless of which pages they're on");

  b2.send(JSON.stringify({ type: "leave" })); // Bob hides his /dsa tab; his other tab is still open
  await wait(700);
  assert.equal(a.latestTotal, 2, "bob is still online via his other tab");

  b.close(); // Bob's last open tab disconnects
  await wait(700);
  assert.equal(a.latestTotal, 1, "only alice remains");

  a.close();
  b2.close();
  await wait(700); // let the server broadcast alice's departure before the next test connects
});

test("ignores malformed pages and client ids", async () => {
  const ws = await connect();
  join(ws, "https://evil.example", "alice-0001");
  join(ws, "/dsa", "x");
  await wait(700);
  assert.equal(ws.latestTotal, null);
  ws.close();
});
