import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { progressRoutes } from "./progress.routes.js";

// Everything under /api
export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/progress", progressRoutes);
