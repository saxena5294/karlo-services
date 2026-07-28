import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true, default: "" },
  publicId: { type: String, trim: true, default: "" },
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  icon: { type: String, trim: true, maxlength: 120, default: "Folder" },
  image: { type: imageSchema, default: () => ({}) },
  displayOrder: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
  seoTitle: { type: String, trim: true, maxlength: 180, default: "" },
  seoDescription: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "categories" });

categorySchema.index({ isActive: 1, deletedAt: 1, displayOrder: 1 });
categorySchema.index({ name: "text", description: "text", slug: "text" });

export const Category = mongoose.model("Category", categorySchema);
