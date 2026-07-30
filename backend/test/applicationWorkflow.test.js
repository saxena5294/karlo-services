import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_STATUSES, APPLICATION_STATUS_TRANSITIONS } from "../src/constants/applicationConstants.js";
import { Application } from "../src/models/applicationModel.js";
import { ApplicationComment } from "../src/models/applicationCommentModel.js";
import { ApplicationNote } from "../src/models/applicationNoteModel.js";
import { ApplicationTimeline } from "../src/models/applicationTimelineModel.js";
import { ApplicationCounter } from "../src/models/applicationCounterModel.js";
import { ApplicationWorkflowConfig } from "../src/models/applicationWorkflowConfigModel.js";
import { formatApplicationNumber } from "../src/services/applicationService.js";
import { APPLICATION_PRIORITIES, buildDocumentChecklist } from "../src/services/applicationWorkflowService.js";

test("application workflow fields use production-safe defaults and indexes", () => {
  const application = new Application();
  assert.equal(application.priority, "medium");
  assert.equal(application.isArchived, false);
  assert.deepEqual(APPLICATION_PRIORITIES, ["low", "medium", "high", "urgent"]);
  const indexes = Application.schema.indexes().map(([fields]) => fields);
  assert.ok(indexes.some((fields) => fields.isArchived === 1 && fields.priority === 1));
  assert.ok(indexes.some((fields) => fields.service === 1 && fields.status === 1));
});

test("workflow models separate public comments from private notes and enrich timeline events", () => {
  const comment = new ApplicationComment({ application: "67f000000000000000000001", body: "Internal review", authorUserId: "expert_1", authorRole: "expert" });
  assert.equal(comment.visibility, "internal");
  assert.equal(comment.validateSync(), undefined);
  assert.ok(ApplicationNote.schema.path("updatedAt"));
  assert.ok(ApplicationTimeline.schema.path("eventType"));
  assert.ok(ApplicationTimeline.schema.path("actorRole"));
  assert.ok(ApplicationTimeline.schema.path("visibility"));
});

test("document checklist counts current uploaded, verified, rejected, pending, and missing documents", () => {
  const checklist = buildDocumentChecklist({
    requiredDocumentSnapshot: ["Identity Proof", "Address Proof"],
    files: [
      { label: "Identity Proof", verificationStatus: "verified", isCurrent: true },
      { label: "Old Identity Proof", verificationStatus: "rejected", isCurrent: false },
    ],
    additionalDocuments: [{ label: "Photo", verificationStatus: "pending", isCurrent: true }],
    completionDocuments: [{ label: "Certificate", verificationStatus: "reupload_required", isCurrent: true }],
  });
  assert.equal(checklist.uploaded, 3);
  assert.equal(checklist.verified, 1);
  assert.equal(checklist.pending, 1);
  assert.equal(checklist.rejected, 1);
  assert.deepEqual(checklist.missing, ["Address Proof"]);
});

test("completed applications can be delivered while both states remain closed to assignee updates", () => {
  assert.ok(APPLICATION_STATUS_TRANSITIONS[APPLICATION_STATUSES.COMPLETED].includes(APPLICATION_STATUSES.DELIVERED));
  assert.deepEqual(APPLICATION_STATUS_TRANSITIONS[APPLICATION_STATUSES.DELIVERED], [APPLICATION_STATUSES.ARCHIVED]);
});

test("invalid workflow enums are rejected", () => {
  const application = new Application({ priority: "critical" });
  assert.ok(application.validateSync()?.errors.priority);
  const comment = new ApplicationComment({ application: "67f000000000000000000001", body: "Visible", visibility: "customer", authorUserId: "admin_1", authorRole: "admin" });
  assert.ok(comment.validateSync()?.errors.visibility);
});

test("application numbers use a fixed-width yearly sequence backed by a unique counter", () => {
  assert.equal(formatApplicationNumber(2026, 1), "KARLO-2026-000001");
  assert.equal(formatApplicationNumber(2026, 999999), "KARLO-2026-999999");
  assert.equal(ApplicationCounter.schema.path("year").options.unique, true);
  assert.equal(Application.schema.path("applicationNumber").options.unique, true);
});

test("configurable workflows accept unique enabled transitions and reject self transitions", async () => {
  const workflow = new ApplicationWorkflowConfig({
    updatedBy: "admin_1",
    statuses: [APPLICATION_STATUSES.SUBMITTED, APPLICATION_STATUSES.IN_REVIEW],
    transitions: [{ from: APPLICATION_STATUSES.SUBMITTED, to: [APPLICATION_STATUSES.IN_REVIEW] }],
  });
  await workflow.validate();

  workflow.transitions = [{ from: APPLICATION_STATUSES.SUBMITTED, to: [APPLICATION_STATUSES.SUBMITTED] }];
  await assert.rejects(workflow.validate(), /cannot transition to itself/);
});
