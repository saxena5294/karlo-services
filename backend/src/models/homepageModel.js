import mongoose from "mongoose";

export const HOMEPAGE_SECTIONS = ["hero", "banners", "featuredServices", "howItWorks", "testimonials", "faqs"];
const buttonSchema = new mongoose.Schema({ text: { type: String, trim: true, maxlength: 80, default: "" }, link: { type: String, trim: true, maxlength: 500, default: "" } }, { _id: false });
const imageSchema = new mongoose.Schema({ url: { type: String, trim: true, default: "" }, publicId: { type: String, trim: true, default: "" } }, { _id: false });
const homepageSchema = new mongoose.Schema({
  key: { type: String, unique: true, immutable: true, default: "homepage" },
  hero: { eyebrow: { type: String, trim: true, maxlength: 120, default: "" }, heading: { type: String, trim: true, maxlength: 180, default: "" }, highlightedText: { type: String, trim: true, maxlength: 120, default: "" }, subheading: { type: String, trim: true, maxlength: 500, default: "" }, primaryButton: { type: buttonSchema, default: () => ({}) }, secondaryButton: { type: buttonSchema, default: () => ({}) }, image: { type: imageSchema, default: () => ({}) }, trustText: { type: String, trim: true, maxlength: 240, default: "" }, stats: { type: [{ label: { type: String, trim: true, maxlength: 80 }, value: { type: String, trim: true, maxlength: 40 } }], default: [] }, isActive: { type: Boolean, default: true } },
  featuredServiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  popularServicesLimit: { type: Number, min: 1, max: 24, default: 6 },
  sectionVisibility: { hero: { type: Boolean, default: true }, banners: { type: Boolean, default: true }, featuredServices: { type: Boolean, default: true }, howItWorks: { type: Boolean, default: true }, testimonials: { type: Boolean, default: true }, faqs: { type: Boolean, default: true } },
  sectionOrder: { type: [String], enum: HOMEPAGE_SECTIONS, default: () => [...HOMEPAGE_SECTIONS] },
  status: { type: String, enum: ["draft", "published"], default: "draft", index: true }, publishedAt: { type: Date, default: null },
  publishedSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, collection: "homepages" });
export const Homepage = mongoose.model("Homepage", homepageSchema);
