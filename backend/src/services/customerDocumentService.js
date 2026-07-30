import mongoose from "mongoose";
import {
  CUSTOMER_DOCUMENT_TYPES,
  CUSTOMER_DOCUMENT_TYPE_VALUES,
  DOCUMENT_EXPIRY_STATUSES,
  DOCUMENT_VERIFICATION_STATUSES,
} from "../constants/customerDocumentConstants.js";
import { APPLICATION_STATUSES, TERMINAL_APPLICATION_STATUSES } from "../constants/applicationConstants.js";
import { ASSIGNMENT_TYPES } from "../constants/fulfillmentConstants.js";
import { ROLES } from "../constants/roleConstants.js";
import { Application } from "../models/applicationModel.js";
import { AuditLog } from "../models/auditLogModel.js";
import { CustomerDocument } from "../models/customerDocumentModel.js";
import { CustomerDocumentVersion } from "../models/customerDocumentVersionModel.js";
import { ApiError } from "../utils/ApiError.js";
import { hasAllowedFileSignature, removeUploadedFiles, uploadBuffer } from "./applicationService.js";
import { buildDocumentAccessUrl } from "./documentAccessService.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_FILES = Object.freeze({
  "application/pdf": new Set(["pdf"]),
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
});
const PRIVATE_FIELDS = "+cloudinaryPublicId +cloudinarySecureUrl +cloudinaryAssetId +cloudinaryVersion +deliveryType +folder";
const VERSION_PRIVATE_FIELDS = "+cloudinaryPublicId +cloudinarySecureUrl +cloudinaryAssetId +cloudinaryVersion +deliveryType +folder";
const activeApplicationStatuses = APPLICATION_STATUS_VALUES_WITHOUT_TERMINAL();

function APPLICATION_STATUS_VALUES_WITHOUT_TERMINAL() {
  return Object.values(APPLICATION_STATUSES).filter((status) => !TERMINAL_APPLICATION_STATUSES.has(status));
}

const cleanText = (value, label, max, required = false) => {
  const text = String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  if (required && !text) throw new ApiError(400, `${label} is required`);
  if (text.length > max) throw new ApiError(400, `${label} cannot exceed ${max} characters`);
  return text;
};

const safeFileName = (value) =>
  String(value || "document")
    .replace(/[\\/<>:"|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220) || "document";

const identifier = (value, label = "Document") => {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(404, `${label} not found`);
  return value;
};

const parseDate = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00.000Z`)
    : new Date(text);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${label} must be a valid date`);
  return date;
};

const validateDates = (issueDate, expiryDate) => {
  if (issueDate && expiryDate && expiryDate < issueDate) {
    throw new ApiError(400, "Expiry date cannot be earlier than issue date");
  }
};

const validateFile = (file) => {
  if (!file) throw new ApiError(400, "Document file is required");
  const extensions = ALLOWED_FILES[file.mimetype];
  const extension = String(file.originalname || "").split(".").pop().toLowerCase();
  if (!extensions?.has(extension) || !hasAllowedFileSignature(file)) {
    throw new ApiError(400, "Document content, MIME type, or extension is invalid");
  }
  const maxMb = Math.min(Math.max(Number(process.env.CUSTOMER_DOCUMENT_MAX_MB) || 10, 1), 25);
  if (!file.size || file.size > maxMb * 1024 * 1024) {
    throw new ApiError(400, `Document must be smaller than ${maxMb} MB`);
  }
};

const expiryThresholdDays = () =>
  Math.min(Math.max(Number(process.env.DOCUMENT_EXPIRY_WARNING_DAYS) || 30, 1), 365);

export const getDocumentExpiryStatus = (expiryDate, now = new Date()) => {
  if (!expiryDate) return "no_expiry";
  const expiry = new Date(expiryDate);
  if (expiry.getTime() < now.getTime()) return "expired";
  return expiry.getTime() <= now.getTime() + expiryThresholdDays() * 86400000
    ? "expiring_soon"
    : "valid";
};

