import mongoose from "mongoose";
import { ROLES } from "../constants/roleConstants.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { User } from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";

const DECISIONS = new Set(["approve", "reject", "suspend", "activate", "deactivate"]);

const cleanNote = (value) => String(value || "").replace(/[<>]/g, "").trim().slice(0, 500);

const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, `${label} not found`);
};

export const decisionState = (decision) => {
  if (!DECISIONS.has(decision)) throw new ApiError(400, "Decision must be approve, reject, suspend, activate, or deactivate");
  if (decision === "approve" || decision === "activate") {
    return { status: "active", approvalStatus: "approved", profileStatus: "approved", isActive: true };
  }
  if (decision === "reject") {
    return { status: "rejected", approvalStatus: "rejected", profileStatus: "rejected", isActive: false };
  }
  if (decision === "suspend") {
    return { status: "suspended", approvalStatus: "approved", profileStatus: "suspended", isActive: false };
  }
  return { status: "inactive", approvalStatus: "approved", profileStatus: "approved", isActive: false };
};

const approvalUpdate = ({ state, adminUserId, note, reviewedAt }) => ({
  status: state.status,
  "approval.status": state.approvalStatus,
  "approval.reviewedBy": adminUserId,
  "approval.reviewedAt": reviewedAt,
  "approval.reason": cleanNote(note),
});

export const decidePartnerAccount = async ({ id, decision, adminUserId, note = "" }) => {
  assertObjectId(id, "Partner profile");
  const state = decisionState(decision);
  const profile = await PartnerProfile.findById(id).lean();
  if (!profile) throw new ApiError(404, "Partner profile not found");
  const account = await User.findOne({ clerkUserId: profile.userId, role: ROLES.PARTNER });
  if (!account) throw new ApiError(409, "Partner profile is not linked to a Partner user account");

  const reviewedAt = new Date();
  await User.updateOne(
    { _id: account._id, role: ROLES.PARTNER },
    { $set: approvalUpdate({ state, adminUserId, note, reviewedAt }) },
    { runValidators: true },
  );
  const partner = await PartnerProfile.findByIdAndUpdate(
    id,
    { $set: { verificationStatus: state.profileStatus, isActive: state.isActive, availability: state.isActive && profile.availability } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  return { partner, account: await User.findById(account._id).lean(), decision, note: cleanNote(note) };
};

export const decideExpertAccount = async ({ id, decision, adminUserId, note = "" }) => {
  assertObjectId(id, "Expert profile");
  const state = decisionState(decision);
  const profile = await ExpertProfile.findById(id).lean();
  if (!profile) throw new ApiError(404, "Expert profile not found");
  const account = await User.findOne({ clerkUserId: profile.userId, role: ROLES.EXPERT });
  if (!account) throw new ApiError(409, "Expert profile is not linked to an Expert user account");

  const reviewedAt = new Date();
  await User.updateOne(
    { _id: account._id, role: ROLES.EXPERT },
    { $set: approvalUpdate({ state, adminUserId, note, reviewedAt }) },
    { runValidators: true },
  );
  const profileStatus = state.profileStatus === "approved" ? "active" : state.profileStatus;
  const expert = await ExpertProfile.findByIdAndUpdate(
    id,
    { $set: { status: profileStatus, availability: state.isActive && profile.availability } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  return { expert, account: await User.findById(account._id).lean(), decision, note: cleanNote(note) };
};

export const changeCustomerStatus = async ({ id, status, adminUserId, note = "" }) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Customer not found");
  if (!["active", "inactive", "suspended"].includes(status)) {
    throw new ApiError(400, "Customer status must be active, inactive, or suspended");
  }
  const customer = await User.findOneAndUpdate(
    { _id: id, role: ROLES.CUSTOMER },
    { $set: { status, "approval.status": "not_required", "approval.reviewedBy": adminUserId, "approval.reviewedAt": new Date(), "approval.reason": cleanNote(note) } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
};
