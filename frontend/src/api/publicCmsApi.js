import API from "./axiosInstance";
export const getPublicHomepage = async () => (await API.get("/public/homepage")).data;
export const getDashboardContent = async () => (await API.get("/public/dashboard")).data;
export const getPublicFaqs = async (params = {}) => (await API.get("/public/faqs", { params })).data;
export const getPublicCategories = async () => (await API.get("/public/categories")).data;
export const getPublicNotices = async () => (await API.get("/public/notices")).data;
export const getPublicBlogs = async (params = {}) => (await API.get("/public/blogs", { params })).data;
export const getPublicBlog = async (slug) => (await API.get(`/public/blogs/${encodeURIComponent(slug)}`)).data;
export const getPublicSeo = async (pageKey) => (await API.get(`/public/seo/${encodeURIComponent(pageKey)}`)).data;
