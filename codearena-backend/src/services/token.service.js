import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { config } from "../config/env.js";
import { sequelize, Session } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";

const ISSUER = "codearena";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const DAY_MS = 24 * 60 * 60 * 1000;
// Two tabs reloading at once both send the same refresh token; the second one arrives just after
// the first rotated it. Within this window that's treated as a race, not theft.
const REUSE_GRACE_MS = 60 * 1000;

// ---- Access tokens: short-lived JWTs sent as "Authorization: Bearer …" ----

export function signAccessToken(user) {
  return jwt.sign({ typ: "access" }, config.jwt.accessSecret, {
    subject: String(user.id),
    issuer: ISSUER,
    expiresIn: config.jwt.accessTtl,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret, { issuer: ISSUER, algorithms: ["HS256"] });
    if (payload.typ !== "access") throw new Error("wrong token type");
    return { userId: Number(payload.sub) };
  } catch {
    throw HttpError.unauthorized();
  }
}

// ---- Refresh tokens: random, stored hashed, one per device session, rotated on every use ----

export async function createSession(user, { userAgent, ipAddress } = {}, transaction) {
  const token = crypto.randomBytes(48).toString("base64url");
  await Session.create(
    {
      userId: user.id,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 255) || null,
      ipAddress: ipAddress?.slice(0, 64) || null,
      expiresAt: new Date(Date.now() + config.refresh.ttlDays * DAY_MS),
      lastUsedAt: new Date(),
    },
    { transaction },
  );
  return token;
}

/**
 * Exchanges a refresh token for a new one (rotation) and returns the session's user id.
 * If a token that was already rotated is presented again, it has likely been stolen, so every
 * session of that user is revoked (refresh-token reuse detection).
 */
export async function rotateSession(token, meta = {}) {
  if (!token) throw HttpError.unauthorized();

  const result = await sequelize.transaction(async (transaction) => {
    const session = await Session.findOne({
      where: { tokenHash: sha256(token) },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!session) return { error: HttpError.unauthorized() };
    if (session.revokedAt) {
      if (Date.now() - session.revokedAt.getTime() < REUSE_GRACE_MS) {
        return { error: HttpError.unauthorized("Session was just refreshed in another tab.", "stale_refresh") };
      }
      // Report reuse instead of throwing here: throwing would roll back the revocation below.
      return { reusedByUserId: session.userId };
    }
    if (session.expiresAt <= new Date()) {
      return { error: HttpError.unauthorized("Your session expired. Please sign in again.") };
    }

    await session.update({ revokedAt: new Date(), lastUsedAt: new Date() }, { transaction });
    const next = await createSession({ id: session.userId }, meta, transaction);
    return { userId: session.userId, refreshToken: next };
  });

  if (result.reusedByUserId) {
    await revokeAllSessions(result.reusedByUserId);
    throw HttpError.unauthorized("Your session was ended for security. Please sign in again.");
  }
  if (result.error) throw result.error;
  return result;
}

export async function revokeSession(token) {
  if (!token) return;
  await Session.update({ revokedAt: new Date() }, { where: { tokenHash: sha256(token), revokedAt: { [Op.is]: null } } });
}

export async function revokeAllSessions(userId) {
  await Session.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
}
