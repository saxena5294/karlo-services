import API from "./axiosInstance";

export const getPopularServices = async () => {
  const response = await API.get("/services", {
    params: {
      popular: true,
    },
  });

  return response.data;
};

export const getAllServices = async (params = {}) => {
  const response = await API.get("/services", {
    params,
  });

  return response.data;
};

export const getServiceBySlug = async (slug) => {
  const response = await API.get(`/services/${slug}`);

  return response.data;
};

export const getServiceForm = async (slug) => {
  const response = await API.get(`/services/${slug}/form`);
  return response.data;
};

export const submitServiceApplication = async (slug, formData) => {
  const response = await API.post(`/applications/${slug}`, formData, {
    timeout: 120000,
  });
  return response.data;
};

export const trackApplication = async (applicationNumber) => {
  const response = await API.get(
    `/applications/track/${encodeURIComponent(applicationNumber)}`
  );
  return response.data;
};
