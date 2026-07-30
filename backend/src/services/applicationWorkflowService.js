import mongoose from "mongoose";
import { APPLICATION_STATUSES, APPLICATION_STATUS_VALUES } from "../constants/applicationConstants.js";
import { ASSIGNMENT_TYPES } from "../constants/fulfillmentConstants.js";
import { ROLES } from "../constants/roleConstants.js";
import { Application } from "../models/applicationModel.js";
import { ApplicationComment } from "../models/applicationCommentModel.js";
import { ApplicationNote } from "../models/applicationNoteModel.js";
import { ApplicationTimeline } from "../models/applicationTimelineModel.js";
import { ApiError } from "../utils/ApiError.js";
import { createApplicationNotification, sanitizeNotificationText } from "./notificationService.js";

export const APPLICATION_PRIORITIES = Object.freeze(["low", "medium", "high", "urgent"]);

const identifierFilter = (value) => {
  const id = String(value || "").trim();
  if (!id) throw new ApiError(400, "Application identifier is required");
  return mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { applicationNumber: id.toUpperCase() }] }
    : { applicationNumber: id.toUpperCase() };
};

const ownsApplication = (application, userId, role) => {
  if (role === ROLES.ADMIN) return true;
  if (application.isDeleted) return false;
  if (role === ROLES.CUSTOMER) return [application.customerUserId, application.customerId].includes(userId);
  if (role === ROLES.EXPERT) return application.assignedExpertId === userId;
  if (role === ROLES.PARTNER) {
    return application.assignmentType === ASSIGNMENT_TYPES.PARTNER && application.assignedPartnerId === userId;
  }
  return false;
};

const loadApplication = async ({ id, userId, role, session = null }) => {
  const application = await Application.findOne(identifierFilter(id)).session(session);
  if (!application || !ownsApplication(application, userId, role)) throw new ApiError(404, "Application not found");
  return application;
};

const cleanText = (value, label, max = 2000) => {
  const text = sanitizeNotificationText(value, max);
  if (!text) throw new ApiError(400, `${label} is required`);
  return text;
};

const timelineStatus = (application) => APPLICATION_STATUS_VALUES.includes(application.status)
  ? application.status
  : APPLICATION_STATUSES.SUBMITTED;

const appendEvent = ({ application, actorUserId, actorRole, eventType, action, remarks, visibility = "internal", metadata = {}, session }) =>
  ApplicationTimeline.create([{
    application: application._id,
    status: timelineStatus(application),
    remarks,
    updatedBy: actorUserId,
    actorRole,
    eventType,
    action,
    visibility,
    metadata,
  }], { session });

const currentDocuments = (application) => [
  ...(application.files || []),
  ...(application.additionalDocuments || []),
  ...(application.completionDocuments || []),
].filter((document) => document.isCurrent !== false);

export const buildDocumentChecklist = (application) => {
  const documents = currentDocuments(application);
  const requiredDocuments = application.requiredDocumentSnapshot || [];
  const normalized = (value) => String(value || "").trim().toLowerCase();
  const uploadedRequired = requiredDocuments.filter((requirement) =>
    documents.some((document) => [document.label, document.documentType, document.fieldName]
      .map(normalized).filter(Boolean)
      .some((value) => value.includes(normalized(requirement)) || normalized(requirement).includes(value)))
  );
  return {
    required: requiredDocuments,
    uploaded: documents.length,
    missing: requiredDocuments.filter((requirement) => !uploadedRequired.includes(requirement)),
    verified: documents.filter((document) => document.verificationStatus === "verified").length,
    rejected: documents.filter((document) => ["rejected", "reupload_required"].includes(document.verificationStatus)).length,
    pending: documents.filter((document) => !document.verificationStatus || document.verificationStatus === "pending").length,
  };
};

