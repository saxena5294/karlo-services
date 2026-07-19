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
    fieldKey: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "Document" },
    documentType: { type: String, trim: true, default: "" },
    originalName: { type: String, required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String, default: "" },
    size: { type: Number, required: true },
    mimeType: { type: String, trim: true, default: "" },
    required: { type: Boolean, default: false },
    status: { type: String, enum: ["uploaded", "accepted", "rejected", "replacement_requested"], default: "uploaded" },
    uploadedAt: { type: Date, default: Date.now },
    customLabel: { type: String, trim: true, default: "" },
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
    additionalDocuments: { type: [applicationFileSchema], default: [] },
    serviceSlug: { type: String, trim: true, default: "" },
    serviceName: { type: String, trim: true, default: "" },
    parentServiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null, index: true },
    parentServiceTitle: { type: String, trim: true, default: "" },
    parentServiceSlug: { type: String, trim: true, default: "" },
    variantKey: { type: String, trim: true, lowercase: true, default: "" },
    variantTitle: { type: String, trim: true, default: "" },
    variantSlug: { type: String, trim: true, lowercase: true, default: "" },
    pricingSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    processingTimeSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    formConfigurationSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    requiredDocumentSnapshot: { type: [String], default: [] },
    submittedByRole: { type: String, enum: ["customer", "expert", "partner", "admin"], default: "customer" },
    applicantName: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    mobileVerified: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true, default: "" },
    additionalDetails: { type: String, trim: true, maxlength: 2000, default: "" },
    paymentStatus: { type: String, enum: ["not_required", "pending", "paid", "failed", "refunded"], default: "not_required" },
    receipt: { generatedAt: { type: Date, default: null }, documentCount: { type: Number, min: 0, default: 0 } },
    submittedAt: { type: Date, default: Date.now },
    submissionKey: { type: String, trim: true, default: undefined },
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
  this.parentServiceId ||= this.service || null;
  this.parentServiceTitle ||= this.serviceName || "";
  this.parentServiceSlug ||= this.serviceSlug || "";
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
applicationSchema.index({ customerUserId: 1, submissionKey: 1 }, { unique: true, sparse: true });

export const Application = mongoose.model("Application", applicationSchema);
