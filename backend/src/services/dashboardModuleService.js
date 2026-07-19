import crypto from "crypto";
import mongoose from "mongoose";
import { PartnerProfile } from "../models/partnerProfileModel.js";
import { PlatformSetting } from "../models/platformSettingModel.js";
import {
  DeclarationForm, PartnerRenewal, PaymentRecord, Referral, ReferralAccount,
  RewardRecord, SoftwareAsset, SupportTicket,
} from "../models/dashboardModuleModels.js";
import { ApiError } from "../utils/ApiError.js";

const pageOf = (query = {}) => { const page = Math.max(Number.parseInt(query.page, 10) || 1, 1); const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100); return { page, limit, skip: (page - 1) * limit }; };
const clean = (value, label, max = 3000) => { const result = String(value || "").trim(); if (!result) throw new ApiError(400, `${label} is required`); if (result.length > max) throw new ApiError(400, `${label} is too long`); return result; };
const paginate = async (Model, filter, query, populate = null) => { const { page, limit, skip } = pageOf(query); let operation = Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit); if (populate) operation = operation.populate(...populate); const [items, total] = await Promise.all([operation.lean(), Model.countDocuments(filter)]); return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }; };

export const listSoftware = () => SoftwareAsset.find({ isActive: true }).select("name description icon version fileSize operatingSystem downloadUrl installationGuide order").sort({ order: 1, name: 1 }).lean();
export const listDeclarationForms = () => DeclarationForm.find({ isActive: true }).select("title description category language version fileUrl fileName fileSize order").sort({ order: 1, title: 1 }).lean();
export const listPayments = (userId, role, query) => paginate(PaymentRecord, { userId, userRole: role }, query, ["applicationId", "applicationNumber"]);
export const listRewards = async (userId, role, query) => { const result = await paginate(RewardRecord, { userId, userRole: role }, query); const [totals = {}] = await RewardRecord.aggregate([{ $match: { userId, userRole: role } }, { $group: { _id: null, approved: { $sum: { $cond: [{ $in: ["$status", ["approved", "credited"]] }, "$amount", 0] } }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } } } }]); return { rewards: result.items, pagination: result.pagination, summary: { approved: totals.approved || 0, pending: totals.pending || 0 } }; };

