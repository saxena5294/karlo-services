import API from "./axiosInstance";

const data = (request) => request.then((response) => response.data.data);
const path = (value) => encodeURIComponent(value);

export const getCrmOverview = () => data(API.get("/admin/crm/overview"));
export const getCrmDirectory = (type, params = {}) => data(API.get(`/admin/crm/${path(type)}`, { params }));
export const getCrmEntity = (type, id) => data(API.get(`/admin/crm/${path(type)}/${path(id)}`));
export const getCrmLeads = (params = {}) => data(API.get("/admin/crm/leads", { params }));
export const createCrmLead = (payload) => data(API.post("/admin/crm/leads", payload));
export const getCrmLead = (id) => data(API.get(`/admin/crm/leads/${path(id)}`));
export const updateCrmLead = (id, payload) => data(API.patch(`/admin/crm/leads/${path(id)}`, payload));
export const convertCrmLead = (id, payload) => data(API.post(`/admin/crm/leads/${path(id)}/convert`, payload));
export const getCrmTickets = (params = {}) => data(API.get("/admin/crm/tickets", { params }));
export const createCrmTicket = (payload) => data(API.post("/admin/crm/tickets", payload));
export const getCrmTicket = (id) => data(API.get(`/admin/crm/tickets/${path(id)}`));
export const updateCrmTicket = (id, payload) => data(API.patch(`/admin/crm/tickets/${path(id)}`, payload));
export const replyCrmTicket = (id, message) => API.post(`/admin/dashboard-modules/tickets/${path(id)}/replies`, { message }).then((response) => response.data.ticket);
export const getCrmFollowUps = (params = {}) => data(API.get("/admin/crm/follow-ups", { params }));
export const createCrmFollowUp = (payload) => data(API.post("/admin/crm/follow-ups", payload));
export const updateCrmFollowUp = (id, payload) => data(API.patch(`/admin/crm/follow-ups/${path(id)}`, payload));
export const cancelCrmFollowUp = (id) => data(API.delete(`/admin/crm/follow-ups/${path(id)}`));
export const getCrmNotes = (type, id) => data(API.get(`/admin/crm/${path(type)}/${path(id)}/notes`));
export const createCrmNote = (type, id, payload) => data(API.post(`/admin/crm/${path(type)}/${path(id)}/notes`, payload));
export const updateCrmNote = (id, payload) => data(API.patch(`/admin/crm/notes/${path(id)}`, payload));
export const deleteCrmNote = (id) => data(API.delete(`/admin/crm/notes/${path(id)}`));
export const getCrmCommunications = (type, id, params = {}) => data(API.get(`/admin/crm/${path(type)}/${path(id)}/communications`, { params }));
export const createCrmCommunication = (type, id, payload) => data(API.post(`/admin/crm/${path(type)}/${path(id)}/communications`, payload));
