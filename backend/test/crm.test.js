import assert from "node:assert/strict";
import test from "node:test";
import { CommunicationLog } from "../src/models/communicationLogModel.js";
import { CrmLead } from "../src/models/crmLeadModel.js";
import { SupportTicket } from "../src/models/dashboardModuleModels.js";
import { FollowUp } from "../src/models/followUpModel.js";
import { InternalNote } from "../src/models/internalNoteModel.js";
import { withOverdue } from "../src/services/crmService.js";
import { assertCrmQuery, crmDateRange, crmPage, crmSort, escapeCrmRegex } from "../src/services/crmValidation.js";

test("CRM models use relationship and workload indexes without duplicating source identities", () => {
  assert.equal(CrmLead.collection.collectionName, "crmleads");
  assert.equal(CrmLead.schema.indexes().some(([keys, options]) => keys.leadNumber === 1 && options.unique), true);
  assert.equal(FollowUp.schema.indexes().some(([keys]) => keys.relatedEntityType === 1 && keys.relatedEntityId === 1), true);
  assert.equal(InternalNote.schema.indexes().some(([keys]) => keys.relatedEntityType === 1 && keys.relatedEntityId === 1), true);
  assert.equal(CommunicationLog.schema.indexes().some(([keys]) => keys.relatedEntityType === 1 && keys.relatedEntityId === 1), true);
  assert.ok(SupportTicket.schema.path("relatedLead"));
  assert.ok(SupportTicket.schema.path("statusHistory"));
});

test("overdue follow-ups are calculated and never persisted as a status", () => {
  const overdue = withOverdue({ status: "pending", dueAt: new Date("2025-01-01") }, new Date("2026-01-01"));
  const completed = withOverdue({ status: "completed", dueAt: new Date("2025-01-01") }, new Date("2026-01-01"));
  assert.equal(overdue.isOverdue, true);
  assert.equal(completed.isOverdue, false);
  assert.deepEqual(FollowUp.schema.path("status").enumValues, ["pending", "completed", "cancelled"]);
});

test("CRM query helpers bound pagination, escape search, validate sorting, and parse dates", () => {
  assert.deepEqual(crmPage({ page: "-4", limit: "1000" }), { page: 1, limit: 100, skip: 0 });
  assert.equal(escapeCrmRegex("a.*(b)"), "a\\.\\*\\(b\\)");
  assert.deepEqual(crmSort({ sortBy: "name", sortOrder: "asc" }, ["name"]), { name: 1 });
  assert.ok(crmDateRange({ dateFrom: "2026-01-01", dateTo: "2026-01-02" }).createdAt.$gte instanceof Date);
  assert.throws(() => crmSort({ sortBy: "password" }, ["name"]), /sortBy/);
  assert.throws(() => assertCrmQuery({ token: "secret" }, []), /Unexpected query/);
});

test("CRM schemas reject invalid statuses, priorities, and unsafe entity types", () => {
  const lead = new CrmLead({ leadNumber: "KSL-2026-TEST", name: "Test", mobile: "9999999999", status: "invalid", priority: "critical", createdBy: "admin", updatedBy: "admin" });
  const leadErrors = lead.validateSync().errors;
  assert.ok(leadErrors.status);
  assert.ok(leadErrors.priority);
  const note = new InternalNote({ relatedEntityType: "public", relatedEntityId: "id", content: "Private", createdBy: "admin", updatedBy: "admin" });
  assert.ok(note.validateSync().errors.relatedEntityType);
});
