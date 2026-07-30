import mongoose from "mongoose";
import { APPLICATION_STATUS_VALUES } from "../constants/applicationConstants.js";

const applicationTimelineSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUS_VALUES,
      required: true,
    },
    remarks: { type: String, trim: true, default: "" },
    eventType: {
      type: String,
      enum: ["status", "assignment", "document", "verification", "comment", "note", "download", "workflow", "submission"],
      default: "status",
      index: true,
    },
    action: { type: String, trim: true, maxlength: 120, default: "status_changed" },
    actorRole: { type: String, enum: ["customer", "partner", "expert", "admin", "system", "legacy"], default: "system" },
    visibility: { type: String, enum: ["public", "internal"], default: "public", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Clerk user IDs will be stored here after authentication is enabled.
    updatedBy: { type: String, trim: true, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "applicationtimelines",
  }
);

applicationTimelineSchema.index({ application: 1, createdAt: 1 });
applicationTimelineSchema.index({ application: 1, visibility: 1, createdAt: -1 });

export const ApplicationTimeline = mongoose.model(
  "ApplicationTimeline",
  applicationTimelineSchema
);
