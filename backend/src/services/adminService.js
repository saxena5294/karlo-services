import mongoose from "mongoose";
import { APPLICATION_STATUS_VALUES } from "../constants/applicationConstants.js";
import { Application } from "../models/applicationModel.js";
import { ApplicationAssignment } from "../models/applicationAssignmentModel.js";
import { ApplicationNote } from "../models/applicationNoteModel.js";
import { ApplicationTimeline } from "../models/applicationTimelineModel.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { Lead } from "../models/leadModel.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";
import { ApiError } from "../utils/ApiError.js";
import {
  addAdminVisibleRemark,
  assignApplication,
  requestApplicationDocumentsByAdmin,
  updateApplicationStatus,
} from "./applicationService.js";
import { sanitizeNotificationText } from "./notificationService.js";

const DEFAULT_LIMIT = 20;
const TERMINAL_STATUSES = ["Completed", "Rejected", "Cancelled", "completed", "rejected"];

const paginate = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const identifierFilter = (id) => {
  if (!id?.trim()) throw new ApiError(400, "Application identifier is required");
  return mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { applicationNumber: id.toUpperCase() }] }
    : { applicationNumber: id.toUpperCase() };
};

const customerName = (formData = {}) =>
  ["fullName", "applicantName", "customerName", "name", "firstName"]
    .map((key) => formData[key])
    .find((value) => typeof value === "string" && value.trim())?.trim() || "Customer";

const assertOnlyFields = (payload, allowed) => {
  const unexpected = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
};

const buildApplicationFilter = async (query) => {
  const filter = {};
  if (query.status) {
    const status = APPLICATION_STATUS_VALUES.find(
      (item) => item.toLowerCase() === query.status.replaceAll("_", " ").toLowerCase()
    );
    if (!status) throw new ApiError(400, "Invalid application status");
    filter.status = status;
  }
  if (query.serviceId) {
    if (!mongoose.isValidObjectId(query.serviceId)) throw new ApiError(400, "Invalid service filter");
    filter.service = query.serviceId;
  }
  const expertId = query.expertId || query.retailerId;
  if (expertId) filter.$and = [{ $or: [{ assignedExpertId: expertId.trim() }, { assignedRetailerId: expertId.trim() }] }];
  if (query.assignmentType) filter.assignmentType = query.assignmentType;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    if (query.dateTo) filter.createdAt.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    if (Object.values(filter.createdAt).some((date) => Number.isNaN(date.getTime()))) {
      throw new ApiError(400, "Use valid YYYY-MM-DD date filters");
    }
  }
  if (query.search?.trim()) {
    const pattern = escapeRegex(query.search.trim());
    const services = await Service.find({ title: { $regex: pattern, $options: "i" } }).select("_id").lean();
    const searchFilter = { $or: [
      { applicationNumber: { $regex: pattern, $options: "i" } },
      { service: { $in: services.map((item) => item._id) } },
      { "formData.fullName": { $regex: pattern, $options: "i" } },
      { "formData.applicantName": { $regex: pattern, $options: "i" } },
      { "formData.customerName": { $regex: pattern, $options: "i" } },
      { "formData.name": { $regex: pattern, $options: "i" } },
    ] };
    if (filter.$and) filter.$and.push(searchFilter);
    else Object.assign(filter, searchFilter);
  }
  return filter;
};

