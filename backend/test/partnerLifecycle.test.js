import test from "node:test";
import assert from "node:assert/strict";
import { mergePendingPartnerAccounts } from "../src/services/partnerMarketplaceService.js";

test("pending Partner approvals are User-first and retain incomplete onboarding accounts", () => {
  const accounts = [
    { _id: "mongo-user-1", clerkUserId: "user_complete", name: "Complete", approval: { status: "pending" } },
    { _id: "mongo-user-2", clerkUserId: "user_incomplete", name: "Incomplete", approval: { status: "pending" } },
  ];
  const profiles = [{ _id: "profile-1", userId: "user_complete", businessName: "Complete Business", verificationStatus: "pending" }];
  const rows = mergePendingPartnerAccounts(accounts, profiles);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].onboardingComplete, true);
  assert.equal(rows[0].account, accounts[0]);
  assert.equal(rows[1].onboardingComplete, false);
  assert.equal(rows[1].businessName, "Onboarding incomplete");
});
