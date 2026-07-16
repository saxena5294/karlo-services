import mongoose from "mongoose";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const auditLogSchema = new mongoose.Schema({
  actorUserId: { type: String, required: true, trim: true, index: true },
  actorRole: { type: String, required: true, enum: ROLE_VALUES, index: true },
  action: { type: String, required: true, trim: true, index: true },
  entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, required: true, trim: true, index: true },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, trim: true, maxlength: 80, default: "" },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "auditlogs" });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
