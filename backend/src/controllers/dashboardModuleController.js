import * as service from "../services/dashboardModuleService.js";

const send = (handler, status = 200) => async (req, res, next) => { try { return res.status(status).json({ success: true, ...(await handler(req)) }); } catch (error) { return next(error); } };

export const software = send(async () => ({ software: await service.listSoftware() }));
export const declarations = send(async () => ({ forms: await service.listDeclarationForms() }));
export const payments = send(async (req) => { const result = await service.listPayments(req.auth.userId, req.auth.role, req.query); return { payments: result.items, pagination: result.pagination }; });
export const rewards = send(async (req) => service.listRewards(req.auth.userId, req.auth.role, req.query));
export const referrals = send(async (req) => service.getReferralDashboard(req.auth.userId, req.auth.role));
export const claimReferral = send(async (req) => ({ referral: await service.claimReferral(req.auth.userId, req.auth.role, req.body.referralCode) }), 201);
export const renewal = send(async (req) => service.getRenewalDashboard(req.auth.userId));
export const requestRenewal = send(async (req) => ({ renewal: await service.requestRenewal(req.auth.userId) }), 201);
export const tickets = send(async (req) => service.listTickets(req.auth.userId, req.auth.role, req.query));
export const createTicket = send(async (req) => ({ ticket: await service.createTicket(req.auth.userId, req.auth.role, req.body) }), 201);
export const ticket = send(async (req) => ({ ticket: await service.getTicket(req.auth.userId, req.auth.role, req.params.id) }));
export const replyTicket = send(async (req) => ({ ticket: await service.replyToTicket(req.auth.userId, req.auth.role, req.params.id, req.body.message) }));
export const closeTicket = send(async (req) => ({ ticket: await service.closeTicket(req.auth.userId, req.auth.role, req.params.id) }));
