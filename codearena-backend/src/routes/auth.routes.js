import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { checkOrigin } from "../middleware/checkOrigin.js";
import { authLimiter } from "../middleware/rateLimits.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { googleSignInSchema } from "../validators/auth.validators.js";

export const authRoutes = Router();

authRoutes.post("/google", authLimiter, validate(googleSignInSchema), auth.googleSignIn);
authRoutes.post("/refresh", authLimiter, checkOrigin, auth.refresh);
authRoutes.post("/logout", checkOrigin, auth.logout);
authRoutes.get("/me", requireAuth, auth.me);
