import crypto from "crypto";
import mongoose from "mongoose";
import streamifier from "streamifier";
import { getCloudinary } from "../config/cloudinary.js";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_TRANSITIONS,
  APPLICATION_STATUS_VALUES,
  TERMINAL_APPLICATION_STATUSES,
} from "../constants/applicationConstants.js";
import {
  ASSIGNMENT_TYPES,
  FULFILLMENT_TYPES,
} from "../constants/fulfillmentConstants.js";
import { ROLES } from "../constants/roleConstants.js";
import { Application } from "../models/applicationModel.js";
import { ApplicationTimeline } from "../models/applicationTimelineModel.js";
import { ApplicationAssignment } from "../models/applicationAssignmentModel.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createApplicationNotification,
  sanitizeNotificationText,
} from "./notificationService.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ASSIGNEE_STATUS_VALUES = new Set([
  APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
  APPLICATION_STATUSES.PROCESSING,
  APPLICATION_STATUSES.APPROVED,
  APPLICATION_STATUSES.COMPLETED,
  APPLICATION_STATUSES.REJECTED,
]);

const createApplicationNumber = () =>
  `KARLO-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

export const uploadBuffer = (file, applicationNumber, folder = "applications") =>
  new Promise((resolve, reject) => {
    const upload = getCloudinary().uploader.upload_stream(
      {
        folder: `karlo-services/${applicationNumber}/${folder}`,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    streamifier.createReadStream(file.buffer).pipe(upload);
  });

export const removeUploadedFiles = async (files) => {
  if (!files.length) return;

  const cloudinary = getCloudinary();
  await Promise.allSettled(
    files.map(({ publicId, resourceType }) =>
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    )
  );
};

const normalizeBodyValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.trim();
  return value;
};

const isMissing = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

const matchesAcceptRule = (file, accept = "") => {
  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (!rules.length) return true;

  const mimeType = file.mimetype.toLowerCase();
  const fileName = file.originalname.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith(".")) return fileName.endsWith(rule);
    if (rule.endsWith("/*")) return mimeType.startsWith(rule.slice(0, -1));
    return mimeType === rule;
  });
};

export const hasAllowedFileSignature = (file) => {
  const { buffer, mimetype } = file;

  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  if (mimetype === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }

  if (mimetype === "application/pdf") {
    return buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  }

  return false;
};

const validateSubmission = (form, body, files) => {
  const errors = [];
  const allowedFields = new Set(form.fields.map(({ name }) => name));
  const filesByField = files.reduce((groups, file) => {
    groups[file.fieldname] = [...(groups[file.fieldname] || []), file];
    return groups;
  }, {});

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) errors.push(`Unexpected field: ${key}`);
  }

  for (const file of files) {
    const config = form.fields.find(({ name }) => name === file.fieldname);
    if (!config || config.type !== "file") errors.push(`Unexpected file field: ${file.fieldname}`);
  }

  for (const field of form.fields) {
    const value = body[field.name];
    const missingValue = isMissing(value);
    const fieldFiles = filesByField[field.name] || [];

    if (Array.isArray(value) && field.type !== "checkbox") {
      errors.push(`${field.label} accepts only one value`);
    }

    if (field.required && field.type === "file" && !fieldFiles.length) {
      errors.push(`${field.label} is required`);
    } else if (field.required && field.type !== "file" && missingValue) {
      errors.push(`${field.label} is required`);
    }

    if (field.options.length && !missingValue) {
      const allowed = new Set(field.options.map(({ value: optionValue }) => optionValue));
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => !allowed.has(item))) {
        errors.push(`${field.label} has an invalid value`);
      }
    }

    if (field.type === "number" && !missingValue) {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        errors.push(`${field.label} must be a valid number`);
      } else if (field.min !== undefined && numberValue < field.min) {
        errors.push(`${field.label} must be at least ${field.min}`);
      } else if (field.max !== undefined && numberValue > field.max) {
        errors.push(`${field.label} must be no more than ${field.max}`);
      }
    }

    if (field.type === "email" && !missingValue) {
      const email = String(value).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`${field.label} must be a valid email address`);
      }
    }

    if (field.type === "date" && !missingValue) {
      const date = String(value).trim();
      const parsedDate = new Date(`${date}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        errors.push(`${field.label} must be a valid date`);
      }
    }

    if (field.type === "file") {
      const maxBytes = Number(field.maxFileSizeMb || 5) * 1024 * 1024;
      if (fieldFiles.some((file) => file.size > maxBytes)) {
        errors.push(`${field.label} must be no larger than ${field.maxFileSizeMb || 5} MB`);
      }
      if (!field.multiple && fieldFiles.length > 1) {
        errors.push(`${field.label} accepts only one file`);
      }
      if (fieldFiles.some((file) => !matchesAcceptRule(file, field.accept))) {
        errors.push(`${field.label} contains an unsupported file type`);
      }
      if (fieldFiles.some((file) => !hasAllowedFileSignature(file))) {
        errors.push(`${field.label} does not contain a valid JPEG, PNG, WEBP, or PDF file`);
      }
    }
  }

  return errors;
};

