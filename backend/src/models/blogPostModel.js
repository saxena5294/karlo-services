import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  url: { type: String, trim: true, default: "" },
  publicId: { type: String, trim: true, default: "" },
}, { _id: false });

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 220 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  excerpt: { type: String, required: true, trim: true, maxlength: 700 },
  content: { type: String, required: true, trim: true, maxlength: 50000 },
  coverImage: { type: imageSchema, default: () => ({}) },
  category: { type: String, trim: true, maxlength: 120, default: "General" },
  tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: [] },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  publishedAt: { type: Date, default: null },
  scheduledAt: { type: Date, default: null },
  seoTitle: { type: String, trim: true, maxlength: 180, default: "" },
  seoDescription: { type: String, trim: true, maxlength: 500, default: "" },
  seoKeywords: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: [] },
  isFeatured: { type: Boolean, default: false },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "blogposts" });

blogPostSchema.index({ status: 1, deletedAt: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, tags: 1, isFeatured: -1 });
blogPostSchema.index({ title: "text", excerpt: "text", content: "text", tags: "text" });

export const BlogPost = mongoose.model("BlogPost", blogPostSchema);
