import { isLeadMarketplaceEnabled } from "../config/features.js";
import { ApiError } from "../utils/ApiError.js";

export const requireLeadMarketplace = (_req, _res, next) => {
  if (!isLeadMarketplaceEnabled()) {
    return next(new ApiError(404, "Route not found"));
  }
  return next();
};
