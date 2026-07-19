import { createEntityController } from "./entityControllerFactory.js";
const controller = createEntityController("testimonial");
export const listTestimonials = controller.list, getTestimonial = controller.get, createTestimonial = controller.create, updateTestimonial = controller.update, updateTestimonialStatus = controller.status, updateTestimonialOrder = controller.order, deleteTestimonial = controller.remove;
