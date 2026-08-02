import { ApiError } from "../utils/ApiError.js";

const requireApproved = (roleLabel) => (req, _res, next) => {
  if (req.auth?.status === "pending") return next(new ApiError(403, `${roleLabel} approval is pending`));
  if (req.auth?.status !== "approved") return next(new ApiError(403, `${roleLabel} approval is required`));
  return next();
};

export const requireApprovedPartnerAccount = requireApproved("Partner");
export const requireApprovedExpertAccount = requireApproved("Expert");
