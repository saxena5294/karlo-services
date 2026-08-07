import mongoose from "mongoose";
import { Application } from "../models/applicationModel.js";
import { ApplicationAssignment } from "../models/applicationAssignmentModel.js";
import { ContentEntry, CONTENT_SECTIONS } from "../models/contentEntryModel.js";
import { Lead, LEAD_STATUSES } from "../models/leadModel.js";
import { Notification } from "../models/notificationModel.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { User } from "../models/userModel.js";
import { PlatformSetting } from "../models/platformSettingModel.js";
import { ApiError } from "../utils/ApiError.js";
import { AuditLog } from "../models/auditLogModel.js";
import { acceptLead, publishApplicationLead } from "./partnerMarketplaceService.js";
import { sanitizeNotificationText } from "./notificationService.js";

const pageOf = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};
const objectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, `${label} not found`);
  return id;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listAssignments = async (query = {}) => {
  const { page, limit, skip } = pageOf(query);
  const filter = {};
  if (query.assignmentType) filter.assignmentType = query.assignmentType;
  if (query.active !== undefined) filter.isActive = String(query.active) === "true";
  const [assignments, total] = await Promise.all([
    ApplicationAssignment.find(filter).populate("application", "applicationNumber status service customerUserId assignedExpertId assignedPartnerId").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApplicationAssignment.countDocuments(filter),
  ]);
  return { assignments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getCustomerDetails = async (userId) => {
  const id = String(userId || "").trim();
  if (!id) throw new ApiError(400, "Customer ID is required");
  const customer = mongoose.isValidObjectId(id)
    ? await User.findOne({ _id: id, role: "customer" }).lean()
    : await User.findOne({ clerkUserId: id, role: "customer" }).lean();
  if (!customer) throw new ApiError(404, "Customer not found");
  const applications = await Application.find({ $or: [{ customerUserId: customer.clerkUserId }, { customerId: customer.clerkUserId }] })
    .select("applicationNumber service status fulfillmentType assignmentType createdAt updatedAt formData.fullName formData.applicantName formData.email formData.mobile formData.phone")
    .populate("service", "title category").sort({ createdAt: -1 }).lean();
  const notifications = await Notification.find({ recipientUserId: customer.clerkUserId }).select("type title message isRead createdAt applicationNumber").sort({ createdAt: -1 }).limit(50).lean();
  return { customer: { ...customer, userId: customer.clerkUserId, phone: customer.mobile, firstActivityAt: applications.at(-1)?.createdAt || customer.createdAt, lastActivityAt: applications[0]?.updatedAt || customer.updatedAt, applicationCount: applications.length }, applications: applications.map(({ formData, ...item }) => item), notifications, paymentHistory: [], supportHistory: [] };
};

export const getPartnerAdminDetails = async (id) => {
  objectId(id, "Partner");
  const partner = await PartnerProfile.findById(id).select("+verificationDocuments").populate("servicesOffered", "title category").lean();
  if (!partner) throw new ApiError(404, "Partner not found");
  const [account, leads, applications, approvalHistory] = await Promise.all([
    User.findOne({ clerkUserId: partner.userId, role: "partner" }).lean(),
    Lead.find({ acceptedByPartnerId: partner.userId }).sort({ createdAt: -1 }).limit(100).lean(),
    Application.find({ assignedPartnerId: partner.userId }).select("applicationNumber status service createdAt updatedAt").populate("service", "title").sort({ createdAt: -1 }).limit(100).lean(),
    AuditLog.find({ entityType: "partner", entityId: String(partner._id) }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const completed = leads.filter((lead) => lead.status === "completed").length;
  return { partner, account, leads, applications, approvalHistory, performance: { accepted: leads.length, completed, acceptanceRate: partner.totalLeads ? (partner.acceptedLeads / partner.totalLeads) * 100 : 0, completionRate: leads.length ? (completed / leads.length) * 100 : 0 } };
};

export const updatePartnerAdmin = async (id, payload) => {
  objectId(id, "Partner");
  const allowed = ["verificationStatus", "isActive", "availability", "serviceCategories", "serviceAreas", "servicesOffered"];
  const bad = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (bad.length) throw new ApiError(400, `Unexpected fields: ${bad.join(", ")}`);
  const partner = await PartnerProfile.findByIdAndUpdate(id, { $set: payload }, { returnDocument: "after", runValidators: true }).lean();
  if (!partner) throw new ApiError(404, "Partner not found");
  if (payload.isActive === false) await User.updateOne({ clerkUserId: partner.userId }, { $set: { status: "inactive" } });
  return partner;
};

export const listAdminLeads = async (query = {}) => {
  const { page, limit, skip } = pageOf(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.city) filter.city = query.city.trim();
  if (query.search?.trim()) { const pattern = escapeRegex(query.search.trim()); filter.$or = [{ applicationNumber: { $regex: pattern, $options: "i" } }, { serviceTitle: { $regex: pattern, $options: "i" } }]; }
  const [leads, total] = await Promise.all([Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Lead.countDocuments(filter)]);
  return { leads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
export const getAdminLead = async (id) => {
  objectId(id, "Lead");
  const lead = await Lead.findById(id).populate("application", "applicationNumber status assignmentType assignedPartnerId").lean();
  if (!lead) throw new ApiError(404, "Lead not found");
  return lead;
};
export const createAdminLead = ({ applicationId, adminUserId, payload }) => publishApplicationLead({ applicationId, adminUserId, payload: { ...payload, status: payload.status || "draft" } });

export const updateAdminLead = async (id, payload) => {
  objectId(id, "Lead");
  const allowed = ["status", "leadPrice", "expiresAt", "safeRequirementSummary", "cancellationReason"];
  const bad = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (bad.length) throw new ApiError(400, `Unexpected fields: ${bad.join(", ")}`);
  if (payload.status && !LEAD_STATUSES.includes(payload.status)) throw new ApiError(400, "Invalid lead status");
  const existing = await Lead.findById(id).lean();
  if (!existing) throw new ApiError(404, "Lead not found");
  const transitions = { draft: ["open", "cancelled"], open: ["expired", "cancelled"], accepted: ["cancelled"], expired: [], completed: [], cancelled: [], rejected: [] };
  if (payload.status && payload.status !== existing.status && !transitions[existing.status].includes(payload.status)) throw new ApiError(409, `Lead cannot move from ${existing.status} to ${payload.status}`);
  const updates = { ...payload };
  if (payload.safeRequirementSummary !== undefined) {
    const summary = sanitizeNotificationText(payload.safeRequirementSummary, 1000);
    const piiPatterns = [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, /(?:\+?91[\s-]?)?[6-9]\d{9}\b/, /\b\d{12}\b/];
    if (!summary || piiPatterns.some((pattern) => pattern.test(summary))) throw new ApiError(400, "safeRequirementSummary must be non-empty and contain no private identifiers");
    updates.safeRequirementSummary = summary;
  }
  if (payload.status === "open") updates.publishedAt = new Date();
  if (payload.expiresAt) {
    updates.expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(updates.expiresAt.getTime())) throw new ApiError(400, "Invalid expiry date");
  }
  return Lead.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after", runValidators: true }).lean();
};
export const assignLeadToPartner = ({ id, partnerUserId, adminUserId }) => acceptLead(partnerUserId, id, { actorUserId: adminUserId, manual: true });

export const listContent = async (query = {}) => ContentEntry.find(query.section ? { section: query.section } : {}).sort({ section: 1, order: 1 }).lean();
export const saveContent = async ({ id, payload, adminUserId }) => {
  if (payload.section && !CONTENT_SECTIONS.includes(payload.section)) throw new ApiError(400, "Invalid content section");
  const data = { ...payload, updatedBy: adminUserId };
  if (id) {
    objectId(id, "Content entry");
    const entry = await ContentEntry.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after", runValidators: true }).lean();
    if (!entry) throw new ApiError(404, "Content entry not found");
    return entry;
  }
  return ContentEntry.create(data);
};

export const listSettings = () => PlatformSetting.find().sort({ key: 1 }).lean();
export const saveSetting = async ({ key, value, description, adminUserId }) => {
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(key || "")) throw new ApiError(400, "Use a valid setting key");
  if (/(password|secret|token|private|credential)/i.test(key)) throw new ApiError(400, "Secrets cannot be stored in platform settings");
  return PlatformSetting.findOneAndUpdate({ key }, { $set: { value, description, updatedBy: adminUserId } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).lean();
};
