import mongoose from "mongoose";

export const CRM_ENTITY_TYPES = Object.freeze(["customer", "partner", "expert", "lead", "ticket", "application"]);
export const FOLLOW_UP_STATUSES = Object.freeze(["pending", "completed", "cancelled"]);
export const CRM_PRIORITIES = Object.freeze(["low", "medium", "high", "urgent"]);

const followUpSchema = new mongoose.Schema({
  relatedEntityType: { type: String, enum: CRM_ENTITY_TYPES, required: true },
  relatedEntityId: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  dueAt: { type: Date, required: true },
  status: { type: String, enum: FOLLOW_UP_STATUSES, default: "pending" },
  priority: { type: String, enum: CRM_PRIORITIES, default: "medium" },
  assignedTo: { type: String, trim: true, default: "" },
  completedAt: { type: Date, default: null },
  outcome: { type: String, trim: true, maxlength: 2000, default: "" },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
}, { timestamps: true, collection: "crmfollowups" });

followUpSchema.index({ relatedEntityType: 1, relatedEntityId: 1, createdAt: -1 });
followUpSchema.index({ status: 1, dueAt: 1 });
followUpSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });

export const FollowUp = mongoose.model("FollowUp", followUpSchema);
