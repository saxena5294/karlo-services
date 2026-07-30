import crypto from "crypto";
import mongoose from "mongoose";
import { Application } from "../models/applicationModel.js";
import { AuditLog } from "../models/auditLogModel.js";
import { CommunicationLog, COMMUNICATION_TYPES } from "../models/communicationLogModel.js";
import { CrmLead, CRM_LEAD_SOURCES, CRM_LEAD_STATUSES } from "../models/crmLeadModel.js";
import { SupportTicket, PaymentRecord } from "../models/dashboardModuleModels.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { FollowUp, CRM_ENTITY_TYPES, CRM_PRIORITIES, FOLLOW_UP_STATUSES } from "../models/followUpModel.js";
import { InternalNote } from "../models/internalNoteModel.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { ApiError } from "../utils/ApiError.js";
import { cleanBoolean, cleanDate, cleanEmail, cleanEnum, cleanPhone, cleanText } from "./cmsValidation.js";
import { assertCrmObjectId, assertCrmQuery, cleanCrmEntityId, crmDateRange, crmPage, crmSort, escapeCrmRegex } from "./crmValidation.js";

const terminalStatuses = ["Completed", "Rejected", "Cancelled", "completed", "rejected"];
const numberFor = (prefix) => `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const pagination = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });
const pattern = (value) => ({ $regex: escapeCrmRegex(String(value).trim().slice(0, 120)), $options: "i" });
const allowedBody = (body, fields) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Request body must be an object");
  const extra = Object.keys(body).filter((key) => !fields.includes(key));
  if (extra.length) throw new ApiError(400, `Unexpected fields: ${extra.join(", ")}`);
};
const arrayText = (value, name, max = 30) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > max) throw new ApiError(400, `${name} must be an array of at most ${max} values`);
  return [...new Set(value.map((item) => cleanText(item, name, { max: 80 }).toLowerCase()).filter(Boolean))];
};

export const assertEntityExists = async (type, id) => {
  cleanEnum(type, "entityType", CRM_ENTITY_TYPES);
  cleanCrmEntityId(id);
  let exists;
  if (type === "customer") exists = await Application.exists({ $or: [{ customerUserId: id }, { customerId: id }] });
  if (type === "partner") exists = await PartnerProfile.exists({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { userId: id }] });
  if (type === "expert") exists = await ExpertProfile.exists({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { userId: id }] });
  if (type === "lead") exists = mongoose.isValidObjectId(id) && await CrmLead.exists({ _id: id, archivedAt: null });
  if (type === "ticket") exists = mongoose.isValidObjectId(id) && await SupportTicket.exists({ _id: id });
  if (type === "application") exists = mongoose.isValidObjectId(id) && await Application.exists({ _id: id });
  if (!exists) throw new ApiError(404, `${type[0].toUpperCase()}${type.slice(1)} not found`);
  return id;
};

const relatedData = async (type, id) => {
  const [notes, followUps, communications, activity] = await Promise.all([
    InternalNote.find({ relatedEntityType: type, relatedEntityId: id }).sort({ createdAt: -1 }).lean(),
    FollowUp.find({ relatedEntityType: type, relatedEntityId: id }).sort({ dueAt: 1 }).lean(),
    CommunicationLog.find({ relatedEntityType: type, relatedEntityId: id }).sort({ occurredAt: -1 }).lean(),
    AuditLog.find({ entityType: { $in: [type, `crm_${type}`] }, entityId: id }).select("action summary actorUserId createdAt").sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  return { notes, followUps: followUps.map(withOverdue), communications, activity };
};

export const withOverdue = (item, now = new Date()) => ({
  ...(typeof item.toObject === "function" ? item.toObject() : item),
  isOverdue: item.status === "pending" && new Date(item.dueAt) < now,
});

export const listCustomers = async (query = {}) => {
  assertCrmQuery(query, ["status", "applicationActivity"]);
  const { page, limit, skip } = crmPage(query);
  const pipeline = [
    { $match: { $or: [{ customerUserId: { $nin: [null, ""] } }, { customerId: { $nin: [null, ""] } }], ...crmDateRange(query) } },
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: { $ifNull: ["$customerUserId", "$customerId"] },
      name: { $first: { $ifNull: ["$applicantName", { $ifNull: ["$formData.fullName", { $ifNull: ["$formData.applicantName", "Customer"] }] }] } },
      email: { $first: { $ifNull: ["$email", { $ifNull: ["$formData.email", ""] }] } },
      mobile: { $first: { $ifNull: ["$mobileNumber", { $ifNull: ["$formData.mobile", { $ifNull: ["$formData.phone", ""] }] }] } },
      totalApplications: { $sum: 1 }, lastApplication: { $max: "$createdAt" }, lastActivity: { $max: "$updatedAt" },
      activeApplications: { $sum: { $cond: [{ $in: ["$status", terminalStatuses] }, 0, 1] } },
    } },
    { $project: { _id: 0, userId: "$_id", name: 1, email: 1, mobile: 1, totalApplications: 1, lastApplication: 1, lastActivity: 1, activeApplications: 1, status: { $cond: [{ $gt: ["$activeApplications", 0] }, "active", "inactive"] } } },
  ];
  const match = {};
  if (query.search?.trim()) match.$or = ["userId", "name", "email", "mobile"].map((field) => ({ [field]: pattern(query.search) }));
  if (query.status) match.status = cleanEnum(query.status, "status", ["active", "inactive"]);
  if (query.applicationActivity === "active") match.activeApplications = { $gt: 0 };
  if (query.applicationActivity === "none") match.totalApplications = 0;
  if (Object.keys(match).length) pipeline.push({ $match: match });
  const sort = crmSort(query, ["name", "totalApplications", "lastApplication", "lastActivity"], "lastActivity");
  const [result] = await Application.aggregate([...pipeline, { $facet: { items: [{ $sort: sort }, { $skip: skip }, { $limit: limit }], count: [{ $count: "total" }] } }]);
  const total = result.count[0]?.total || 0;
  return { items: result.items, pagination: pagination(page, limit, total) };
};

export const getCustomer = async (id) => {
  await assertEntityExists("customer", id);
  const applications = await Application.find({ $or: [{ customerUserId: id }, { customerId: id }] })
    .select("applicationNumber applicantName mobileNumber email status paymentStatus pricingSnapshot files additionalDocuments completionDocuments service createdAt updatedAt")
    .populate("service", "title slug").sort({ createdAt: -1 }).lean();
  const first = applications[0];
  const [tickets, payments, related] = await Promise.all([
    SupportTicket.find({ createdByUserId: id, createdByRole: "customer" }).sort({ updatedAt: -1 }).lean(),
    PaymentRecord.find({ userId: id, userRole: "customer" }).sort({ createdAt: -1 }).limit(100).lean(),
    relatedData("customer", id),
  ]);
  const safeApplications = applications.map(({ files, additionalDocuments, completionDocuments, ...application }) => ({ ...application, documentSummary: { uploaded: (files?.length || 0) + (additionalDocuments?.length || 0), completion: completionDocuments?.length || 0 } }));
  return { customer: { userId: id, name: first.applicantName || "Customer", email: first.email || "", mobile: first.mobileNumber || "", registeredAt: applications.at(-1).createdAt, lastActivity: first.updatedAt, status: applications.some((item) => !terminalStatuses.includes(item.status)) ? "active" : "inactive" }, applications: safeApplications, tickets, payments, ...related };
};

export const listPartners = async (query = {}) => {
  assertCrmQuery(query, ["status", "isActive", "city", "assigned"]);
  const { page, limit, skip } = crmPage(query);
  const filter = { ...crmDateRange(query) };
  if (query.status) filter.verificationStatus = cleanEnum(query.status, "status", ["pending", "under_review", "approved", "rejected", "suspended"]);
  if (query.isActive !== undefined) filter.isActive = cleanBoolean(query.isActive, "isActive");
  if (query.city) filter.city = pattern(query.city);
  if (query.assigned !== undefined) {
    const assignedIds = await Application.distinct("assignedPartnerId", { assignedPartnerId: { $nin: [null, ""] } });
    filter.userId = cleanBoolean(query.assigned, "assigned") ? { $in: assignedIds } : { $nin: assignedIds };
  }
  if (query.search?.trim()) filter.$or = ["userId", "businessName", "ownerName", "mobile", "email"].map((field) => ({ [field]: pattern(query.search) }));
  const sort = crmSort(query, ["createdAt", "businessName", "city", "verificationStatus"], "createdAt");
  const [items, total] = await Promise.all([PartnerProfile.find(filter).select("-verificationDocuments").sort(sort).skip(skip).limit(limit).lean(), PartnerProfile.countDocuments(filter)]);
  const counts = await Application.aggregate([{ $match: { assignedPartnerId: { $in: items.map((item) => item.userId) } } }, { $group: { _id: "$assignedPartnerId", total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ["$status", terminalStatuses] }, 0, 1] } }, completed: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } } } }]);
  const byId = new Map(counts.map((row) => [row._id, row]));
  return { items: items.map((item) => ({ ...item, assignments: byId.get(item.userId) || { total: 0, active: 0, completed: 0 } })), pagination: pagination(page, limit, total) };
};

export const getPartner = async (id) => {
  const partner = await PartnerProfile.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { userId: id }] }).select("-verificationDocuments").lean();
  if (!partner) throw new ApiError(404, "Partner not found");
  const [applications, tickets, related] = await Promise.all([
    Application.find({ assignedPartnerId: partner.userId }).select("applicationNumber status service createdAt updatedAt").populate("service", "title").sort({ createdAt: -1 }).limit(100).lean(),
    SupportTicket.find({ createdByUserId: partner.userId, createdByRole: "partner" }).sort({ updatedAt: -1 }).lean(),
    relatedData("partner", partner.userId),
  ]);
  return { partner, applications, tickets, performance: { total: applications.length, active: applications.filter((item) => !terminalStatuses.includes(item.status)).length, completed: applications.filter((item) => ["Completed", "completed"].includes(item.status)).length }, ...related };
};

export const listExperts = async (query = {}) => {
  assertCrmQuery(query, ["status", "isActive", "category", "assigned"]);
  const { page, limit, skip } = crmPage(query);
  const filter = { ...crmDateRange(query) };
  if (query.status) filter.status = cleanEnum(query.status, "status", ["active", "inactive", "unavailable"]);
  if (query.isActive !== undefined) filter.availability = cleanBoolean(query.isActive, "isActive");
  if (query.category) filter.categories = query.category;
  if (query.assigned !== undefined) {
    const assignedIds = await Application.distinct("assignedExpertId", { assignedExpertId: { $nin: [null, ""] } });
    filter.userId = cleanBoolean(query.assigned, "assigned") ? { $in: assignedIds } : { $nin: assignedIds };
  }
  if (query.search?.trim()) filter.$or = ["userId", "displayName", "email", "phone", "skills"].map((field) => ({ [field]: pattern(query.search) }));
  const sort = crmSort(query, ["createdAt", "displayName", "status"], "createdAt");
  const [items, total] = await Promise.all([ExpertProfile.find(filter).sort(sort).skip(skip).limit(limit).lean(), ExpertProfile.countDocuments(filter)]);
  const counts = await Application.aggregate([{ $match: { assignedExpertId: { $in: items.map((item) => item.userId) } } }, { $group: { _id: "$assignedExpertId", total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ["$status", terminalStatuses] }, 0, 1] } }, completed: { $sum: { $cond: [{ $in: ["$status", ["Completed", "completed"]] }, 1, 0] } } } }]);
  const byId = new Map(counts.map((row) => [row._id, row]));
  return { items: items.map((item) => ({ ...item, assignments: byId.get(item.userId) || { total: 0, active: 0, completed: 0 } })), pagination: pagination(page, limit, total) };
};

export const getExpert = async (id) => {
  const expert = await ExpertProfile.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { userId: id }] }).lean();
  if (!expert) throw new ApiError(404, "Expert not found");
  const [applications, tickets, related] = await Promise.all([
    Application.find({ assignedExpertId: expert.userId }).select("applicationNumber status service createdAt updatedAt").populate("service", "title").sort({ createdAt: -1 }).limit(100).lean(),
    SupportTicket.find({ createdByUserId: expert.userId, createdByRole: "expert" }).sort({ updatedAt: -1 }).lean(),
    relatedData("expert", expert.userId),
  ]);
  return { expert, applications, tickets, performance: { total: applications.length, active: applications.filter((item) => !terminalStatuses.includes(item.status)).length, completed: applications.filter((item) => ["Completed", "completed"].includes(item.status)).length }, ...related };
};

const leadPayload = (body, partial = false) => {
  const fields = ["name", "email", "mobile", "alternateMobile", "source", "serviceInterest", "category", "message", "status", "priority", "assignedTo", "assignedToType", "nextFollowUpAt", "lastContactedAt", "tags", "lostReason"];
  allowedBody(body, fields);
  const output = {};
  if (!partial || body.name !== undefined) output.name = cleanText(body.name, "name", { required: true, max: 160 });
  if (!partial || body.mobile !== undefined) output.mobile = cleanPhone(body.mobile, "mobile") || (() => { throw new ApiError(400, "mobile is required"); })();
  if (body.email !== undefined) output.email = cleanEmail(body.email, "email");
  if (body.alternateMobile !== undefined) output.alternateMobile = cleanPhone(body.alternateMobile, "alternateMobile");
  for (const [key, max] of [["serviceInterest", 200], ["category", 120], ["message", 3000], ["assignedTo", 160], ["lostReason", 1000]]) if (body[key] !== undefined) output[key] = cleanText(body[key], key, { max });
  if (body.source !== undefined) output.source = cleanEnum(body.source, "source", CRM_LEAD_SOURCES);
  if (body.status !== undefined) output.status = cleanEnum(body.status, "status", CRM_LEAD_STATUSES);
  if (body.priority !== undefined) output.priority = cleanEnum(body.priority, "priority", CRM_PRIORITIES);
  if (body.assignedToType !== undefined) output.assignedToType = cleanEnum(body.assignedToType, "assignedToType", ["", "admin", "expert", "partner"]);
  for (const key of ["nextFollowUpAt", "lastContactedAt"]) if (body[key] !== undefined) output[key] = cleanDate(body[key], key);
  if (body.tags !== undefined) output.tags = arrayText(body.tags, "tags");
  const status = output.status ?? body.status;
  const reason = output.lostReason ?? body.lostReason;
  if (!partial && status === "lost" && !reason?.trim()) throw new ApiError(400, "lostReason is required when a lead is lost");
  return output;
};

const validateAssignee = async (type, id) => {
  if (!id && !type) return;
  if (!id || !type) throw new ApiError(400, "assignedTo and assignedToType must be provided together");
  if (type === "partner" && !await PartnerProfile.exists({ userId: id, isActive: true })) throw new ApiError(400, "Assigned partner is invalid or inactive");
  if (type === "expert" && !await ExpertProfile.exists({ userId: id, status: "active" })) throw new ApiError(400, "Assigned expert is invalid or inactive");
};

export const listLeads = async (query = {}) => {
  assertCrmQuery(query, ["status", "priority", "source", "category", "assignedTo"]);
  const { page, limit, skip } = crmPage(query);
  const filter = { archivedAt: null, ...crmDateRange(query) };
  for (const [key, values] of [["status", CRM_LEAD_STATUSES], ["priority", CRM_PRIORITIES], ["source", CRM_LEAD_SOURCES]]) if (query[key]) filter[key] = cleanEnum(query[key], key, values);
  if (query.category) filter.category = query.category;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.search?.trim()) filter.$or = ["leadNumber", "name", "email", "mobile", "serviceInterest", "tags"].map((field) => ({ [field]: pattern(query.search) }));
  const sort = crmSort(query, ["createdAt", "updatedAt", "name", "status", "priority", "nextFollowUpAt"], "createdAt");
  const [items, total] = await Promise.all([CrmLead.find(filter).sort(sort).skip(skip).limit(limit).lean(), CrmLead.countDocuments(filter)]);
  return { items, pagination: pagination(page, limit, total) };
};

export const createLead = async (body, userId) => {
  const payload = leadPayload(body);
  await validateAssignee(payload.assignedToType, payload.assignedTo);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await CrmLead.create({ ...payload, leadNumber: numberFor("KSL"), createdBy: userId, updatedBy: userId }); }
    catch (error) { if (error.code !== 11000 || attempt === 2) throw error; }
  }
};

export const getLead = async (id) => {
  assertCrmObjectId(id, "Lead ID");
  const lead = await CrmLead.findOne({ _id: id, archivedAt: null }).populate("convertedApplication", "applicationNumber status").lean();
  if (!lead) throw new ApiError(404, "Lead not found");
  return { lead, ...await relatedData("lead", id) };
};

export const updateLead = async (id, body, userId) => {
  assertCrmObjectId(id, "Lead ID");
  const existing = await CrmLead.findOne({ _id: id, archivedAt: null });
  if (!existing) throw new ApiError(404, "Lead not found");
  if (existing.status === "converted") throw new ApiError(409, "Converted leads cannot be edited");
  const payload = leadPayload(body, true);
  if (payload.assignedToType === "") payload.assignedTo = "";
  if ((payload.status ?? existing.status) === "lost" && !(payload.lostReason ?? existing.lostReason)?.trim()) throw new ApiError(400, "lostReason is required when a lead is lost");
  await validateAssignee(payload.assignedToType ?? existing.assignedToType, payload.assignedTo ?? existing.assignedTo);
  Object.assign(existing, payload, { updatedBy: userId });
  await existing.save();
  return existing;
};

export const convertLead = async (id, body, userId) => {
  allowedBody(body, ["convertedCustomer", "convertedApplication"]);
  assertCrmObjectId(id, "Lead ID");
  const lead = await CrmLead.findById(id);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.status === "converted" || lead.convertedAt) throw new ApiError(409, "Lead has already been converted");
  const customer = cleanText(body.convertedCustomer, "convertedCustomer", { max: 160 });
  const applicationId = body.convertedApplication || null;
  if (!customer && !applicationId) throw new ApiError(400, "Select an existing customer or application for conversion");
  if (customer && !await Application.exists({ $or: [{ customerUserId: customer }, { customerId: customer }] })) throw new ApiError(400, "Converted customer does not exist");
  if (applicationId) { assertCrmObjectId(applicationId, "convertedApplication"); if (!await Application.exists({ _id: applicationId })) throw new ApiError(400, "Converted application does not exist"); }
  lead.status = "converted"; lead.convertedCustomer = customer; lead.convertedApplication = applicationId; lead.convertedAt = new Date(); lead.updatedBy = userId;
  await lead.save();
  return lead;
};

export const listTickets = async (query = {}) => {
  assertCrmQuery(query, ["status", "priority", "category", "assignedTo", "raisedByType"]);
  const { page, limit, skip } = crmPage(query);
  const filter = { ...crmDateRange(query) };
  if (query.status) filter.status = cleanEnum(query.status, "status", ["open", "in_progress", "waiting_for_user", "waiting_for_customer", "waiting_for_partner", "resolved", "closed"]);
  if (query.priority) filter.priority = cleanEnum(query.priority, "priority", ["low", "normal", "medium", "high", "urgent"]);
  if (query.category) filter.category = query.category;
  if (query.assignedTo) filter.assignedAdminId = query.assignedTo;
  if (query.raisedByType) filter.createdByRole = cleanEnum(query.raisedByType, "raisedByType", ["customer", "partner"]);
  if (query.search?.trim()) filter.$or = ["ticketNumber", "subject", "description", "createdByUserId"].map((field) => ({ [field]: pattern(query.search) }));
  const sort = crmSort(query, ["createdAt", "updatedAt", "status", "priority", "ticketNumber"], "updatedAt");
  const [items, total] = await Promise.all([SupportTicket.find(filter).sort(sort).skip(skip).limit(limit).lean(), SupportTicket.countDocuments(filter)]);
  return { items, pagination: pagination(page, limit, total) };
};

export const createTicket = async (body, userId) => {
  const fields = ["subject", "description", "category", "priority", "raisedByType", "raisedBy", "relatedApplication", "relatedLead", "assignedTo"];
  allowedBody(body, fields);
  const raisedByType = cleanEnum(body.raisedByType, "raisedByType", ["customer", "partner", "expert"]);
  await assertEntityExists(raisedByType, body.raisedBy);
  const payload = {
    ticketNumber: numberFor("KST"), createdByUserId: cleanCrmEntityId(body.raisedBy, "raisedBy"), createdByRole: raisedByType,
    subject: cleanText(body.subject, "subject", { required: true, max: 200 }), description: cleanText(body.description, "description", { required: true, max: 5000 }),
    category: cleanEnum(body.category, "category", ["service_query", "transaction_query", "feedback", "technical_issue", "application", "payment", "document", "technical", "partner", "expert", "account", "general", "other"]),
    priority: cleanEnum(body.priority || "normal", "priority", ["low", "normal", "medium", "high", "urgent"]), assignedAdminId: cleanText(body.assignedTo, "assignedTo", { max: 160 }),
    relatedApplication: body.relatedApplication || null, relatedLead: body.relatedLead || null,
    statusHistory: [{ status: "open", changedBy: userId }],
  };
  if (payload.relatedApplication) assertCrmObjectId(payload.relatedApplication, "relatedApplication");
  if (payload.relatedLead) assertCrmObjectId(payload.relatedLead, "relatedLead");
  if (payload.relatedApplication && !await Application.exists({ _id: payload.relatedApplication })) throw new ApiError(400, "Related application does not exist");
  if (payload.relatedLead && !await CrmLead.exists({ _id: payload.relatedLead, archivedAt: null })) throw new ApiError(400, "Related CRM lead does not exist");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await SupportTicket.create({ ...payload, ticketNumber: numberFor("KST") }); }
    catch (error) { if (error.code !== 11000 || attempt === 2) throw error; }
  }
};

export const getTicket = async (id) => {
  assertCrmObjectId(id, "Ticket ID");
  const ticket = await SupportTicket.findById(id).populate("relatedApplication", "applicationNumber status").populate("relatedLead", "leadNumber name status").lean();
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return { ticket, ...await relatedData("ticket", id) };
};

export const updateTicket = async (id, body, userId) => {
  allowedBody(body, ["status", "priority", "assignedTo", "resolution"]);
  assertCrmObjectId(id, "Ticket ID");
  const ticket = await SupportTicket.findById(id);
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const beforeStatus = ticket.status;
  if (body.status !== undefined) ticket.status = cleanEnum(body.status, "status", ["open", "in_progress", "waiting_for_user", "waiting_for_customer", "waiting_for_partner", "resolved", "closed"]);
  if (body.priority !== undefined) ticket.priority = cleanEnum(body.priority, "priority", ["low", "normal", "medium", "high", "urgent"]);
  if (body.assignedTo !== undefined) ticket.assignedAdminId = cleanText(body.assignedTo, "assignedTo", { max: 160 });
  if (body.resolution !== undefined) ticket.resolution = cleanText(body.resolution, "resolution", { max: 3000 });
  if (ticket.status === "resolved" && !ticket.resolution) throw new ApiError(400, "resolution is required to resolve a ticket");
  if (ticket.status === "closed" && !["resolved", "closed"].includes(beforeStatus)) throw new ApiError(409, "Resolve the ticket before closing it");
  if (ticket.status !== beforeStatus) {
    ticket.statusHistory.push({ status: ticket.status, changedBy: userId });
    if (ticket.status === "resolved") ticket.resolvedAt = new Date();
    if (ticket.status === "closed") ticket.closedAt = new Date();
    if (!["resolved", "closed"].includes(ticket.status)) { ticket.resolvedAt = null; ticket.closedAt = null; }
  }
  await ticket.save();
  return ticket;
};

export const listFollowUps = async (query = {}) => {
  assertCrmQuery(query, ["status", "priority", "assignedTo", "entityType", "entityId", "dueFrom", "dueTo"]);
  const { page, limit, skip } = crmPage(query);
  const filter = {};
  if (query.status) filter.status = cleanEnum(query.status, "status", [...FOLLOW_UP_STATUSES, "overdue"]);
  if (filter.status === "overdue") { filter.status = "pending"; filter.dueAt = { $lt: new Date() }; }
  if (query.priority) filter.priority = cleanEnum(query.priority, "priority", CRM_PRIORITIES);
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.entityType) filter.relatedEntityType = cleanEnum(query.entityType, "entityType", CRM_ENTITY_TYPES);
  if (query.entityId) filter.relatedEntityId = cleanCrmEntityId(query.entityId);
  if (query.dueFrom || query.dueTo) { filter.dueAt = filter.dueAt || {}; if (query.dueFrom) filter.dueAt.$gte = cleanDate(query.dueFrom, "dueFrom"); if (query.dueTo) filter.dueAt.$lte = cleanDate(query.dueTo, "dueTo"); }
  if (query.search?.trim()) filter.$or = ["title", "description", "relatedEntityId"].map((field) => ({ [field]: pattern(query.search) }));
  const sort = crmSort(query, ["dueAt", "createdAt", "priority", "status"], "dueAt");
  const [items, total] = await Promise.all([FollowUp.find(filter).sort(sort).skip(skip).limit(limit).lean(), FollowUp.countDocuments(filter)]);
  return { items: items.map(withOverdue), pagination: pagination(page, limit, total) };
};

export const createFollowUp = async (body, userId) => {
  allowedBody(body, ["relatedEntityType", "relatedEntityId", "title", "description", "dueAt", "priority", "assignedTo"]);
  const type = cleanEnum(body.relatedEntityType, "relatedEntityType", CRM_ENTITY_TYPES);
  const id = cleanCrmEntityId(body.relatedEntityId, "relatedEntityId");
  await assertEntityExists(type, id);
  const dueAt = cleanDate(body.dueAt, "dueAt");
  if (!dueAt) throw new ApiError(400, "dueAt is required");
  return FollowUp.create({ relatedEntityType: type, relatedEntityId: id, title: cleanText(body.title, "title", { required: true, max: 180 }), description: cleanText(body.description, "description", { max: 2000 }), dueAt, priority: cleanEnum(body.priority || "medium", "priority", CRM_PRIORITIES), assignedTo: cleanText(body.assignedTo, "assignedTo", { max: 160 }), createdBy: userId, updatedBy: userId });
};

export const updateFollowUp = async (id, body, userId) => {
  allowedBody(body, ["title", "description", "dueAt", "status", "priority", "assignedTo", "outcome"]);
  assertCrmObjectId(id, "Follow-up ID");
  const item = await FollowUp.findById(id);
  if (!item) throw new ApiError(404, "Follow-up not found");
  if (body.title !== undefined) item.title = cleanText(body.title, "title", { required: true, max: 180 });
  if (body.description !== undefined) item.description = cleanText(body.description, "description", { max: 2000 });
  if (body.dueAt !== undefined) item.dueAt = cleanDate(body.dueAt, "dueAt");
  if (body.status !== undefined) item.status = cleanEnum(body.status, "status", FOLLOW_UP_STATUSES);
  if (body.priority !== undefined) item.priority = cleanEnum(body.priority, "priority", CRM_PRIORITIES);
  if (body.assignedTo !== undefined) item.assignedTo = cleanText(body.assignedTo, "assignedTo", { max: 160 });
  if (body.outcome !== undefined) item.outcome = cleanText(body.outcome, "outcome", { max: 2000 });
  if (item.status === "completed" && !item.outcome) throw new ApiError(400, "outcome is required to complete a follow-up");
  item.completedAt = item.status === "completed" ? item.completedAt || new Date() : null;
  item.updatedBy = userId;
  await item.save();
  return withOverdue(item);
};

export const removeFollowUp = async (id, userId) => updateFollowUp(id, { status: "cancelled", outcome: "Cancelled by administrator" }, userId);

export const listNotes = async (type, id) => { await assertEntityExists(type, id); return InternalNote.find({ relatedEntityType: type, relatedEntityId: id }).sort({ createdAt: -1 }).lean(); };
export const createNote = async (type, id, body, userId) => { allowedBody(body, ["content"]); await assertEntityExists(type, id); return InternalNote.create({ relatedEntityType: type, relatedEntityId: id, content: cleanText(body.content, "content", { required: true, max: 5000 }), createdBy: userId, updatedBy: userId }); };
export const updateNote = async (id, body, userId) => { allowedBody(body, ["content"]); assertCrmObjectId(id, "Note ID"); const item = await InternalNote.findByIdAndUpdate(id, { $set: { content: cleanText(body.content, "content", { required: true, max: 5000 }), updatedBy: userId } }, { returnDocument: "after", runValidators: true }).lean(); if (!item) throw new ApiError(404, "Internal note not found"); return item; };
export const removeNote = async (id) => { assertCrmObjectId(id, "Note ID"); const item = await InternalNote.findByIdAndDelete(id).lean(); if (!item) throw new ApiError(404, "Internal note not found"); return item; };

export const listCommunications = async (type, id, query = {}) => {
  assertCrmQuery(query, ["communicationType"]);
  await assertEntityExists(type, id);
  const filter = { relatedEntityType: type, relatedEntityId: id };
  if (query.communicationType) filter.communicationType = cleanEnum(query.communicationType, "communicationType", COMMUNICATION_TYPES);
  Object.assign(filter, crmDateRange(query, "occurredAt"));
  return CommunicationLog.find(filter).sort({ occurredAt: -1 }).limit(200).lean();
};
export const createCommunication = async (type, id, body, userId) => {
  allowedBody(body, ["communicationType", "direction", "subject", "summary", "contactValue", "occurredAt", "outcome", "nextAction", "followUp"]);
  await assertEntityExists(type, id);
  const item = await CommunicationLog.create({ relatedEntityType: type, relatedEntityId: id, communicationType: cleanEnum(body.communicationType, "communicationType", COMMUNICATION_TYPES), direction: cleanEnum(body.direction, "direction", ["inbound", "outbound"]), subject: cleanText(body.subject, "subject", { max: 180 }), summary: cleanText(body.summary, "summary", { required: true, max: 5000 }), contactValue: cleanText(body.contactValue, "contactValue", { max: 254 }), occurredAt: cleanDate(body.occurredAt, "occurredAt") || new Date(), outcome: cleanText(body.outcome, "outcome", { max: 1000 }), nextAction: cleanText(body.nextAction, "nextAction", { max: 1000 }), createdBy: userId });
  let followUp = null;
  if (body.followUp) followUp = await createFollowUp({ ...body.followUp, relatedEntityType: type, relatedEntityId: id }, userId);
  return { item, followUp };
};

export const overview = async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [customerRows, activePartners, activeExperts, openLeads, leadsRequiringFollowUp, openTickets, overdueFollowUps, recentCommunications, upcoming, overdue, leads, tickets, activity] = await Promise.all([
    Application.aggregate([{ $match: { $or: [{ customerUserId: { $nin: [null, ""] } }, { customerId: { $nin: [null, ""] } }] } }, { $group: { _id: { $ifNull: ["$customerUserId", "$customerId"] } } }]),
    PartnerProfile.countDocuments({ isActive: true, verificationStatus: "approved" }),
    ExpertProfile.countDocuments({ status: "active", availability: true }),
    CrmLead.countDocuments({ archivedAt: null, status: { $nin: ["converted", "lost", "closed"] } }),
    CrmLead.countDocuments({ archivedAt: null, status: { $nin: ["converted", "lost", "closed"] }, nextFollowUpAt: { $lte: soon } }),
    SupportTicket.countDocuments({ status: { $nin: ["resolved", "closed"] } }),
    FollowUp.countDocuments({ status: "pending", dueAt: { $lt: now } }),
    CommunicationLog.countDocuments({ occurredAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }),
    FollowUp.find({ status: "pending", dueAt: { $gte: now, $lte: soon } }).sort({ dueAt: 1 }).limit(8).lean(),
    FollowUp.find({ status: "pending", dueAt: { $lt: now } }).sort({ dueAt: 1 }).limit(8).lean(),
    CrmLead.find({ archivedAt: null }).sort({ createdAt: -1 }).limit(8).lean(),
    SupportTicket.find().sort({ updatedAt: -1 }).limit(8).lean(),
    AuditLog.find({ entityType: { $regex: /^(crm_|lead|ticket|customer|partner|expert)/ } }).select("summary action entityType entityId actorUserId createdAt").sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return { summary: { totalCustomers: customerRows.length, activePartners, activeExperts, openLeads, leadsRequiringFollowUp, openTickets, overdueFollowUps, recentCommunications }, upcomingFollowUps: upcoming.map(withOverdue), overdueFollowUps: overdue.map(withOverdue), recentLeads: leads, recentTickets: tickets, recentActivity: activity };
};
