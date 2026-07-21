import crypto from "crypto";
import mongoose from "mongoose";
import { APPLICATION_STATUSES, APPLICATION_STATUS_VALUES } from "../constants/applicationConstants.js";
import { ASSIGNMENT_TYPES } from "../constants/fulfillmentConstants.js";
import { ROLES } from "../constants/roleConstants.js";
import { getCloudinary } from "../config/cloudinary.js";
import { Application } from "../models/applicationModel.js";
import { ApplicationTimeline } from "../models/applicationTimelineModel.js";
import { ApiError } from "../utils/ApiError.js";
import { createApplicationNotification } from "./notificationService.js";
import { hasAllowedFileSignature, removeUploadedFiles, uploadBuffer } from "./applicationService.js";

export const DOCUMENT_ACTIONS = Object.freeze({
  LIST: "list",
  PREVIEW: "preview",
  DOWNLOAD: "download",
  VERIFY: "verify",
  REJECT: "reject",
  REQUEST_REUPLOAD: "request_reupload",
  REPLACE: "replace",
});

const DOCUMENT_COLLECTIONS = ["files", "additionalDocuments", "completionDocuments"];
const REVIEW_ACTIONS = new Set([DOCUMENT_ACTIONS.VERIFY, DOCUMENT_ACTIONS.REJECT, DOCUMENT_ACTIONS.REQUEST_REUPLOAD]);
const READ_ACTIONS = new Set([DOCUMENT_ACTIONS.LIST, DOCUMENT_ACTIONS.PREVIEW, DOCUMENT_ACTIONS.DOWNLOAD]);
const VERIFICATION_STATUSES = new Set(["verified", "rejected", "reupload_required"]);
const ALLOWED_EXTENSIONS = Object.freeze({
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "application/pdf": new Set(["pdf"]),
});
const URL_TTL_SECONDS = 5 * 60;

const ownerId = (application) => application.customerUserId || application.customerId;
const expertId = (application) => application.assignedExpertId;

const applicationIdentifierFilter = (value) => {
  const identifier = String(value || "").trim();
  if (!identifier) throw new ApiError(400, "Application identifier is required");
  return mongoose.isValidObjectId(identifier)
    ? { $or: [{ _id: identifier }, { applicationNumber: identifier.toUpperCase() }] }
    : { applicationNumber: identifier.toUpperCase() };
};

export const getDocumentId = (document, collection = "files") => {
  if (document?.publicId) return `doc_${crypto.createHash("sha256").update(`${collection}:${document.publicId}`).digest("hex").slice(0, 24)}`;
  return `doc_${crypto.createHash("sha256").update(`${collection}:${document?._id || "missing"}`).digest("hex").slice(0, 24)}`;
};

const hasApplicationAccess = ({ userId, role, application }) => {
  if (!userId || !role || !application) return false;
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.CUSTOMER) return ownerId(application) === userId;
  if (role === ROLES.EXPERT) return expertId(application) === userId;
  if (role === ROLES.PARTNER) {
    return application.assignmentType === ASSIGNMENT_TYPES.PARTNER && application.assignedPartnerId === userId;
  }
  return false;
};

export const canAccessApplicationDocument = ({ userId, role, application, document, action }) => {
  if (!hasApplicationAccess({ userId, role, application })) return false;
  if (READ_ACTIONS.has(action)) return true;
  if (REVIEW_ACTIONS.has(action)) return role === ROLES.ADMIN;
  if (action === DOCUMENT_ACTIONS.REPLACE) {
    return Boolean(document?.replacementRequested) && [ROLES.CUSTOMER, ROLES.PARTNER].includes(role);
  }
  return false;
};

const findDocument = (application, documentId) => {
  for (const collection of DOCUMENT_COLLECTIONS) {
    const index = (application[collection] || []).findIndex((document) => getDocumentId(document, collection) === documentId);
    if (index >= 0) return { collection, index, document: application[collection][index] };
  }
  throw new ApiError(404, "Document not found");
};

const legacyVerificationStatus = (document) => {
  if (document.verificationStatus) return document.verificationStatus;
  if (document.status === "accepted") return "verified";
  if (document.status === "rejected") return "rejected";
  if (document.status === "replacement_requested") return "reupload_required";
  return "pending";
};

const extensionFor = (document) => String(document.format || document.originalName?.split(".").pop() || "").toLowerCase();

const permissionSet = ({ userId, role, application, document }) => ({
  canPreview: canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.PREVIEW }),
  canDownload: canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.DOWNLOAD }),
  canVerify: canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.VERIFY }),
  canRequestReupload: canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.REQUEST_REUPLOAD }),
  canReplace: canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.REPLACE }),
});