const makeReferralCode = (userId) => `${String(userId).replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "KARLO"}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
export const getReferralDashboard = async (userId, role) => {
  let account = await ReferralAccount.findOne({ userId }).lean();
  if (!account) {
    for (let attempt = 0; attempt < 5 && !account; attempt += 1) {
      try { account = (await ReferralAccount.create({ userId, userRole: role, referralCode: makeReferralCode(userId) })).toObject(); }
      catch (error) { if (error?.code !== 11000) throw error; account = await ReferralAccount.findOne({ userId }).lean(); }
    }
  }
  if (!account) throw new ApiError(503, "Unable to create a referral account");
  const [referrals, counts] = await Promise.all([Referral.find({ referrerUserId: userId }).select("status rewardAmount rewardStatus createdAt completedAt").sort({ createdAt: -1 }).limit(100).lean(), Referral.aggregate([{ $match: { referrerUserId: userId } }, { $group: { _id: null, total: { $sum: 1 }, successful: { $sum: { $cond: [{ $eq: ["$status", "successful"] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }, earned: { $sum: { $cond: [{ $in: ["$rewardStatus", ["approved", "credited"]] }, "$rewardAmount", 0] } } } }])]);
  return { account: { referralCode: account.referralCode }, referrals, summary: counts[0] || { total: 0, successful: 0, pending: 0, earned: 0 } };
};
export const claimReferral = async (userId, role, code) => {
  const referralCode = clean(code, "Referral code", 40).toUpperCase();
  const account = await ReferralAccount.findOne({ referralCode }).lean();
  if (!account) throw new ApiError(404, "Referral code not found");
  if (account.userId === userId) throw new ApiError(400, "You cannot use your own referral code");
  try { return await Referral.create({ referrerUserId: account.userId, referredUserId: userId, referralCode, referrerRole: account.userRole, referredRole: role }); }
  catch (error) { if (error?.code === 11000) throw new ApiError(409, "A referral has already been claimed for this account"); throw error; }
};

const addMonths = (date, months) => { const value = new Date(date); value.setUTCMonth(value.getUTCMonth() + months); return value; };
export const getRenewalDashboard = async (partnerUserId) => {
  const [profile, settings, history] = await Promise.all([PartnerProfile.findOne({ userId: partnerUserId, isActive: true }).lean(), PlatformSetting.find({ key: { $in: ["renewal.enabled", "renewal.period_months", "renewal.fee", "renewal.grace_days"] } }).lean(), PartnerRenewal.find({ partnerUserId }).sort({ createdAt: -1 }).lean()]);
  if (!profile) throw new ApiError(404, "Partner profile not found");
  const config = Object.fromEntries(settings.map(({ key, value }) => [key, value]));
  const enabled = config["renewal.enabled"] === true; const months = Math.max(Number(config["renewal.period_months"]) || 12, 1); const feeConfigured = Number.isFinite(Number(config["renewal.fee"])); const fee = feeConfigured ? Number(config["renewal.fee"]) : null;
  const approved = history.find(({ status }) => status === "approved"); const registeredAt = profile.createdAt; const expiresAt = approved?.periodEnd || addMonths(registeredAt, months); const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000); const pending = history.some(({ status }) => status === "pending");
  const status = pending ? "pending" : days < 0 ? "expired" : days <= 30 ? "due_soon" : approved ? "renewed" : "active";
  return { registration: { registeredAt, expiresAt, status }, config: { enabled, periodMonths: months, renewalFee: fee, graceDays: Math.max(Number(config["renewal.grace_days"]) || 0, 0) }, eligible: enabled && feeConfigured && !pending && days <= 30, history };
};
export const requestRenewal = async (partnerUserId) => {
  const dashboard = await getRenewalDashboard(partnerUserId); if (!dashboard.eligible) throw new ApiError(409, "Renewal is not currently available for this partner");
  const periodStart = new Date(dashboard.registration.expiresAt); const periodEnd = addMonths(periodStart, dashboard.config.periodMonths);
  return PartnerRenewal.create({ partnerUserId, periodStart, periodEnd, fee: dashboard.config.renewalFee, status: "pending" });
};

const ticketNumber = () => `KST-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const ticketOwner = (userId, role) => ({ createdByUserId: userId, createdByRole: role });
export const listTickets = async (userId, role, query) => { const filter = ticketOwner(userId, role); if (query.status === "open") filter.status = { $in: ["open", "in_progress", "waiting_for_user"] }; if (query.status === "closed") filter.status = { $in: ["resolved", "closed"] }; const result = await paginate(SupportTicket, filter, query); return { tickets: result.items, pagination: result.pagination }; };
export const createTicket = async (userId, role, payload) => SupportTicket.create({ ticketNumber: ticketNumber(), createdByUserId: userId, createdByRole: role, category: payload.category, subcategory: String(payload.subcategory || "").trim(), subject: clean(payload.subject, "Subject", 200), description: clean(payload.description, "Description", 5000), serviceId: payload.serviceId || null, transactionId: String(payload.transactionId || "").trim() });
export const getTicket = async (userId, role, id) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Ticket not found"); const ticket = await SupportTicket.findOne({ _id: id, ...ticketOwner(userId, role) }).populate("serviceId", "title").lean(); if (!ticket) throw new ApiError(404, "Ticket not found"); return ticket; };
export const replyToTicket = async (userId, role, id, message) => { await getTicket(userId, role, id); const ticket = await SupportTicket.findOneAndUpdate({ _id: id, ...ticketOwner(userId, role), status: { $ne: "closed" } }, { $push: { replies: { authorUserId: userId, authorRole: role, message: clean(message, "Reply", 3000) } }, $set: { status: "waiting_for_user" } }, { returnDocument: "after", runValidators: true }).lean(); if (!ticket) throw new ApiError(409, "Closed tickets cannot receive replies"); return ticket; };
export const closeTicket = async (userId, role, id) => { const ticket = await SupportTicket.findOneAndUpdate({ _id: id, ...ticketOwner(userId, role), status: "resolved" }, { $set: { status: "closed", closedAt: new Date() } }, { returnDocument: "after" }).lean(); if (!ticket) throw new ApiError(409, "Only resolved tickets can be closed"); return ticket; };

