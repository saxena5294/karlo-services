import mongoose from "mongoose";
const testimonialSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 120 }, customerRole: { type: String, trim: true, maxlength: 120, default: "" }, message: { type: String, required: true, trim: true, maxlength: 1500 }, rating: { type: Number, required: true, min: 1, max: 5 }, image: { url: { type: String, trim: true, default: "" }, publicId: { type: String, trim: true, default: "" } }, serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null }, order: { type: Number, min: 0, default: 0 }, isActive: { type: Boolean, default: true }, status: { type: String, enum: ["draft", "published"], default: "draft" }, createdBy: { type: String, required: true }, updatedBy: { type: String, required: true }, deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "testimonials" });
testimonialSchema.index({ status: 1, isActive: 1, deletedAt: 1, order: 1 }); testimonialSchema.index({ serviceId: 1 });
export const Testimonial = mongoose.model("Testimonial", testimonialSchema);
