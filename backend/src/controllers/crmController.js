import * as crm from "../services/crmService.js";
import { writeAuditLog } from "../services/auditService.js";

const send = (handler, status = 200) => async (req, res, next) => {
  try { return res.status(status).json({ success: true, data: await handler(req) }); }
  catch (error) { return next(error); }
};
const audited = (handler, action, entityType, summary, status = 200) => send(async (req) => {
  const result = await handler(req);
  const item = result?.item || result?.lead || result?.ticket || result?.followUp || result;
  const auditEntityType = typeof entityType === "function" ? entityType(item, req) : entityType;
  const entityId = item?.relatedEntityId || req.params.entityId || item?._id || req.params.id;
  await writeAuditLog({ req, action, entityType: auditEntityType, entityId, summary: typeof summary === "function" ? summary(item, req) : summary, after: item });
  return result;
}, status);

export const overview = send(() => crm.overview());
export const customers = send((req) => crm.listCustomers(req.query));
export const customer = send((req) => crm.getCustomer(req.params.id));
export const partners = send((req) => crm.listPartners(req.query));
export const partner = send((req) => crm.getPartner(req.params.id));
export const experts = send((req) => crm.listExperts(req.query));
export const expert = send((req) => crm.getExpert(req.params.id));

export const leads = send((req) => crm.listLeads(req.query));
export const lead = send((req) => crm.getLead(req.params.id));
export const createLead = audited((req) => crm.createLead(req.body, req.auth.userId), "crm.lead.create", "crm_lead", (item) => `Created CRM lead ${item.leadNumber}`, 201);
export const updateLead = audited((req) => crm.updateLead(req.params.id, req.body, req.auth.userId), "crm.lead.update", "crm_lead", (item) => `Updated CRM lead ${item.leadNumber}`);
export const convertLead = audited((req) => crm.convertLead(req.params.id, req.body, req.auth.userId), "crm.lead.convert", "crm_lead", (item) => `Converted CRM lead ${item.leadNumber}`);

export const tickets = send((req) => crm.listTickets(req.query));
export const ticket = send((req) => crm.getTicket(req.params.id));
export const createTicket = audited((req) => crm.createTicket(req.body, req.auth.userId), "crm.ticket.create", "ticket", (item) => `Created support ticket ${item.ticketNumber}`, 201);
export const updateTicket = audited((req) => crm.updateTicket(req.params.id, req.body, req.auth.userId), "crm.ticket.update", "ticket", (item) => `Updated support ticket ${item.ticketNumber}`);

export const followUps = send((req) => crm.listFollowUps(req.query));
export const createFollowUp = audited(async (req) => ({ followUp: await crm.createFollowUp(req.body, req.auth.userId) }), "crm.follow_up.create", (item) => item.relatedEntityType, (item) => `Created follow-up ${item.title}`, 201);
export const updateFollowUp = audited(async (req) => ({ followUp: await crm.updateFollowUp(req.params.id, req.body, req.auth.userId) }), "crm.follow_up.update", (item) => item.relatedEntityType, (item) => `Updated follow-up ${item.title}`);
export const removeFollowUp = audited(async (req) => ({ followUp: await crm.removeFollowUp(req.params.id, req.auth.userId) }), "crm.follow_up.cancel", (item) => item.relatedEntityType, (item) => `Cancelled follow-up ${item.title}`);

export const notes = send(async (req) => ({ items: await crm.listNotes(req.params.entityType, req.params.entityId) }));
export const createNote = audited(async (req) => ({ item: await crm.createNote(req.params.entityType, req.params.entityId, req.body, req.auth.userId) }), "crm.note.create", (item) => item.relatedEntityType, (_item, req) => `Added internal note to ${req.params.entityType}`, 201);
export const updateNote = audited(async (req) => ({ item: await crm.updateNote(req.params.id, req.body, req.auth.userId) }), "crm.note.update", (item) => item.relatedEntityType, "Updated internal CRM note");
export const removeNote = audited(async (req) => ({ item: await crm.removeNote(req.params.id) }), "crm.note.delete", (item) => item.relatedEntityType, "Deleted internal CRM note");

export const communications = send(async (req) => ({ items: await crm.listCommunications(req.params.entityType, req.params.entityId, req.query) }));
export const createCommunication = audited((req) => crm.createCommunication(req.params.entityType, req.params.entityId, req.body, req.auth.userId), "crm.communication.create", (item) => item.relatedEntityType, (_item, req) => `Logged ${req.body.communicationType} communication`, 201);
