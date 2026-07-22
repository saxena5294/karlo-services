import API from "./axiosInstance";

export const getExpertDashboardSummary = async () => {
  const response = await API.get("/expert/dashboard-summary");
  return response.data;
};
export const getExpertProfile = async () => (await API.get("/expert/profile")).data;
export const uploadExpertCompletionDocuments = async (id, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("completionDocuments", file));
  return (await API.post(`/expert/applications/${encodeURIComponent(id)}/completion-documents`, formData)).data;
};

export const getExpertApplications = async (params = {}) => {
  const response = await API.get("/expert/applications", { params });
  return response.data;
};

export const getExpertApplicationById = async (id) => {
  const response = await API.get(`/expert/applications/${encodeURIComponent(id)}`);
  return response.data;
};

export const updateExpertApplicationStatus = async (id, payload) => {
  const response = await API.patch(
    `/expert/applications/${encodeURIComponent(id)}/status`,
    payload
  );
  return response.data;
};

export const addExpertRemark = async (id, remarks) => {
  const response = await API.post(
    `/expert/applications/${encodeURIComponent(id)}/remarks`,
    { remarks }
  );
  return response.data;
};

export const requestApplicationDocuments = async (id, remarks) => {
  const response = await API.post(
    `/expert/applications/${encodeURIComponent(id)}/request-documents`,
    { remarks }
  );
  return response.data;
};
