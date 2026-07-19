import mongoose from "mongoose";
const imageSchema = new mongoose.Schema({ url: { type: String, trim: true, default: "" }, publicId: { type: String, trim: true, default: "" }, altText: { type: String, trim: true, maxlength: 160, default: "" } }, { _id: false });
const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, immutable: true, default: "main-settings" }, siteName: { type: String, trim: true, maxlength: 120, default: "Karlo Services" }, logo: { type: imageSchema, default: () => ({}) },
  contact: { phone: { type: String, trim: true, default: "" }, alternatePhone: { type: String, trim: true, default: "" }, email: { type: String, trim: true, lowercase: true, default: "" }, supportEmail: { type: String, trim: true, lowercase: true, default: "" }, whatsapp: { type: String, trim: true, default: "" }, address: { type: String, trim: true, maxlength: 500, default: "" }, city: { type: String, trim: true, default: "" }, state: { type: String, trim: true, default: "" }, pincode: { type: String, trim: true, default: "" }, workingHours: { type: String, trim: true, maxlength: 160, default: "" } },
  socialLinks: { facebook: { type: String, default: "" }, instagram: { type: String, default: "" }, youtube: { type: String, default: "" }, linkedin: { type: String, default: "" }, twitter: { type: String, default: "" } },
  footer: { shortDescription: { type: String, trim: true, maxlength: 500, default: "" }, copyrightText: { type: String, trim: true, maxlength: 200, default: "" }, supportText: { type: String, trim: true, maxlength: 300, default: "" } },
  legal: { serviceDisclaimer: { type: String, trim: true, maxlength: 1200, default: "" }, refundDisclaimer: { type: String, trim: true, maxlength: 1200, default: "" } },
  seo: { defaultTitle: { type: String, trim: true, maxlength: 180, default: "" }, defaultDescription: { type: String, trim: true, maxlength: 500, default: "" }, defaultKeywords: { type: [String], default: [] }, defaultImage: { type: imageSchema, default: () => ({}) } },
}, { timestamps: true, collection: "sitesettings" });
export const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
