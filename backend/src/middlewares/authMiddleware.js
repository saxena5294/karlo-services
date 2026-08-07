import { clerkClient, getAuth } from "@clerk/express";
import { normalizeRole, ROLES } from "../constants/roleConstants.js";
import { User } from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";

const blockedStatuses = new Set(["rejected", "suspended", "inactive"]);

export const assertAccountCanAuthenticate = (profile) => {
  if (!profile) throw new ApiError(404, "Account profile was not found");
  if (blockedStatuses.has(profile.status)) throw new ApiError(403, `Account is ${profile.status}`);
  return profile;
};

export const profileFromClerkUser = (clerkUser) => {
  const verifiedEmail = clerkUser.emailAddresses?.find((item) => item.verification?.status === "verified");
  return {
    clerkUserId: clerkUser.id,
    email: verifiedEmail?.emailAddress || "",
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()
      || clerkUser.username
      || "",
    mobile: clerkUser.primaryPhoneNumber?.phoneNumber
      || clerkUser.phoneNumbers?.[0]?.phoneNumber
      || "",
    role: ROLES.CUSTOMER,
    status: "active",
    approval: { status: "not_required" },
  };
};

export const findOrCreateUserProfile = async (clerkUserId, client = clerkClient, UserModel = User) => {
  let profile = await UserModel.findOne({ clerkUserId });
  if (profile) return profile;

  const clerkUser = await client.users.getUser(clerkUserId);
  const candidate = profileFromClerkUser(clerkUser);
  if (!candidate.email) throw new ApiError(422, "A verified email address is required");

  try {
    profile = await UserModel.create(candidate);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    profile = await UserModel.findOne({ clerkUserId });
  }
  return profile;
};

const authenticateRequest = (allowBlockedAccount) => async (req, _res, next) => {
  try {
    const clerkAuth = getAuth(req, { acceptsToken: "session_token" });
    if (!clerkAuth.isAuthenticated || !clerkAuth.userId) {
      return next(new ApiError(401, "Authentication is required"));
    }

    const profile = await findOrCreateUserProfile(clerkAuth.userId);
    if (!allowBlockedAccount) assertAccountCanAuthenticate(profile);

    req.auth = Object.freeze({
      userId: clerkAuth.userId,
      clerkUserId: clerkAuth.userId,
      sessionId: clerkAuth.sessionId,
      role: profile.role,
      status: profile.status,
      approvalStatus: profile.approval?.status,
      profileId: String(profile._id),
    });
    req.userProfile = profile;
    return next();
  } catch (error) {
    if (error?.status === 401 || error?.statusCode === 401) {
      return next(new ApiError(401, "Invalid or expired Clerk session"));
    }
    return next(error);
  }
};

export const requireAuth = authenticateRequest(false);
export const resolveAuthProfile = authenticateRequest(true);

export const optionalAuth = async (req, _res, next) => {
  try {
    const clerkAuth = getAuth(req, { acceptsToken: "session_token" });
    if (!clerkAuth.isAuthenticated || !clerkAuth.userId) return next();
    return requireAuth(req, _res, next);
  } catch {
    return next();
  }
};

export const requireRole = (...roles) => {
  const allowedRoles = roles.map(normalizeRole).filter(Boolean);
  return (req, _res, next) => {
    if (!req.auth?.userId) return next(new ApiError(401, "Authentication is required"));
    if (!allowedRoles.includes(normalizeRole(req.auth.role))) {
      return next(new ApiError(403, "You do not have permission to access this resource"));
    }
    return next();
  };
};

export const requireCustomer = requireRole(ROLES.CUSTOMER);
export const requirePartner = requireRole(ROLES.PARTNER);
export const requireExpert = requireRole(ROLES.EXPERT);
export const requireAdmin = requireRole(ROLES.ADMIN);
