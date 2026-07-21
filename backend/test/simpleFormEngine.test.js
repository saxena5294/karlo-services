import assert from "node:assert/strict";
import test from "node:test";
import { Application } from "../src/models/applicationModel.js";
import { ServiceForm } from "../src/models/serviceFormModel.js";
import { MobileOtp } from "../src/models/mobileOtpModel.js";
import { conditionalMatches, getEffectiveFields } from "../src/services/formConfigurationService.js";
import { normalizeIndianMobile } from "../src/services/mobileVerificationService.js";
import { hasAllowedFileSignature, validateSubmission } from "../src/services/applicationService.js";

test("effective forms always include minimal bilingual identity fields", () => {
  const fields = getEffectiveFields({ requireEmail: false, fields: [{ name: "passportType", label: "Passport type", type: "select", options: [] }] });
  assert.deepEqual(fields.slice(0, 3).map(({ name }) => name), ["applicantName", "mobileNumber", "email"]);
  assert.equal(fields.find(({ name }) => name === "email").required, false);
  assert.equal(fields[0].labelHindi, "आवेदक का नाम");
});

test("conditional fields support equality, inequality and membership", () => {
  assert.equal(conditionalMatches({ field: "type", operator: "equals", value: "renewal" }, { type: "renewal" }), true);
  assert.equal(conditionalMatches({ field: "type", operator: "not_equals", value: "renewal" }, { type: "fresh" }), true);
  assert.equal(conditionalMatches({ field: "type", operator: "in", value: ["a", "b"] }, { type: "b" }), true);
});

test("Indian mobile normalization accepts 10 digits or country code and rejects invalid numbers", () => {
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "9876543210");
  assert.throws(() => normalizeIndianMobile("12345"), /valid 10-digit/);
});

test("file signatures recognize JPG, PNG and PDF content", () => {
  assert.equal(hasAllowedFileSignature({ mimetype: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) }), true);
  assert.equal(hasAllowedFileSignature({ mimetype: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }), true);
  assert.equal(hasAllowedFileSignature({ mimetype: "application/pdf", buffer: Buffer.from("%PDF-1.7") }), true);
});

test("submission validation requires basic details, declaration and at most six extras", () => {
  const form = { requireEmail: false, maxAdditionalDocuments: 6, fields: [{ name: "proof", label: "Proof", type: "file", required: false, options: [], maxFileSizeMb: 10, maxFiles: 1 }] };
  const validBody = { applicantName: "राम कुमार", mobileNumber: "9876543210", termsAccepted: "true" };
  const extraFiles = Array.from({ length: 7 }, (_, index) => ({ fieldname: `additionalDocument__${index}`, originalname: "proof.pdf", mimetype: "application/pdf", size: 8, buffer: Buffer.from("%PDF-1.7") }));
  assert.ok(validateSubmission(form, validBody, extraFiles).some((message) => message.includes("maximum of 6")));
});

test("submission validation accepts only 10-digit Indian mobile numbers", () => {
  const form = { requireEmail: false, fields: [] };
  const validBody = { applicantName: "Ram Kumar", mobileNumber: "9876543210", termsAccepted: "true" };

  assert.deepEqual(validateSubmission(form, validBody, []), []);
  for (const mobileNumber of ["987654321", "98765432101", "5876543210", "98765abc10", "+919876543210"]) {
    assert.ok(
      validateSubmission(form, { ...validBody, mobileNumber }, []).some((message) => message.includes("exactly 10 digits")),
      `${mobileNumber} should be rejected`
    );
  }
});

test("application schema stores labeled and additional document metadata with idempotency", () => {
  assert.ok(Application.schema.path("additionalDocuments"));
  assert.ok(Application.schema.indexes().some(([fields]) => fields.customerUserId === 1 && fields.submissionKey === 1));
  assert.ok(ServiceForm.schema.path("fields").schema.path("maxFiles"));
  assert.equal(Application.schema.path("mobileVerified").defaultValue, false);
});

test("mobile verification records persist one-time token consumption state", () => {
  assert.ok(MobileOtp.schema.path("verificationTokenHash"));
  assert.ok(MobileOtp.schema.path("verificationExpiresAt"));
  assert.ok(MobileOtp.schema.path("consumedAt"));
});
