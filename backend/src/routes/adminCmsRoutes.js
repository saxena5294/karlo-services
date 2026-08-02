import express from "express";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";
import { uploadCmsImage } from "../middlewares/uploadMiddleware.js";
import * as homepage from "../controllers/cms/homepageController.js";
import * as settings from "../controllers/cms/siteSettingsController.js";
import * as banners from "../controllers/cms/bannerController.js";
import * as faqs from "../controllers/cms/faqController.js";
import * as testimonials from "../controllers/cms/testimonialController.js";
import { collectionController } from "../controllers/cms/extendedCmsController.js";
const router = express.Router(); router.use(requireAuth, requireRole(ROLES.ADMIN));
router.get("/homepage", homepage.getHomepage); router.patch("/homepage/hero", uploadCmsImage, homepage.updateHero); router.patch("/homepage/featured-services", homepage.updateFeaturedServices); router.patch("/homepage/sections", homepage.updateSections); router.post("/homepage/publish", homepage.publishHomepage);
router.get("/site-settings", settings.getSiteSettings); router.patch("/site-settings", settings.updateSiteSettings); router.patch("/site-settings/logo", uploadCmsImage, settings.updateLogo); router.patch("/site-settings/seo-image", uploadCmsImage, settings.updateSeoImage);
const resource = (path, controller, withImage = false) => { router.get(path, controller.list); router.post(path, ...(withImage ? [uploadCmsImage] : []), controller.create); router.patch(`${path}/:id/status`, controller.status); router.patch(`${path}/:id/order`, controller.order); router.get(`${path}/:id`, controller.get); router.patch(`${path}/:id`, ...(withImage ? [uploadCmsImage] : []), controller.update); router.delete(`${path}/:id`, controller.remove); };
resource("/banners", { list: banners.listBanners, create: banners.createBanner, get: banners.getBanner, update: banners.updateBanner, status: banners.updateBannerStatus, order: banners.updateBannerOrder, remove: banners.deleteBanner }, true);
resource("/faqs", { list: faqs.listFaqs, create: faqs.createFaq, get: faqs.getFaq, update: faqs.updateFaq, status: faqs.updateFaqStatus, order: faqs.updateFaqOrder, remove: faqs.deleteFaq });
resource("/testimonials", { list: testimonials.listTestimonials, create: testimonials.createTestimonial, get: testimonials.getTestimonial, update: testimonials.updateTestimonial, status: testimonials.updateTestimonialStatus, order: testimonials.updateTestimonialOrder, remove: testimonials.deleteTestimonial }, true);
for (const [path, type, withImage] of [["/categories", "category", true], ["/notices", "notice", false], ["/blogs", "blog", true], ["/seo", "seo", true]]) {
  const controller = collectionController(type);
  router.get(path, controller.list);
  router.post(path, ...(withImage ? [uploadCmsImage] : []), controller.create);
  router.get(`${path}/:id`, controller.get);
  router.patch(`${path}/:id`, ...(withImage ? [uploadCmsImage] : []), controller.update);
  router.delete(`${path}/:id`, controller.remove);
}
export default router;
