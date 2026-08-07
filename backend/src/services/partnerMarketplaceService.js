import mongoose from "mongoose";
import { APPLICATION_STATUSES, TERMINAL_APPLICATION_STATUSES } from "../constants/applicationConstants.js";
import { ASSIGNMENT_TYPES, FULFILLMENT_TYPES } from "../constants/fulfillmentConstants.js";
import { ROLES } from "../constants/roleConstants.js";
import { Application } from "../models/applicationModel.js";
import { ApplicationAssignment } from "../models/applicationAssignmentModel.js";
import { ApplicationTimeline } from "../models/applicationTimelineModel.js";
import { Lead } from "../models/leadModel.js";
import { PARTNER_VERIFICATION_STATUSES, PartnerProfile } from "../models/partnerProfileModel.js";
import { User } from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";
import { createApplicationNotification, getUserNotifications, sanitizeNotificationText } from "./notificationService.js";
import { decidePartnerAccount } from "./accountLifecycleService.js";
import { hasAllowedFileSignature, removeUploadedFiles, uploadBuffer, updatePartnerApplicationStatus } from "./applicationService.js";

const DEFAULT_LIMIT = 20;
const paginate = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const getActiveProfile = async (partnerId, { requireApproval = false, session } = {}) => {
  const profile = await PartnerProfile.findOne({ userId: partnerId.trim(), isActive: true }).session(session || null);
  if (!profile) throw new ApiError(403, "An active partner profile is required");
  if (requireApproval && (profile.verificationStatus !== "approved" || !profile.availability)) {
    throw new ApiError(403, "Only approved and available partners can accept leads");
  }
  return profile;
};

const expireStaleLeads = () => Lead.updateMany(
  { status: "open", expiresAt: { $lte: new Date() } },
  { $set: { status: "expired" } }
);

const matchingLeadFilter = (profile, query = {}) => {
  const filter = { status: "open", expiresAt: { $gt: new Date() } };
  const conditions = [];
  if (profile.servicesOffered.length) conditions.push({ service: { $in: profile.servicesOffered } });
  if (profile.serviceCategories.length) conditions.push({ category: { $in: profile.serviceCategories } });
  if (conditions.length) filter.$or = conditions;
  if (profile.serviceAreas.length) filter.city = { $in: profile.serviceAreas };
  if (query.category?.trim()) filter.category = query.category.trim();
  if (query.city?.trim()) {
    const city = query.city.trim();
    if (profile.serviceAreas.length && !profile.serviceAreas.includes(city)) return { _id: null };
    filter.city = city;
  }
  if (query.pincode?.trim()) filter.pincode = query.pincode.trim();
  if (query.serviceId?.trim()) {
    if (!mongoose.isValidObjectId(query.serviceId)) throw new ApiError(400, "Invalid service filter");
    filter.service = query.serviceId;
  }
  return filter;
};

const profileMatchesLead = (profile, lead) => {
  const hasServices = profile.servicesOffered.length > 0;
  const hasCategories = profile.serviceCategories.length > 0;
  const serviceMatch = hasServices && profile.servicesOffered.some((id) => String(id) === String(lead.service));
  const categoryMatch = hasCategories && profile.serviceCategories.includes(lead.category);
  const workMatch = (!hasServices && !hasCategories) || serviceMatch || categoryMatch;
  const areaMatch = !profile.serviceAreas.length || profile.serviceAreas.includes(lead.city);
  return workMatch && areaMatch;
};

export const serializeSafeLead = (lead) => ({
  _id: lead._id,
  service: lead.service,
  serviceTitle: lead.serviceTitle,
  category: lead.category,
  city: lead.city,
  pincode: lead.pincode,
  safeRequirementSummary: lead.safeRequirementSummary,
  leadPrice: lead.leadPrice,
  status: lead.status,
  createdAt: lead.createdAt,
  expiresAt: lead.expiresAt,
});

