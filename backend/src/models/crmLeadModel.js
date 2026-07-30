import mongoose from "mongoose";
import { CRM_PRIORITIES } from "./followUpModel.js";

export const CRM_LEAD_STATUSES = Object.freeze(["new", "contacted", "qualified", "proposal", "follow_up", "converted", "lost", "closed"]);
export const CRM_LEAD_SOURCES = Object.freeze(["website", "phone", "walk_in", "referral", "partner", "whatsapp", "campaign", "social_media", "other"]);

const crmLeadSchema = new mongoose.Schema({
  leadNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  mobile: { type: String, required: true, trim: true, maxlength: 30 },
  alternateMobile: { type: String, trim: true, maxlength: 30, default: "" },
  source: { type: String, enum: CRM_LEAD_SOURCES, default: "other" },
  serviceInterest: { type: String, trim: true, maxlength: 200, default: "" },
  category: { type: String, trim: true, maxlength: 120, default: "" },
  message: { type: String, trim: true, maxlength: 3000, default: "" },
  status: { type: String, enum: CRM_LEAD_STATUSES, default: "new" },
  priority: { type: String, enum: CRM_PRIORITIES, default: "medium" },
  assignedTo: { type: String, trim: true, default: "" },
  assignedToType: { type: String, enum: ["", "admin", "expert", "partner"], default: "" },
  nextFollowUpAt: { type: Date, default: null },
  lastContactedAt: { type: Date, default: null },
  convertedCustomer: { type: String, trim: true, default: "" },
  convertedApplication: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
  convertedAt: { type: Date, default: null },
  tags: { type: [String], default: [] },
  lostReason: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
  archivedAt: { type: Date, default: null },
}, { timestamps: true, collection: "crmleads" });

crmLeadSchema.index({ status: 1, priority: 1, createdAt: -1 });
crmLeadSchema.index({ assignedTo: 1, status: 1 });
crmLeadSchema.index({ nextFollowUpAt: 1, status: 1 });
crmLeadSchema.index({ mobile: 1, createdAt: -1 });
crmLeadSchema.index({ email: 1, createdAt: -1 });

export const CrmLead = mongoose.model("CrmLead", crmLeadSchema);
