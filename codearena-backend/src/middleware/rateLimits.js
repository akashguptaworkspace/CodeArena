import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { config } from "../config/env.js";

const message = (text) => ({ message: text });
const skip = () => config.isTest;

// Sign-in and token refresh: generous for real users, painful for scripts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: message("Too many sign-in attempts. Please wait a few minutes and try again."),
  skip,
});

// Progress writes: per signed-in user (notes autosave ~1 request/second while typing).
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `user:${req.userId}` : ipKeyGenerator(req.ip)),
  message: message("You're saving very quickly. Please slow down for a moment."),
  skip,
});