const normalizeStatus = (status) => {
  if (typeof status !== "string") return null;
  const normalized = status.trim().replaceAll("_", " ").toLowerCase();
  if (normalized === "under review") return APPLICATION_STATUSES.PROCESSING;
  return APPLICATION_STATUS_VALUES.find((value) => value.toLowerCase() === normalized) || null;
};

const getStatusStorageValues = (status) => {
  const legacyStatuses = {
    [APPLICATION_STATUSES.SUBMITTED]: ["submitted"],
    [APPLICATION_STATUSES.PROCESSING]: ["under_review", "processing"],
    [APPLICATION_STATUSES.COMPLETED]: ["completed"],
    [APPLICATION_STATUSES.REJECTED]: ["rejected"],
  };
  return [status, ...(legacyStatuses[status] || [])];
};

const getPagination = ({ page, limit }) => {
  const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const customerOwnerFilter = (customerUserId) => ({
  $or: [{ customerUserId }, { customerId: customerUserId }],
});

const expertOwnerFilter = (expertUserId) => ({
  $or: [{ assignedExpertId: expertUserId }, { assignedRetailerId: expertUserId }],
});

const partnerOwnerFilter = (partnerUserId) => ({
  assignmentType: ASSIGNMENT_TYPES.PARTNER,
  assignedPartnerId: partnerUserId,
});

const getCustomerUserId = (application) => application.customerUserId || application.customerId;
const getAssignedExpertId = (application) => application.assignedExpertId || application.assignedRetailerId;

const buildCustomerFilter = async (customerId, query = {}) => {
  if (!customerId?.trim()) throw new ApiError(400, "Customer identity is required");

  const filter = { $and: [customerOwnerFilter(customerId.trim())] };
  const status = query.status ? normalizeStatus(query.status) : null;
  if (query.status && !status) throw new ApiError(400, "Invalid application status");
  if (status) filter.status = { $in: getStatusStorageValues(status) };

  if (query.search?.trim()) {
    const searchPattern = escapeRegex(query.search.trim());
    const services = await Service.find({ title: { $regex: searchPattern, $options: "i" } })
      .select("_id")
      .lean();
    filter.$and.push({ $or: [
      { applicationNumber: { $regex: searchPattern, $options: "i" } },
      { service: { $in: services.map(({ _id }) => _id) } },
    ] });
  }

  return filter;
};

const listApplications = async (filter, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .select("-formData -files")
      .populate("service", "title slug category processingTime price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getApplicationIdentifierFilter = (id) => {
  if (!id?.trim()) throw new ApiError(400, "Application identifier is required");
  const identifier = id.trim();
  return mongoose.isValidObjectId(identifier)
    ? { $or: [{ _id: identifier }, { applicationNumber: identifier.toUpperCase() }] }
    : { applicationNumber: identifier.toUpperCase() };
};

const getCustomerName = (formData = {}) => {
  const preferredKeys = [
    "fullName",
    "applicantName",
    "customerName",
    "name",
    "firstName",
  ];
  const matchedKey = preferredKeys.find((key) => {
    const value = formData[key];
    return typeof value === "string" && value.trim();
  });
  if (!matchedKey) return "Customer";
  const firstName = formData[matchedKey].trim();
  const lastName = typeof formData.lastName === "string" ? formData.lastName.trim() : "";
  return matchedKey === "firstName" && lastName ? `${firstName} ${lastName}` : firstName;
};

const findApplicationForUpdate = async (applicationNumber, session) => {
  const application = await Application.findOne({
    applicationNumber: applicationNumber.toUpperCase(),
  })
    .select("+statusHistory")
    .session(session);

  if (!application) throw new ApiError(404, "Application not found");
  return application;
};

const getStatusNotification = (status, remarks) => {
  const configurations = {
    [APPLICATION_STATUSES.DOCUMENTS_REQUIRED]: {
      type: "documents_required",
      title: "Documents required",
      message: `Additional documents are required.${remarks ? ` ${remarks}` : ""}`,
    },
    [APPLICATION_STATUSES.APPROVED]: {
      type: "application_approved",
      title: "Application approved",
      message: "Your application has been approved.",
    },
    [APPLICATION_STATUSES.COMPLETED]: {
      type: "application_completed",
      title: "Application completed",
      message: "Your application has been completed successfully.",
    },
    [APPLICATION_STATUSES.REJECTED]: {
      type: "application_rejected",
      title: "Application rejected",
      message: `Your application has been rejected.${remarks ? ` ${remarks}` : ""}`,
    },
  };
  return configurations[status] || {
    type: "status_changed",
    title: "Application status updated",
    message: `Your application status is now ${status}.${remarks ? ` ${remarks}` : ""}`,
  };
};

const createStatusNotifications = async ({
  application,
  nextStatus,
  remarks,
  actorUserId,
  eventKey,
  session,
}) => {
  const notification = getStatusNotification(nextStatus, remarks);
  const customerUserId = getCustomerUserId(application);
  if (customerUserId && customerUserId !== actorUserId) {
    await createApplicationNotification({
      application,
      recipientUserId: customerUserId,
      recipientRole: ROLES.CUSTOMER,
      ...notification,
      eventKey,
      metadata: { status: nextStatus },
      session,
    });
  }
  const assignedUserId = application.assignmentType === ASSIGNMENT_TYPES.PARTNER
    ? application.assignedPartnerId
    : getAssignedExpertId(application);
  const assignedRole = application.assignmentType === ASSIGNMENT_TYPES.PARTNER
    ? ROLES.PARTNER
    : ROLES.EXPERT;
  if (assignedUserId && assignedUserId !== actorUserId) {
    await createApplicationNotification({
      application,
      recipientUserId: assignedUserId,
      recipientRole: assignedRole,
      type: notification.type,
      title: notification.title,
      message: `Application ${application.applicationNumber} is now ${nextStatus}.`,
      eventKey,
      metadata: { status: nextStatus },
      session,
    });
  }
};

const applyStatusChange = async ({ application, nextStatus, remarks, updatedBy, session }) => {
  const currentStatus = normalizeStatus(application.status) || application.status;
  if (currentStatus === nextStatus) {
    throw new ApiError(409, `Application is already ${nextStatus}`);
  }

  const allowedTransitions = APPLICATION_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    throw new ApiError(
      409,
      `Cannot change application status from ${currentStatus} to ${nextStatus}`,
      allowedTransitions
    );
  }

  application.status = nextStatus;
  await application.save({ session });
  const [timelineEntry] = await ApplicationTimeline.create(
    [{ application: application._id, status: nextStatus, remarks, updatedBy }],
    { session }
  );
  await createStatusNotifications({
    application,
    nextStatus,
    remarks,
    actorUserId: updatedBy,
    eventKey: `timeline:${timelineEntry._id}`,
    session,
  });
};

const addVisibleRemarkForApplication = async ({ application, remarks, updatedBy, session }) => {
  const status = normalizeStatus(application.status) || application.status;
  const [timelineEntry] = await ApplicationTimeline.create(
    [{ application: application._id, status, remarks, updatedBy }],
    { session }
  );
  const customerUserId = getCustomerUserId(application);
  if (customerUserId && customerUserId !== updatedBy) {
    await createApplicationNotification({
      application,
      recipientUserId: customerUserId,
      recipientRole: ROLES.CUSTOMER,
      type: "remark_added",
      title: "New application update",
      message: remarks,
      eventKey: `timeline:${timelineEntry._id}`,
      metadata: { status },
      session,
    });
  }
  await Application.updateOne(
    { _id: application._id },
    { $set: { updatedAt: new Date() } },
    { session }
  );
};

const requestDocumentsForApplication = async ({ application, remarks, updatedBy, session }) => {
  const currentStatus = normalizeStatus(application.status) || application.status;
  if (currentStatus === APPLICATION_STATUSES.DOCUMENTS_REQUIRED) {
    const [timelineEntry] = await ApplicationTimeline.create(
      [{
        application: application._id,
        status: APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
        remarks,
        updatedBy,
      }],
      { session }
    );
    const customerUserId = getCustomerUserId(application);
    if (customerUserId && customerUserId !== updatedBy) {
      await createApplicationNotification({
        application,
        recipientUserId: customerUserId,
        recipientRole: ROLES.CUSTOMER,
        type: "documents_required",
        title: "Documents required",
        message: `Additional documents are required. ${remarks}`,
        eventKey: `timeline:${timelineEntry._id}`,
        metadata: { status: APPLICATION_STATUSES.DOCUMENTS_REQUIRED },
        session,
      });
    }
    await Application.updateOne(
      { _id: application._id },
      { $set: { updatedAt: new Date() } },
      { session }
    );
    return;
  }
  await applyStatusChange({
    application,
    nextStatus: APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
    remarks,
    updatedBy,
    session,
  });
};

export const submitApplication = async ({
  serviceSlug,
  body,
  files = [],
  customerId = null,
  updatedBy = "system",
}) => {
  const service = await Service.findOne({ slug: serviceSlug, isActive: true });
  if (!service) throw new ApiError(404, "Service not found");

  const form = await ServiceForm.findOne({ service: service._id, isActive: true });
  if (!form) throw new ApiError(404, "Application form is not configured");

  const validationErrors = validateSubmission(form, body, files);
  if (validationErrors.length) {
    throw new ApiError(400, "Invalid application", validationErrors);
  }

  const applicationNumber = createApplicationNumber();
  const uploadedFiles = [];

  try {
    for (const file of files) {
      const result = await uploadBuffer(file, applicationNumber, "submissions");
      uploadedFiles.push({
        fieldName: file.fieldname,
        originalName: file.originalname,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        format: result.format || "",
        size: result.bytes ?? file.size,
      });
    }

    const formData = Object.fromEntries(
      form.fields
        .filter(({ type }) => type !== "file")
        .map(({ name, type }) => {
          const value = normalizeBodyValue(body[name]);
          return [name, type === "checkbox" && value !== undefined
            ? (Array.isArray(value) ? value : [value])
            : value];
        })
        .filter(([, value]) => value !== undefined)
    );

    let application;
    await mongoose.connection.transaction(async (session) => {
      [application] = await Application.create(
        [{
          applicationNumber,
          service: service._id,
          serviceForm: form._id,
          formData,
          files: uploadedFiles,
          customerUserId: customerId || null,
          customerId: customerId || null,
          fulfillmentType: service.fulfillmentType || FULFILLMENT_TYPES.INTERNAL,
          status: APPLICATION_STATUSES.SUBMITTED,
        }],
        { session }
      );

      const [timelineEntry] = await ApplicationTimeline.create(
        [{
          application: application._id,
          status: APPLICATION_STATUSES.SUBMITTED,
          remarks: "Application submitted successfully",
          updatedBy,
        }],
        { session }
      );

      if (customerId) {
        await createApplicationNotification({
          application,
          recipientUserId: customerId,
          recipientRole: ROLES.CUSTOMER,
          type: "application_submitted",
          title: "Application submitted",
          message: `Application ${application.applicationNumber} was submitted successfully.`,
          eventKey: `timeline:${timelineEntry._id}`,
          metadata: { status: APPLICATION_STATUSES.SUBMITTED },
          session,
        });
      }
      if (process.env.DEV_ADMIN_USER_ID?.trim()) {
        await createApplicationNotification({
          application,
          recipientUserId: process.env.DEV_ADMIN_USER_ID.trim(),
          recipientRole: ROLES.ADMIN,
          type: "application_submitted",
          title: "New application submitted",
          message: `A new ${service.title} application was submitted.`,
          eventKey: `timeline:${timelineEntry._id}`,
          metadata: { status: APPLICATION_STATUSES.SUBMITTED },
          session,
        });
      }
    });

    return application;
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);
    throw error;
  }
};

