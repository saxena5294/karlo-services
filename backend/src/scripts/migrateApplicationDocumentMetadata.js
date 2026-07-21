import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { Application } from "../models/applicationModel.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const mimeType = (document) => document.mimeType || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" }[String(document.format || document.originalName?.split(".").pop() || "").toLowerCase()] || "");
const verificationStatus = (status) => status === "accepted" ? "verified" : status === "rejected" ? "rejected" : status === "replacement_requested" ? "reupload_required" : "pending";

const normalize = (document, source) => ({
  ...document,
  _id: document._id || new mongoose.Types.ObjectId(),
  fieldKey: document.fieldKey || document.fieldName || "document",
  label: document.label || document.customLabel || document.fieldName || "Document",
  deliveryType: document.deliveryType || "upload",
  mimeType: mimeType(document),
  source: document.source || source,
  uploadedBy: document.uploadedBy || "legacy",
  uploadedByRole: document.uploadedByRole || "",
  verificationStatus: document.verificationStatus || verificationStatus(document.status),
  verificationRemark: document.verificationRemark || "",
  verifiedBy: document.verifiedBy || "",
  verifiedAt: document.verifiedAt || null,
  replacementRequested: document.replacementRequested ?? document.status === "replacement_requested",
  replacedDocumentId: document.replacedDocumentId || "",
  isCurrent: document.isCurrent !== false,
  verificationHistory: document.verificationHistory || [],
});

const run = async () => {
  try {
    await connectDatabase();
    const cursor = Application.collection.find({ $or: [
      { "files.deliveryType": { $exists: false } },
      { "additionalDocuments.deliveryType": { $exists: false } },
      { "completionDocuments.deliveryType": { $exists: false } },
    ] });
    let reviewed = 0; let updated = 0;
    for await (const application of cursor) {
      reviewed += 1;
      const result = await Application.collection.updateOne({ _id: application._id }, { $set: {
        files: (application.files || []).map((document) => normalize(document, "required")),
        additionalDocuments: (application.additionalDocuments || []).map((document) => normalize(document, "additional")),
        completionDocuments: (application.completionDocuments || []).map((document) => normalize(document, "completion")),
      } });
      updated += result.modifiedCount;
    }
    console.log(`[document migration] Reviewed: ${reviewed}; updated: ${updated}. Legacy Cloudinary assets remain deliveryType=upload.`);
  } catch (error) {
    console.error(`[document migration] Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  }
};

run();
