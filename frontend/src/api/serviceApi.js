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