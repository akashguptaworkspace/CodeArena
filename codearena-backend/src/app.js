import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env.js";
import { health } from "./controllers/health.controller.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiRoutes } from "./routes/index.js";

/** Builds the Express app (no listening), so tests can use it directly. */
export function createApp({ getPresenceStats = () => null } = {}) {
  const app = express();

  // Behind a proxy/load balancer in production (Render, Railway, Nginx): trust the first hop
  // so req.ip and secure cookies work.
  if (config.isProd) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || config.clientOrigins.includes(origin)),
      credentials: true, // allow the refresh-token cookie
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/", (req, res) => {
    res.send("welcome to codearena");
  });
  app.get("/health", health(getPresenceStats));
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
