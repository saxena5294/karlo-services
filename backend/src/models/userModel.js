import mongoose from "mongoose";
import { ROLE_VALUES, ROLES } from "../constants/roleConstants.js";

export const ACCOUNT_STATUSES = Object.freeze([
  "active",
  "pending",
  "approved",
  "rejected",
  "suspended",
  "inactive",
]);

export const APPROVAL_STATUSES = Object.freeze([
  "not_required",
  "pending",
  "approved",
  "rejected",
]);

const userSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, trim: true, default: "", maxlength: 120 },
    mobile: { type: String, trim: true, default: "", maxlength: 24 },
    address: { type: String, trim: true, default: "", maxlength: 500 },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.CUSTOMER, index: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "active", index: true },
    approval: {
      status: { type: String, enum: APPROVAL_STATUSES, default: "not_required" },
      reviewedBy: { type: String, trim: true, default: "" },
      reviewedAt: { type: Date, default: null },
      reason: { type: String, trim: true, default: "", maxlength: 500 },
    },
  },
  { timestamps: true, collection: "users" },
);

userSchema.index({ role: 1, status: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