export const updateApplicationStatus = async ({
  applicationNumber,
  status,
  remarks = "",
  updatedBy = "system",
}) => {
  const nextStatus = normalizeStatus(status);
  if (!nextStatus) {
    throw new ApiError(400, "Invalid application status", APPLICATION_STATUS_VALUES);
  }
  if (nextStatus === APPLICATION_STATUSES.ASSIGNED) {
    throw new ApiError(400, "Use the assignment endpoint to assign an application");
  }

  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findApplicationForUpdate(applicationNumber, session);
    await applyStatusChange({ application, nextStatus, remarks, updatedBy, session });
  });

  return application;
};

export const assignApplication = async ({
  applicationNumber,
  assignmentType = null,
  assignedExpertId = null,
  assignedPartnerId = null,
  remarks = "",
  updatedBy = "system",
}) => {
  const normalizedType = assignmentType === "none" || assignmentType === ""
    ? null
    : assignmentType;
  if (normalizedType !== null && !Object.values(ASSIGNMENT_TYPES).includes(normalizedType)) {
    throw new ApiError(400, "assignmentType must be expert, partner, or none");
  }

  const expertId = assignedExpertId?.trim() || null;
  const partnerId = assignedPartnerId?.trim() || null;
  if (normalizedType === ASSIGNMENT_TYPES.EXPERT && !expertId) {
    throw new ApiError(400, "assignedExpertId is required for an expert assignment");
  }
  if (normalizedType === ASSIGNMENT_TYPES.PARTNER && !partnerId) {
    throw new ApiError(400, "assignedPartnerId is required for a partner assignment");
  }

  let expert = null;
  if (normalizedType === ASSIGNMENT_TYPES.EXPERT) {
    expert = await ExpertProfile.findOne({ userId: expertId, status: "active" });
    if (!expert) throw new ApiError(400, "Select a valid active expert");
  }
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);

  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findApplicationForUpdate(applicationNumber, session);
    const currentStatus = normalizeStatus(application.status) || application.status;
    if (TERMINAL_APPLICATION_STATUSES.has(currentStatus)) {
      throw new ApiError(409, `A ${currentStatus} application cannot be assigned`);
    }
    const fulfillmentType = application.fulfillmentType || FULFILLMENT_TYPES.INTERNAL;
    if (normalizedType === ASSIGNMENT_TYPES.EXPERT && fulfillmentType === FULFILLMENT_TYPES.PARTNER) {
      throw new ApiError(409, "A partner-fulfilled service cannot be assigned to an expert");
    }
    if (normalizedType === ASSIGNMENT_TYPES.PARTNER && fulfillmentType === FULFILLMENT_TYPES.INTERNAL) {
      throw new ApiError(409, "An internally fulfilled service cannot be assigned to a partner");
    }
    const currentType = application.assignmentType || (getAssignedExpertId(application) ? ASSIGNMENT_TYPES.EXPERT : null);
    const currentUserId = currentType === ASSIGNMENT_TYPES.PARTNER
      ? application.assignedPartnerId
      : getAssignedExpertId(application);
    const nextUserId = normalizedType === ASSIGNMENT_TYPES.PARTNER ? partnerId : expertId;
    if (currentType === normalizedType && currentUserId === nextUserId) return;

    const now = new Date();
    await ApplicationAssignment.updateMany(
      { application: application._id, isActive: true },
      { $set: { isActive: false, endedAt: now } },
      { session }
    );

    application.assignmentType = normalizedType;
    application.assignedExpertId = normalizedType === ASSIGNMENT_TYPES.EXPERT ? expertId : null;
    application.assignedPartnerId = normalizedType === ASSIGNMENT_TYPES.PARTNER ? partnerId : null;
    application.assignedRetailerId = normalizedType === ASSIGNMENT_TYPES.EXPERT ? expertId : null;
    application.assignedBy = normalizedType ? updatedBy : null;
    application.assignedAt = normalizedType ? now : null;
    if (normalizedType && currentStatus === APPLICATION_STATUSES.SUBMITTED) {
      application.status = APPLICATION_STATUSES.ASSIGNED;
    }

    const assigneeLabel = normalizedType === ASSIGNMENT_TYPES.EXPERT
      ? `expert ${expert.displayName}`
      : normalizedType === ASSIGNMENT_TYPES.PARTNER
        ? `partner ${partnerId}`
        : "nobody";
    await ApplicationTimeline.create(
      [{ application: application._id, status: application.status, remarks: cleanRemarks || `Assigned to ${assigneeLabel}`, updatedBy }],
      { session }
    );
    if (normalizedType) {
      await ApplicationAssignment.create(
        [{
          application: application._id,
          assignmentType: normalizedType,
          expertUserId: normalizedType === ASSIGNMENT_TYPES.EXPERT ? expertId : null,
          partnerUserId: normalizedType === ASSIGNMENT_TYPES.PARTNER ? partnerId : null,
          retailerUserId: normalizedType === ASSIGNMENT_TYPES.EXPERT ? expertId : null,
          assignedBy: updatedBy,
          remarks: cleanRemarks,
          isActive: true,
        }],
        { session }
      );
    }
    await application.save({ session });

    if (!normalizedType) return;
    const role = normalizedType === ASSIGNMENT_TYPES.EXPERT ? ROLES.EXPERT : ROLES.PARTNER;
    const assignmentEventKey = `assignment:${application._id}:${role}:${nextUserId}:${now.toISOString()}`;
    if (nextUserId !== updatedBy) {
      await createApplicationNotification({
        application,
        recipientUserId: nextUserId,
        recipientRole: role,
        type: "application_assigned",
        title: "New application assigned",
        message: `Application ${application.applicationNumber} has been assigned to you.`,
        eventKey: assignmentEventKey,
        metadata: { status: application.status, assignmentType: normalizedType },
        session,
      });
    }
    const customerUserId = getCustomerUserId(application);
    if (customerUserId && customerUserId !== updatedBy) {
      await createApplicationNotification({
        application,
        recipientUserId: customerUserId,
        recipientRole: ROLES.CUSTOMER,
        type: "application_assigned",
        title: "Application assigned",
        message: `A ${normalizedType} has been assigned to process your application.`,
        eventKey: assignmentEventKey,
        metadata: { status: application.status, assignmentType: normalizedType },
        session,
      });
    }
  });
  return application;
};

