import test from "node:test";
import assert from "node:assert/strict";
import { promoteAdminByClerkUserId, validateClerkUserId } from "../src/services/adminPromotionService.js";

test("admin promotion validates Clerk user IDs", () => {
  assert.equal(validateClerkUserId(" user_Abc123 "), "user_Abc123");
  assert.throws(() => validateClerkUserId("admin@example.com"), /valid Clerk user ID/);
});

test("admin promotion is idempotent and never inserts a user", async () => {
  const stored = { clerkUserId: "user_Abc123", role: "customer", status: "active", approval: { status: "not_required" } };
  const calls = [];
  const UserModel = { findOneAndUpdate: async (filter, update, options) => {
    calls.push({ filter, update, options });
    if (filter.clerkUserId !== stored.clerkUserId) return null;
    stored.role = update.$set.role;
    stored.status = update.$set.status;
    stored.approval.status = update.$set["approval.status"];
    stored.approval.reviewedAt = update.$set["approval.reviewedAt"];
    return stored;
  } };
  await promoteAdminByClerkUserId({ clerkUserId: stored.clerkUserId, UserModel, reviewedAt: new Date("2026-01-01") });
  await promoteAdminByClerkUserId({ clerkUserId: stored.clerkUserId, UserModel, reviewedAt: new Date("2026-01-02") });
  assert.equal(stored.role, "admin");
  assert.equal(stored.status, "active");
  assert.equal(stored.approval.status, "approved");
  assert.equal(calls.length, 2);
  assert.equal(calls.every(({ options }) => options.upsert === undefined), true);
});

test("admin promotion clearly rejects a missing MongoDB profile", async () => {
  const UserModel = { findOneAndUpdate: async () => null };
  await assert.rejects(
    promoteAdminByClerkUserId({ clerkUserId: "user_Missing123", UserModel }),
    /MongoDB user profile not found.*GET \/api\/auth\/me/,
  );
});
