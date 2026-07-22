import * as applicationService from "../services/applicationService.js";
import * as marketplaceService from "../services/partnerMarketplaceService.js";

const send = (handler, status = 200) => async (req, res, next) => {
  try { return res.status(status).json({ success: true, ...(await handler(req)) }); }
  catch (error) { return next(error); }
};

export const listApplications = send(async (req) => applicationService.getPartnerApplications(req.auth.userId, req.query));
export const applicationDetails = send(async (req) => ({ application: await applicationService.getPartnerApplicationById(req.auth.userId, req.params.id) }));
export const updateStatus = send(async (req) => ({ application: await applicationService.updatePartnerApplicationStatus({ partnerId: req.auth.userId, id: req.params.id, status: req.body.status, remarks: req.body.remarks }) }));
export const addRemark = send(async (req) => ({ application: await applicationService.addPartnerRemark({ partnerId: req.auth.userId, id: req.params.id, remarks: req.body.remarks }) }), 201);
export const requestDocuments = send(async (req) => ({ application: await applicationService.requestPartnerApplicationDocuments({ partnerId: req.auth.userId, id: req.params.id, remarks: req.body.remarks }) }));
export const dashboardSummary = send(async (req) => applicationService.getPartnerDashboardSummary(req.auth.userId));
export const listLeads = send(async (req) => marketplaceService.listAvailableLeads(req.auth.userId, req.query));
export const leadDetails = send(async (req) => ({ lead: await marketplaceService.getSafeLeadDetails(req.auth.userId, req.params.id) }));
export const acceptLead = send(async (req) => ({ lead: await marketplaceService.acceptLead(req.auth.userId, req.params.id) }));
export const acceptedLeads = send(async (req) => marketplaceService.listAcceptedLeads(req.auth.userId, req.query));
export const updateMarketplaceStatus = send(async (req) => ({ application: await marketplaceService.updatePartnerWorkStatus({ partnerId: req.auth.userId, id: req.params.id, status: req.body.status, remarks: req.body.remarks }) }));
export const completionDocuments = send(async (req) => ({ documents: await applicationService.uploadPartnerCompletionDocuments({ partnerId: req.auth.userId, id: req.params.id, files: req.files || [] }) }), 201);
export const profile = send(async (req) => ({ profile: await marketplaceService.getPartnerProfile(req.auth.userId) }));
export const updateProfile = send(async (req) => ({ profile: await marketplaceService.updatePartnerProfile(req.auth.userId, req.body) }));
export const register = send(async (req) => ({ profile: await marketplaceService.registerPartnerProfile(req.auth.userId, req.body) }), 201);
