import test from "node:test";
import assert from "node:assert/strict";
import { serializeSafeLead, updatePartnerProfile } from "../src/services/partnerMarketplaceService.js";
import { Lead } from "../src/models/leadModel.js";
import { PartnerProfile } from "../src/models/partnerProfileModel.js";

test("pre-acceptance lead serialization uses an explicit privacy whitelist", () => {
  const response = serializeSafeLead({
    _id: "lead-id", service: "service-id", serviceTitle: "PAN Service", category: "Tax",
    city: "Nagpur", pincode: "440001", safeRequirementSummary: "Safe summary", leadPrice: 50,
    status: "open", createdAt: new Date(), expiresAt: new Date(), applicationNumber: "SECRET",
    customerName: "Private Customer", phone: "9999999999", email: "private@example.test",
    formData: { aadhaar: "secret" }, files: [{ secureUrl: "secret" }], privateRemarks: "secret",
  });
  assert.deepEqual(Object.keys(response).sort(), ["_id", "category", "city", "createdAt", "expiresAt", "leadPrice", "pincode", "safeRequirementSummary", "service", "serviceTitle", "status"].sort());
  assert.equal(response.customerName, undefined);
  assert.equal(response.applicationNumber, undefined);
});

test("verification documents are excluded from PartnerProfile queries by default", () => {
  assert.equal(PartnerProfile.schema.path("verificationDocuments").options.select, false);
});

test("lead schema includes marketplace lookup indexes", () => {
  const indexedFirstFields = new Set(Lead.schema.indexes().map(([fields]) => Object.keys(fields)[0]));
  for (const field of ["status", "category", "city", "pincode", "expiresAt", "acceptedByPartnerId"]) {
    assert.equal(indexedFirstFields.has(field), true, `${field} index missing`);
  }
});

test("partner profile updates cannot self-approve verification", async () => {
  await assert.rejects(
    updatePartnerProfile("dev_partner_001", { verificationStatus: "approved" }),
    /Partner cannot update: verificationStatus/
  );
});
