import * as adminService from "../services/adminService.js";
import { ApiError } from "../utils/ApiError.js";
import { listPartnerProfilesForAdmin, publishApplicationLead, updatePartnerVerification } from "../services/partnerMarketplaceService.js";
import * as controlService from "../services/adminControlService.js";
import { listAuditLogs, writeAuditLog } from "../services/auditService.js";

const validateBody = (req, allowed) => {
  const unexpected = Object.keys(req.body).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
};

const send = (handler, statusCode = 200) => async (req, res, next) => {
  try {
    const data = await handler(req);
    return res.status(statusCode).json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

export const dashboardSummary = send(async () => adminService.getAdminDashboardSummary());
export const listApplications = send(async (req) => adminService.getAdminApplications(req.query));
export const applicationDetails = send(async (req) => ({ application: await adminService.getAdminApplicationById(req.params.id) }));
export const assignApplication = send(async (req) => { validateBody(req, ["assignmentType", "assignedExpertId", "assignedPartnerId", "remarks"]); const application = await adminService.assignAdminApplication({ id: req.params.id, ...req.body, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "application.assignment", entityType: "application", entityId: application._id, summary: `Application ${application.applicationNumber} assigned`, after: { assignmentType: application.assignmentType, assignedExpertId: application.assignedExpertId, assignedPartnerId: application.assignedPartnerId } }); return { application }; });
export const updateApplicationStatus = send(async (req) => { validateBody(req, ["status", "remarks"]); const application = await adminService.updateAdminApplicationStatus({ id: req.params.id, status: req.body.status, remarks: req.body.remarks, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "application.status_override", entityType: "application", entityId: application._id, summary: `Application ${application.applicationNumber} status changed to ${application.status}`, after: { status: application.status } }); return { application }; });
export const addApplicationRemark = send(async (req) => { validateBody(req, ["remarks", "visibility"]); return { remark: await adminService.addAdminApplicationRemark({ id: req.params.id, remarks: req.body.remarks, visibility: req.body.visibility, adminUserId: req.auth.userId }) }; }, 201);
export const requestDocuments = send(async (req) => { validateBody(req, ["remarks"]); return { application: await adminService.requestAdminApplicationDocuments({ id: req.params.id, remarks: req.body.remarks, adminUserId: req.auth.userId }) }; });
export const publishLead = send(async (req) => { validateBody(req, ["city", "pincode", "safeRequirementSummary", "leadPrice", "status", "expiresAt"]); const lead = await publishApplicationLead({ applicationId: req.params.id, adminUserId: req.auth.userId, payload: req.body }); await writeAuditLog({ req, action: lead.status === "open" ? "lead.publish" : "lead.draft", entityType: "lead", entityId: lead._id, summary: `${lead.status === "open" ? "Published" : "Saved"} lead for ${lead.applicationNumber}`, after: lead }); return { lead }; }, 201);
export const listPartners = send(async (req) => listPartnerProfilesForAdmin(req.query));
export const verifyPartner = send(async (req) => { validateBody(req, ["verificationStatus"]); const partner = await updatePartnerVerification({ id: req.params.id, verificationStatus: req.body.verificationStatus }); await writeAuditLog({ req, action: "partner.verification", entityType: "partner", entityId: partner._id, summary: `Partner verification changed to ${partner.verificationStatus}`, after: { verificationStatus: partner.verificationStatus } }); return { partner }; });
export const listCustomers = send(async (req) => adminService.getAdminCustomers(req.query));
export const listExperts = send(async (req) => adminService.getAdminExperts(req.query));
export const createExpert = send(async (req) => { const expert = await adminService.createExpertProfile(req.body, req.auth.userId); await writeAuditLog({ req, action: "expert.create", entityType: "expert", entityId: expert._id, summary: `Created expert ${expert.displayName}`, after: expert }); return { expert }; }, 201);
export const updateExpert = send(async (req) => { const expert = await adminService.updateExpertProfile(req.params.id, req.body); await writeAuditLog({ req, action: "expert.update", entityType: "expert", entityId: expert._id, summary: `Updated expert ${expert.displayName}`, after: expert }); return { expert }; });
export const listServices = send(async (req) => adminService.getAdminServices(req.query));
export const createService = send(async (req) => { const service = await adminService.createAdminService(req.body); await writeAuditLog({ req, action: "service.create", entityType: "service", entityId: service._id, summary: `Created service ${service.title}`, after: service }); return { service }; }, 201);
export const serviceDetails = send(async (req) => ({ service: await adminService.getAdminServiceById(req.params.id) }));
export const updateService = send(async (req) => { const service = await adminService.updateAdminService(req.params.id, req.body); await writeAuditLog({ req, action: "service.update", entityType: "service", entityId: service._id, summary: `Updated service ${service.title}`, after: service }); return { service }; });
export const updateServiceStatus = send(async (req) => { const service = await adminService.updateAdminServiceStatus(req.params.id, req.body); await writeAuditLog({ req, action: service.isActive ? "service.activate" : "service.deactivate", entityType: "service", entityId: service._id, summary: `${service.isActive ? "Activated" : "Deactivated"} service ${service.title}`, after: { isActive: service.isActive } }); return { service }; });
export const serviceForm = send(async (req) => ({ form: await adminService.getAdminServiceForm(req.params.id) }));
export const updateServiceForm = send(async (req) => { const form = await adminService.updateAdminServiceForm(req.params.id, req.body); await writeAuditLog({ req, action: "service.form_update", entityType: "service_form", entityId: form._id, summary: `Updated dynamic form ${form.title}`, after: { title: form.title, isActive: form.isActive, fieldNames: form.fields.map((field) => field.name) } }); return { form }; });
export const reportsSummary = send(async () => ({ reports: await adminService.getAdminReports() }));

export const assignments = send(async (req) => controlService.listAssignments(req.query));
export const customerDetails = send(async (req) => controlService.getCustomerDetails(req.params.id));
export const partnerDetails = send(async (req) => controlService.getPartnerAdminDetails(req.params.id));
export const updatePartner = send(async (req) => { const partner = await controlService.updatePartnerAdmin(req.params.id, req.body); await writeAuditLog({ req, action: "partner.update", entityType: "partner", entityId: partner._id, summary: `Updated partner ${partner.businessName}`, after: partner }); return { partner }; });
export const listLeads = send(async (req) => controlService.listAdminLeads(req.query));
export const leadDetails = send(async (req) => ({ lead: await controlService.getAdminLead(req.params.id) }));
export const createLead = send(async (req) => { const { applicationId, ...payload } = req.body; const lead = await controlService.createAdminLead({ applicationId, adminUserId: req.auth.userId, payload }); await writeAuditLog({ req, action: lead.status === "open" ? "lead.publish" : "lead.draft", entityType: "lead", entityId: lead._id, summary: `Created ${lead.status} lead for ${lead.applicationNumber}`, after: lead }); return { lead }; }, 201);
export const updateLead = send(async (req) => { const lead = await controlService.updateAdminLead(req.params.id, req.body); await writeAuditLog({ req, action: ["cancelled", "expired"].includes(lead.status) ? `lead.${lead.status}` : "lead.update", entityType: "lead", entityId: lead._id, summary: `Updated lead ${lead.applicationNumber}`, after: lead }); return { lead }; });
export const assignLead = send(async (req) => { validateBody(req, ["partnerUserId"]); const lead = await controlService.assignLeadToPartner({ id: req.params.id, partnerUserId: req.body.partnerUserId, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "lead.manual_assignment", entityType: "lead", entityId: req.params.id, summary: `Assigned lead to partner ${req.body.partnerUserId}`, after: { partnerUserId: req.body.partnerUserId } }); return { lead }; });
export const content = send(async (req) => ({ content: await controlService.listContent(req.query) }));
export const createContent = send(async (req) => { const entry = await controlService.saveContent({ payload: req.body, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "content.create", entityType: "content", entityId: entry._id, summary: `Created content ${entry.key}`, after: entry }); return { entry }; }, 201);
export const updateContent = send(async (req) => { const entry = await controlService.saveContent({ id: req.params.id, payload: req.body, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "content.update", entityType: "content", entityId: entry._id, summary: `Updated content ${entry.key}`, after: entry }); return { entry }; });
export const auditLogs = send(async (req) => listAuditLogs(req.query));
export const settings = send(async () => ({ settings: await controlService.listSettings() }));
export const saveSetting = send(async (req) => { validateBody(req, ["key", "value", "description"]); const setting = await controlService.saveSetting({ ...req.body, adminUserId: req.auth.userId }); await writeAuditLog({ req, action: "settings.update", entityType: "setting", entityId: setting._id, summary: `Updated setting ${setting.key}`, after: setting }); return { setting }; });
