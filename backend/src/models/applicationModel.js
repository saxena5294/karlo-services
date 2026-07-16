import mongoose from "mongoose";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES,
} from "../constants/applicationConstants.js";
import {
  ASSIGNMENT_TYPES,
  ASSIGNMENT_TYPE_VALUES,
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_VALUES,
} from "../constants/fulfillmentConstants.js";

export const applicationFileSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true },
    originalName: { type: String, required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String, default: "" },
    size: { type: Number, required: true },
  },
  { _id: false }
);

// Retained only so applications created before the timeline collection remain readable.
const legacyStatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    message: { type: String, default: "Application submitted successfully" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    serviceForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceForm",
      required: true,
    },
    formData: { type: mongoose.Schema.Types.Mixed, required: true },
    files: { type: [applicationFileSchema], default: [] },
    completionDocuments: { type: [applicationFileSchema], default: [] },
    // These values are Clerk user IDs once authentication is connected.
    customerUserId: { type: String, trim: true, default: null },
    fulfillmentType: {
      type: String,
      enum: FULFILLMENT_TYPE_VALUES,
      default: FULFILLMENT_TYPES.INTERNAL,
    },
    assignmentType: { type: String, enum: [...ASSIGNMENT_TYPE_VALUES, null], default: null },
    assignedExpertId: { type: String, trim: true, default: null },
    assignedPartnerId: { type: String, trim: true, default: null },
    // Compatibility fields are dual-written until existing records are normalized.
    customerId: { type: String, trim: true, default: null },
    assignedRetailerId: { type: String, trim: true, default: null },
    assignedBy: { type: String, trim: true, default: null },
    assignedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: [
        ...APPLICATION_STATUS_VALUES,
        "submitted",
        "under_review",
        "processing",
        "completed",
        "rejected",
      ],
      default: APPLICATION_STATUSES.SUBMITTED,
    },
    statusHistory: {
      type: [legacyStatusHistorySchema],
      default: undefined,
      select: false,
    },
  },
  { timestamps: true, collection: "applications" }
);

applicationSchema.pre("validate", function normalizeCompatibilityFields() {
  this.customerUserId ||= this.customerId || null;
  this.customerId ||= this.customerUserId || null;

  if (!this.assignmentType && (this.assignedExpertId || this.assignedRetailerId)) {
    this.assignmentType = ASSIGNMENT_TYPES.EXPERT;
  }
  if (!this.assignmentType && this.assignedPartnerId) {
    this.assignmentType = ASSIGNMENT_TYPES.PARTNER;
  }

  if (this.assignmentType === ASSIGNMENT_TYPES.EXPERT) {
    this.assignedExpertId ||= this.assignedRetailerId || null;
    this.assignedRetailerId = this.assignedExpertId || null;
    this.assignedPartnerId = null;
  } else if (this.assignmentType === ASSIGNMENT_TYPES.PARTNER) {
    this.assignedPartnerId ||= null;
    this.assignedExpertId = null;
    this.assignedRetailerId = null;
  } else {
    this.assignedExpertId = null;
    this.assignedPartnerId = null;
    this.assignedRetailerId = null;
  }
});

applicationSchema.index({ customerUserId: 1, createdAt: -1 });
applicationSchema.index({ customerId: 1, createdAt: -1 });
applicationSchema.index({ assignmentType: 1, assignedExpertId: 1, createdAt: -1 });
applicationSchema.index({ assignmentType: 1, assignedPartnerId: 1, createdAt: -1 });
applicationSchema.index({ assignedRetailerId: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });

export const Application = mongoose.model("Application", applicationSchema);
