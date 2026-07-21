import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  developmentAuth,
  requireRole,
} from "../src/middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../src/constants/roleConstants.js";
import { Application } from "../src/models/applicationModel.js";
import { ApplicationAssignment } from "../src/models/applicationAssignmentModel.js";
import { ExpertProfile } from "../src/models/expertProfileModel.js";
import { NOTIFICATION_ROLES } from "../src/models/notificationModel.js";
import {
  DEVELOPMENT_ROLE_KEY,
  resolveDevelopmentIdentity,
  roleForPath,
} from "../../frontend/src/auth/developmentAuth.js";

const withDevelopmentAuthEnvironment = async (callback) => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    DEV_AUTH_ENABLED: process.env.DEV_AUTH_ENABLED,
    DEV_USER_ID: process.env.DEV_USER_ID,
    DEV_USER_ROLE: process.env.DEV_USER_ROLE,
  };
  process.env.NODE_ENV = "test";
  process.env.DEV_AUTH_ENABLED = "true";
  process.env.DEV_USER_ID = "fallback-user";
  process.env.DEV_USER_ROLE = ROLES.CUSTOMER;
  try {
    await callback();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
};

const request = ({ role, userId = `dev_${role}_001` } = {}) => {
  const headers = {};
  if (role !== undefined) headers["x-dev-role"] = role;
  if (userId !== undefined) headers["x-dev-user-id"] = userId;
  return {
    method: "POST",
    originalUrl: "/api/applications/example-service",
    get: (name) => headers[name.toLowerCase()],
  };
};

const run = (middleware, req) => new Promise((resolve) => middleware(req, {}, resolve));

test("development auth creates the normalized req.auth identity from headers", async () => {
  await withDevelopmentAuthEnvironment(async () => {
    const req = request({ role: " CUSTOMER ", userId: " dev_customer_001 " });
    assert.equal(await run(developmentAuth, req), undefined);
    assert.deepEqual(req.auth, { userId: "dev_customer_001", role: ROLES.CUSTOMER });
    assert.equal(Object.isFrozen(req.auth), true);
  });
});

test("customer application submission permission allows customers and rejects admin", async () => {
  await withDevelopmentAuthEnvironment(async () => {
    const customer = request({ role: ROLES.CUSTOMER });
    await run(developmentAuth, customer);
    assert.equal(await run(requireRole(ROLES.CUSTOMER), customer), undefined);

    const admin = request({ role: ROLES.ADMIN });
    await run(developmentAuth, admin);
    const error = await run(requireRole(ROLES.CUSTOMER), admin);
    assert.equal(error.statusCode, 403);
    assert.match(error.message, /permission/i);
  });
});

test("each canonical role passes only its intended route guard", async () => {
  await withDevelopmentAuthEnvironment(async () => {
    for (const role of Object.values(ROLES)) {
      const req = request({ role });
      await run(developmentAuth, req);
      assert.equal(await run(requireRole(role), req), undefined);
      for (const otherRole of Object.values(ROLES).filter((value) => value !== role)) {
        assert.equal((await run(requireRole(otherRole), req)).statusCode, 403);
      }
    }
  });
});

test("obsolete retailer role is rejected and cannot bypass a canonical guard", async () => {
  await withDevelopmentAuthEnvironment(async () => {
    const req = request({ role: "retailer", userId: "legacy-retailer" });
    const error = await run(developmentAuth, req);
    assert.equal(error.statusCode, 403);
    assert.equal(req.auth, undefined);
  });
});

test("unknown role receives 403 and missing authentication receives 401", async () => {
  await withDevelopmentAuthEnvironment(async () => {
    const invalid = request({ role: "owner" });
    const authError = await run(developmentAuth, invalid);
    assert.equal(authError.statusCode, 403);
    assert.equal(invalid.auth, undefined);

    const authorizationError = await run(
      requireRole(ROLES.CUSTOMER),
      request({ role: undefined, userId: undefined })
    );
    assert.equal(authorizationError.statusCode, 401);
  });
});

test("dashboard paths resolve to exactly the four supported development roles", () => {
  assert.equal(roleForPath("/customer/dashboard"), ROLES.CUSTOMER);
  assert.equal(roleForPath("/partner/dashboard"), ROLES.PARTNER);
  assert.equal(roleForPath("/expert/dashboard"), ROLES.EXPERT);
  assert.equal(roleForPath("/admin/dashboard"), ROLES.ADMIN);
  assert.equal(roleForPath("/services/passport/apply"), ROLES.CUSTOMER);
  assert.equal(roleForPath("/retailer/dashboard"), null);
});

test("development identity removes stale roles and sends the active dashboard identity", () => {
  const values = new Map([[DEVELOPMENT_ROLE_KEY, "retailer"]]);
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const identity = resolveDevelopmentIdentity({
    pathname: "/partner/dashboard",
    storage,
    env: { VITE_DEV_PARTNER_USER_ID: "partner-test-user" },
  });
  assert.deepEqual(identity, { userId: "partner-test-user", role: ROLES.PARTNER });
  assert.equal(values.get(DEVELOPMENT_ROLE_KEY), ROLES.PARTNER);
});

test("the shared Axios client has no automatic response retry loop", async () => {
  const source = await readFile(new URL("../../frontend/src/api/axiosInstance.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /interceptors\.response|setInterval|axios-retry/);
});

test("active schemas expose only canonical role and assignment fields", () => {
  assert.deepEqual(NOTIFICATION_ROLES, ["customer", "partner", "expert", "admin"]);
  assert.equal(Application.schema.path("assignedRetailerId"), undefined);
  assert.equal(ApplicationAssignment.schema.path("retailerUserId"), undefined);
  assert.equal(ExpertProfile.collection.collectionName, "expertprofiles");
});
