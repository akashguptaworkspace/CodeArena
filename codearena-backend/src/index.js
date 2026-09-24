import http from "node:http";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase, sequelize } from "./config/database.js";
import "./models/index.js";
import { attachPresence } from "./presence/presenceServer.js";

// One HTTP server for the REST API (/api/…) and live presence (WebSocket at /presence).
await connectDatabase().catch((err) => {
  console.error(`Can't connect to the database: ${err.message}`);
  console.error("Check DB_* in codearena-backend/.env, then run `npm run db:create` and `npm run db:migrate`.");
  process.exit(1);
});

let presence;
const app = createApp({ getPresenceStats: () => presence?.stats() });
const server = http.createServer(app);
presence = attachPresence(server, { path: "/presence", allowedOrigins: config.clientOrigins });

server.listen(config.port, () => {
  console.log(`API       http://localhost:${config.port}/api`);
  console.log(`Presence  ws://localhost:${config.port}/presence`);
});

// ws v8 doesn't close open connections on wss.close(), so do it explicitly; browsers reconnect
// to the next instance. Force-exit if anything hangs.
const shutdown = () => {
  for (const ws of presence.wss.clients) ws.close(1001, "Server restarting");
  presence.wss.close();
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
