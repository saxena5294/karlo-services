import API from "./axiosInstance";

export const getCustomerDashboardSummary = async () => {
  const response = await API.get("/customer/dashboard-summary");
  return response.data;
};

export const getCustomerApplications = async (params = {}) => {
  const response = await API.get("/customer/applications", { params });
  return response.data;
};

export const getCustomerApplicationById = async (id) => {
  const response = await API.get(`/customer/applications/${encodeURIComponent(id)}`);
  return response.data;
};