export const getPartnerProfile = async (partnerId) => {
  const profile = await PartnerProfile.findOne({ userId: partnerId.trim() })
    .select("+verificationDocuments")
    .populate("servicesOffered", "title slug category")
    .lean();
  if (!profile) throw new ApiError(404, "Partner profile not found");
  const assignedWorkCount = await Application.countDocuments({ assignmentType: ASSIGNMENT_TYPES.PARTNER, assignedPartnerId: partnerId.trim() });
  return { ...profile, role: ROLES.PARTNER, isOnline: Boolean(profile.availability && profile.isActive && profile.verificationStatus === "approved"), assignedWorkCount };
};

const EDITABLE_PROFILE_FIELDS = [
  "businessName", "ownerName", "mobile", "email", "address", "city", "state", "pincode",
  "gstNumber", "businessType", "servicesOffered", "serviceCategories", "serviceAreas", "availability",
];

const CREATE_PROFILE_FIELDS = EDITABLE_PROFILE_FIELDS.filter((field) => field !== "availability");
const createProfilePayload = (userId, payload, verificationStatus) => {
  const unexpected = Object.keys(payload).filter((key) => !["userId", ...CREATE_PROFILE_FIELDS].includes(key));
  if (unexpected.length) throw new ApiError(400, `Unsupported partner fields: ${unexpected.join(", ")}`);
  const resolvedUserId = String(userId || payload.userId || "").trim();
  if (!resolvedUserId) throw new ApiError(400, "Partner userId is required");
  return {
    userId: resolvedUserId,
    ...Object.fromEntries(CREATE_PROFILE_FIELDS.filter((field) => field in payload).map((field) => [field, payload[field]])),
    verificationStatus,
    isActive: true,
    availability: true,
  };
};

