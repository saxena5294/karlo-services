import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../src/constants/roleConstants.js";
import { profileFromClerkUser, requireAdmin, requireCustomer, requireExpert, requirePartner, requireRole } from "../src/middlewares/authMiddleware.js";
import { User } from "../src/models/userModel.js";

const run = (middleware, req) => new Promise((resolve) => middleware(req, {}, resolve));

test("Clerk identity maps to a customer MongoDB profile without metadata roles", () => {
  const profile = profileFromClerkUser({
    id: "user_clerk_123",
    firstName: "Asha",
    lastName: "Patil",
    primaryEmailAddress: { emailAddress: "ASHA@example.com", verification: { status: "verified" } },
    emailAddresses: [{ emailAddress: "ASHA@example.com", verification: { status: "verified" } }],
    primaryPhoneNumber: { phoneNumber: "+919876543210" },
    publicMetadata: { role: "admin" },
  });
  assert.equal(profile.clerkUserId, "user_clerk_123");
  assert.equal(profile.role, ROLES.CUSTOMER);
  assert.equal(profile.status, "active");
  assert.equal(profile.approval.status, "not_required");
});

test("canonical reusable role guards permit only the MongoDB-resolved role", async () => {
  const guards = { customer: requireCustomer, partner: requirePartner, expert: requireExpert, admin: requireAdmin };
  for (const role of Object.values(ROLES)) {
    assert.equal(await run(guards[role], { auth: { userId: "user_1", role } }), undefined);
    const denied = await run(requireRole(...Object.values(ROLES).filter((item) => item !== role)), { auth: { userId: "user_1", role } });
    assert.equal(denied.statusCode, 403);
  }
  assert.equal((await run(requireCustomer, {})).statusCode, 401);
});

test("user schema stores Clerk reference, business role, status, approval, and timestamps", () => {
  for (const path of ["clerkUserId", "email", "name", "mobile", "role", "status", "approval.status", "createdAt", "updatedAt"]) {
    assert.ok(User.schema.path(path), `missing ${path}`);
  }
  assert.equal(User.schema.path("clerkUserId").options.unique, true);
  assert.equal(User.schema.path("role").defaultValue, ROLES.CUSTOMER);
});