export const getApplicationWorkflow = async ({ id, userId, role }) => {
  const application = await loadApplication({ id, userId, role });
  const commentFilter = { application: application._id };
  const timelineFilter = { application: application._id };
  if (role === ROLES.CUSTOMER) {
    commentFilter.visibility = "public";
    timelineFilter.visibility = { $ne: "internal" };
  }
  const [comments, timeline] = await Promise.all([
    ApplicationComment.find(commentFilter).sort({ createdAt: -1 }).lean(),
    ApplicationTimeline.find(timelineFilter).sort({ createdAt: 1 }).lean(),
  ]);
  const workflow = {
    priority: application.priority || "medium",
    expectedCompletionAt: application.expectedCompletionAt,
    actualCompletionAt: application.actualCompletionAt,
    isArchived: Boolean(application.isArchived),
    isOverdue: Boolean(application.expectedCompletionAt && !application.actualCompletionAt
      && new Date(application.expectedCompletionAt).getTime() < Date.now()),
    comments,
    timeline,
    statusHistory: timeline.filter(({ eventType, action }) =>
      eventType === "status" || action === "status_changed" || action === "application_submitted"),
    documentChecklist: buildDocumentChecklist(application),
  };
  if (role === ROLES.ADMIN) {
    workflow.notes = await ApplicationNote.find({ application: application._id }).sort({ createdAt: -1 }).lean();
  }
  return workflow;
};

export const createApplicationComment = async ({ id, userId, role, body, visibility }) => {
  if (![ROLES.ADMIN, ROLES.PARTNER, ROLES.EXPERT].includes(role)) {
    throw new ApiError(403, "Customers cannot create application comments");
  }
  const cleanBody = cleanText(body, "Comment");
  const cleanVisibility = visibility || "internal";
  if (!["internal", "public"].includes(cleanVisibility)) throw new ApiError(400, "visibility must be internal or public");
  let comment;
  await mongoose.connection.transaction(async (session) => {
    const application = await loadApplication({ id, userId, role, session });
    [comment] = await ApplicationComment.create([{
      application: application._id,
      body: cleanBody,
      visibility: cleanVisibility,
      authorUserId: userId,
      authorRole: role,
    }], { session });
    await appendEvent({
      application, actorUserId: userId, actorRole: role, eventType: "comment",
      action: "comment_added", remarks: cleanVisibility === "public" ? cleanBody : "Internal comment added",
      visibility: cleanVisibility, metadata: { commentId: String(comment._id) }, session,
    });
    const customerUserId = application.customerUserId || application.customerId;
    if (cleanVisibility === "public" && customerUserId && customerUserId !== userId) {
      await createApplicationNotification({
        application,
        recipientUserId: customerUserId,
        recipientRole: ROLES.CUSTOMER,
        type: "remark_added",
        title: "New application comment",
        message: cleanBody,
        eventKey: `application-comment:${comment._id}`,
        metadata: { commentId: String(comment._id), status: application.status },
        session,
      });
    }
  });
  return comment;
};

export const updateApplicationComment = async ({ id, commentId, userId, role, body, visibility }) => {
  if (!mongoose.isValidObjectId(commentId)) throw new ApiError(404, "Comment not found");
  const application = await loadApplication({ id, userId, role });
  const comment = await ApplicationComment.findOne({ _id: commentId, application: application._id });
  if (!comment) throw new ApiError(404, "Comment not found");
  if (role !== ROLES.ADMIN && comment.authorUserId !== userId) throw new ApiError(403, "Only the author or an admin can edit this comment");
  if (body !== undefined) comment.body = cleanText(body, "Comment");
  if (visibility !== undefined) {
    if (!["internal", "public"].includes(visibility)) throw new ApiError(400, "visibility must be internal or public");
    comment.visibility = visibility;
  }
  comment.editedAt = new Date();
  await comment.save();
  return comment;
};

export const deleteApplicationComment = async ({ id, commentId, userId, role }) => {
  if (!mongoose.isValidObjectId(commentId)) throw new ApiError(404, "Comment not found");
  const application = await loadApplication({ id, userId, role });
  const comment = await ApplicationComment.findOne({ _id: commentId, application: application._id });
  if (!comment) throw new ApiError(404, "Comment not found");
  if (role !== ROLES.ADMIN && comment.authorUserId !== userId) throw new ApiError(403, "Only the author or an admin can delete this comment");
  await comment.deleteOne();
  return comment;
};