// Backward-compatible service signature used by legacy API aliases.
export const assignRetailer = ({ retailerId, ...options }) => assignApplication({
  ...options,
  assignmentType: ASSIGNMENT_TYPES.EXPERT,
  assignedExpertId: retailerId,
});

const getApplicationDetailsByFilter = async (filter) => {
  const application = await Application.findOne(filter)
    .select("+statusHistory")
    .populate("service", "title slug description category processingTime price")
    .populate("serviceForm", "title description fields")
    .lean();

  if (!application) throw new ApiError(404, "Application not found");

  const timeline = await ApplicationTimeline.find({ application: application._id })
    .sort({ createdAt: 1 })
    .lean();

  const legacyTimeline = (application.statusHistory || []).map(
    ({ status, message, changedAt }) => ({
      application: application._id,
      status: normalizeStatus(status) || status,
      remarks: message,
      updatedBy: "legacy",
      createdAt: changedAt,
    })
  );
  delete application.statusHistory;

  return {
    ...application,
    timeline: [...legacyTimeline, ...timeline].sort(
      (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
    ),
  };
};

export const getApplicationDetails = (applicationNumber) =>
  getApplicationDetailsByFilter({ applicationNumber: applicationNumber.toUpperCase() });

export const getCustomerApplications = async (customerId, query = {}) => {
  const filter = await buildCustomerFilter(customerId, query);
  return listApplications(filter, query);
};

export const getCustomerDashboardSummary = async (customerId) => {
  if (!customerId?.trim()) throw new ApiError(400, "Customer identity is required");
  const ownerFilter = customerOwnerFilter(customerId.trim());

  const [counts = {}, recentResult] = await Promise.all([
    Application.aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          submitted: {
            $sum: { $cond: [{ $in: ["$status", ["Submitted", "submitted"]] }, 1, 0] },
          },
          processing: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      "Assigned",
                      "Documents Required",
                      "Processing",
                      "Approved",
                      "under_review",
                      "processing",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $in: ["$status", ["Rejected", "rejected"]] }, 1, 0] },
          },
        },
      },
      { $project: { _id: 0 } },
    ]).then((results) => results[0]),
    listApplications(ownerFilter, { page: 1, limit: 5 }),
  ]);

  return {
    summary: {
      total: counts.total || 0,
      submitted: counts.submitted || 0,
      processing: counts.processing || 0,
      completed: counts.completed || 0,
      rejected: counts.rejected || 0,
    },
    recentApplications: recentResult.applications,
  };
};

