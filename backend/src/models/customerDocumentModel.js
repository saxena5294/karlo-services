import mongoose from "mongoose";
import {
  CUSTOMER_DOCUMENT_TYPE_VALUES,
  DOCUMENT_VERIFICATION_STATUSES,
} from "../constants/customerDocumentConstants.js";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const customerDocumentSchema = new mongoose.Schema(
  {
    customerUserId: { type: String, required: true, trim: true, index: true },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    documentType: { type: String, enum: CUSTOMER_DOCUMENT_TYPE_VALUES, required: true, index: true },
    documentName: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    fileName: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 1 },
    cloudinaryPublicId: { type: String, required: true, trim: true, index: true, select: false },
    cloudinarySecureUrl: { type: String, required: true, trim: true, select: false },
    cloudinaryAssetId: { type: String, trim: true, default: "", select: false },
    cloudinaryVersion: { type: Number, default: null, select: false },
    resourceType: { type: String, required: true, trim: true, default: "image" },
    deliveryType: { type: String, enum: ["upload", "private", "authenticated"], default: "authenticated", select: false },
    format: { type: String, trim: true, default: "" },
    folder: { type: String, required: true, trim: true, select: false },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },
    verificationStatus: { type: String, enum: DOCUMENT_VERIFICATION_STATUSES, default: "pending", index: true },
    publicVerificationRemarks: { type: String, trim: true, maxlength: 1000, default: "" },
    internalVerificationRemarks: { type: String, trim: true, maxlength: 1000, default: "", select: false },
    verifiedBy: { type: String, trim: true, default: "" },
    verifierRole: { type: String, enum: ["", ...ROLE_VALUES], default: "" },
    verifiedAt: { type: Date, default: null },
    uploadedBy: { type: String, required: true, trim: true },
    uploadedByRole: { type: String, enum: ROLE_VALUES, required: true, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, trim: true, default: "" },
    isLocked: { type: Boolean, default: false, index: true },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, trim: true, default: "" },
    lockReason: { type: String, trim: true, maxlength: 1000, default: "" },
    currentVersion: { type: Number, min: 1, default: 1 },
    versionCount: { type: Number, min: 1, default: 1 },
    downloadCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, collection: "customerdocuments" }
);

customerDocumentSchema.pre("validate", function validateDates() {
  if (this.issueDate && this.expiryDate && this.expiryDate < this.issueDate) {
    this.invalidate("expiryDate", "Expiry date cannot be earlier than issue date");
  }
});

customerDocumentSchema.index({ customerUserId: 1, isDeleted: 1, createdAt: -1 });
customerDocumentSchema.index({ applications: 1, isDeleted: 1, createdAt: -1 });
customerDocumentSchema.index({ documentType: 1, verificationStatus: 1, isDeleted: 1 });
customerDocumentSchema.index({ expiryDate: 1, isDeleted: 1 });

export const CustomerDocument = mongoose.model("CustomerDocument", customerDocumentSchema);