export const canAccessCustomerDocument = ({ role, owner = false, assigned = false, isLocked = false, isDeleted = false, action }) => {
  const admin = role === ROLES.ADMIN;
  if (action === "restore") return admin && isDeleted;
  if (isDeleted) return false;
  if (["preview", "download", "versions"].includes(action)) return admin || owner || assigned;
  if (action === "verify") return admin || (assigned && [ROLES.PARTNER, ROLES.EXPERT].includes(role));
  if (["lock", "unlock", "restore_version"].includes(action)) return admin;
  if (["replace", "delete", "update"].includes(action)) return admin || (owner && !isLocked);
  return false;
};

const permissions = ({ role, owner, isLocked, isDeleted }) => ({
  canPreview: canAccessCustomerDocument({ role, owner, assigned: true, isLocked, isDeleted, action: "preview" }),
  canDownload: canAccessCustomerDocument({ role, owner, assigned: true, isLocked, isDeleted, action: "download" }),
  canReplace: canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "replace" }),
  canDelete: canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "delete" }),
  canRestore: canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "restore" }),
  canVerify: canAccessCustomerDocument({ role, owner, assigned: true, isLocked, isDeleted, action: "verify" }),
  canLock: canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "lock" }),
  canUnlock: isLocked && canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "unlock" }),
  canRestoreVersion: canAccessCustomerDocument({ role, owner, isLocked, isDeleted, action: "restore_version" }),
});

const safeDocument = (document, { userId, role, includeInternal = false } = {}) => {
  const source = typeof document.toObject === "function" ? document.toObject() : document;
  return {
    _id: source._id,
    customerUserId: source.customerUserId,
    applications: source.applications || [],
    services: source.services || [],
    documentType: source.documentType,
    documentName: source.documentName,
    description: source.description,
    fileName: source.fileName,
    originalFileName: source.originalFileName,
    mimeType: source.mimeType,
    fileSize: source.fileSize,
    issueDate: source.issueDate,
    expiryDate: source.expiryDate,
    expiryStatus: getDocumentExpiryStatus(source.expiryDate),
    verificationStatus: source.verificationStatus,
    verificationRemarks: source.publicVerificationRemarks,
    ...(includeInternal ? { internalVerificationRemarks: source.internalVerificationRemarks || "" } : {}),
    verifiedBy: source.verifiedBy,
    verifierRole: source.verifierRole,
    verifiedAt: source.verifiedAt,
    uploadedBy: source.uploadedBy,
    uploadedByRole: source.uploadedByRole,
    isActive: source.isActive,
    isDeleted: source.isDeleted,
    deletedAt: source.deletedAt,
    isLocked: source.isLocked,
    lockedAt: source.lockedAt,
    lockReason: source.lockReason,
    currentVersion: source.currentVersion,
    versionCount: source.versionCount,
    downloadCount: source.downloadCount,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    ...permissions({
      role,
      owner: source.customerUserId === userId,
      isLocked: source.isLocked,
      isDeleted: source.isDeleted,
    }),
  };
};

const applicationFilter = (value) => mongoose.isValidObjectId(value)
  ? { _id: value }
  : { applicationNumber: String(value || "").trim().toUpperCase() };

const loadLinkedApplication = async ({ value, customerUserId, role, session = null }) => {
  if (!value) return null;
  const application = await Application.findOne(applicationFilter(value))
    .select("_id service customerUserId customerId assignedExpertId assignedPartnerId assignmentType status isDeleted applicationNumber")
    .session(session);
  if (!application || application.isDeleted) throw new ApiError(404, "Application not found");
  if (role === ROLES.CUSTOMER && ![application.customerUserId, application.customerId].includes(customerUserId)) {
    throw new ApiError(403, "Application does not belong to this customer");
  }
  return application;
};

const hasAssignedAccess = async ({ document, userId, role, applicationId = null, session = null }) => {
  if (![ROLES.PARTNER, ROLES.EXPERT].includes(role)) return false;
  const filter = {
    _id: { $in: document.applications || [] },
    isDeleted: { $ne: true },
  };
  if (applicationId) {
    const application = await Application.findOne(applicationFilter(applicationId)).select("_id").session(session);
    if (!application) return false;
    filter._id = application._id;
  }
  if (role === ROLES.EXPERT) {
    filter.assignedExpertId = userId;
    filter.assignmentType = { $in: [null, ASSIGNMENT_TYPES.EXPERT] };
  } else {
    filter.assignedPartnerId = userId;
    filter.assignmentType = ASSIGNMENT_TYPES.PARTNER;
  }
  return Boolean(await Application.exists(filter).session(session));
};