export const getCustomerApplicationById = async (customerId, id) => {
  if (!customerId?.trim()) throw new ApiError(400, "Customer identity is required");
  const application = await getApplicationDetailsByFilter({
    $and: [customerOwnerFilter(customerId.trim()), getApplicationIdentifierFilter(id)],
  });

  const safeFiles = application.files.map(
    ({ fieldName, originalName, format, size }) => ({
      fieldName,
      originalName,
      format,
      size,
    })
  );
  const safeCompletionDocuments = (application.completionDocuments || []).map(
    ({ fieldName, originalName, secureUrl, format, size }) => ({ fieldName, originalName, secureUrl, format, size })
  );
  // Timeline remarks are customer-facing. Future internal notes need a separate protected field.
  const safeTimeline = application.timeline.map(({ status, remarks, createdAt }) => ({
    status,
    remarks,
    createdAt,
  }));

  const safeApplication = { ...application };
  delete safeApplication.assignedBy;
  delete safeApplication.assignedExpertId;
  delete safeApplication.assignedPartnerId;
  delete safeApplication.assignedRetailerId;
  delete safeApplication.customerUserId;
  delete safeApplication.customerId;
  delete safeApplication.files;
  delete safeApplication.completionDocuments;
  delete safeApplication.timeline;

  return { ...safeApplication, files: safeFiles, completionDocuments: safeCompletionDocuments, timeline: safeTimeline };
};

