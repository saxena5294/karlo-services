import test from "node:test";
import assert from "node:assert/strict";
import { clerkSessionHeaders } from "../src/auth/authHeaders.js";

test("the current-user request sends the Clerk session as a bearer token", () => {
  assert.deepEqual(clerkSessionHeaders(" session.jwt.value "), { Authorization: "Bearer session.jwt.value" });
  assert.deepEqual(clerkSessionHeaders(""), {});
  assert.deepEqual(clerkSessionHeaders(null), {});
});
