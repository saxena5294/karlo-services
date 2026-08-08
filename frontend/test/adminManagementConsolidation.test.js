import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("admin sidebar exposes only the main Partner and Expert management entries", () => {
  const sidebar = read("../src/components/dashboard/DashboardSidebar.jsx");
  assert.doesNotMatch(sidebar, /name: "Pending Partners"/);
  assert.doesNotMatch(sidebar, /name: "Pending Experts"/);
  assert.match(sidebar, /name: "Partners", path: "\/admin\/partners"/);
  assert.match(sidebar, /name: "Experts", path: "\/admin\/experts"/);
});

test("legacy pending URLs redirect to status-filtered main pages", () => {
  const routes = read("../src/AppRoutes.jsx");
  assert.match(routes, /path="partners\/pending"[^\n]+\/admin\/partners\?status=pending/);
  assert.match(routes, /path="experts\/pending"[^\n]+\/admin\/experts\?status=pending/);
});

test("dashboard pending metrics target the consolidated pages", () => {
  const dashboard = read("../src/pages/admin/AdminDashboard.jsx");
  assert.match(dashboard, /Pending Partner Approvals[^\n]+\/admin\/partners\?status=pending/);
  assert.match(dashboard, /Pending Expert Approvals[^\n]+\/admin\/experts\?status=pending/);
});