export const getExpertApplications = async (expertId, query = {}) => {
  if (!expertId?.trim()) throw new ApiError(400, "Expert identity is required");
  const filter = { $and: [expertOwnerFilter(expertId.trim())] };
  const status = query.status ? normalizeStatus(query.status) : null;
  if (query.status && !status) throw new ApiError(400, "Invalid application status");
  if (status) filter.status = { $in: getStatusStorageValues(status) };

  if (query.search?.trim()) {
    const searchPattern = escapeRegex(query.search.trim());
    const services = await Service.find({ title: { $regex: searchPattern, $options: "i" } })
      .select("_id")
      .lean();
    filter.$and.push({ $or: [
      { applicationNumber: { $regex: searchPattern, $options: "i" } },
      { service: { $in: services.map(({ _id }) => _id) } },
      { "formData.fullName": { $regex: searchPattern, $options: "i" } },
      { "formData.applicantName": { $regex: searchPattern, $options: "i" } },
      { "formData.customerName": { $regex: searchPattern, $options: "i" } },
      { "formData.name": { $regex: searchPattern, $options: "i" } },
    ] });
  }

  const { page, limit, skip } = getPagination(query);
  const [documents, total] = await Promise.all([
    Application.find(filter)
      .select("applicationNumber service formData status assignedAt createdAt updatedAt")
      .populate("service", "title slug category processingTime")
      .sort({ assignedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);
  const applications = documents.map(({ formData, ...application }) => ({
    ...application,
    customerName: getCustomerName(formData),
  }));

  return {
    applications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getExpertDashboardSummary = async (expertId) => {
  if (!expertId?.trim()) throw new ApiError(400, "Expert identity is required");
  const ownerFilter = expertOwnerFilter(expertId.trim());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [summaryRows, completedRows, recent] = await Promise.all([
    Application.aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: null,
          assigned: { $sum: 1 },
          processing: {
            $sum: { $cond: [{ $in: ["$status", ["Processing", "processing", "under_review"]] }, 1, 0] },
          },
          documentsRequired: {
            $sum: { $cond: [{ $eq: ["$status", APPLICATION_STATUSES.DOCUMENTS_REQUIRED] }, 1, 0] },
          },
        },
      },
      { $project: { _id: 0 } },
    ]),
    ApplicationTimeline.aggregate([
      {
        $match: {
          status: APPLICATION_STATUSES.COMPLETED,
          createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
        },
      },
      {
        $lookup: {
          from: "applications",
          localField: "application",
          foreignField: "_id",
          as: "applicationDocument",
        },
      },
      { $unwind: "$applicationDocument" },
      { $match: { $or: [{ "applicationDocument.assignedExpertId": expertId.trim() }, { "applicationDocument.assignedRetailerId": expertId.trim() }] } },
      { $count: "count" },
    ]),
    getExpertApplications(expertId, { page: 1, limit: 5 }),
  ]);
  const counts = summaryRows[0] || {};

  return {
    summary: {
      assigned: counts.assigned || 0,
      processing: counts.processing || 0,
      documentsRequired: counts.documentsRequired || 0,
      completedToday: completedRows[0]?.count || 0,
    },
    recentAssignments: recent.applications,
  };
};

export const getExpertApplicationById = async (expertId, id) => {
  if (!expertId?.trim()) throw new ApiError(400, "Expert identity is required");
  const application = await getApplicationDetailsByFilter({
    $and: [expertOwnerFilter(expertId.trim()), getApplicationIdentifierFilter(id)],
  });

  const safeApplication = { ...application };
  safeApplication.customerName = getCustomerName(application.formData);
  safeApplication.files = application.files.map(
    ({ fieldName, originalName, format, size }) => ({ fieldName, originalName, format, size })
  );
  safeApplication.timeline = application.timeline.map(({ status, remarks, createdAt }) => ({
    status,
    remarks,
    createdAt,
  }));
  delete safeApplication.assignedBy;
  delete safeApplication.assignedExpertId;
  delete safeApplication.assignedPartnerId;
  delete safeApplication.assignedRetailerId;
  delete safeApplication.customerUserId;
  delete safeApplication.customerId;
  return safeApplication;
};

const findExpertApplicationForUpdate = async (expertId, id, session) => {
  const application = await Application.findOne({
    $and: [expertOwnerFilter(expertId.trim()), getApplicationIdentifierFilter(id)],
  }).session(session);
  if (!application) throw new ApiError(404, "Application not found");
  return application;
};

export const updateExpertApplicationStatus = async ({
  expertId,
  id,
  status,
  remarks = "",
}) => {
  const nextStatus = normalizeStatus(status);
  if (!nextStatus || !ASSIGNEE_STATUS_VALUES.has(nextStatus)) {
    throw new ApiError(400, "Expert cannot set this application status", [
      ...ASSIGNEE_STATUS_VALUES,
    ]);
  }
  const cleanRemarks = typeof remarks === "string" ? remarks.trim() : "";
  if (cleanRemarks.length > 1000) {
    throw new ApiError(400, "Remarks cannot exceed 1000 characters");
  }

  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findExpertApplicationForUpdate(expertId, id, session);
    await applyStatusChange({
      application,
      nextStatus,
      remarks: cleanRemarks,
      updatedBy: expertId,
      session,
    });
  });
  return application;
};

