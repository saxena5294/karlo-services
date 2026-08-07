import test from "node:test";
import assert from "node:assert/strict";
import { dashboardTitleForPortal } from "../src/components/dashboard/dashboardTitles.js";

test("shared dashboard headings follow the active portal", () => {
  assert.equal(dashboardTitleForPortal("customer"), "Customer Dashboard");
  assert.equal(dashboardTitleForPortal("partner"), "Partner Dashboard");
  assert.equal(dashboardTitleForPortal("expert"), "Expert Dashboard");
  assert.equal(dashboardTitleForPortal("admin"), "Admin Dashboard");
});
