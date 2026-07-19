import assert from "node:assert/strict";
import test from "node:test";
import { serviceCatalogSeedData } from "../src/config/serviceCatalogSeedData.js";
import { AVAILABILITY_STATUSES, normalizeServiceForClient, PRICING_MODES, PROCESSING_TIME_UNITS, Service } from "../src/models/serviceModel.js";
import { assertServiceCanAcceptApplications } from "../src/services/serviceAvailabilityService.js";

const base = () => ({ title: "Test Service", slug: `test-${Math.random().toString(36).slice(2)}`, description: "A test service", category: "Testing", pricing: { governmentFee: 107, serviceCharge: 50, totalAmount: 9999, pricingMode: "fixed" }, estimatedProcessingTime: { value: 4, unit: "days", displayText: "3–4 days" } });

test("service schema exposes constrained pricing, processing and availability fields", () => {
  assert.deepEqual(Service.schema.path("pricing.pricingMode").enumValues, PRICING_MODES);
  assert.deepEqual(Service.schema.path("estimatedProcessingTime.unit").enumValues, PROCESSING_TIME_UNITS);
  assert.deepEqual(Service.schema.path("availabilityStatus").enumValues, AVAILABILITY_STATUSES);
  assert.equal(Service.schema.path("availabilityStatus").options.default, "available");
});

test("backend overwrites an untrusted total and synchronizes legacy fields", async () => {
  const service = new Service(base());
  await service.validate();
  assert.equal(service.pricing.totalAmount, 157);
  assert.equal(service.price, 157);
  assert.equal(service.processingTime, "3–4 days");
});

test("free pricing always stores zero and custom pricing requires a note", async () => {
  const free = new Service({ ...base(), slug: "free-test", pricing: { governmentFee: 100, serviceCharge: 20, pricingMode: "free" } });
  await free.validate();
  assert.equal(free.pricing.totalAmount, 0);
  const variable = new Service({ ...base(), slug: "variable-test", pricing: { pricingMode: "variable", governmentFee: 0, serviceCharge: 0, pricingNote: "" } });
  await assert.rejects(variable.validate(), /Pricing note is required/);
});

test("legacy service output preserves old price without inventing a government fee", () => {
  const result = normalizeServiceForClient({ title: "Legacy", price: 199, processingTime: "7 days" });
  assert.equal(result.pricing.governmentFee, 0);
  assert.equal(result.pricing.serviceCharge, 199);
  assert.equal(result.pricing.totalAmount, 199);
  assert.equal(result.pricing.requiresAdminReview, true);
  assert.equal(result.estimatedProcessingTime.displayText, "7 days");
});

test("application availability guard rejects inactive and unavailable services with editable messages", () => {
  assert.throws(() => assertServiceCanAcceptApplications({ isActive: false }), /currently inactive/);
  assert.throws(() => assertServiceCanAcceptApplications({ isActive: true, availabilityStatus: "coming_soon", availabilityMessage: "Pricing review in progress." }), /Pricing review in progress/);
  assert.equal(assertServiceCanAcceptApplications({ isActive: true, availabilityStatus: "available" }).availabilityStatus, "available");
});

test("catalog seed uses unique slugs, Karlo-only content, and review-safe pricing", () => {
  const slugs = serviceCatalogSeedData.map(({ slug }) => slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.length >= 20);
  assert.equal(JSON.stringify(serviceCatalogSeedData).toLowerCase().includes(`csc${"wale"}`), false);
  for (const service of serviceCatalogSeedData) {
    assert.equal(service.pricing.totalAmount, service.pricing.governmentFee + service.pricing.serviceCharge);
    if (!["fixed", "free"].includes(service.pricing.pricingMode)) assert.ok(service.pricing.pricingNote);
  }
});