const loadAuthorizedDocument = async ({
  id,
  userId,
  role,
  includeDeleted = false,
  includePrivate = false,
  applicationId = null,
  session = null,
}) => {
  identifier(id);
  let query = CustomerDocument.findById(id).session(session);
  if (includePrivate) query = query.select(PRIVATE_FIELDS);
  if (role !== ROLES.CUSTOMER) query = query.select("+internalVerificationRemarks");
  const document = await query;
  if (!document || (document.isDeleted && !includeDeleted)) throw new ApiError(404, "Document not found");
  const owner = document.customerUserId === userId;
  const authorized = role === ROLES.ADMIN || owner ||
    await hasAssignedAccess({ document, userId, role, applicationId, session });
  if (!authorized) throw new ApiError(404, "Document not found");
  return document;
};

const versionData = ({ documentId, versionNumber, file, upload, userId, role, reason = "", restoredFromVersion = null }) => ({
  document: documentId,
  versionNumber,
  originalFileName: safeFileName(file.originalname),
  storedFileName: safeFileName(upload.original_filename || file.originalname),
  cloudinaryPublicId: upload.public_id,
  cloudinarySecureUrl: upload.secure_url,
  cloudinaryAssetId: upload.asset_id || "",
  cloudinaryVersion: upload.version || null,
  resourceType: upload.resource_type || "image",
  deliveryType: upload.type || "authenticated",
  format: upload.format || String(file.originalname).split(".").pop().toLowerCase(),
  folder: upload.folder || "",
  mimeType: file.mimetype,
  fileSize: upload.bytes ?? file.size,
  uploadedBy: userId,
  uploadedByRole: role,
  uploadedAt: new Date(),
  replacementReason: reason,
  restoredFromVersion,
  isCurrent: true,
});

const applyCurrentVersion = (document, version) => {
  document.fileName = version.storedFileName;
  document.originalFileName = version.originalFileName;
  document.mimeType = version.mimeType;
  document.fileSize = version.fileSize;
  document.cloudinaryPublicId = version.cloudinaryPublicId;
  document.cloudinarySecureUrl = version.cloudinarySecureUrl;
  document.cloudinaryAssetId = version.cloudinaryAssetId;
  document.cloudinaryVersion = version.cloudinaryVersion;
  document.resourceType = version.resourceType;
  document.deliveryType = version.deliveryType;
  document.format = version.format;
  document.folder = version.folder;
  document.currentVersion = version.versionNumber;
  document.versionCount = version.versionNumber;
};

export const listDocumentTypes = () => ({
  documentTypes: CUSTOMER_DOCUMENT_TYPES,
  verificationStatuses: DOCUMENT_VERIFICATION_STATUSES,
  expiryStatuses: DOCUMENT_EXPIRY_STATUSES,
  maxUploadMb: Math.min(Math.max(Number(process.env.CUSTOMER_DOCUMENT_MAX_MB) || 10, 1), 25),
  expiryWarningDays: expiryThresholdDays(),
});

