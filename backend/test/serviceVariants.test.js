import assert from "node:assert/strict";
import test from "node:test";
import { parentServiceSeedData, serviceCatalogSeedData } from "../src/config/serviceCatalogSeedData.js";
import { normalizeServiceForClient, Service } from "../src/models/serviceModel.js";
import { Application } from "../src/models/applicationModel.js";
import { assertVariantAvailable, normalizeVariantKey, resolveVariant, variantForm } from "../src/services/serviceVariantService.js";
import { validateSubmission } from "../src/services/applicationService.js";
import { appendSelectedVariant } from "../../frontend/src/utils/applicationPayload.js";

const parent = (slug) => parentServiceSeedData.find((service) => service.slug === slug);

test("catalog exposes one PAN and one Passport parent with required variants", () => {
  assert.equal(serviceCatalogSeedData.filter(({ slug }) => slug === "pan-card").length, 1);
  assert.deepEqual(parent("pan-card").variants.slice(0, 2).map(({ key }) => key), ["new", "correction"]);
  assert.equal(serviceCatalogSeedData.filter(({ slug }) => slug === "passport").length, 1);
  assert.deepEqual(parent("passport").variants.map(({ key }) => key), ["normal", "tatkal", "renewal"]);
});

test("grouped families and search keywords cover requested discovery terms", () => {
  const groups = new Set(parentServiceSeedData.map(({ slug }) => slug));
  for (const slug of ["insurance", "police-e-help", "edistrict-services", "epfo", "aadhaar-services", "driving-licence", "typing-services", "other-forms"]) assert.ok(groups.has(slug));
  assert.ok(parent("pan-card").variants.some(({ keywords }) => keywords.includes("correction")));
  assert.ok(parent("passport").keywords.includes("tatkal"));
  assert.ok(parent("police-e-help").keywords.includes("fir"));
});

test("parent summaries are derived from active variants", async () => {
  const service = new Service(parent("pan-card")); await service.validate();
  const result = normalizeServiceForClient(service);
  assert.equal(result.variantCount, 5); assert.equal(result.availabilityStatus, "available");
  assert.equal(result.priceSummary.type, "government_portal");
  const fixedOnly = new Service({ ...parent("pan-card"), slug: "fixed-pan", variants: parent("pan-card").variants.slice(0, 2) }); await fixedOnly.validate();
  const summary = normalizeServiceForClient(fixedOnly).priceSummary;
  assert.deepEqual([summary.type, summary.minimum, summary.maximum], ["range", 157, 207]);
});

test("unavailable variants are rejected without blocking available siblings", () => {
  const railway = parent("railway-ticket");
  assert.throws(() => assertVariantAvailable(railway, "tatkal"), /currently unavailable/);
  assert.equal(assertVariantAvailable(railway, "sleeper").key, "sleeper");
});

test("standalone services accept no variant and reject an inappropriate variant", () => {
  const standalone = serviceCatalogSeedData.find(({ variants = [] }) => variants.length === 0);
  assert.ok(standalone);
  assert.equal(assertVariantAvailable(standalone), null);
  assert.throws(
    () => assertVariantAvailable(standalone, "income-certificate"),
    /does not support variants/,
  );
});

test("parent services require a valid variant from that service", () => {
  const edistrict = parent("edistrict-services");
  assert.equal(assertVariantAvailable(edistrict, " INCOME-CERTIFICATE ").key, "income-certificate");
  assert.throws(() => assertVariantAvailable(edistrict), /variant is required/);
  assert.throws(() => assertVariantAvailable(edistrict, "not-a-variant"), /variant is invalid/);
  assert.throws(() => assertVariantAvailable(edistrict, "tatkal"), /variant is invalid/);
});

test("inactive variants are distinguished from invalid variants", () => {
  const edistrict = structuredClone(parent("edistrict-services"));
  edistrict.variants[0].isActive = false;
  assert.throws(
    () => assertVariantAvailable(edistrict, edistrict.variants[0].key),
    /variant is inactive/,
  );
});

test("variant keys must be non-empty strings and are normalized case-insensitively", () => {
  assert.equal(normalizeVariantKey("  Income-Certificate  "), "income-certificate");
  assert.equal(normalizeVariantKey(undefined), null);
  assert.throws(() => normalizeVariantKey("   "), /variant is required/);
  assert.throws(() => normalizeVariantKey(["income-certificate"]), /variant is invalid/);
});

