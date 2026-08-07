import { ApiError } from "../utils/ApiError.js";

const requireApproved = (roleLabel) => (req, _res, next) => {
  if (req.auth?.approvalStatus === "pending") return next(new ApiError(403, `${roleLabel} approval is pending`));
  if (req.auth?.approvalStatus !== "approved" || !["active", "approved"].includes(req.auth?.status)) {
    return next(new ApiError(403, `${roleLabel} approval and an active account are required`));
  }
  return next();
};

export const requireApprovedPartnerAccount = requireApproved("Partner");
export const requireApprovedExpertAccount = requireApproved("Expert");
