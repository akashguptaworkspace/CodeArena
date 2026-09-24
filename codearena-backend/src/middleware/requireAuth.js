import { verifyAccessToken } from "../services/token.service.js";
import { HttpError } from "../utils/HttpError.js";

// Requires "Authorization: Bearer <access token>"; sets req.userId.
export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw HttpError.unauthorized();
  req.userId = verifyAccessToken(token).userId;
  next();
}
