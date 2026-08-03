import test from "node:test";
import assert from "node:assert/strict";
import { clerkSessionHeaders, normalizeCurrentUserResponse } from "../src/auth/authHeaders.js";

test("the current-user request sends the Clerk session as a bearer token", () => {
  assert.deepEqual(clerkSessionHeaders(" session.jwt.value "), { Authorization: "Bearer session.jwt.value" });
  assert.deepEqual(clerkSessionHeaders(""), {});
  assert.deepEqual(clerkSessionHeaders(null), {});
});

test("the current-user API exposes the backend user as the frontend profile", () => {
  const user = { clerkUserId: "user_123", role: "admin", status: "active" };
  assert.equal(normalizeCurrentUserResponse({ success: true, user }).profile, user);
});
