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

export const getServiceBySlug = async (slug, type = "") => {
  const response = await API.get(`/services/${slug}`, { params: type ? { type } : {} });

  return response.data;
};

export const getServiceForm = async (slug, type = "") => {
  const response = await API.get(`/services/${slug}/form`, { params: type ? { type } : {} });
  return response.data;
};

export const submitServiceApplication = async (slug, formData, idempotencyKey) => {
  const response = await API.post(`/applications/${slug}`, formData, {
    timeout: 120000,
    headers: { "idempotency-key": idempotencyKey },
  });
  return response.data;
};

export const sendMobileOtp = async (mobileNumber) => (await API.post("/mobile-verification/send", { mobileNumber })).data;
export const verifyMobileOtp = async (mobileNumber, otp) => (await API.post("/mobile-verification/verify", { mobileNumber, otp })).data;

export const trackApplication = async (applicationNumber) => {
  const response = await API.get(
    `/applications/track/${encodeURIComponent(applicationNumber)}`
  );
  return response.data;
};
