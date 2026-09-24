import { OAuth2Client } from "google-auth-library";
import { config } from "../config/env.js";
import { HttpError } from "../utils/HttpError.js";

const client = new OAuth2Client(config.google.clientId);

/**
 * Verifies a Google ID token (the `credential` from Google Identity Services) and returns the
 * account details. Checks signature, expiry, issuer and that it was issued for OUR client ID.
 */
async function verifyWithGoogle(idToken) {
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: config.google.clientId });
    payload = ticket.getPayload();
  } catch (err) {
    // e.g. "Wrong recipient" = GOOGLE_CLIENT_ID differs from the frontend's; "used too early" = server clock skew.
    if (!config.isTest) console.warn(`Google token rejected: ${err.message}`);
    throw HttpError.unauthorized("Google sign-in failed. Please try again.");
  }
  if (!payload?.sub || !payload.email) throw HttpError.unauthorized("Google didn't share your email address.");
  if (!payload.email_verified) throw HttpError.unauthorized("Your Google email address isn't verified.");

  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || null,
  };
}

let verifier = verifyWithGoogle;
export const verifyGoogleIdToken = (idToken) => verifier(idToken);

// Tests replace Google with a stub; never used outside the test environment.
export function setGoogleVerifierForTests(fn) {
  if (!config.isTest) throw new Error("setGoogleVerifierForTests is only allowed in tests");
  verifier = fn;
}
