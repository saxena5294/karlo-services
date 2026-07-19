import API from "./axiosInstance";
const data = (request) => request.then((response) => response.data);
const id = (value) => encodeURIComponent(value);
export const getHomepageAdminContent = () => data(API.get("/admin/cms/homepage"));
export const updateHomepageHero = (payload) => data(API.patch("/admin/cms/homepage/hero", payload));
export const updateFeaturedServices = (featuredServiceIds) => data(API.patch("/admin/cms/homepage/featured-services", { featuredServiceIds }));
export const updateHomepageSections = (payload) => data(API.patch("/admin/cms/homepage/sections", payload));
export const publishHomepage = () => data(API.post("/admin/cms/homepage/publish", {}));
export const getSiteSettings = () => data(API.get("/admin/cms/site-settings"));
export const updateSiteSettings = (payload) => data(API.patch("/admin/cms/site-settings", payload));
export const updateSiteLogo = (formData) => data(API.patch("/admin/cms/site-settings/logo", formData));
export const updateSiteSeoImage = (formData) => data(API.patch("/admin/cms/site-settings/seo-image", formData));
const collection = (name) => ({
  list: (params = {}) => data(API.get(`/admin/cms/${name}`, { params })),
  get: (value) => data(API.get(`/admin/cms/${name}/${id(value)}`)),
  create: (payload) => data(API.post(`/admin/cms/${name}`, payload)),
  update: (value, payload) => data(API.patch(`/admin/cms/${name}/${id(value)}`, payload)),
  remove: (value) => data(API.delete(`/admin/cms/${name}/${id(value)}`)),
  status: (value, payload) => data(API.patch(`/admin/cms/${name}/${id(value)}/status`, payload)),
  order: (value, order) => data(API.patch(`/admin/cms/${name}/${id(value)}/order`, { order })),
});
export const bannerApi = collection("banners"), faqApi = collection("faqs"), testimonialApi = collection("testimonials");
export const getBanners = bannerApi.list, createBanner = bannerApi.create, updateBanner = bannerApi.update, deleteBanner = bannerApi.remove, updateBannerStatus = bannerApi.status, reorderBanner = bannerApi.order;
export const getFaqs = faqApi.list, createFaq = faqApi.create, updateFaq = faqApi.update, deleteFaq = faqApi.remove, updateFaqStatus = faqApi.status, reorderFaq = faqApi.order;
export const getTestimonials = testimonialApi.list, createTestimonial = testimonialApi.create, updateTestimonial = testimonialApi.update, deleteTestimonial = testimonialApi.remove, updateTestimonialStatus = testimonialApi.status, reorderTestimonial = testimonialApi.order;
