import test from "node:test";
import assert from "node:assert/strict";
import { dashboardForRole, destinationForProfile, safeInternalRedirect } from "../src/auth/roleRouting.js";

test("signed-in users are routed to the dashboard for their MongoDB role", () => {
  assert.equal(dashboardForRole("admin"), "/admin/dashboard");
  assert.equal(dashboardForRole("expert"), "/expert/dashboard");
  assert.equal(dashboardForRole("partner"), "/partner/dashboard");
  assert.equal(dashboardForRole("customer"), "/customer/dashboard");
  assert.equal(dashboardForRole("owner"), null);
});

test("role resolution includes approval and inactive account states", () => {
  assert.equal(destinationForProfile({ role: "partner", status: "pending" }), "/approval-pending");
  assert.equal(destinationForProfile({ role: "expert", status: "approved" }), "/expert/dashboard");
  assert.equal(destinationForProfile({ role: "admin", status: "active" }), "/admin/dashboard");
  assert.equal(destinationForProfile({ role: "customer", status: "active" }), "/customer/dashboard");
  assert.equal(destinationForProfile({ role: "partner", status: "rejected" }), "/account-unavailable");
  assert.equal(destinationForProfile({ role: "expert", status: "approved", approval: { status: "rejected" } }), "/account-unavailable");
  assert.equal(destinationForProfile(null), null);
});

test("login redirects preserve only safe internal destinations", () => {
  assert.equal(safeInternalRedirect("/partner?tab=profile"), "/partner?tab=profile");
  assert.equal(safeInternalRedirect("/login?redirect=/admin"), null);
  assert.equal(safeInternalRedirect("//example.com"), null);
  assert.equal(safeInternalRedirect("https://example.com"), null);
});
