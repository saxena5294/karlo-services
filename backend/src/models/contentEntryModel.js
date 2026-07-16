import mongoose from "mongoose";

export const CONTENT_SECTIONS = Object.freeze([
  "homepage_hero", "homepage_banners", "featured_services", "testimonials", "faqs",
  "contact", "footer", "terms", "privacy",
]);

const contentEntrySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true },
  section: { type: String, required: true, enum: CONTENT_SECTIONS, index: true },
  title: { type: String, trim: true, maxlength: 200, default: "" },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  updatedBy: { type: String, required: true, trim: true },
}, { timestamps: true, collection: "contententries" });

contentEntrySchema.index({ section: 1, order: 1 });
export const ContentEntry = mongoose.model("ContentEntry", contentEntrySchema);
