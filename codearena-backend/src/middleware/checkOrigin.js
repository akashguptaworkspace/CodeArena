import { config } from "../config/env.js";
import { HttpError } from "../utils/HttpError.js";

/**
 * CSRF protection for endpoints authenticated by the refresh-token cookie (refresh, logout):
 * the request must come from one of our own sites. Browsers always send Origin on cross-site
 * POSTs, so a forged request from another site is rejected here.
 */
export function checkOrigin(req, _res, next) {
  const origin = req.get("origin");
  if (origin && !config.clientOrigins.includes(origin)) throw HttpError.forbidden("Request from an unknown site.");
  next();
}
