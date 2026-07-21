import { ApiError } from "../utils/ApiError.js";
import { normalizeRole, ROLE_VALUES } from "../constants/roleConstants.js";

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

  const userId = req.get("x-dev-user-id")?.trim();
  const requestedRole = req.get("x-dev-role")?.trim();
  const role = normalizeRole(requestedRole);

  if (!userId || !requestedRole) {
    return next(new ApiError(401, "Authentication is required"));
  }
  if (!role) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[authorization-denied]", {
        method: req.method,
        url: req.originalUrl,
        userId,
        role: requestedRole,
        allowedRoles: ROLE_VALUES,
      });
    }
    return next(new ApiError(403, "You do not have permission to access this resource"));
  }

  // TODO(Clerk): replace this assignment with Clerk's authentication middleware.
  req.auth = Object.freeze({ userId, role });
  return next();
};

export const developmentAuth = attachDevelopmentIdentity(true);
export const optionalDevelopmentAuth = attachDevelopmentIdentity(false);

export const requireRole = (...roles) => {
  const allowedRoles = roles.map(normalizeRole).filter(Boolean);
  return (req, _res, next) => {
    const currentRole = normalizeRole(req.auth?.role);
    if (!currentRole) {
      return next(new ApiError(401, "Authentication is required"));
    }
    if (!allowedRoles.includes(currentRole)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[authorization-denied]", {
          method: req.method,
          url: req.originalUrl,
          routePath: req.route?.path,
          userId: req.auth?.userId,
          role: req.auth?.role,
          allowedRoles,
          origin: req.get("origin") || null,
          developmentHeaders: {
            userIdPresent: Boolean(req.get("x-dev-user-id")),
            rolePresent: Boolean(req.get("x-dev-role")),
          },
        });
      }
      return next(new ApiError(403, "You do not have permission to access this resource"));
    }
    return next();
  };
};
