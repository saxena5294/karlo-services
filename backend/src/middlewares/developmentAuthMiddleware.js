import { ApiError } from "../utils/ApiError.js";
import { normalizeRole } from "../constants/roleConstants.js";

const isEnabled = () => process.env.DEV_AUTH_ENABLED?.toLowerCase() === "true";

const attachDevelopmentIdentity = (required) => (req, _res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (isEnabled() || required) {
      return next(new ApiError(503, "Temporary development authentication is unavailable"));
    }
    return next();
  }

  if (!isEnabled()) {
    return required
      ? next(new ApiError(503, "Development authentication is not enabled"))
      : next();
  }

  const userId = req.get("x-dev-user-id")?.trim() || process.env.DEV_USER_ID?.trim();
  const requestedRole = req.get("x-dev-role")?.trim() || process.env.DEV_USER_ROLE?.trim();
  const role = normalizeRole(requestedRole);

  if (!userId || !role) {
    return next(new ApiError(500, "Development authentication is misconfigured"));
  }

  // TODO(Clerk): replace this assignment with Clerk's authentication middleware.
  req.auth = Object.freeze({ userId, role });
  return next();
};

export const developmentAuth = attachDevelopmentIdentity(true);
export const optionalDevelopmentAuth = attachDevelopmentIdentity(false);

export const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.auth || !allowedRoles.includes(req.auth.role)) {
    return next(new ApiError(403, "You do not have permission to access this resource"));
  }
  return next();
};
