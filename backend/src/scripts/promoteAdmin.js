import "../config/environment.js";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/userModel.js";

const clerkUserId = process.argv[2]?.trim();
if (!clerkUserId) throw new Error("Usage: npm run promote:admin -- <clerkUserId>");

await connectDatabase();
const user = await User.findOneAndUpdate(
  { clerkUserId },
  { $set: { role: "admin", status: "active", "approval.status": "approved", "approval.reviewedAt": new Date() } },
  { returnDocument: "after", runValidators: true },
);
if (!user) throw new Error("User profile not found. Sign in once before promotion.");
console.log(`Promoted Clerk user ${clerkUserId} to admin.`);
await mongoose.disconnect();
