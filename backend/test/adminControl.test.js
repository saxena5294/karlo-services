import assert from "node:assert/strict";
import test from "node:test";
import { AuditLog } from "../src/models/auditLogModel.js";
import { ROLES } from "../src/constants/roleConstants.js";
import { requireRole } from "../src/middlewares/developmentAuthMiddleware.js";
import { sanitizeAuditValue } from "../src/services/auditService.js";

test("non-admin identities receive a 403 from the shared admin role guard", () => {
  for (const role of [ROLES.CUSTOMER, ROLES.EXPERT, ROLES.PARTNER]) {
    let result;
    requireRole(ROLES.ADMIN)({ auth: { userId: `dev_${role}`, role } }, {}, (error) => { result = error; });
    assert.equal(result?.statusCode, 403);
  }
});

test("admin identities pass the shared admin role guard", () => {
  let result = "not-called";
  requireRole(ROLES.ADMIN)({ auth: { userId: "dev_admin", role: ROLES.ADMIN } }, {}, (error) => { result = error; });
  assert.equal(result, undefined);
});

test("audit sanitizer removes secrets, uploaded document data, and form submissions", () => {
  const clean = sanitizeAuditValue({
    status: "approved",
    password: "never-store",
    accessToken: "never-store",
    verificationDocuments: [{ secureUrl: "private", publicId: "private" }],
    formData: { aadhaar: "private" },
    nested: { serviceTitle: "PAN service", secretKey: "private" },
  });
  assert.deepEqual(clean, { status: "approved", nested: { serviceTitle: "PAN service" } });
});

test("audit model has entity and actor history indexes", () => {
  const indexes = AuditLog.schema.indexes().map(([fields]) => Object.keys(fields).join(","));
  assert.ok(indexes.includes("entityType,entityId,createdAt"));
  assert.ok(indexes.includes("actorUserId,createdAt"));
});