test("variantKey is an explicit submission field while unrelated fields remain rejected", () => {
  const form = { requireEmail: false, fields: [] };
  const body = {
    applicantName: "Ram Kumar",
    mobileNumber: "9876543210",
    termsAccepted: "true",
    variantKey: "income-certificate",
  };
  assert.deepEqual(validateSubmission(form, body, []), []);
  assert.ok(
    validateSubmission(form, { ...body, frontendPrice: "1" }, [])
      .includes("Unexpected field: frontendPrice"),
  );
});

test("frontend appends variantKey only for a genuine non-empty selection", () => {
  const entries = [];
  const payload = { append: (...entry) => entries.push(entry) };
  appendSelectedVariant(payload, null);
  appendSelectedVariant(payload, { key: "" });
  appendSelectedVariant(payload, { key: "   " });
  assert.deepEqual(entries, []);
  appendSelectedVariant(payload, { key: " income-certificate " });
  assert.deepEqual(entries, [["variantKey", "income-certificate"]]);
});

test("applications created before variants remain readable with empty optional snapshots", () => {
  const legacyApplication = Application.hydrate({
    _id: "507f1f77bcf86cd799439010",
    applicationNumber: "KARLO-2026-LEGACY",
    service: "507f1f77bcf86cd799439011",
    serviceForm: "507f1f77bcf86cd799439012",
    formData: {},
    status: "Submitted",
  });
  assert.equal(legacyApplication.applicationNumber, "KARLO-2026-LEGACY");
  assert.equal(legacyApplication.variantKey, "");
  assert.equal(legacyApplication.variantTitle, "");
  assert.equal(legacyApplication.variantSlug, "");
});

test("legacy slug lookup selects the corresponding variant and variant form overrides base fields", () => {
  const pan = parent("pan-card");
  assert.equal(resolveVariant(pan, "", "pan-correction").key, "correction");
  const configured = variantForm({ title: "Base", fields: [{ name: "base" }] }, pan.variants[0]);
  assert.ok(configured.fields.some(({ name }) => name === "fatherName"));
});

test("variant keys are unique and application snapshot fields exist", () => {
  for (const service of parentServiceSeedData) assert.equal(new Set(service.variants.map(({ key }) => key)).size, service.variants.length);
  for (const path of ["parentServiceId", "parentServiceTitle", "parentServiceSlug", "variantKey", "variantTitle", "variantSlug", "pricingSnapshot", "processingTimeSnapshot", "formConfigurationSnapshot", "requiredDocumentSnapshot"]) assert.ok(Application.schema.path(path));
});

test("eDistrict is the only certificate parent and exposes the requested variant keys", () => {
  const edistrict = parent("edistrict-services");
  assert.ok(edistrict);
  assert.equal(parentServiceSeedData.some(({ slug }) => slug === "certificates"), false);
  assert.deepEqual(edistrict.variants.map(({ key }) => key), ["income-certificate", "domicile-certificate", "caste-certificate"]);
  assert.equal(edistrict.variantSelectionLabel, "Choose Certificate Type");
  assert.equal(edistrict.category, "certificates");
});

test("certificate variants use any-one address proof and caste-only family proof", () => {
  const variants = parent("edistrict-services").variants;
  for (const variant of variants) {
    const addressProof = variant.formConfiguration.fields.find(({ name }) => name === "addressProof");
    assert.equal(addressProof.required, true);
    assert.equal(addressProof.documentOptions.length, 4);
    assert.equal(variant.formConfiguration.fields.some(({ name }) => name === "fatherName"), true);
    assert.equal(variant.formConfiguration.fields.some(({ name }) => name === "motherName"), true);
  }
  assert.equal(variants[0].formConfiguration.fields.some(({ name }) => name === "familyCasteCertificate"), false);
  assert.equal(variants[1].formConfiguration.fields.some(({ name }) => name === "familyCasteCertificate"), false);
  assert.equal(variants[2].formConfiguration.fields.some(({ name }) => name === "familyCasteCertificate"), true);
});
