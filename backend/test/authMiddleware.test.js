import test from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_REGISTRATION_ROLES, ROLES } from "../src/constants/roleConstants.js";
import { assertAccountCanAuthenticate, findOrCreateUserProfile, profileFromClerkUser, requireAdmin, requireCustomer, requireExpert, requirePartner, requireRole } from "../src/middlewares/authMiddleware.js";
import { User } from "../src/models/userModel.js";
import { me, serializeAuthProfile } from "../src/controllers/authController.js";

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

test("the first authenticated request creates one default customer profile and later requests reuse it", async () => {
  const clerkUserId = "user_FirstRequest123";
  let stored = null;
  let clerkReads = 0;
  let creates = 0;
  const client = { users: { getUser: async () => {
    clerkReads += 1;
    return { id: clerkUserId, firstName: "First", lastName: "User", emailAddresses: [{ emailAddress: "first@example.com", verification: { status: "verified" } }] };
  } } };
  const UserModel = {
    findOne: async ({ clerkUserId: requestedId }) => requestedId === stored?.clerkUserId ? stored : null,
    create: async (candidate) => { creates += 1; stored = { _id: "mongo_1", ...candidate }; return stored; },
  };
  const first = await findOrCreateUserProfile(clerkUserId, client, UserModel);
  const second = await findOrCreateUserProfile(clerkUserId, client, UserModel);
  assert.equal(first, second);
  assert.equal(first.role, ROLES.CUSTOMER);
  assert.equal(first.status, "active");
  assert.equal(first.approval.status, "not_required");
  assert.equal(clerkReads, 1);
  assert.equal(creates, 1);
});

test("profile synchronization preserves existing partner, expert, and admin roles", async () => {
  for (const role of [ROLES.PARTNER, ROLES.EXPERT, ROLES.ADMIN]) {
    const stored = { _id: `mongo_${role}`, clerkUserId: `user_${role}123`, role, status: role === ROLES.ADMIN ? "active" : "approved", approval: { status: "approved" } };
    let clerkReads = 0;
    let creates = 0;
    const client = { users: { getUser: async () => { clerkReads += 1; return {}; } } };
    const UserModel = { findOne: async () => stored, create: async () => { creates += 1; return null; } };
    const result = await findOrCreateUserProfile(stored.clerkUserId, client, UserModel);
    assert.equal(result.role, role);
    assert.equal(clerkReads, 0);
    assert.equal(creates, 0);
  }
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

test("public registration cannot request admin and inactive admins are denied", () => {
  assert.equal(PUBLIC_REGISTRATION_ROLES.includes(ROLES.ADMIN), false);
  assert.throws(() => assertAccountCanAuthenticate({ role: ROLES.ADMIN, status: "inactive" }), (error) => error.statusCode === 403 && /inactive/.test(error.message));
  assert.equal(assertAccountCanAuthenticate({ role: ROLES.ADMIN, status: "active" }).role, ROLES.ADMIN);
});

test("current-user response exposes MongoDB identity, role, status, and approval", () => {
  const profile = serializeAuthProfile({ _id: "mongo_123", clerkUserId: "user_123", email: "user@example.com", name: "User", mobile: "9999999999", address: "Address", role: ROLES.ADMIN, status: "active", approval: { status: "approved" } });
  assert.equal(profile.mongoUserId, "mongo_123");
  assert.equal(profile.clerkUserId, "user_123");
  assert.equal(profile.role, ROLES.ADMIN);
  assert.equal(profile.status, "active");
  assert.equal(profile.approval.status, "approved");
});

test("current-user endpoint returns the authenticated MongoDB profile as user", () => {
  const req = { userProfile: { _id: "mongo_123", clerkUserId: "user_123", role: ROLES.ADMIN, status: "active", approval: { status: "approved" } } };
  let body;
  me(req, { json: (payload) => { body = payload; } });
  assert.equal(body.success, true);
  assert.equal(body.user.clerkUserId, "user_123");
  assert.equal(body.user.role, ROLES.ADMIN);
  assert.equal(body.user.approval.status, "approved");
  assert.equal(body.profile, undefined);
});