const resources = { software: { Model: SoftwareAsset, fields: ["name", "description", "icon", "version", "fileSize", "operatingSystem", "downloadUrl", "installationGuide", "isActive", "order"] }, declarations: { Model: DeclarationForm, fields: ["title", "description", "category", "language", "version", "fileUrl", "fileName", "fileSize", "isActive", "order"] } };
const resourceConfig = (type) => { const config = resources[type]; if (!config) throw new ApiError(404, "Resource type not found"); return config; };
const allowedPayload = (payload, fields) => { const extra = Object.keys(payload).filter((key) => !fields.includes(key)); if (extra.length) throw new ApiError(400, `Unexpected fields: ${extra.join(", ")}`); return payload; };
export const adminListResources = (type) => resourceConfig(type).Model.find().sort({ order: 1, createdAt: -1 }).lean();
export const adminCreateResource = (type, payload, adminId) => { const { Model, fields } = resourceConfig(type); return Model.create({ ...allowedPayload(payload, fields), createdBy: adminId, updatedBy: adminId }); };
export const adminUpdateResource = async (type, id, payload, adminId) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Resource not found"); const { Model, fields } = resourceConfig(type); const item = await Model.findByIdAndUpdate(id, { $set: { ...allowedPayload(payload, fields), updatedBy: adminId } }, { returnDocument: "after", runValidators: true }).lean(); if (!item) throw new ApiError(404, "Resource not found"); return item; };

export const adminListTickets = async (query) => { const filter = {}; if (query.status) filter.status = query.status; const result = await paginate(SupportTicket, filter, query); return { tickets: result.items, pagination: result.pagination }; };
export const adminUpdateTicket = async (adminId, id, payload) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Ticket not found"); const allowed = ["status", "priority", "assignedAdminId"]; const updates = allowedPayload(payload, allowed); if (updates.status === "closed") updates.closedAt = new Date(); const ticket = await SupportTicket.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after", runValidators: true }).lean(); if (!ticket) throw new ApiError(404, "Ticket not found"); return ticket; };
export const adminReplyTicket = async (adminId, id, message) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Ticket not found"); const ticket = await SupportTicket.findOneAndUpdate({ _id: id, status: { $ne: "closed" } }, { $push: { replies: { authorUserId: adminId, authorRole: "admin", message: clean(message, "Reply", 3000) } }, $set: { status: "in_progress", assignedAdminId: adminId } }, { returnDocument: "after", runValidators: true }).lean(); if (!ticket) throw new ApiError(404, "Ticket not found or closed"); return ticket; };

export const adminListRenewals = async (query) => { const filter = {}; if (query.status) filter.status = query.status; const result = await paginate(PartnerRenewal, filter, query); return { renewals: result.items, pagination: result.pagination }; };
export const adminReviewRenewal = async (adminId, id, payload) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Renewal request not found");
  if (!["approved", "rejected"].includes(payload.status)) throw new ApiError(400, "Renewal status must be approved or rejected");
  const renewal = await PartnerRenewal.findOneAndUpdate({ _id: id, status: "pending" }, { $set: { status: payload.status, remarks: String(payload.remarks || "").trim(), reviewedAt: new Date(), reviewedBy: adminId } }, { returnDocument: "after", runValidators: true }).lean();
  if (!renewal) throw new ApiError(409, "Only pending renewal requests can be reviewed");
  return renewal;
};
