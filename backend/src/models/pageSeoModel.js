import mongoose from "mongoose";

export const SEO_PAGE_KEYS = ["homepage", "services", "contact", "faq", "blogs"];

const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true, default: "" },
  publicId: { type: String, trim: true, default: "" },
}, { _id: false });

const pageSeoSchema = new mongoose.Schema({
  pageKey: { type: String, required: true, unique: true, enum: SEO_PAGE_KEYS },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  keywords: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: [] },
  canonicalUrl: { type: String, trim: true, maxlength: 500, default: "" },
  ogTitle: { type: String, trim: true, maxlength: 180, default: "" },
  ogDescription: { type: String, trim: true, maxlength: 500, default: "" },
  ogImage: { type: imageSchema, default: () => ({}) },
  noIndex: { type: Boolean, default: false },
  noFollow: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: String, required: true, trim: true },
}, { timestamps: true, collection: "pageseo" });

pageSeoSchema.index({ isActive: 1, pageKey: 1 });

export const PageSeo = mongoose.model("PageSeo", pageSeoSchema);
