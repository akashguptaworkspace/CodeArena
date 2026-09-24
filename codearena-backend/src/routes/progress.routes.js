import { Router } from "express";
import * as progress from "../controllers/progress.controller.js";
import { writeLimiter } from "../middleware/rateLimits.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  designAttemptParamsSchema,
  saveDesignAttemptSchema,
  setDesignStatusSchema,
  updateProblemSchema,
  updateSettingsSchema,
} from "../validators/progress.validators.js";

export const progressRoutes = Router();

progressRoutes.use(requireAuth);

progressRoutes.get("/", progress.getProgress);
progressRoutes.patch("/problems/:problemId", writeLimiter, validate(updateProblemSchema), progress.updateProblem);
progressRoutes.patch("/settings", writeLimiter, validate(updateSettingsSchema), progress.updateSettings);
progressRoutes.patch("/design/:questionId", writeLimiter, validate(setDesignStatusSchema), progress.setDesignStatus);
progressRoutes.put(
  "/design/:questionId/attempt",
  writeLimiter,
  validate(saveDesignAttemptSchema),
  progress.saveDesignAttempt,
);
progressRoutes.delete(
  "/design/:questionId/attempt",
  writeLimiter,
  validate(designAttemptParamsSchema),
  progress.deleteDesignAttempt,
);
