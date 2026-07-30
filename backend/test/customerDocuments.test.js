import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOMER_DOCUMENT_TYPE_VALUES, DOCUMENT_VERIFICATION_STATUSES } from "../src/constants/customerDocumentConstants.js";
import { ROLES } from "../src/constants/roleConstants.js";
import { CustomerDocument } from "../src/models/customerDocumentModel.js";
import { CustomerDocumentVersion } from "../src/models/customerDocumentVersionModel.js";
import {
  canAccessCustomerDocument,
  getDocumentExpiryStatus,
  listDocumentTypes,
} from "../src/services/customerDocumentService.js";

test("customer document types are reusable configuration and include common Indian identity documents", () => {
  const configuration = listDocumentTypes();
  assert.ok(CUSTOMER_DOCUMENT_TYPE_VALUES.includes("aadhaar-card"));
  assert.ok(CUSTOMER_DOCUMENT_TYPE_VALUES.includes("pan-card"));
  assert.ok(CUSTOMER_DOCUMENT_TYPE_VALUES.includes("other"));
  assert.deepEqual(configuration.verificationStatuses, DOCUMENT_VERIFICATION_STATUSES);
  assert.ok(configuration.maxUploadMb >= 1);
});

test("customer document schema protects storage metadata and validates dates", async () => {
  assert.equal(CustomerDocument.schema.path("cloudinaryPublicId").options.select, false);
  assert.equal(CustomerDocument.schema.path("cloudinarySecureUrl").options.select, false);
  const document = new CustomerDocument({
    customerUserId: "customer_1",
    documentType: "passport",
    documentName: "Passport",
    fileName: "passport",
    originalFileName: "passport.pdf",
    mimeType: "application/pdf",
    fileSize: 200,
    cloudinaryPublicId: "private/passport",
    cloudinarySecureUrl: "https://res.cloudinary.com/private",
    resourceType: "image",
    folder: "karlo-services/customers/customer_1/documents/passport",
    issueDate: new Date("2030-01-01"),
    expiryDate: new Date("2029-01-01"),
    uploadedBy: "customer_1",
    uploadedByRole: "customer",
  });
  await assert.rejects(document.validate(), /Expiry date cannot be earlier than issue date/);
});

test("document and version indexes support owner lists, application access, expiry, and immutable history", () => {
  const documentIndexes = CustomerDocument.schema.indexes().map(([fields]) => fields);
  assert.ok(documentIndexes.some((fields) => fields.customerUserId === 1 && fields.isDeleted === 1));
  assert.ok(documentIndexes.some((fields) => fields.applications === 1 && fields.isDeleted === 1));
  assert.ok(documentIndexes.some((fields) => fields.expiryDate === 1 && fields.isDeleted === 1));
  const versionIndex = CustomerDocumentVersion.schema.indexes()
    .find(([fields, options]) => fields.document === 1 && fields.versionNumber === -1 && options.unique);
  assert.ok(versionIndex);
});

test("expiry status is calculated consistently on the backend", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");
  assert.equal(getDocumentExpiryStatus(null, now), "no_expiry");
  assert.equal(getDocumentExpiryStatus("2026-07-30", now), "expired");
  assert.equal(getDocumentExpiryStatus("2026-08-05", now), "expiring_soon");
  assert.equal(getDocumentExpiryStatus("2027-08-05", now), "valid");
});

test("document permissions enforce ownership, current assignment, locks, and admin-only recovery", () => {
  assert.equal(canAccessCustomerDocument({ role: ROLES.CUSTOMER, owner: true, action: "download" }), true);
  assert.equal(canAccessCustomerDocument({ role: ROLES.CUSTOMER, owner: true, isLocked: true, action: "replace" }), false);
  assert.equal(canAccessCustomerDocument({ role: ROLES.EXPERT, assigned: true, action: "verify" }), true);
  assert.equal(canAccessCustomerDocument({ role: ROLES.EXPERT, assigned: false, action: "download" }), false);
  assert.equal(canAccessCustomerDocument({ role: ROLES.PARTNER, assigned: true, action: "delete" }), false);
  assert.equal(canAccessCustomerDocument({ role: ROLES.ADMIN, isDeleted: true, action: "restore" }), true);
  assert.equal(canAccessCustomerDocument({ role: ROLES.CUSTOMER, owner: true, isDeleted: true, action: "restore" }), false);
});