export const getAdminApplications = async (query = {}) => {
  const filter = await buildApplicationFilter(query);
  const { page, limit, skip } = paginate(query);
  const [documents, total, experts] = await Promise.all([
    Application.find(filter)
      .select("applicationNumber customerUserId customerId service formData fulfillmentType assignmentType assignedExpertId assignedPartnerId assignedRetailerId assignedAt status createdAt updatedAt")
      .populate("service", "title slug category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
    ExpertProfile.find().select("userId displayName").lean(),
  ]);
  const expertNames = new Map(experts.map((item) => [item.userId, item.displayName]));
  return {
    applications: documents.map(({ formData, ...item }) => ({
      ...item,
      customerName: customerName(formData),
      assignedExpertName: expertNames.get(item.assignedExpertId || item.assignedRetailerId) || item.assignedExpertId || item.assignedRetailerId || "Unassigned",
      assignedRetailerName: expertNames.get(item.assignedExpertId || item.assignedRetailerId) || item.assignedExpertId || item.assignedRetailerId || "Unassigned",
      assigneeName: item.assignmentType === "partner" ? (item.assignedPartnerId || "Unassigned") : (expertNames.get(item.assignedExpertId || item.assignedRetailerId) || item.assignedExpertId || item.assignedRetailerId || "Unassigned"),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getAdminApplicationById = async (id) => {
  const application = await Application.findOne(identifierFilter(id))
    .select("+statusHistory")
    .populate("service")
    .populate("serviceForm")
    .lean();
  if (!application) throw new ApiError(404, "Application not found");

  const [timeline, internalRemarks, assignmentHistory, expert] = await Promise.all([
    ApplicationTimeline.find({ application: application._id }).sort({ createdAt: 1 }).lean(),
    ApplicationNote.find({ application: application._id }).sort({ createdAt: -1 }).lean(),
    ApplicationAssignment.find({ application: application._id }).sort({ createdAt: -1 }).lean(),
    (application.assignedExpertId || application.assignedRetailerId)
      ? ExpertProfile.findOne({ userId: application.assignedExpertId || application.assignedRetailerId }).lean()
      : null,
  ]);
  delete application.statusHistory;
  application.files = application.files.map(({ fieldName, originalName, format, size }) => ({
    fieldName,
    originalName,
    format,
    size,
  }));
  return {
    ...application,
    customerName: customerName(application.formData),
    assignedExpert: expert,
    assignedRetailer: expert,
    timeline,
    internalRemarks,
    assignmentHistory,
  };
};

const findApplicationNumber = async (id) => {
  const application = await Application.findOne(identifierFilter(id)).select("applicationNumber").lean();
  if (!application) throw new ApiError(404, "Application not found");
  return application.applicationNumber;
};

export const assignAdminApplication = async ({ id, assignmentType, assignedExpertId, assignedPartnerId, retailerId, remarks, adminUserId }) =>
  assignApplication({
    applicationNumber: await findApplicationNumber(id),
    assignmentType: assignmentType ?? (retailerId ? "expert" : null),
    assignedExpertId: assignedExpertId || retailerId,
    assignedPartnerId,
    remarks,
    updatedBy: adminUserId,
  });

export const updateAdminApplicationStatus = async ({ id, status, remarks, adminUserId }) =>
  updateApplicationStatus({
    applicationNumber: await findApplicationNumber(id),
    status,
    remarks: sanitizeNotificationText(remarks, 1000),
    updatedBy: adminUserId,
  });

export const addAdminApplicationRemark = async ({ id, remarks, visibility, adminUserId }) => {
  const applicationNumber = await findApplicationNumber(id);
  if (visibility === "customer") {
    return addAdminVisibleRemark({ applicationNumber, remarks, updatedBy: adminUserId });
  }
  if (visibility !== "internal") throw new ApiError(400, "visibility must be internal or customer");
  const cleanRemarks = sanitizeNotificationText(remarks, 2000);
  if (!cleanRemarks) throw new ApiError(400, "Remarks are required");
  const application = await Application.findOne({ applicationNumber }).select("_id").lean();
  return ApplicationNote.create({
    application: application._id,
    remarks: cleanRemarks,
    createdBy: adminUserId,
  });
};

export const requestAdminApplicationDocuments = async ({ id, remarks, adminUserId }) =>
  requestApplicationDocumentsByAdmin({
    applicationNumber: await findApplicationNumber(id),
    remarks,
    updatedBy: adminUserId,
  });

export const getAdminCustomers = async (query = {}) => {
  const { page, limit, skip } = paginate(query);
  const match = { customerId: { $nin: [null, ""] } };
  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$customerId",
        name: { $first: { $ifNull: ["$formData.fullName", { $ifNull: ["$formData.applicantName", "Customer"] }] } },
        email: { $first: { $ifNull: ["$formData.email", ""] } },
        phone: { $first: { $ifNull: ["$formData.mobile", { $ifNull: ["$formData.phone", ""] }] } },
        totalApplications: { $sum: 1 },
        latestApplicationDate: { $max: "$createdAt" },
        completedApplications: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } },
        activeApplications: { $sum: { $cond: [{ $in: ["$status", TERMINAL_STATUSES] }, 0, 1] } },
      },
    },
    { $project: { _id: 0, userId: "$_id", name: 1, email: 1, phone: 1, totalApplications: 1, latestApplicationDate: 1, completedApplications: 1, activeApplications: 1 } },
  ];
  if (query.search?.trim()) {
    const pattern = escapeRegex(query.search.trim());
    pipeline.push({ $match: { $or: [{ userId: { $regex: pattern, $options: "i" } }, { name: { $regex: pattern, $options: "i" } }] } });
  }
  const [rows] = await Application.aggregate([
    ...pipeline,
    { $facet: { data: [{ $sort: { latestApplicationDate: -1 } }, { $skip: skip }, { $limit: limit }], count: [{ $count: "total" }] } },
  ]);
  const total = rows.count[0]?.total || 0;
  return { customers: rows.data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getAdminExperts = async (query = {}) => {
  const { page, limit, skip } = paginate(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search?.trim()) {
    const pattern = escapeRegex(query.search.trim());
    filter.$or = [{ userId: { $regex: pattern, $options: "i" } }, { displayName: { $regex: pattern, $options: "i" } }];
  }
  const [profiles, total] = await Promise.all([
    ExpertProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ExpertProfile.countDocuments(filter),
  ]);
  const ids = profiles.map((item) => item.userId);
  const counts = await Application.aggregate([
    { $match: { $or: [{ assignedExpertId: { $in: ids } }, { assignedRetailerId: { $in: ids } }] } },
    { $group: { _id: { $ifNull: ["$assignedExpertId", "$assignedRetailerId"] }, activeAssignments: { $sum: { $cond: [{ $in: ["$status", TERMINAL_STATUSES] }, 0, 1] } }, completedApplications: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } }, pendingApplications: { $sum: { $cond: [{ $in: ["$status", ["Assigned", "Documents Required", "Processing", "Approved", "processing", "under_review"]] }, 1, 0] } } } },
  ]);
  const countMap = new Map(counts.map((item) => [item._id, item]));
  return {
    experts: profiles.map((item) => { const countsForExpert = countMap.get(item.userId) || {}; const totalWork = (countsForExpert.completedApplications || 0) + (countsForExpert.pendingApplications || 0); return { ...item, activeAssignments: countsForExpert.activeAssignments || 0, completedApplications: countsForExpert.completedApplications || 0, pendingApplications: countsForExpert.pendingApplications || 0, completionRate: totalWork ? ((countsForExpert.completedApplications || 0) / totalWork) * 100 : 0 }; }),
    retailers: profiles.map((item) => ({ ...item, activeAssignments: countMap.get(item.userId)?.activeAssignments || 0, completedApplications: countMap.get(item.userId)?.completedApplications || 0, pendingApplications: countMap.get(item.userId)?.pendingApplications || 0 })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const createExpertProfile = async (payload, adminUserId) => {
  assertOnlyFields(payload, ["userId", "displayName", "email", "phone", "status", "categories", "skills", "availability"]);
  return ExpertProfile.create({ ...payload, createdBy: adminUserId });
};

export const updateExpertProfile = async (id, payload) => {
  assertOnlyFields(payload, ["displayName", "email", "phone", "status", "categories", "skills", "availability"]);
  const expert = await ExpertProfile.findByIdAndUpdate(id, payload, { returnDocument: "after", runValidators: true }).lean();
  if (!expert) throw new ApiError(404, "Expert not found");
  return expert;
};

const SERVICE_FIELDS = ["title", "slug", "description", "icon", "price", "processingTime", "category", "fulfillmentType", "isPopular", "isActive", "requiredDocuments", "eligibility", "instructions"];

export const getAdminServices = async (query = {}) => {
  const { page, limit, skip } = paginate(query);
  const filter = {};
  if (query.search?.trim()) filter.title = { $regex: escapeRegex(query.search.trim()), $options: "i" };
  if (query.isActive !== undefined) filter.isActive = String(query.isActive) === "true";
  const [services, total] = await Promise.all([
    Service.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Service.countDocuments(filter),
  ]);
  return { services, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getAdminServiceById = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Service not found");
  const service = await Service.findById(id).lean();
  if (!service) throw new ApiError(404, "Service not found");
  return service;
};

export const createAdminService = async (payload) => {
  assertOnlyFields(payload, SERVICE_FIELDS);
  return Service.create(payload);
};

export const updateAdminService = async (id, payload) => {
  assertOnlyFields(payload, SERVICE_FIELDS.filter((field) => field !== "isActive"));
  const service = await Service.findByIdAndUpdate(id, payload, { returnDocument: "after", runValidators: true }).lean();
  if (!service) throw new ApiError(404, "Service not found");
  return service;
};

export const updateAdminServiceStatus = async (id, payload) => {
  assertOnlyFields(payload, ["isActive"]);
  if (typeof payload.isActive !== "boolean") throw new ApiError(400, "isActive must be boolean");
  const service = await Service.findByIdAndUpdate(id, { isActive: payload.isActive }, { returnDocument: "after", runValidators: true }).lean();
  if (!service) throw new ApiError(404, "Service not found");
  return service;
};

export const getAdminServiceForm = async (serviceId) => {
  await getAdminServiceById(serviceId);
  return ServiceForm.findOne({ service: serviceId }).lean();
};

const FORM_FIELDS = ["title", "description", "sections", "fields", "isActive"];
const DYNAMIC_FIELD_KEYS = ["name", "label", "type", "required", "placeholder", "helpText", "options", "accept", "multiple", "maxFileSizeMb", "min", "max", "step", "section", "order"];

export const updateAdminServiceForm = async (serviceId, payload) => {
  await getAdminServiceById(serviceId);
  assertOnlyFields(payload, FORM_FIELDS);
  if (!Array.isArray(payload.fields) || !payload.fields.length) throw new ApiError(400, "Form fields are required");
  payload.fields.forEach((field) => assertOnlyFields(field, DYNAMIC_FIELD_KEYS));
  const existing = await ServiceForm.findOne({ service: serviceId }).lean();
  if (existing && await Application.exists({ service: serviceId })) {
    const nextNames = new Set(payload.fields.map((field) => field.name));
    const removedNames = existing.fields.map((field) => field.name).filter((name) => !nextNames.has(name));
    if (removedNames.length) {
      throw new ApiError(409, `Field names used by submitted applications cannot be removed or renamed: ${removedNames.join(", ")}`);
    }
  }
  return ServiceForm.findOneAndUpdate(
    { service: serviceId },
    { ...payload, service: serviceId },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  ).lean();
};

export const getAdminReports = async () => {
  const [byStatus, byService, byExpert, byDate, totals, leadsByStatus, leadsByCity, partnerPerformance] = await Promise.all([
    Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Application.aggregate([{ $group: { _id: "$service", count: { $sum: 1 } } }, { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } }, { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, serviceId: "$_id", serviceTitle: { $ifNull: ["$service.title", "Unknown service"] }, count: 1 } }, { $sort: { count: -1 } }]),
    Application.aggregate([{ $match: { $or: [{ assignedExpertId: { $nin: [null, ""] } }, { assignedRetailerId: { $nin: [null, ""] } }] } }, { $group: { _id: { $ifNull: ["$assignedExpertId", "$assignedRetailerId"] }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } } } }, { $sort: { count: -1 } }]),
    Application.aggregate([{ $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 30 }]),
    Application.aggregate([{ $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $in: ["$status", ["Rejected", "rejected"]] }, 1, 0] } }, averageProcessingMs: { $avg: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, { $subtract: ["$updatedAt", "$createdAt"] }, null] } } } }]),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $match: { acceptedByPartnerId: { $nin: [null, ""] } } }, { $group: { _id: "$acceptedByPartnerId", accepted: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } } } }, { $sort: { accepted: -1 } }]),
  ]);
  const summary = totals[0] || { total: 0, completed: 0, rejected: 0, averageProcessingMs: 0 };
  const leadTotal = leadsByStatus.reduce((sum, item) => sum + item.count, 0); const acceptedTotal = leadsByStatus.filter((item) => ["accepted", "completed"].includes(item._id)).reduce((sum, item) => sum + item.count, 0);
  return { byStatus, byService, byExpert, byRetailer: byExpert, byDate, leadsByStatus, leadsByCity, partnerPerformance, leadAcceptanceRate: leadTotal ? (acceptedTotal / leadTotal) * 100 : 0, customerGrowth: byDate, servicePopularity: byService, completionRate: summary.total ? (summary.completed / summary.total) * 100 : 0, rejectionRate: summary.total ? (summary.rejected / summary.total) * 100 : 0, averageProcessingMs: summary.averageProcessingMs || 0 };
};

