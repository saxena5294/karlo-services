import "../config/environment.js";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { promoteAdminByClerkUserId } from "../services/adminPromotionService.js";

const fromEnvironment = process.argv[2] === "--from-env";
const clerkUserId = fromEnvironment ? process.env.ADMIN_CLERK_USER_ID : process.argv[2];

try {
  await connectDatabase();
  const user = await promoteAdminByClerkUserId({ clerkUserId });
  console.log(`Admin promotion complete: ${user.clerkUserId} is role=${user.role}, status=${user.status}.`);
} catch (error) {
  console.error(`[promote-admin] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