export const addExpertRemark = async ({ expertId, id, remarks }) => {
  const cleanRemarks = typeof remarks === "string" ? remarks.trim() : "";
  if (!cleanRemarks) throw new ApiError(400, "Remarks are required");
  if (cleanRemarks.length > 1000) throw new ApiError(400, "Remarks cannot exceed 1000 characters");

  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findExpertApplicationForUpdate(expertId, id, session);
    await addVisibleRemarkForApplication({
      application,
      remarks: cleanRemarks,
      updatedBy: expertId,
      session,
    });
  });
  return application;
};

export const requestApplicationDocuments = async ({ expertId, retailerId, id, remarks }) => {
  const assigneeId = expertId || retailerId;
  const cleanRemarks = typeof remarks === "string" ? remarks.trim() : "";
  if (!cleanRemarks) throw new ApiError(400, "Describe the required documents");
  if (cleanRemarks.length > 1000) {
    throw new ApiError(400, "Document request cannot exceed 1000 characters");
  }

  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findExpertApplicationForUpdate(assigneeId, id, session);
    await requestDocumentsForApplication({
      application,
      remarks: cleanRemarks,
      updatedBy: assigneeId,
      session,
    });
  });
  return application;
};

export const getPartnerApplications = async (partnerId, query = {}) => {
  if (!partnerId?.trim()) throw new ApiError(400, "Partner identity is required");
  const filter = partnerOwnerFilter(partnerId.trim());
  const status = query.status ? normalizeStatus(query.status) : null;
  if (query.status && !status) throw new ApiError(400, "Invalid application status");
  if (status) filter.status = { $in: getStatusStorageValues(status) };
  const { page, limit, skip } = getPagination(query);
  const [documents, total] = await Promise.all([
    Application.find(filter)
      .select("applicationNumber service formData status assignedAt createdAt updatedAt")
      .populate("service", "title slug category processingTime")
      .sort({ assignedAt: -1, createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  return {
    applications: documents.map(({ formData, ...application }) => ({ ...application, customerName: getCustomerName(formData) })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getPartnerApplicationById = async (partnerId, id) => {
  if (!partnerId?.trim()) throw new ApiError(400, "Partner identity is required");
  const application = await getApplicationDetailsByFilter({
    $and: [partnerOwnerFilter(partnerId.trim()), getApplicationIdentifierFilter(id)],
  });
  const safeApplication = { ...application, customerName: getCustomerName(application.formData) };
  safeApplication.files = application.files.map(({ fieldName, originalName, secureUrl, resourceType, format, size }) => ({ fieldName, originalName, secureUrl, resourceType, format, size }));
  safeApplication.completionDocuments = (application.completionDocuments || []).map(({ fieldName, originalName, secureUrl, resourceType, format, size }) => ({ fieldName, originalName, secureUrl, resourceType, format, size }));
  safeApplication.timeline = application.timeline.map(({ status, remarks, createdAt }) => ({ status, remarks, createdAt }));
  delete safeApplication.assignedBy;
  delete safeApplication.assignedExpertId;
  delete safeApplication.assignedPartnerId;
  delete safeApplication.assignedRetailerId;
  delete safeApplication.customerUserId;
  delete safeApplication.customerId;
  return safeApplication;
};

const findPartnerApplicationForUpdate = async (partnerId, id, session) => {
  const application = await Application.findOne({
    $and: [partnerOwnerFilter(partnerId.trim()), getApplicationIdentifierFilter(id)],
  }).session(session);
  if (!application) throw new ApiError(404, "Application not found");
  return application;
};

export const updatePartnerApplicationStatus = async ({ partnerId, id, status, remarks = "", session: existingSession = null }) => {
  const nextStatus = normalizeStatus(status);
  if (!nextStatus || !ASSIGNEE_STATUS_VALUES.has(nextStatus)) {
    throw new ApiError(400, "Partner cannot set this application status", [...ASSIGNEE_STATUS_VALUES]);
  }
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);
  let application;
  const execute = async (session) => {
    application = await findPartnerApplicationForUpdate(partnerId, id, session);
    await applyStatusChange({ application, nextStatus, remarks: cleanRemarks, updatedBy: partnerId, session });
  };
  if (existingSession) await execute(existingSession);
  else await mongoose.connection.transaction(execute);
  return application;
};

export const addPartnerRemark = async ({ partnerId, id, remarks }) => {
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);
  if (!cleanRemarks) throw new ApiError(400, "Remarks are required");
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findPartnerApplicationForUpdate(partnerId, id, session);
    await addVisibleRemarkForApplication({ application, remarks: cleanRemarks, updatedBy: partnerId, session });
  });
  return application;
};

export const requestPartnerApplicationDocuments = async ({ partnerId, id, remarks }) => {
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);
  if (!cleanRemarks) throw new ApiError(400, "Describe the required documents");
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findPartnerApplicationForUpdate(partnerId, id, session);
    await requestDocumentsForApplication({ application, remarks: cleanRemarks, updatedBy: partnerId, session });
  });
  return application;
};

