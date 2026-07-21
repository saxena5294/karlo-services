import assert from "node:assert/strict";
import test from "node:test";
import { ROLES } from "../src/constants/roleConstants.js";
import { Application } from "../src/models/applicationModel.js";
import { NOTIFICATION_TYPES } from "../src/models/notificationModel.js";
import { buildDocumentAccessUrl, canAccessApplicationDocument, DOCUMENT_ACTIONS, getDocumentId, toSafeDocumentMetadata } from "../src/services/documentAccessService.js";

const document = { _id: "67f000000000000000000010", fieldName: "identity", label: "Identity proof", originalName: "proof.pdf", publicId: "private/internal-id", secureUrl: "https://legacy.example/file", resourceType: "image", deliveryType: "authenticated", format: "pdf", mimeType: "application/pdf", size: 20, replacementRequested: false };
const application = { _id: "67f000000000000000000020", customerUserId: "customer_1", assignmentType: "partner", assignedPartnerId: "partner_1", assignedExpertId: "expert_1" };
const allowed = (role, userId, action, item = document, target = application) => canAccessApplicationDocument({ role, userId, action, document: item, application: target });

test("document access follows customer ownership, current assignments and admin authority", () => {
  assert.equal(allowed(ROLES.CUSTOMER, "customer_1", DOCUMENT_ACTIONS.PREVIEW), true);
  assert.equal(allowed(ROLES.CUSTOMER, "customer_2", DOCUMENT_ACTIONS.PREVIEW), false);
  assert.equal(allowed(ROLES.PARTNER, "partner_1", DOCUMENT_ACTIONS.DOWNLOAD), true);
  assert.equal(allowed(ROLES.PARTNER, "partner_2", DOCUMENT_ACTIONS.DOWNLOAD), false);
  assert.equal(allowed(ROLES.EXPERT, "expert_1", DOCUMENT_ACTIONS.PREVIEW), true);
  assert.equal(allowed(ROLES.EXPERT, "expert_2", DOCUMENT_ACTIONS.PREVIEW), false);
  assert.equal(allowed(ROLES.ADMIN, "admin_1", DOCUMENT_ACTIONS.PREVIEW), true);
  assert.equal(allowed(undefined, undefined, DOCUMENT_ACTIONS.PREVIEW), false);
});

test("only admins review documents and replacements require an explicit request", () => {
  assert.equal(allowed(ROLES.ADMIN, "admin_1", DOCUMENT_ACTIONS.VERIFY), true);
  assert.equal(allowed(ROLES.EXPERT, "expert_1", DOCUMENT_ACTIONS.VERIFY), false);
  assert.equal(allowed(ROLES.CUSTOMER, "customer_1", DOCUMENT_ACTIONS.REPLACE), false);
  assert.equal(allowed(ROLES.CUSTOMER, "customer_1", DOCUMENT_ACTIONS.REPLACE, { ...document, replacementRequested: true }), true);
  assert.equal(allowed(ROLES.PARTNER, "partner_1", DOCUMENT_ACTIONS.REPLACE, { ...document, replacementRequested: true }), true);
});

test("safe metadata never exposes Cloudinary storage identifiers or permanent URLs", () => {
  const metadata = toSafeDocumentMetadata({ userId: "customer_1", role: ROLES.CUSTOMER, application, document, collection: "files" });
  assert.match(metadata.id, /^doc_[a-f0-9]{24}$/);
  assert.equal("publicId" in metadata, false);
  assert.equal("secureUrl" in metadata, false);
  assert.equal("deliveryType" in metadata, false);
  assert.equal(metadata.canPreview, true);
  assert.equal(getDocumentId({ publicId: "legacy" }, "files"), getDocumentId({ publicId: "legacy" }, "files"));
});

test("short-lived Cloudinary access can be regenerated after expiry", () => {
  process.env.CLOUDINARY_CLOUD_NAME ||= "test-cloud";
  process.env.CLOUDINARY_API_KEY ||= "test-key";
  process.env.CLOUDINARY_API_SECRET ||= "test-secret";
  const first = buildDocumentAccessUrl(document, false, 1_700_000_000_000);
  const regenerated = buildDocumentAccessUrl(document, false, 1_700_000_600_000);
  assert.notEqual(first.url, regenerated.url);
  assert.notEqual(first.expiresAt, regenerated.expiresAt);
  assert.ok(new Date(first.expiresAt).getTime() - 1_700_000_000_000 <= 300_000);
});

test("application documents and workflow notification types retain required audit metadata", () => {
  assert.ok(Application.schema.path("files").schema.path("verificationHistory"));
  assert.ok(Application.schema.path("files").schema.path("replacementRequested"));
  for (const type of ["document_verified", "document_rejected", "document_reupload_requested", "document_replacement_submitted"]) assert.ok(NOTIFICATION_TYPES.includes(type));
});
