import { PartnerProfile } from "../models/partnerProfileModel.js";
import { ApiError } from "../utils/ApiError.js";

export const requireApprovedPartner = async (req, _res, next) => {
  try {
    const profile = await PartnerProfile.findOne({
      userId: req.auth.userId,
      verificationStatus: "approved",
      isActive: true,
    }).select("_id availability").lean();
    if (!profile) return next(new ApiError(403, "Partner approval is required"));
    req.partnerProfile = Object.freeze(profile);
    return next();
  } catch (error) {
    return next(error);
  }
};
