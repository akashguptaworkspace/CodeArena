import { sequelize } from "../models/index.js";

// GET /health  → for uptime checks and the hosting platform's health probe
export const health = (getPresenceStats) => async (_req, res) => {
  let database = "ok";
  try {
    await sequelize.authenticate();
  } catch {
    database = "unreachable";
  }
  res.status(database === "ok" ? 200 : 503).json({ ok: database === "ok", database, presence: getPresenceStats() });
};