export const registerPartnerProfile = async (partnerId, payload) => {
  const userId = partnerId.trim();
  const account = await User.findOne({ clerkUserId: userId, role: ROLES.PARTNER });
  if (!account) throw new ApiError(409, "Partner onboarding must be started before submitting a business profile");
  if (account.approval?.status === "approved") throw new ApiError(409, "Approved partners must update their existing profile");
  const data = createProfilePayload(userId, payload, "pending");
  const profile = await PartnerProfile.findOneAndUpdate(
    { userId },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  await User.updateOne(
    { _id: account._id, role: ROLES.PARTNER },
    { $set: { name: data.ownerName, mobile: data.mobile, ...(data.email ? { email: data.email } : {}), status: "pending", "approval.status": "pending", "approval.reviewedBy": "", "approval.reviewedAt": null, "approval.reason": "" } },
    { runValidators: true },
  );
  return profile;
};

export const createPartnerProfileByAdmin = async (payload) => {
  const data = createProfilePayload(payload.userId, payload, "approved");
  if (await PartnerProfile.exists({ userId: data.userId })) throw new ApiError(409, "Partner profile already exists");
  const profile = await PartnerProfile.create(data);
  await User.updateOne(
    { clerkUserId: profile.userId },
    { $set: { role: ROLES.PARTNER, status: "approved", "approval.status": "approved", "approval.reviewedAt": new Date() } },
  );
  return profile;
};

export const updatePartnerProfile = async (partnerId, payload) => {
  const unexpected = Object.keys(payload).filter((key) => !EDITABLE_PROFILE_FIELDS.includes(key));
  if (unexpected.length) throw new ApiError(400, `Partner cannot update: ${unexpected.join(", ")}`);
  const existing = await PartnerProfile.findOne({ userId: partnerId.trim() }).lean();
  if (!existing) throw new ApiError(404, "Partner profile not found");
  const verificationFields = ["businessName", "city", "state", "pincode", "gstNumber", "businessType", "servicesOffered", "serviceCategories", "serviceAreas"];
  const requiresReview = verificationFields.some((key) => key in payload && JSON.stringify(payload[key] ?? null) !== JSON.stringify(existing[key] ?? null));
  const updates = { ...payload, ...(requiresReview ? { verificationStatus: "pending" } : {}) };
  const profile = await PartnerProfile.findOneAndUpdate(
    { userId: partnerId.trim() },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  ).lean();
  if (requiresReview) {
    await User.updateOne(
      { clerkUserId: partnerId.trim(), role: ROLES.PARTNER },
      { $set: { status: "pending", "approval.status": "pending", "approval.reviewedBy": "", "approval.reviewedAt": null, "approval.reason": "Profile changes require review" } },
      { runValidators: true },
    );
  }
  return profile;
};

export const listPartnerProfilesForAdmin = async (query = {}) => {
  const { page, limit, skip } = paginate(query);
  const filter = {};
  if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
  if (query.city?.trim()) filter.city = query.city.trim();
  if (query.search?.trim()) {
    const pattern = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ businessName: { $regex: pattern, $options: "i" } }, { ownerName: { $regex: pattern, $options: "i" } }, { userId: { $regex: pattern, $options: "i" } }];
  }
  const [partners, total] = await Promise.all([
    PartnerProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PartnerProfile.countDocuments(filter),
  ]);
  const accounts = await User.find({ clerkUserId: { $in: partners.map((item) => item.userId) }, role: ROLES.PARTNER }).lean();
  const accountMap = new Map(accounts.map((account) => [account.clerkUserId, account]));
  return {
    partners: partners.map((partner) => ({ ...partner, account: accountMap.get(partner.userId) || null })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const mergePendingPartnerAccounts = (accounts, profiles) => {
  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
  return accounts.map((account) => {
    const profile = profileMap.get(account.clerkUserId);
    return profile
      ? { ...profile, account, onboardingComplete: true }
      : { _id: null, userId: account.clerkUserId, ownerName: account.name, email: account.email, mobile: account.mobile, businessName: "Onboarding incomplete", verificationStatus: "pending", createdAt: account.createdAt, account, onboardingComplete: false };
  });
};

export const listPendingPartnerApprovals = async (query = {}) => {
  const { page, limit, skip } = paginate(query);
  const filter = { role: ROLES.PARTNER, "approval.status": "pending" };
  if (query.search?.trim()) {
    const pattern = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
      { mobile: { $regex: pattern, $options: "i" } },
      { clerkUserId: { $regex: pattern, $options: "i" } },
    ];
  }
  const [accounts, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const profiles = await PartnerProfile.find({ userId: { $in: accounts.map((account) => account.clerkUserId) } }).lean();
  return {
    partners: mergePendingPartnerAccounts(accounts, profiles),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const updatePartnerVerification = async ({ id, verificationStatus, adminUserId, note = "" }) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Partner profile not found");
  if (!PARTNER_VERIFICATION_STATUSES.includes(verificationStatus)) throw new ApiError(400, "Invalid verification status");
  if (verificationStatus === "pending" || verificationStatus === "under_review") {
    const profile = await PartnerProfile.findById(id).lean();
    if (!profile) throw new ApiError(404, "Partner profile not found");
    const account = await User.findOneAndUpdate(
      { clerkUserId: profile.userId, role: ROLES.PARTNER },
      { $set: { status: "pending", "approval.status": "pending", "approval.reviewedBy": adminUserId, "approval.reviewedAt": new Date(), "approval.reason": String(note || "").trim().slice(0, 500) } },
      { returnDocument: "after", runValidators: true },
    );
    if (!account) throw new ApiError(409, "Partner profile is not linked to a Partner user account");
    return PartnerProfile.findByIdAndUpdate(id, { $set: { verificationStatus } }, { returnDocument: "after", runValidators: true }).lean();
  }
  const decision = { approved: "approve", rejected: "reject", suspended: "suspend" }[verificationStatus];
  return (await decidePartnerAccount({ id, decision, adminUserId, note })).partner;
};

export const listAvailableLeads = async (partnerId, query = {}) => {
  const profile = await getActiveProfile(partnerId);
  if (profile.verificationStatus !== "approved") throw new ApiError(403, "Partner verification approval is required");
  await expireStaleLeads();
  const filter = matchingLeadFilter(profile, query);
  const { page, limit, skip } = paginate(query);
  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  return { leads: leads.map(serializeSafeLead), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getSafeLeadDetails = async (partnerId, id) => {
  const profile = await getActiveProfile(partnerId);
  if (profile.verificationStatus !== "approved") throw new ApiError(403, "Partner verification approval is required");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Lead not found");
  await expireStaleLeads();
  const lead = await Lead.findOne({ _id: id, $or: [{ status: "open" }, { acceptedByPartnerId: partnerId.trim() }] }).lean();
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.status === "open" && !profileMatchesLead(profile, lead)) throw new ApiError(404, "Lead not found");
  const acceptedByCurrentPartner = lead.acceptedByPartnerId === partnerId.trim();
  return {
    ...serializeSafeLead(lead),
    acceptedByCurrentPartner,
    ...(acceptedByCurrentPartner ? { application: lead.application, applicationNumber: lead.applicationNumber, acceptedAt: lead.acceptedAt } : {}),
  };
};

export const listAcceptedLeads = async (partnerId, query = {}) => {
  await getActiveProfile(partnerId);
  const { page, limit, skip } = paginate(query);
  const statuses = query.completed === "true" ? ["completed"] : ["accepted"];
  const filter = { acceptedByPartnerId: partnerId.trim(), status: { $in: statuses } };
  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ acceptedAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  return {
    leads: leads.map((lead) => ({ ...serializeSafeLead(lead), application: lead.application, applicationNumber: lead.applicationNumber, acceptedAt: lead.acceptedAt, completedAt: lead.completedAt })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const acceptLead = async (partnerId, id, { actorUserId = partnerId, manual = false } = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Lead not found");
  let acceptedLead;
  await mongoose.connection.transaction(async (session) => {
    const profile = await getActiveProfile(partnerId, { requireApproval: true, session });
    const now = new Date();
    acceptedLead = await Lead.findOneAndUpdate(
      { _id: id, status: "open", acceptedByPartnerId: null, expiresAt: { $gt: now } },
      { $set: { status: "accepted", acceptedByPartnerId: partnerId.trim(), acceptedAt: now } },
      { returnDocument: "after", session }
    );
    if (!acceptedLead) throw new ApiError(409, "This lead is no longer available");
    if (!profileMatchesLead(profile, acceptedLead)) throw new ApiError(403, "This lead does not match your approved service profile");

    const application = await Application.findOne({
      _id: acceptedLead.application,
      assignedExpertId: { $in: [null, ""] },
      assignedPartnerId: { $in: [null, ""] },
    }).session(session);
    if (!application || ![FULFILLMENT_TYPES.PARTNER, FULFILLMENT_TYPES.HYBRID].includes(application.fulfillmentType)) {
      throw new ApiError(409, "The application is not available for partner assignment");
    }
    application.assignmentType = ASSIGNMENT_TYPES.PARTNER;
    application.assignedPartnerId = partnerId.trim();
    application.assignedExpertId = null;
    application.assignedBy = manual ? actorUserId : (acceptedLead.publishedByAdminId || "marketplace");
    application.assignedAt = now;
    if (application.status === APPLICATION_STATUSES.SUBMITTED) application.status = APPLICATION_STATUSES.ASSIGNED;

    await ApplicationAssignment.updateMany(
      { application: application._id, isActive: true },
      { $set: { isActive: false, endedAt: now } },
      { session }
    );
    await ApplicationAssignment.create([{
      application: application._id,
      assignmentType: ASSIGNMENT_TYPES.PARTNER,
      partnerUserId: partnerId.trim(),
      assignedBy: application.assignedBy,
      remarks: manual ? "Lead assigned manually by admin" : "Lead accepted through Partner Marketplace",
      isActive: true,
    }], { session });
    const [timeline] = await ApplicationTimeline.create([{
      application: application._id,
      status: application.status,
      remarks: manual ? "An administrator assigned a verified service partner." : "A verified service partner accepted the application.",
      updatedBy: actorUserId,
    }], { session });
    await application.save({ session });

    const customerUserId = application.customerUserId || application.customerId;
    if (customerUserId) await createApplicationNotification({
      application,
      recipientUserId: customerUserId,
      recipientRole: ROLES.CUSTOMER,
      type: "lead_accepted",
      title: "Service partner assigned",
      message: manual ? "A verified partner has been assigned to your application." : "A verified partner has accepted your application.",
      eventKey: `lead-acceptance:${timeline._id}`,
      metadata: { status: application.status },
      session,
    });
    await createApplicationNotification({
      application,
      recipientUserId: partnerId.trim(),
      recipientRole: ROLES.PARTNER,
      type: "lead_accepted",
      title: manual ? "Lead assigned" : "Lead accepted",
      message: manual ? `An administrator assigned application ${application.applicationNumber} to you.` : `You accepted application ${application.applicationNumber}.`,
      eventKey: `lead-acceptance:${timeline._id}`,
      metadata: { status: application.status },
      session,
    });
    await PartnerProfile.updateOne({ userId: partnerId.trim() }, { $inc: { acceptedLeads: 1, totalLeads: 1 } }, { session });
  });
  return { ...serializeSafeLead(acceptedLead.toObject()), application: acceptedLead.application, applicationNumber: acceptedLead.applicationNumber, acceptedAt: acceptedLead.acceptedAt };
};

export const publishApplicationLead = async ({ applicationId, adminUserId, payload }) => {
  if (!mongoose.isValidObjectId(applicationId)) throw new ApiError(404, "Application not found");
  const application = await Application.findById(applicationId).populate("service", "title category").lean();
  if (!application) throw new ApiError(404, "Application not found");
  if (![FULFILLMENT_TYPES.PARTNER, FULFILLMENT_TYPES.HYBRID].includes(application.fulfillmentType)) {
    throw new ApiError(409, "Only partner or hybrid applications can be published as leads");
  }
  if (application.assignedExpertId || application.assignedPartnerId) {
    throw new ApiError(409, "Assigned applications cannot be published as leads");
  }
  const existingLead = await Lead.findOne({ application: application._id }).select("status").lean();
  if (existingLead && !["draft", "open"].includes(existingLead.status)) {
    throw new ApiError(409, `A ${existingLead.status} lead cannot be republished`);
  }
  const expiresAt = new Date(payload.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw new ApiError(400, "expiresAt must be a future date");
  const summary = sanitizeNotificationText(payload.safeRequirementSummary, 1000);
  if (!summary) throw new ApiError(400, "safeRequirementSummary is required");
  const piiPatterns = [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, /(?:\+?91[\s-]?)?[6-9]\d{9}\b/, /\b\d{12}\b/];
  if (piiPatterns.some((pattern) => pattern.test(summary))) {
    throw new ApiError(400, "safeRequirementSummary must not contain email, phone, Aadhaar, or other private identifiers");
  }
  const status = payload.status === "draft" ? "draft" : "open";
  return Lead.findOneAndUpdate(
    { application: application._id },
    { $set: {
      applicationNumber: application.applicationNumber,
      service: application.service._id,
      serviceTitle: application.service.title,
      category: application.service.category,
      city: String(payload.city || "").trim(),
      pincode: String(payload.pincode || "").trim(),
      safeRequirementSummary: summary,
      leadPrice: Number(payload.leadPrice),
      status,
      publishedByAdminId: adminUserId,
      publishedAt: status === "open" ? new Date() : null,
      expiresAt,
    } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  ).lean();
};

export const updatePartnerWorkStatus = async ({ partnerId, id, status, remarks }) => {
  if (String(status || "").trim().toLowerCase() === APPLICATION_STATUSES.COMPLETED.toLowerCase()) {
    const application = await Application.findOne({
      _id: mongoose.isValidObjectId(id) ? id : null,
      assignmentType: ASSIGNMENT_TYPES.PARTNER,
      assignedPartnerId: partnerId.trim(),
    }).select("completionDocuments").lean();
    if (!application) throw new ApiError(404, "Application not found");
    if (!application.completionDocuments?.length) throw new ApiError(409, "Upload at least one completion document before completing the work");
  }
  let application;
  await mongoose.connection.transaction(async (session) => {
    application = await updatePartnerApplicationStatus({ partnerId, id, status, remarks, session });
    if (application.status === APPLICATION_STATUSES.COMPLETED) {
      const lead = await Lead.findOneAndUpdate(
        { application: application._id, acceptedByPartnerId: partnerId.trim(), status: "accepted" },
        { $set: { status: "completed", completedAt: new Date() } },
        { returnDocument: "after", session }
      );
      if (lead) await PartnerProfile.updateOne({ userId: partnerId.trim() }, { $inc: { completedLeads: 1 } }, { session });
    } else if (application.status === APPLICATION_STATUSES.REJECTED) {
      await Lead.updateOne(
        { application: application._id, acceptedByPartnerId: partnerId.trim(), status: "accepted" },
        { $set: { status: "rejected", cancellationReason: sanitizeNotificationText(remarks, 1000) } },
        { session }
      );
    }
  });
  return application;
};

export const uploadCompletionDocuments = async ({ partnerId, id, files = [] }) => {
  if (!files.length) throw new ApiError(400, "At least one completion document is required");
  if (files.some((file) => !hasAllowedFileSignature(file))) throw new ApiError(400, "A completion document has invalid file content");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Application not found");
  const application = await Application.findOne({
    _id: id,
    assignmentType: ASSIGNMENT_TYPES.PARTNER,
    assignedPartnerId: partnerId.trim(),
  });
  if (!application) throw new ApiError(404, "Application not found");
  if (TERMINAL_APPLICATION_STATUSES.has(application.status)) throw new ApiError(409, "Completion documents cannot be changed after work is closed");
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await uploadBuffer(file, application.applicationNumber, "completion-documents");
      uploaded.push({ fieldName: "completionDocuments", label: "Completion Document", originalName: file.originalname, publicId: result.public_id, secureUrl: result.secure_url, resourceType: result.resource_type, deliveryType: result.type || "authenticated", format: result.format || "", size: result.bytes ?? file.size, mimeType: file.mimetype, source: "completion", uploadedBy: partnerId.trim(), uploadedByRole: ROLES.PARTNER, verificationStatus: "pending" });
    }
    await mongoose.connection.transaction(async (session) => {
      application.completionDocuments.push(...uploaded);
      await application.save({ session });
      const [timeline] = await ApplicationTimeline.create([{
        application: application._id,
        status: application.status,
        remarks: `${uploaded.length} completion document${uploaded.length === 1 ? "" : "s"} uploaded.`,
        updatedBy: partnerId.trim(),
      }], { session });
      const customerUserId = application.customerUserId || application.customerId;
      if (customerUserId) await createApplicationNotification({
        application,
        recipientUserId: customerUserId,
        recipientRole: ROLES.CUSTOMER,
        type: "completion_documents_uploaded",
        title: "Completion documents uploaded",
        message: "Your service partner uploaded completed documents.",
        eventKey: `completion-documents:${timeline._id}`,
        metadata: { count: uploaded.length },
        session,
      });
    });
    return uploaded.map(({ publicId, secureUrl, ...document }) => document);
  } catch (error) {
    await removeUploadedFiles(uploaded);
    throw error;
  }
};

export const getPartnerDashboardSummary = async (partnerId) => {
  const profile = await getActiveProfile(partnerId);
  await expireStaleLeads();
  const match = profile.verificationStatus === "approved" ? matchingLeadFilter(profile) : { _id: null };
  const [available, accepted, activeWork, completed, recentLeads, notifications] = await Promise.all([
    Lead.countDocuments(match),
    Lead.countDocuments({ acceptedByPartnerId: partnerId.trim(), status: "accepted" }),
    Application.countDocuments({ assignedPartnerId: partnerId.trim(), status: { $nin: [...TERMINAL_APPLICATION_STATUSES] } }),
    Lead.countDocuments({ acceptedByPartnerId: partnerId.trim(), status: "completed" }),
    Lead.find(match).sort({ createdAt: -1 }).limit(5).lean(),
    getUserNotifications({ userId: partnerId, role: ROLES.PARTNER, query: { limit: 5 } }),
  ]);
  return {
    summary: { availableLeads: available, acceptedLeads: accepted, activeWork, completedWork: completed, walletBalance: profile.walletBalance },
    recentLeads: recentLeads.map(serializeSafeLead),
    recentNotifications: notifications.notifications,
    verificationStatus: profile.verificationStatus,
  };
};