export const createCustomerDocument = async ({ userId, role, payload, file }) => {
  if (![ROLES.CUSTOMER, ROLES.ADMIN].includes(role)) throw new ApiError(403, "Only customers and administrators can upload customer documents");
  const allowed = new Set(["documentType", "documentName", "description", "issueDate", "expiryDate", "applicationId", "customerUserId", "allowDuplicate"]);
  const unexpected = Object.keys(payload).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  validateFile(file);
  const documentType = cleanText(payload.documentType, "Document type", 80, true).toLowerCase();
  if (!CUSTOMER_DOCUMENT_TYPE_VALUES.includes(documentType)) throw new ApiError(400, "Invalid document type");
  const customerUserId = role === ROLES.ADMIN
    ? cleanText(payload.customerUserId, "Customer", 160, true)
    : userId;
  const application = await loadLinkedApplication({ value: payload.applicationId, customerUserId, role });
  if (application && ![application.customerUserId, application.customerId].includes(customerUserId)) {
    throw new ApiError(400, "The selected application does not belong to the selected customer");
  }
  const issueDate = parseDate(payload.issueDate, "Issue date");
  const expiryDate = parseDate(payload.expiryDate, "Expiry date");
  validateDates(issueDate, expiryDate);
  const allowDuplicate = String(payload.allowDuplicate).toLowerCase() === "true";
  if (!allowDuplicate && await CustomerDocument.exists({ customerUserId, documentType, isDeleted: { $ne: true } })) {
    throw new ApiError(409, "An active document of this type already exists", { duplicateDocumentType: documentType });
  }
  const safeCustomer = customerUserId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
  const upload = await uploadBuffer(file, `customers/${safeCustomer}`, `documents/${documentType}`);
  let document;
  try {
    await mongoose.connection.transaction(async (session) => {
      [document] = await CustomerDocument.create([{
        customerUserId,
        applications: application ? [application._id] : [],
        services: application?.service ? [application.service] : [],
        documentType,
        documentName: cleanText(payload.documentName, "Document name", 160) ||
          CUSTOMER_DOCUMENT_TYPES.find(({ value }) => value === documentType)?.label ||
          file.originalname,
        description: cleanText(payload.description, "Description", 1000),
        fileName: safeFileName(upload.original_filename || file.originalname),
        originalFileName: safeFileName(file.originalname),
        mimeType: file.mimetype,
        fileSize: upload.bytes ?? file.size,
        cloudinaryPublicId: upload.public_id,
        cloudinarySecureUrl: upload.secure_url,
        cloudinaryAssetId: upload.asset_id || "",
        cloudinaryVersion: upload.version || null,
        resourceType: upload.resource_type || "image",
        deliveryType: upload.type || "authenticated",
        format: upload.format || String(file.originalname).split(".").pop().toLowerCase(),
        folder: upload.folder || "",
        issueDate,
        expiryDate,
        uploadedBy: userId,
        uploadedByRole: role,
      }], { session });
      await CustomerDocumentVersion.create([
        versionData({ documentId: document._id, versionNumber: 1, file, upload, userId, role }),
      ], { session });
    });
    return safeDocument(document, { userId, role, includeInternal: role === ROLES.ADMIN });
  } catch (error) {
    await removeUploadedFiles([{ publicId: upload.public_id, resourceType: upload.resource_type, deliveryType: upload.type || "authenticated" }]);
    throw error;
  }
};

const pagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const escaped = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const expiryFilter = (status) => {
  const now = new Date();
  const soon = new Date(now.getTime() + expiryThresholdDays() * 86400000);
  if (status === "expired") return { $lt: now };
  if (status === "expiring_soon") return { $gte: now, $lte: soon };
  if (status === "valid") return { $gt: soon };
  if (status === "no_expiry") return null;
  throw new ApiError(400, "Invalid expiry status filter");
};