export const toSafeDocumentMetadata = ({ userId, role, application, document, collection }) => ({
  id: getDocumentId(document, collection),
  label: document.customLabel || document.label || document.fieldName || "Document",
  originalName: document.originalName,
  mimeType: document.mimeType || (document.format === "pdf" ? "application/pdf" : ""),
  extension: extensionFor(document),
  size: document.size,
  source: document.source || (collection === "additionalDocuments" ? "additional" : collection === "completionDocuments" ? "completion" : "required"),
  uploadedAt: document.uploadedAt,
  verificationStatus: legacyVerificationStatus(document),
  verificationRemark: document.verificationRemark || "",
  replacementRequested: Boolean(document.replacementRequested || document.status === "replacement_requested"),
  isCurrent: document.isCurrent !== false,
  ...permissionSet({ userId, role, application, document }),
});

const loadAuthorizedApplication = async ({ applicationId, userId, role, session = null }) => {
  const application = await Application.findOne(applicationIdentifierFilter(applicationId)).session(session);
  if (!application || !hasApplicationAccess({ userId, role, application })) throw new ApiError(404, "Application not found");
  return application;
};

export const listApplicationDocuments = async ({ applicationId, userId, role }) => {
  const application = await loadAuthorizedApplication({ applicationId, userId, role });
  const documents = DOCUMENT_COLLECTIONS.flatMap((collection) => (application[collection] || [])
    .filter((document) => role === ROLES.ADMIN || document.isCurrent !== false)
    .map((document) => toSafeDocumentMetadata({ userId, role, application, document, collection })));
  return { applicationId: String(application._id), documents };
};

export const buildDocumentAccessUrl = (document, attachment = false, now = Date.now()) => {
  const expiresAt = Math.floor(now / 1000) + URL_TTL_SECONDS;
  const url = getCloudinary().utils.private_download_url(document.publicId, extensionFor(document), {
    resource_type: document.resourceType || "image",
    type: document.deliveryType || "upload",
    expires_at: expiresAt,
    attachment,
  });
  return { url, expiresAt: new Date(expiresAt * 1000).toISOString() };
};

export const createDocumentAccess = async ({ applicationId, documentId, userId, role, action }) => {
  if (![DOCUMENT_ACTIONS.PREVIEW, DOCUMENT_ACTIONS.DOWNLOAD].includes(action)) throw new ApiError(400, "Invalid document access action");
  const application = await loadAuthorizedApplication({ applicationId, userId, role });
  const { collection, document } = findDocument(application, documentId);
  if (!canAccessApplicationDocument({ userId, role, application, document, action })) throw new ApiError(403, "You do not have permission to access this document");
  return {
    application,
    document: toSafeDocumentMetadata({ userId, role, application, document, collection }),
    access: buildDocumentAccessUrl(document, action === DOCUMENT_ACTIONS.DOWNLOAD),
  };
};

const timelineStatus = (application) => APPLICATION_STATUS_VALUES.includes(application.status)
  ? application.status
  : APPLICATION_STATUSES.SUBMITTED;

const reviewNotification = (status) => ({
  verified: { type: "document_verified", title: "Document verified", message: "A document in your application was verified." },
  rejected: { type: "document_rejected", title: "Document rejected", message: "A document in your application was rejected. Review the document remark for details." },
  reupload_required: { type: "document_reupload_requested", title: "Document re-upload requested", message: "A replacement document is required. Review the document remark and upload a new file." },
})[status];

export const updateDocumentVerification = async ({ applicationId, documentId, userId, role, status, remark }) => {
  const cleanStatus = String(status || "").trim().toLowerCase();
  const cleanRemark = String(remark || "").replace(/[<>]/g, "").trim();
  if (!VERIFICATION_STATUSES.has(cleanStatus)) throw new ApiError(400, "Invalid document verification status");
  if (cleanRemark.length > 1000) throw new ApiError(400, "Verification remark cannot exceed 1000 characters");
  if (["rejected", "reupload_required"].includes(cleanStatus) && !cleanRemark) throw new ApiError(400, "A verification remark is required");

  let result;
  await mongoose.connection.transaction(async (session) => {
    const application = await loadAuthorizedApplication({ applicationId, userId, role, session });
    const { collection, document } = findDocument(application, documentId);
    const action = cleanStatus === "verified" ? DOCUMENT_ACTIONS.VERIFY : cleanStatus === "rejected" ? DOCUMENT_ACTIONS.REJECT : DOCUMENT_ACTIONS.REQUEST_REUPLOAD;
    if (!canAccessApplicationDocument({ userId, role, application, document, action })) throw new ApiError(403, "You do not have permission to review this document");
    const reviewedAt = new Date();
    document.verificationStatus = cleanStatus;
    document.verificationRemark = cleanRemark;
    document.verifiedBy = userId;
    document.verifiedAt = reviewedAt;
    document.replacementRequested = cleanStatus === "reupload_required";
    document.status = cleanStatus === "verified" ? "accepted" : cleanStatus === "rejected" ? "rejected" : "replacement_requested";
    document.verificationHistory.push({ status: cleanStatus, remark: cleanRemark, reviewedBy: userId, reviewedAt });
    await application.save({ session });
    const event = reviewNotification(cleanStatus);
    const [timeline] = await ApplicationTimeline.create([{
      application: application._id,
      status: timelineStatus(application),
      remarks: `${event.title}: ${document.label || document.originalName}${cleanRemark ? ` — ${cleanRemark}` : ""}`,
      updatedBy: userId,
    }], { session });
    const customerUserId = ownerId(application);
    if (customerUserId) await createApplicationNotification({
      application,
      recipientUserId: customerUserId,
      recipientRole: ROLES.CUSTOMER,
      ...event,
      eventKey: `document-review:${timeline._id}`,
      metadata: { documentId: getDocumentId(document, collection), verificationStatus: cleanStatus },
      session,
    });
    result = toSafeDocumentMetadata({ userId, role, application, document, collection });
  });
  return result;
};

