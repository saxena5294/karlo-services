import { PUBLIC_REGISTRATION_ROLES, ROLES } from "../constants/roleConstants.js";
import { User } from "../models/userModel.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { ApiError } from "../utils/ApiError.js";

export const serializeAuthProfile = (profile) => ({
  id: profile._id,
  mongoUserId: profile._id,
  clerkUserId: profile.clerkUserId,
  email: profile.email,
  name: profile.name,
  mobile: profile.mobile,
  address: profile.address,
  role: profile.role,
  status: profile.status,
  approval: profile.approval,
  profileComplete: Boolean(profile.mobile && (profile.role !== ROLES.CUSTOMER || profile.address)),
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

export const me = (req, res) => res.json({ success: true, profile: serializeAuthProfile(req.userProfile) });

export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ["name", "mobile", "address"];
    const unexpected = Object.keys(req.body).filter((key) => !allowed.includes(key));
    if (unexpected.length) throw new ApiError(400, `Unsupported profile fields: ${unexpected.join(", ")}`);
    const profile = await User.findByIdAndUpdate(
      req.userProfile._id,
      { $set: Object.fromEntries(allowed.filter((key) => key in req.body).map((key) => [key, req.body[key]])) },
      { returnDocument: "after", runValidators: true },
    );
    return res.json({ success: true, profile: serializeAuthProfile(profile) });
  } catch (error) { return next(error); }
};

const registerRoleHandler = (forcedRole) => async (req, res, next) => {
  try {
    const role = String(forcedRole || req.body.role || "").trim().toLowerCase();
    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      throw new ApiError(400, "Only partner or expert registration can be requested");
    }
    if (req.userProfile.role === ROLES.ADMIN) throw new ApiError(403, "Admin accounts cannot use public registration");
    if (req.userProfile.role !== ROLES.CUSTOMER && req.userProfile.role !== role) {
      throw new ApiError(409, "This account already has a different business role");
    }

    const profile = req.userProfile.role === role
      ? req.userProfile
      : await User.findByIdAndUpdate(
        req.userProfile._id,
        { $set: { role, status: "pending", "approval.status": "pending", "approval.reviewedBy": "", "approval.reviewedAt": null, "approval.reason": "" } },
        { returnDocument: "after", runValidators: true },
      );

    if (role === ROLES.EXPERT) {
      await ExpertProfile.findOneAndUpdate(
        { userId: profile.clerkUserId },
        { $setOnInsert: { userId: profile.clerkUserId, displayName: profile.name || "Expert", email: profile.email, phone: profile.mobile, status: "pending", availability: false, createdBy: profile.clerkUserId } },
        { upsert: true, runValidators: true },
      );
    }
    return res.json({ success: true, profile: serializeAuthProfile(profile) });
  } catch (error) { return next(error); }
};

export const registerRole = registerRoleHandler();
export const startPartnerOnboarding = registerRoleHandler(ROLES.PARTNER);
export const startExpertOnboarding = registerRoleHandler(ROLES.EXPERT);
