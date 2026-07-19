import assert from "node:assert/strict";
import test from "node:test";
import { Service } from "../src/models/serviceModel.js";
import { buildPublicBannerFilter } from "../src/services/cmsService.js";

test("service availability is explicit and defaults to available", () => {
  const path = Service.schema.path("availabilityStatus");
  assert.equal(path.defaultValue, "available");
  assert.deepEqual(path.enumValues, ["available", "coming_soon", "temporarily_unavailable"]);
});

test("dashboard categories are constrained to supported dashboard groups", () => {
  assert.ok(Service.schema.path("dashboardCategory").enumValues.includes("government-id"));
  assert.equal(Service.schema.path("dashboardCategory").defaultValue, "other-services");
});

test("dashboard banner filter requires active published scheduled dashboard content", () => {
  const now = new Date("2026-07-19T12:00:00.000Z");
  const filter = buildPublicBannerFilter(now, "dashboard");
  assert.equal(filter.position, "dashboard");
  assert.equal(filter.status, "published");
  assert.equal(filter.isActive, true);
  assert.equal(filter.deletedAt, null);
  assert.equal(filter.$and[0].$or[1].startAt.$lte, now);
  assert.equal(filter.$and[1].$or[1].endAt.$gt, now);
});
