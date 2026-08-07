import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { ROLES } from "../constants/roleConstants.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { User } from "../models/userModel.js";

const apply = process.argv.includes("--apply");
const stateFor = (verificationStatus) => {
  if (["pending", "under_review"].includes(verificationStatus)) return { status: "pending", approvalStatus: "pending" };
  if (verificationStatus === "approved") return { status: "active", approvalStatus: "approved" };
  if (verificationStatus === "rejected") return { status: "rejected", approvalStatus: "rejected" };
  if (verificationStatus === "suspended") return { status: "suspended", approvalStatus: "approved" };
  return null;
};

await connectDatabase();
try {
  const [profiles, partnerUsers] = await Promise.all([
    PartnerProfile.find().select("userId verificationStatus").lean(),
    User.find({ role: ROLES.PARTNER }).select("clerkUserId").lean(),
  ]);
  const profileIds = new Set(profiles.map((profile) => profile.userId));
  let changed = 0;
  for (const profile of profiles) {
    const account = await User.findOne({ clerkUserId: profile.userId });
    if (!account) { console.log(`[orphan-profile] ${profile.userId}`); continue; }
    const desired = stateFor(profile.verificationStatus);
    if (!desired) continue;
    const mismatch = account.role !== ROLES.PARTNER || account.status !== desired.status || account.approval?.status !== desired.approvalStatus;
    if (!mismatch) continue;
    console.log(`[repair] ${profile.userId}: ${account.role}/${account.status}/${account.approval?.status} -> partner/${desired.status}/${desired.approvalStatus}`);
    if (apply) {
      await User.updateOne({ _id: account._id }, { $set: { role: ROLES.PARTNER, status: desired.status, "approval.status": desired.approvalStatus } }, { runValidators: true });
      changed += 1;
    }
  }
  for (const account of partnerUsers) if (!profileIds.has(account.clerkUserId)) console.log(`[missing-profile] ${account.clerkUserId}`);
  console.log(apply ? `[complete] ${changed} linked account(s) repaired.` : "[dry-run] No data changed. Re-run with --apply to repair only linked mismatches.");
} finally {
  await mongoose.disconnect();
}
