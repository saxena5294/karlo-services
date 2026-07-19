import { createEntityController } from "./entityControllerFactory.js";
const controller = createEntityController("banner");
export const listBanners = controller.list, getBanner = controller.get, createBanner = controller.create, updateBanner = controller.update, updateBannerStatus = controller.status, updateBannerOrder = controller.order, deleteBanner = controller.remove;
