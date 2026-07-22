import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_STATUSES, APPLICATION_STATUS_TRANSITIONS } from "../src/constants/applicationConstants.js";
import { isLeadMarketplaceEnabled } from "../src/config/features.js";
import { PartnerProfile } from "../src/models/partnerProfileModel.js";
import { ASSIGNEE_STATUS_VALUES } from "../src/services/applicationService.js";

test("expert and partner assignees share the admin-review status contract", () => {
  assert.deepEqual([...ASSIGNEE_STATUS_VALUES], [
    APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
    APPLICATION_STATUSES.PROCESSING,
    APPLICATION_STATUSES.AWAITING_ADMIN_REVIEW,
  ]);
  assert.equal(ASSIGNEE_STATUS_VALUES.has(APPLICATION_STATUSES.COMPLETED), false);
  assert.equal(ASSIGNEE_STATUS_VALUES.has(APPLICATION_STATUSES.REJECTED), false);
});

test("completed work flows through admin review before completion", () => {
  assert.equal(APPLICATION_STATUS_TRANSITIONS[APPLICATION_STATUSES.PROCESSING].includes(APPLICATION_STATUSES.AWAITING_ADMIN_REVIEW), true);
  assert.equal(APPLICATION_STATUS_TRANSITIONS[APPLICATION_STATUSES.AWAITING_ADMIN_REVIEW].includes(APPLICATION_STATUSES.COMPLETED), true);
  assert.equal(APPLICATION_STATUS_TRANSITIONS[APPLICATION_STATUSES.PROCESSING].includes(APPLICATION_STATUSES.COMPLETED), false);
});

test("lead marketplace is disabled unless explicitly enabled", () => {
  assert.equal(isLeadMarketplaceEnabled({}), false);
  assert.equal(isLeadMarketplaceEnabled({ LEAD_MARKETPLACE_ENABLED: "false" }), false);
  assert.equal(isLeadMarketplaceEnabled({ LEAD_MARKETPLACE_ENABLED: "true" }), true);
  assert.equal(isLeadMarketplaceEnabled({ LEAD_MARKETPLACE_ENABLED: "TRUE" }), true);
});

test("self-registered partner profiles default to pending approval", () => {
  const profile = new PartnerProfile({
    userId: "partner-test",
    businessName: "Test Services",
    ownerName: "Test Owner",
    mobile: "9876543210",
    city: "Delhi",
    state: "Delhi",
    pincode: "110001",
    businessType: "Proprietorship",
  });
  assert.equal(profile.verificationStatus, "pending");
  assert.equal(profile.isActive, true);
  assert.equal(profile.availability, true);
});
