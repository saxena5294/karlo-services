import API from "./axiosInstance";

const data = (request) => request.then((response) => response.data);

export const getPartnerDashboardSummary = () => data(API.get("/partner/dashboard-summary"));
export const getAvailableLeads = (params = {}) => data(API.get("/partner/leads", { params }));
export const getLeadDetails = (id) => data(API.get(`/partner/leads/${encodeURIComponent(id)}`));
export const acceptLead = (id) => data(API.post(`/partner/leads/${encodeURIComponent(id)}/accept`));
export const getAcceptedLeads = (params = {}) => data(API.get("/partner/accepted-leads", { params }));
export const getPartnerApplications = (params = {}) => data(API.get("/partner/applications", { params }));
export const getPartnerApplication = (id) => data(API.get(`/partner/applications/${encodeURIComponent(id)}`));
export const updatePartnerApplicationStatus = (id, payload) => data(API.patch(`/partner/applications/${encodeURIComponent(id)}/status`, payload));
export const addPartnerRemark = (id, remarks) => data(API.post(`/partner/applications/${encodeURIComponent(id)}/remarks`, { remarks }));
export const requestPartnerDocuments = (id, remarks) => data(API.post(`/partner/applications/${encodeURIComponent(id)}/request-documents`, { remarks }));
export const uploadCompletionDocuments = (id, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("completionDocuments", file));
  return data(API.post(`/partner/applications/${encodeURIComponent(id)}/completion-documents`, formData));
};
export const getPartnerProfile = () => data(API.get("/partner/profile"));
export const updatePartnerProfile = (payload) => data(API.patch("/partner/profile", payload));
