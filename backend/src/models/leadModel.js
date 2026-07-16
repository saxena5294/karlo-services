import mongoose from "mongoose";

export const LEAD_STATUSES = Object.freeze([
  "draft", "open", "accepted", "expired", "completed", "cancelled", "rejected",
]);

const leadSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, unique: true },
  applicationNumber: { type: String, required: true, trim: true, uppercase: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  serviceTitle: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  safeRequirementSummary: { type: String, required: true, trim: true, maxlength: 1000 },
  leadPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: LEAD_STATUSES, default: "draft", index: true },
  acceptedByPartnerId: { type: String, trim: true, default: null },
  publishedByAdminId: { type: String, trim: true, default: null },
  publishedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  cancellationReason: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true, collection: "leads" });

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ category: 1, status: 1 });
leadSchema.index({ city: 1, status: 1 });
leadSchema.index({ pincode: 1, status: 1 });
leadSchema.index({ expiresAt: 1, status: 1 });
leadSchema.index({ acceptedByPartnerId: 1, status: 1, acceptedAt: -1 });
leadSchema.index({ service: 1, status: 1 });

export const Lead = mongoose.model("Lead", leadSchema);
