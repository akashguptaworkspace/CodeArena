import { UniqueConstraintError, ValidationError } from "sequelize";
import { config } from "../config/env.js";
import { HttpError } from "../utils/HttpError.js";

export function notFound(req, _res, next) {
  next(HttpError.notFound(`No route for ${req.method} ${req.path}`));
}

// Every error ends here and becomes { message } with a sensible status. Internals never leak.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err instanceof HttpError ? err.status : 500;
  let message = err instanceof HttpError ? err.message : "Something went wrong on our side. Please try again.";

  if (err instanceof UniqueConstraintError) {
    status = 409;
    message = "That already exists.";
  } else if (err instanceof ValidationError) {
    status = 400;
    message = err.errors?.[0]?.message || "Invalid data.";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    message = "That request is too large.";
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    message = "The request body isn't valid JSON.";
  }

  if (status >= 500 && !config.isTest) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json(err instanceof HttpError && err.code ? { message, code: err.code } : { message });
}
