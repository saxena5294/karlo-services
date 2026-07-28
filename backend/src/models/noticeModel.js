import mongoose from "mongoose";

export const NOTICE_TYPES = ["info", "success", "warning", "urgent"];

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 1500 },
  type: { type: String, enum: NOTICE_TYPES, default: "info" },
  linkText: { type: String, trim: true, maxlength: 80, default: "" },
  linkUrl: { type: String, trim: true, maxlength: 500, default: "" },
  priority: { type: Number, min: 0, max: 100000, default: 0 },
  isPinned: { type: Boolean, default: false },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "notices" });

noticeSchema.index({ isActive: 1, deletedAt: 1, isPinned: -1, priority: -1 });
noticeSchema.index({ startsAt: 1, endsAt: 1 });

export const Notice = mongoose.model("Notice", noticeSchema);
