import { User } from "../models/userModel.js";

const CLERK_USER_ID_PATTERN = /^user_[A-Za-z0-9]+$/;

export const validateClerkUserId = (value) => {
  const clerkUserId = String(value || "").trim();
  if (!CLERK_USER_ID_PATTERN.test(clerkUserId)) {
    throw new Error("A valid Clerk user ID is required (expected format: user_xxxxx)");
  }
  return clerkUserId;
};

export const promoteAdminByClerkUserId = async ({
  clerkUserId,
  UserModel = User,
  reviewedAt = new Date(),
}) => {
  const normalizedId = validateClerkUserId(clerkUserId);
  const user = await UserModel.findOneAndUpdate(
    { clerkUserId: normalizedId },
    { $set: { role: "admin", status: "active", "approval.status": "approved", "approval.reviewedAt": reviewedAt } },
    { returnDocument: "after", runValidators: true },
  );
  if (!user) {
    throw new Error(
      `MongoDB user profile not found for ${normalizedId}. Sign in through this project's configured Clerk instance and complete GET /api/auth/me before retrying.`,
    );
  }
  return user;
};
