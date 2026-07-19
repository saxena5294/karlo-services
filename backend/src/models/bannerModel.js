import mongoose from "mongoose";
const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 }, description: { type: String, trim: true, maxlength: 600, default: "" }, image: { url: { type: String, trim: true, default: "" }, publicId: { type: String, trim: true, default: "" } }, buttonText: { type: String, trim: true, maxlength: 80, default: "" }, buttonLink: { type: String, trim: true, maxlength: 500, default: "" },
  position: { type: String, enum: ["homepage", "services", "dashboard"], default: "homepage" }, order: { type: Number, min: 0, default: 0 }, isActive: { type: Boolean, default: true }, status: { type: String, enum: ["draft", "published"], default: "draft" }, startAt: { type: Date, default: null }, endAt: { type: Date, default: null }, createdBy: { type: String, required: true }, updatedBy: { type: String, required: true }, deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "banners" });
bannerSchema.index({ position: 1, status: 1, isActive: 1, deletedAt: 1, order: 1 }); bannerSchema.index({ startAt: 1, endAt: 1 });
export const Banner = mongoose.model("Banner", bannerSchema);