export const listCustomerDocuments = async ({ userId, role, query = {}, mine = false }) => {
  const allowed = new Set(["page", "limit", "search", "documentType", "verificationStatus", "expiryStatus", "customerUserId", "applicationId", "serviceId", "uploadedByRole", "dateFrom", "dateTo", "locked", "deleted", "sortBy", "sortOrder"]);
  const unexpected = Object.keys(query).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected query parameters: ${unexpected.join(", ")}`);
  const filter = {};
  if (mine || role === ROLES.CUSTOMER) filter.customerUserId = userId;
  else if (role === ROLES.ADMIN && query.customerUserId) filter.customerUserId = query.customerUserId.trim();
  else if (![ROLES.ADMIN, ROLES.PARTNER, ROLES.EXPERT].includes(role)) throw new ApiError(403, "Document access is not allowed");

  if (role === ROLES.PARTNER || role === ROLES.EXPERT) {
    if (!query.applicationId) throw new ApiError(400, "applicationId is required for assigned document access");
    const application = await loadLinkedApplication({ value: query.applicationId, customerUserId: "", role });
    const assignmentMatches = role === ROLES.EXPERT
      ? application.assignedExpertId === userId && (!application.assignmentType || application.assignmentType === ASSIGNMENT_TYPES.EXPERT)
      : application.assignedPartnerId === userId && application.assignmentType === ASSIGNMENT_TYPES.PARTNER;
    if (!assignmentMatches) throw new ApiError(404, "Application not found");
    filter.applications = application._id;
  } else if (query.applicationId) {
    const application = await Application.findOne(applicationFilter(query.applicationId)).select("_id").lean();
    if (!application) throw new ApiError(404, "Application not found");
    filter.applications = application._id;
  }
  if (query.serviceId) {
    if (!mongoose.isValidObjectId(query.serviceId)) throw new ApiError(400, "Invalid service filter");
    filter.services = query.serviceId;
  }
  if (query.documentType) {
    if (!CUSTOMER_DOCUMENT_TYPE_VALUES.includes(query.documentType)) throw new ApiError(400, "Invalid document type filter");
    filter.documentType = query.documentType;
  }
  if (query.verificationStatus) {
    if (!DOCUMENT_VERIFICATION_STATUSES.includes(query.verificationStatus)) throw new ApiError(400, "Invalid verification filter");
    filter.verificationStatus = query.verificationStatus;
  }
  if (query.uploadedByRole) {
    if (!Object.values(ROLES).includes(query.uploadedByRole)) throw new ApiError(400, "Invalid uploader role filter");
    filter.uploadedByRole = query.uploadedByRole;
  }
  if (query.locked !== undefined) {
    if (!["true", "false"].includes(String(query.locked))) throw new ApiError(400, "locked must be true or false");
    filter.isLocked = String(query.locked) === "true";
  }
  if (query.deleted !== undefined && role === ROLES.ADMIN) {
    if (!["true", "false"].includes(String(query.deleted))) throw new ApiError(400, "deleted must be true or false");
    filter.isDeleted = String(query.deleted) === "true";
  } else filter.isDeleted = { $ne: true };
  if (query.expiryStatus) {
    if (!DOCUMENT_EXPIRY_STATUSES.includes(query.expiryStatus)) throw new ApiError(400, "Invalid expiry status filter");
    const value = expiryFilter(query.expiryStatus);
    filter.expiryDate = value || null;
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = parseDate(query.dateFrom, "Start date");
    if (query.dateTo) {
      const end = parseDate(query.dateTo, "End date");
      end.setUTCHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  if (query.search?.trim()) {
    const pattern = { $regex: escaped(query.search.trim()), $options: "i" };
    const matchingApplications = await Application.find({
      $or: [
        { applicationNumber: pattern },
        { applicantName: pattern },
        { mobileNumber: pattern },
        { email: pattern },
      ],
    }).select("_id customerUserId customerId").lean();
    filter.$or = [
      { documentName: pattern },
      { originalFileName: pattern },
      { customerUserId: pattern },
      { applications: { $in: matchingApplications.map(({ _id }) => _id) } },
      { customerUserId: { $in: matchingApplications.flatMap((item) => [item.customerUserId, item.customerId]).filter(Boolean) } },
    ];
  }
  const sorts = new Set(["createdAt", "documentName", "expiryDate", "fileSize", "currentVersion"]);
  if (query.sortBy && !sorts.has(query.sortBy)) throw new ApiError(400, "Invalid document sort field");
  if (query.sortOrder && !["asc", "desc"].includes(query.sortOrder)) throw new ApiError(400, "sortOrder must be asc or desc");
  const sortBy = sorts.has(query.sortBy) ? query.sortBy : "createdAt";
  const direction = query.sortOrder === "asc" ? 1 : -1;
  const { page, limit, skip } = pagination(query);
  const [documents, total] = await Promise.all([
    CustomerDocument.find(filter)
      .select(role === ROLES.CUSTOMER ? "" : "+internalVerificationRemarks")
      .populate("applications", "applicationNumber status")
      .populate("services", "title slug")
      .sort({ [sortBy]: direction, _id: direction })
      .skip(skip)
      .limit(limit)
      .lean(),
    CustomerDocument.countDocuments(filter),
  ]);
  return {
    documents: documents.map((document) => safeDocument(document, { userId, role, includeInternal: role !== ROLES.CUSTOMER })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getCustomerDocumentDetails = async ({ id, userId, role, applicationId = null }) => {
  const document = await loadAuthorizedDocument({ id, userId, role, includeDeleted: role === ROLES.ADMIN, applicationId });
  const result = safeDocument(document, { userId, role, includeInternal: role !== ROLES.CUSTOMER });
  if (role === ROLES.ADMIN) {
    result.activity = await AuditLog.find({ entityType: "customer_document", entityId: String(document._id) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
  return result;
};

export const updateCustomerDocument = async ({ id, userId, role, payload }) => {
  const allowed = new Set(["documentName", "description", "issueDate", "expiryDate", "applicationId"]);
  const unexpected = Object.keys(payload).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  const document = await loadAuthorizedDocument({ id, userId, role });
  if (role !== ROLES.ADMIN && document.customerUserId !== userId) throw new ApiError(403, "Only the owner or an administrator can update this document");
  if (document.isLocked && role !== ROLES.ADMIN) throw new ApiError(409, "Locked documents cannot be changed");
  if (payload.documentName !== undefined) document.documentName = cleanText(payload.documentName, "Document name", 160, true);
  if (payload.description !== undefined) document.description = cleanText(payload.description, "Description", 1000);
  const issueDate = payload.issueDate !== undefined ? parseDate(payload.issueDate, "Issue date") : document.issueDate;
  const expiryDate = payload.expiryDate !== undefined ? parseDate(payload.expiryDate, "Expiry date") : document.expiryDate;
  validateDates(issueDate, expiryDate);
  document.issueDate = issueDate;
  document.expiryDate = expiryDate;
  if (payload.applicationId) {
    const application = await loadLinkedApplication({ value: payload.applicationId, customerUserId: document.customerUserId, role });
    if (![application.customerUserId, application.customerId].includes(document.customerUserId)) {
      throw new ApiError(400, "The selected application does not belong to this document owner");
    }
    if (!document.applications.some((item) => String(item) === String(application._id))) document.applications.push(application._id);
    if (application.service && !document.services.some((item) => String(item) === String(application.service))) document.services.push(application.service);
  }
  await document.save();
  return safeDocument(document, { userId, role, includeInternal: role === ROLES.ADMIN });
};

export const replaceCustomerDocument = async ({ id, userId, role, file, replacementReason }) => {
  validateFile(file);
  const reason = cleanText(replacementReason, "Replacement reason", 1000, true);
  const existing = await loadAuthorizedDocument({ id, userId, role, includePrivate: true });
  if (role !== ROLES.ADMIN && existing.customerUserId !== userId) throw new ApiError(403, "Only the owner or an administrator can replace this document");
  if (existing.isLocked && role !== ROLES.ADMIN) throw new ApiError(409, "Locked documents cannot be replaced");
  if (role !== ROLES.ADMIN && existing.verificationStatus !== "reupload_required" && existing.applications.length) {
    const processingLock = await Application.exists({
      _id: { $in: existing.applications },
      status: { $in: [APPLICATION_STATUSES.PROCESSING, APPLICATION_STATUSES.AWAITING_ADMIN_REVIEW, APPLICATION_STATUSES.APPROVED] },
      isDeleted: { $ne: true },
    });
    if (processingLock) throw new ApiError(409, "This document is locked by an application currently under processing");
  }
  const safeCustomer = existing.customerUserId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
  const upload = await uploadBuffer(file, `customers/${safeCustomer}`, `documents/${existing.documentType}`);
  try {
    let document;
    await mongoose.connection.transaction(async (session) => {
      document = await loadAuthorizedDocument({ id, userId, role, includePrivate: true, session });
      if (document.isLocked && role !== ROLES.ADMIN) throw new ApiError(409, "Locked documents cannot be replaced");
      await CustomerDocumentVersion.updateMany({ document: document._id, isCurrent: true }, { $set: { isCurrent: false } }, { session });
      const next = document.versionCount + 1;
      const data = versionData({ documentId: document._id, versionNumber: next, file, upload, userId, role, reason });
      await CustomerDocumentVersion.create([data], { session });
      applyCurrentVersion(document, data);
      document.verificationStatus = "pending";
      document.publicVerificationRemarks = "";
      document.internalVerificationRemarks = "";
      document.verifiedBy = "";
      document.verifierRole = "";
      document.verifiedAt = null;
      if (role !== ROLES.ADMIN) {
        document.isLocked = false;
        document.lockedAt = null;
        document.lockedBy = "";
        document.lockReason = "";
      }
      await document.save({ session });
    });
    return safeDocument(document, { userId, role, includeInternal: role === ROLES.ADMIN });
  } catch (error) {
    await removeUploadedFiles([{ publicId: upload.public_id, resourceType: upload.resource_type, deliveryType: upload.type || "authenticated" }]);
    throw error;
  }
};

export const listCustomerDocumentVersions = async ({ id, userId, role, applicationId = null }) => {
  const document = await loadAuthorizedDocument({ id, userId, role, includeDeleted: role === ROLES.ADMIN, applicationId });
  const versions = await CustomerDocumentVersion.find({ document: document._id })
    .sort({ versionNumber: -1 })
    .lean();
  const result = {
    document: safeDocument(document, { userId, role, includeInternal: role !== ROLES.CUSTOMER }),
    versions: versions.map((version) => ({
      _id: version._id,
      versionNumber: version.versionNumber,
      originalFileName: version.originalFileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      uploadedBy: version.uploadedBy,
      uploadedByRole: version.uploadedByRole,
      uploadedAt: version.uploadedAt,
      replacementReason: version.replacementReason,
      restoredFromVersion: version.restoredFromVersion,
      isCurrent: version.isCurrent,
      canDownload: true,
      canRestore: role === ROLES.ADMIN && !version.isCurrent && !document.isDeleted,
    })),
  };
  if (role === ROLES.ADMIN) {
    result.activity = await AuditLog.find({ entityType: "customer_document", entityId: String(document._id) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
  return result;
};

export const createCustomerDocumentAccess = async ({ id, versionId = null, userId, role, action, applicationId = null }) => {
  if (!["preview", "download"].includes(action)) throw new ApiError(400, "Invalid document access action");
  const document = await loadAuthorizedDocument({ id, userId, role, includePrivate: !versionId, applicationId });
  let storage = document;
  if (versionId) {
    identifier(versionId, "Document version");
    storage = await CustomerDocumentVersion.findOne({ _id: versionId, document: document._id }).select(VERSION_PRIVATE_FIELDS);
    if (!storage) throw new ApiError(404, "Document version not found");
  }
  if (action === "download") await CustomerDocument.updateOne({ _id: document._id }, { $inc: { downloadCount: 1 } });
  return {
    document: safeDocument(document, { userId, role, includeInternal: role !== ROLES.CUSTOMER }),
    access: buildDocumentAccessUrl({
      publicId: storage.cloudinaryPublicId,
      format: storage.format,
      originalName: storage.originalFileName,
      resourceType: storage.resourceType,
      deliveryType: storage.deliveryType,
    }, action === "download"),
  };
};

export const deleteCustomerDocument = async ({ id, userId, role }) => {
  const document = await loadAuthorizedDocument({ id, userId, role });
  if (role !== ROLES.ADMIN && document.customerUserId !== userId) throw new ApiError(403, "Only the owner or an administrator can delete this document");
  if (document.isLocked && role !== ROLES.ADMIN) throw new ApiError(409, "Locked documents cannot be deleted");
  if (role !== ROLES.ADMIN && document.applications.length) {
    const inUse = await Application.exists({ _id: { $in: document.applications }, status: { $in: activeApplicationStatuses }, isDeleted: { $ne: true } });
    if (inUse) throw new ApiError(409, "This document is linked to an active application and cannot be deleted");
  }
  document.isDeleted = true;
  document.isActive = false;
  document.status = "inactive";
  document.deletedAt = new Date();
  document.deletedBy = userId;
  await document.save();
  return safeDocument(document, { userId, role, includeInternal: role === ROLES.ADMIN });
};

export const restoreCustomerDocument = async ({ id, userId, role }) => {
  if (role !== ROLES.ADMIN) throw new ApiError(403, "Only administrators can restore documents");
  const document = await loadAuthorizedDocument({ id, userId, role, includeDeleted: true });
  if (!document.isDeleted) throw new ApiError(409, "Document is not deleted");
  document.isDeleted = false;
  document.isActive = true;
  document.status = "active";
  document.deletedAt = null;
  document.deletedBy = "";
  await document.save();
  return safeDocument(document, { userId, role, includeInternal: true });
};

export const verifyCustomerDocument = async ({ id, userId, role, status, publicRemarks, internalRemarks, applicationId = null }) => {
  if (![ROLES.ADMIN, ROLES.PARTNER, ROLES.EXPERT].includes(role)) throw new ApiError(403, "Document verification is not allowed");
  const cleanStatus = cleanText(status, "Verification status", 40, true).toLowerCase();
  if (!DOCUMENT_VERIFICATION_STATUSES.includes(cleanStatus)) throw new ApiError(400, "Invalid verification status");
  const publicText = cleanText(publicRemarks, "Public verification remarks", 1000);
  const internalText = cleanText(internalRemarks, "Internal verification remarks", 1000);
  if (["rejected", "reupload_required"].includes(cleanStatus) && !publicText) {
    throw new ApiError(400, "A customer-visible verification remark is required");
  }
  const document = await loadAuthorizedDocument({ id, userId, role, applicationId });
  document.verificationStatus = cleanStatus;
  document.publicVerificationRemarks = publicText;
  document.internalVerificationRemarks = internalText;
  document.verifiedBy = userId;
  document.verifierRole = role;
  document.verifiedAt = new Date();
  if (cleanStatus === "verified") {
    document.isLocked = true;
    document.lockedAt = new Date();
    document.lockedBy = userId;
    document.lockReason = "Automatically locked after verification";
  } else if (cleanStatus === "reupload_required") {
    document.isLocked = false;
    document.lockedAt = null;
    document.lockedBy = "";
    document.lockReason = "";
  }
  await document.save();
  return safeDocument(document, { userId, role, includeInternal: true });
};

export const setCustomerDocumentLock = async ({ id, userId, role, locked, reason }) => {
  if (role !== ROLES.ADMIN) throw new ApiError(403, "Only administrators can change document locks");
  const document = await loadAuthorizedDocument({ id, userId, role });
  const cleanReason = cleanText(reason, locked ? "Lock reason" : "Unlock reason", 1000, true);
  document.isLocked = locked;
  document.lockedAt = locked ? new Date() : null;
  document.lockedBy = locked ? userId : "";
  document.lockReason = locked ? cleanReason : "";
  await document.save();
  return safeDocument(document, { userId, role, includeInternal: true });
};

export const restoreCustomerDocumentVersion = async ({ id, versionId, userId, role, reason }) => {
  if (role !== ROLES.ADMIN) throw new ApiError(403, "Only administrators can restore document versions");
  identifier(versionId, "Document version");
  const cleanReason = cleanText(reason, "Restore reason", 1000, true);
  let document;
  await mongoose.connection.transaction(async (session) => {
    document = await loadAuthorizedDocument({ id, userId, role, includePrivate: true, session });
    const source = await CustomerDocumentVersion.findOne({ _id: versionId, document: document._id }).select(VERSION_PRIVATE_FIELDS).session(session);
    if (!source) throw new ApiError(404, "Document version not found");
    await CustomerDocumentVersion.updateMany({ document: document._id, isCurrent: true }, { $set: { isCurrent: false } }, { session });
    const next = document.versionCount + 1;
    const data = {
      document: document._id,
      versionNumber: next,
      originalFileName: source.originalFileName,
      storedFileName: source.storedFileName,
      cloudinaryPublicId: source.cloudinaryPublicId,
      cloudinarySecureUrl: source.cloudinarySecureUrl,
      cloudinaryAssetId: source.cloudinaryAssetId,
      cloudinaryVersion: source.cloudinaryVersion,
      resourceType: source.resourceType,
      deliveryType: source.deliveryType,
      format: source.format,
      folder: source.folder,
      mimeType: source.mimeType,
      fileSize: source.fileSize,
      uploadedBy: userId,
      uploadedByRole: role,
      uploadedAt: new Date(),
      replacementReason: cleanReason,
      restoredFromVersion: source.versionNumber,
      isCurrent: true,
    };
    await CustomerDocumentVersion.create([data], { session });
    applyCurrentVersion(document, data);
    document.verificationStatus = "pending";
    document.publicVerificationRemarks = "";
    document.internalVerificationRemarks = "";
    document.verifiedBy = "";
    document.verifierRole = "";
    document.verifiedAt = null;
    await document.save({ session });
  });
  return safeDocument(document, { userId, role, includeInternal: true });
};
