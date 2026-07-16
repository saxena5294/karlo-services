import mongoose from "mongoose";
import { ROLE_VALUES } from "../constants/roleConstants.js";

// "retailer" remains readable during migration; new notifications use canonical roles.
export const NOTIFICATION_ROLES = Object.freeze([...ROLE_VALUES, "retailer"]);
export const NOTIFICATION_TYPES = Object.freeze([
  "application_submitted",
  "application_assigned",
  "status_changed",
  "documents_required",
  "remark_added",
  "application_approved",
  "application_completed",
  "application_rejected",
  "lead_accepted",
  "completion_documents_uploaded",
]);

const notificationSchema = new mongoose.Schema(
  {
    // Clerk user IDs will replace development IDs without changing this schema contract.
    recipientUserId: { type: String, required: true, trim: true },
    recipientRole: { type: String, required: true, enum: NOTIFICATION_ROLES },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    applicationNumber: { type: String, required: true, trim: true, uppercase: true },
    serviceTitle: { type: String, trim: true, default: "Service application" },
    link: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, trim: true, select: false },
  },
  { timestamps: true, collection: "notifications" }
);

notificationSchema.index(
  { recipientUserId: 1, recipientRole: 1, isRead: 1, createdAt: -1 },
  { name: "notification_inbox" }
);
notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, sparse: true, name: "unique_notification_event" }
);

export const Notification = mongoose.model("Notification", notificationSchema);
