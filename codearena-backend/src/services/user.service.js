import { Entitlement, User } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";

/**
 * Finds the user for a verified Google account, creating it on first sign-in.
 * Matches by Google account id first, then by email (links an existing account to Google).
 */
export async function upsertGoogleUser({ googleSub, email, name, avatarUrl }) {
  let user = (await User.findOne({ where: { googleSub } })) || (await User.findOne({ where: { email } }));

  if (user) {
    await user.update({ googleSub, email, name, avatarUrl, lastLoginAt: new Date() });
  } else {
    user = await User.create({ googleSub, email, name, avatarUrl, lastLoginAt: new Date() });
  }
  return user;
}

export async function getUserWithEntitlements(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw HttpError.unauthorized();
  const entitlements = await Entitlement.findAll({ where: { userId }, attributes: ["moduleId"] });
  return user.toPublicJSON(entitlements.map((e) => e.moduleId));
}
