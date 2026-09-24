import { config } from "../config/env.js";
import { verifyGoogleIdToken } from "../services/google.service.js";
import { createSession, revokeSession, rotateSession, signAccessToken } from "../services/token.service.js";
import { getUserWithEntitlements, upsertGoogleUser } from "../services/user.service.js";

const { cookieName, cookie, ttlDays } = config.refresh;
const requestMeta = (req) => ({ userAgent: req.get("user-agent"), ipAddress: req.ip });

function setRefreshCookie(res, token) {
  res.cookie(cookieName, token, { ...cookie, maxAge: ttlDays * 24 * 60 * 60 * 1000 });
}

async function signedInResponse(res, userId, refreshToken) {
  setRefreshCookie(res, refreshToken);
  const user = await getUserWithEntitlements(userId);
  res.json({ accessToken: signAccessToken({ id: userId }), user });
}

// POST /api/auth/google  { credential }  → sign in (or sign up) with a Google ID token
export async function googleSignIn(req, res) {
  const profile = await verifyGoogleIdToken(req.body.credential);
  const user = await upsertGoogleUser(profile);
  const refreshToken = await createSession(user, requestMeta(req));
  await signedInResponse(res, user.id, refreshToken);
}

// POST /api/auth/refresh  (refresh cookie) → new access token + rotated refresh cookie
export async function refresh(req, res) {
  try {
    const { userId, refreshToken } = await rotateSession(req.cookies[cookieName], requestMeta(req));
    await signedInResponse(res, userId, refreshToken);
  } catch (err) {
    res.clearCookie(cookieName, cookie);
    throw err;
  }
}

// POST /api/auth/logout  → ends this device's session
export async function logout(req, res) {
  await revokeSession(req.cookies[cookieName]);
  res.clearCookie(cookieName, cookie);
  res.status(204).end();
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: await getUserWithEntitlements(req.userId) });
}