export const getAdminDashboardSummary = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [reports, activeServices, customers, experts, recent, activity, todayApplications, unassigned, expertAssigned, partnerAssigned, openLeads, acceptedLeads, pendingPartners, activePartners] = await Promise.all([
    getAdminReports(),
    Service.countDocuments({ isActive: true }),
    Application.aggregate([
      { $match: { $or: [{ customerUserId: { $nin: [null, ""] } }, { customerId: { $nin: [null, ""] } }] } },
      { $group: { _id: { $ifNull: ["$customerUserId", "$customerId"] } } },
    ]),
    ExpertProfile.countDocuments(),
    getAdminApplications({ page: 1, limit: 5 }),
    ApplicationTimeline.find().sort({ createdAt: -1 }).limit(8).populate("application", "applicationNumber").lean(),
    Application.countDocuments({ createdAt: { $gte: today } }),
    Application.countDocuments({ assignmentType: "none", status: { $nin: TERMINAL_STATUSES } }),
    Application.countDocuments({ assignmentType: "expert", status: { $nin: TERMINAL_STATUSES } }),
    Application.countDocuments({ assignmentType: "partner", status: { $nin: TERMINAL_STATUSES } }),
    Lead.countDocuments({ status: "open", expiresAt: { $gt: new Date() } }),
    Lead.countDocuments({ status: "accepted" }),
    PartnerProfile.countDocuments({ verificationStatus: { $in: ["pending", "under_review"] } }),
    PartnerProfile.countDocuments({ verificationStatus: "approved", isActive: true }),
  ]);
  const statusMap = Object.fromEntries(reports.byStatus.map((item) => [item._id, item.count]));
  return {
    summary: {
      totalApplications: reports.byStatus.reduce((sum, item) => sum + item.count, 0),
      todayApplications,
      unassigned,
      assignedToExperts: expertAssigned,
      assignedToPartners: partnerAssigned,
      submitted: (statusMap.Submitted || 0) + (statusMap.submitted || 0),
      assigned: statusMap.Assigned || 0,
      processing: (statusMap.Processing || 0) + (statusMap.processing || 0) + (statusMap.under_review || 0),
      documentsRequired: statusMap["Documents Required"] || 0,
      completed: (statusMap.Completed || 0) + (statusMap.completed || 0),
      rejected: (statusMap.Rejected || 0) + (statusMap.rejected || 0),
      activeServices,
      totalCustomers: customers.length,
      totalExperts: experts,
      activeExperts: await ExpertProfile.countDocuments({ status: "active", availability: true }),
      openLeads,
      acceptedLeads,
      pendingPartnerApprovals: pendingPartners,
      activePartners,
      totalRetailers: experts,
    },
    recentApplications: recent.applications,
    applicationsByStatus: reports.byStatus,
    applicationsByService: reports.byService,
    recentActivity: activity,
  };
};

// Deprecated admin-service aliases retained while clients migrate to expert naming.
export const getAdminRetailers = getAdminExperts;
export const createRetailerProfile = createExpertProfile;
export const updateRetailerProfile = updateExpertProfile;