export const addAdminVisibleRemark = async ({ applicationNumber, remarks, updatedBy }) => {
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);
  if (!cleanRemarks) throw new ApiError(400, "Remarks are required");
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findApplicationForUpdate(applicationNumber, session);
    await addVisibleRemarkForApplication({ application, remarks: cleanRemarks, updatedBy, session });
  });
  return application;
};

export const requestApplicationDocumentsByAdmin = async ({
  applicationNumber,
  remarks,
  updatedBy,
}) => {
  const cleanRemarks = sanitizeNotificationText(remarks, 1000);
  if (!cleanRemarks) throw new ApiError(400, "Describe the required documents");
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await findApplicationForUpdate(applicationNumber, session);
    await requestDocumentsForApplication({ application, remarks: cleanRemarks, updatedBy, session });
  });
  return application;
};

export const getAdminApplications = (query) => {
  const filter = {};
  const status = query.status ? normalizeStatus(query.status) : null;
  if (query.status && !status) throw new ApiError(400, "Invalid application status");
  if (status) filter.status = status;
  if (query.customerId) filter.customerId = query.customerId.trim();
  if (query.retailerId) filter.assignedRetailerId = query.retailerId.trim();
  if (query.serviceId) {
    if (!mongoose.isValidObjectId(query.serviceId)) throw new ApiError(400, "Invalid serviceId");
    filter.service = query.serviceId;
  }
  if (query.search) {
    const escapedSearch = escapeRegex(query.search.trim());
    filter.applicationNumber = { $regex: escapedSearch, $options: "i" };
  }
  return listApplications(filter, query);
};

// Deprecated service aliases retained for callers using the retailer-era API.
export const getRetailerApplications = getExpertApplications;
export const getRetailerDashboardSummary = getExpertDashboardSummary;
export const getRetailerApplicationById = getExpertApplicationById;
export const updateRetailerApplicationStatus = ({ retailerId, ...options }) =>
  updateExpertApplicationStatus({ ...options, expertId: retailerId });
export const addRetailerRemark = ({ retailerId, ...options }) =>
  addExpertRemark({ ...options, expertId: retailerId });
