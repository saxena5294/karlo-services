import { createEntityController } from "./entityControllerFactory.js";
const controller = createEntityController("faq");
export const listFaqs = controller.list, getFaq = controller.get, createFaq = controller.create, updateFaq = controller.update, updateFaqStatus = controller.status, updateFaqOrder = controller.order, deleteFaq = controller.remove;