export const updateApplicationWorkflow = async ({ id, adminUserId, payload }) => {
  const unexpected = Object.keys(payload).filter((key) =>
    !["priority", "expectedCompletionAt", "actualCompletionAt", "isArchived"].includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  const updates = {};
  if (payload.priority !== undefined) {
    if (!APPLICATION_PRIORITIES.includes(payload.priority)) throw new ApiError(400, "Invalid application priority");
    updates.priority = payload.priority;
  }
  for (const key of ["expectedCompletionAt", "actualCompletionAt"]) {
    if (payload[key] !== undefined) {
      if (payload[key] === "" || payload[key] === null) updates[key] = null;
      else {
        const date = new Date(payload[key]);
        if (Number.isNaN(date.getTime())) throw new ApiError(400, `${key} must be a valid date`);
        updates[key] = date;
      }
    }
  }
  if (payload.isArchived !== undefined) {
    if (typeof payload.isArchived !== "boolean") throw new ApiError(400, "isArchived must be a boolean");
    updates.isArchived = payload.isArchived;
    updates.archivedAt = payload.isArchived ? new Date() : null;
    updates.archivedBy = payload.isArchived ? adminUserId : "";
  }
  if (!Object.keys(updates).length) throw new ApiError(400, "At least one workflow field is required");
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await loadApplication({ id, userId: adminUserId, role: ROLES.ADMIN, session });
    Object.assign(application, updates);
    await application.save({ session });
    const changed = Object.keys(payload).join(", ");
    await appendEvent({
      application, actorUserId: adminUserId, actorRole: ROLES.ADMIN, eventType: "workflow",
      action: payload.isArchived === true ? "application_archived" : payload.isArchived === false ? "application_restored" : "workflow_updated",
      remarks: `Application workflow updated: ${changed}`, visibility: "internal", metadata: updates, session,
    });
  });
  return application;
};

export const softDeleteApplication = async ({ id, adminUserId }) => {
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await loadApplication({ id, userId: adminUserId, role: ROLES.ADMIN, session });
    if (application.isDeleted) throw new ApiError(409, "Application is already deleted");
    application.isDeleted = true;
    application.deletedAt = new Date();
    application.deletedBy = adminUserId;
    application.isArchived = true;
    application.archivedAt ||= application.deletedAt;
    application.archivedBy ||= adminUserId;
    await application.save({ session });
    await appendEvent({
      application, actorUserId: adminUserId, actorRole: ROLES.ADMIN, eventType: "workflow",
      action: "application_deleted", remarks: "Application soft-deleted by administrator",
      visibility: "internal", session,
    });
  });
  return application;
};

export const createApplicationNote = async ({ id, adminUserId, remarks }) => {
  const application = await loadApplication({ id, userId: adminUserId, role: ROLES.ADMIN });
  return ApplicationNote.create({ application: application._id, remarks: cleanText(remarks, "Note"), createdBy: adminUserId });
};

export const updateApplicationNote = async ({ id, noteId, adminUserId, remarks }) => {
  if (!mongoose.isValidObjectId(noteId)) throw new ApiError(404, "Note not found");
  const application = await loadApplication({ id, userId: adminUserId, role: ROLES.ADMIN });
  const note = await ApplicationNote.findOneAndUpdate(
    { _id: noteId, application: application._id }, { $set: { remarks: cleanText(remarks, "Note") } },
    { returnDocument: "after", runValidators: true }
  ).lean();
  if (!note) throw new ApiError(404, "Note not found");
  return note;
};

export const deleteApplicationNote = async ({ id, noteId, adminUserId }) => {
  if (!mongoose.isValidObjectId(noteId)) throw new ApiError(404, "Note not found");
  const application = await loadApplication({ id, userId: adminUserId, role: ROLES.ADMIN });
  const note = await ApplicationNote.findOneAndDelete({ _id: noteId, application: application._id }).lean();
  if (!note) throw new ApiError(404, "Note not found");
  return note;
};
