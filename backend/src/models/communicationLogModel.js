import mongoose from "mongoose";
import { CRM_ENTITY_TYPES } from "./followUpModel.js";

export const COMMUNICATION_TYPES = Object.freeze(["phone", "email", "whatsapp", "sms", "meeting", "in_person", "other"]);

const communicationLogSchema = new mongoose.Schema({
  relatedEntityType: { type: String, enum: CRM_ENTITY_TYPES, required: true },
  relatedEntityId: { type: String, required: true, trim: true },
  communicationType: { type: String, enum: COMMUNICATION_TYPES, required: true },
  direction: { type: String, enum: ["inbound", "outbound"], required: true },
  subject: { type: String, trim: true, maxlength: 180, default: "" },
  summary: { type: String, required: true, trim: true, maxlength: 5000 },
  contactValue: { type: String, trim: true, maxlength: 254, default: "" },
  occurredAt: { type: Date, required: true, default: Date.now },
  outcome: { type: String, trim: true, maxlength: 1000, default: "" },
  nextAction: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "crmcommunications" });

communicationLogSchema.index({ relatedEntityType: 1, relatedEntityId: 1, occurredAt: -1 });
communicationLogSchema.index({ communicationType: 1, occurredAt: -1 });

export const CommunicationLog = mongoose.model("CommunicationLog", communicationLogSchema);
