import mongoose from "mongoose";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const customerDocumentVersionSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerDocument", required: true },
    versionNumber: { type: Number, required: true, min: 1 },
    originalFileName: { type: String, required: true, trim: true },
    storedFileName: { type: String, required: true, trim: true },
    cloudinaryPublicId: { type: String, required: true, trim: true, select: false },
    cloudinarySecureUrl: { type: String, required: true, trim: true, select: false },
    cloudinaryAssetId: { type: String, trim: true, default: "", select: false },
    cloudinaryVersion: { type: Number, default: null, select: false },
    resourceType: { type: String, trim: true, default: "image" },
    deliveryType: { type: String, enum: ["upload", "private", "authenticated"], default: "authenticated", select: false },
    format: { type: String, trim: true, default: "" },
    folder: { type: String, trim: true, required: true, select: false },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 1 },
    uploadedBy: { type: String, required: true, trim: true },
    uploadedByRole: { type: String, enum: ROLE_VALUES, required: true },
    uploadedAt: { type: Date, default: Date.now },
    replacementReason: { type: String, trim: true, maxlength: 1000, default: "" },
    restoredFromVersion: { type: Number, min: 1, default: null },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: false, collection: "customerdocumentversions" }
);

customerDocumentVersionSchema.index({ document: 1, versionNumber: -1 }, { unique: true });
customerDocumentVersionSchema.index({ document: 1, isCurrent: 1 });

export const CustomerDocumentVersion = mongoose.model(
  "CustomerDocumentVersion",
  customerDocumentVersionSchema
);
