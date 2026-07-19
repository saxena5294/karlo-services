import API from "./axiosInstance";
export const getPublicHomepage = async () => (await API.get("/public/homepage")).data;
export const getDashboardContent = async () => (await API.get("/public/dashboard")).data;
export const getPublicFaqs = async (params = {}) => (await API.get("/public/faqs", { params })).data;