const validateReplacementFile = (file) => {
  if (!file) throw new ApiError(400, "Replacement document is required");
  if (!ALLOWED_EXTENSIONS[file.mimetype]) throw new ApiError(400, "Only JPG, PNG and PDF files are allowed");
  const extension = String(file.originalname || "").split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS[file.mimetype].has(extension) || !hasAllowedFileSignature(file)) throw new ApiError(400, "Replacement document content or extension is invalid");
};

export const replaceApplicationDocument = async ({ applicationId, documentId, userId, role, file }) => {
  validateReplacementFile(file);
  const initialApplication = await loadAuthorizedApplication({ applicationId, userId, role });
  const initialMatch = findDocument(initialApplication, documentId);
  if (!canAccessApplicationDocument({ userId, role, application: initialApplication, document: initialMatch.document, action: DOCUMENT_ACTIONS.REPLACE })) throw new ApiError(403, "A replacement has not been requested for this document");
  let uploaded;
  try {
    uploaded = await uploadBuffer(file, initialApplication.applicationNumber, "replacement-documents");
    let replacement;
    await mongoose.connection.transaction(async (session) => {
      const application = await loadAuthorizedApplication({ applicationId, userId, role, session });
      const { collection, document } = findDocument(application, documentId);
      if (!canAccessApplicationDocument({ userId, role, application, document, action: DOCUMENT_ACTIONS.REPLACE })) throw new ApiError(409, "A replacement is no longer required for this document");
      document.isCurrent = false;
      document.replacementRequested = false;
      const replacementData = {
        fieldName: document.fieldName,
        fieldKey: document.fieldKey,
        label: document.label,
        documentType: document.documentType,
        customLabel: document.customLabel,
        originalName: file.originalname,
        publicId: uploaded.public_id,
        secureUrl: uploaded.secure_url,
        resourceType: uploaded.resource_type,
        deliveryType: uploaded.type || "authenticated",
        format: uploaded.format || String(file.originalname).split(".").pop().toLowerCase(),
        size: uploaded.bytes ?? file.size,
        mimeType: file.mimetype,
        required: document.required,
        status: "uploaded",
        source: "replacement",
        uploadedBy: userId,
        uploadedByRole: role,
        verificationStatus: "pending",
        replacedDocumentId: getDocumentId(document, collection),
        uploadedAt: new Date(),
      };
      application[collection].push(replacementData);
      await application.save({ session });
      const newDocument = application[collection][application[collection].length - 1];
      const [timeline] = await ApplicationTimeline.create([{
        application: application._id,
        status: timelineStatus(application),
        remarks: `Replacement document uploaded: ${document.label || document.originalName}`,
        updatedBy: userId,
      }], { session });
      const recipients = [];
      if (role !== ROLES.CUSTOMER && ownerId(application)) recipients.push([ownerId(application), ROLES.CUSTOMER]);
      if (role === ROLES.CUSTOMER && expertId(application)) recipients.push([expertId(application), ROLES.EXPERT]);
      if (role === ROLES.CUSTOMER && application.assignedPartnerId) recipients.push([application.assignedPartnerId, ROLES.PARTNER]);
      if (role === ROLES.CUSTOMER && process.env.DEV_ADMIN_USER_ID?.trim()) recipients.push([process.env.DEV_ADMIN_USER_ID.trim(), ROLES.ADMIN]);
      await Promise.all(recipients.map(([recipientUserId, recipientRole]) => createApplicationNotification({
        application,
        recipientUserId,
        recipientRole,
        type: "document_replacement_submitted",
        title: "Replacement document submitted",
        message: "A requested replacement document was uploaded and is ready for review.",
        eventKey: `document-replacement:${timeline._id}`,
        metadata: { documentId: getDocumentId(newDocument, collection) },
        session,
      })));
      replacement = toSafeDocumentMetadata({ userId, role, application, document: newDocument, collection });
    });
    return replacement;
  } catch (error) {
    if (uploaded?.public_id) await removeUploadedFiles([{ publicId: uploaded.public_id, resourceType: uploaded.resource_type, deliveryType: uploaded.type || "authenticated" }]);
    throw error;
  }
};
