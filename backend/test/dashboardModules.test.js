import assert from "node:assert/strict";
import test from "node:test";
import { DeclarationForm, PaymentRecord, Referral, RewardRecord, SoftwareAsset, SupportTicket } from "../src/models/dashboardModuleModels.js";
import { ROLES } from "../src/constants/roleConstants.js";
import { requireRole } from "../src/middlewares/developmentAuthMiddleware.js";

test("dashboard financial records are role and user scoped", () => {
  assert.ok(PaymentRecord.schema.indexes().some(([fields]) => fields.userId === 1 && fields.userRole === 1));
  assert.ok(RewardRecord.schema.indexes().some(([fields]) => fields.userId === 1 && fields.userRole === 1));
});

test("software and declaration URLs reject non-HTTPS values", () => {
  assert.ok(new SoftwareAsset({ name: "Tool", downloadUrl: "http://unsafe.example", createdBy: "admin", updatedBy: "admin" }).validateSync()?.errors.downloadUrl);
  assert.ok(new DeclarationForm({ title: "Form", fileName: "form.pdf", fileUrl: "javascript:alert(1)", createdBy: "admin", updatedBy: "admin" }).validateSync()?.errors.fileUrl);
});

test("referrals prevent duplicate claims through a unique referred-user index", () => {
  assert.equal(Referral.schema.path("referredUserId").options.unique, true);
});

test("support tickets include owner and status indexes", () => {
  assert.ok(SupportTicket.schema.indexes().some(([fields]) => fields.createdByUserId === 1 && fields.createdByRole === 1 && fields.status === 1));
});

test("renewal guard accepts partners and rejects customers", () => {
  let partnerResult = "not-called"; let customerResult;
  requireRole(ROLES.PARTNER)({ auth: { userId: "partner", role: ROLES.PARTNER } }, {}, (error) => { partnerResult = error; });
  requireRole(ROLES.PARTNER)({ auth: { userId: "customer", role: ROLES.CUSTOMER } }, {}, (error) => { customerResult = error; });
  assert.equal(partnerResult, undefined); assert.equal(customerResult?.statusCode, 403);
});
