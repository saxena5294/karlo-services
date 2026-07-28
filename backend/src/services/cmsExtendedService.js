import { BlogPost } from "../models/blogPostModel.js";
import { Category } from "../models/categoryModel.js";
import { Notice } from "../models/noticeModel.js";
import { PageSeo } from "../models/pageSeoModel.js";
import { Service } from "../models/serviceModel.js";
import { ApiError } from "../utils/ApiError.js";
import { assertObjectId } from "./cmsValidation.js";
import { hasAllowedFileSignature, removeUploadedFiles, uploadBuffer } from "./applicationService.js";

const configs = {
  category: { Model: Category, imageField: "image", order: { displayOrder: 1, name: 1 }, search: ["name", "slug", "description"] },
  notice: { Model: Notice, order: { isPinned: -1, priority: -1, createdAt: -1 }, search: ["title", "message"] },
  blog: { Model: BlogPost, imageField: "coverImage", order: { createdAt: -1 }, search: ["title", "excerpt", "content", "category", "tags"] },
  seo: { Model: PageSeo, imageField: "ogImage", order: { pageKey: 1 }, search: ["pageKey", "title", "description"] },
};

const configFor = (type) => {
  const config = configs[type];
  if (!config) throw new ApiError(500, "Unknown CMS collection");
  return config;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const persistenceError = (error) => {
  if (error?.code === 11000) {
    const key = Object.keys(error.keyPattern || error.keyValue || {})[0] || "value";
    throw new ApiError(409, `A record with this ${key} already exists`);
  }
  if (error?.name === "ValidationError") {
    const details = Object.values(error.errors || {}).map(({ message }) => message);
    throw new ApiError(400, details[0] || "CMS record is invalid", details);
  }
  throw error;
};

export const slugifyCms = (value) => String(value || "").trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const listExtended = async (type, query = {}) => {
  const { Model, order, search } = configFor(type);
  const filter = type === "seo" ? {} : { deletedAt: null };
  if (query.search?.trim()) {
    const matcher = new RegExp(escapeRegex(query.search.trim().slice(0, 120)), "i");
    filter.$or = search.map((field) => ({ [field]: matcher }));
  }
  if (query.isActive !== undefined && query.isActive !== "") {
    if (!["true", "false"].includes(String(query.isActive))) throw new ApiError(400, "isActive must be true or false");
    filter.isActive = String(query.isActive) === "true";
  }
  if (type === "blog" && query.status) filter.status = query.status;
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const [items, total] = await Promise.all([
    Model.find(filter).sort(order).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  if (type === "category") {
    const counts = await Service.aggregate([{ $match: { category: { $in: items.map(({ name }) => name) }, isActive: true } }, { $group: { _id: "$category", count: { $sum: 1 } } }]);
    const byName = new Map(counts.map(({ _id, count }) => [_id, count]));
    items.forEach((item) => { item.serviceCount = byName.get(item.name) || 0; });
  }
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getExtended = async (type, id) => {
  assertObjectId(id);
  const { Model } = configFor(type);
  const item = await Model.findOne(type === "seo" ? { _id: id } : { _id: id, deletedAt: null });
  if (!item) throw new ApiError(404, `${type} not found`);
  return item;
};

export const createExtended = async (type, payload, userId) => {
  try {
    return await configFor(type).Model.create({
      ...payload,
      ...(type === "seo" ? {} : { createdBy: userId }),
      updatedBy: userId,
    });
  } catch (error) {
    return persistenceError(error);
  }
};

export const updateExtended = async (type, id, payload, userId) => {
  const item = await getExtended(type, id);
  Object.assign(item, payload, { updatedBy: userId });
  try {
    await item.save();
    return item;
  } catch (error) {
    return persistenceError(error);
  }
};

export const replaceExtendedImage = async (type, id, file, payload, userId) => {
  const config = configFor(type);
  if (!config.imageField) throw new ApiError(400, "This CMS record does not support images");
  const current = id ? await getExtended(type, id) : null;
  if (!file) throw new ApiError(400, "Image file is required");
  if (!hasAllowedFileSignature(file)) throw new ApiError(400, "Image content is not a valid JPG, PNG, or WEBP file");
  let uploaded;
  uploaded = await uploadBuffer(file, "cms", type === "blog" ? "blogs" : `${type}s`, { deliveryType: "upload" });
  let item;
  try {
    const image = { url: uploaded.secure_url, publicId: uploaded.public_id };
    item = current
      ? await updateExtended(type, id, { ...payload, [config.imageField]: image }, userId)
      : await createExtended(type, { ...payload, [config.imageField]: image }, userId);
  } catch (error) {
    if (uploaded?.public_id) await removeUploadedFiles([{ publicId: uploaded.public_id, resourceType: "image" }]);
    throw error;
  }
  if (current?.[config.imageField]?.publicId) {
    try {
      await removeUploadedFiles([{ publicId: current[config.imageField].publicId, resourceType: "image" }]);
    } catch (error) {
      console.error("CMS old image cleanup failed", { publicId: current[config.imageField].publicId, reason: error?.message || "Unknown error" });
    }
  }
  return item;
};

export const removeExtended = async (type, id, userId) => {
  const item = await getExtended(type, id);
  if (type === "category" && await Service.exists({ category: item.name, isActive: true })) {
    throw new ApiError(409, "Deactivate or reassign active services before deleting this category");
  }
  if (type === "seo") {
    item.isActive = false;
  } else {
    item.deletedAt = new Date();
    item.isActive = false;
    if (type === "blog") item.status = "draft";
  }
  item.updatedBy = userId;
  await item.save();
  return item;
};

export const activeNoticeFilter = (now = new Date()) => ({
  isActive: true,
  deletedAt: null,
  $and: [
    { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
  ],
});

export const getPublicCategories = async () => {
  const categories = await Category.find({ isActive: true, deletedAt: null })
    .select("name slug description icon image.url displayOrder seoTitle seoDescription")
    .sort({ displayOrder: 1, name: 1 }).lean();
  const counts = await Service.aggregate([{ $match: { isActive: true, category: { $in: categories.map(({ name }) => name) } } }, { $group: { _id: "$category", count: { $sum: 1 } } }]);
  const byName = new Map(counts.map(({ _id, count }) => [_id, count]));
  return categories.map((category) => ({ ...category, serviceCount: byName.get(category.name) || 0 }));
};
export const getPublicNotices = () => Notice.find(activeNoticeFilter())
  .select("title message type linkText linkUrl priority isPinned startsAt endsAt")
  .sort({ isPinned: -1, priority: -1, createdAt: -1 }).lean();

const publishedBlogFilter = (now = new Date()) => ({
  status: "published",
  deletedAt: null,
  publishedAt: { $lte: now },
});
export const listPublicBlogs = async (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 50);
  const filter = publishedBlogFilter();
  if (query.category) filter.category = String(query.category).trim();
  if (query.tag) filter.tags = String(query.tag).trim().toLowerCase();
  if (query.featured === "true") filter.isFeatured = true;
  if (query.search?.trim()) {
    const matcher = new RegExp(escapeRegex(query.search.trim().slice(0, 120)), "i");
    filter.$or = ["title", "excerpt", "category", "tags"].map((field) => ({ [field]: matcher }));
  }
  const [items, total] = await Promise.all([
    BlogPost.find(filter).select("title slug excerpt coverImage.url category tags author publishedAt seoTitle seoDescription isFeatured").sort({ isFeatured: -1, publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    BlogPost.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
export const getPublicBlog = async (slug) => {
  const item = await BlogPost.findOne({ ...publishedBlogFilter(), slug })
    .select("title slug excerpt content coverImage.url category tags author publishedAt seoTitle seoDescription seoKeywords isFeatured").lean();
  if (!item) throw new ApiError(404, "Blog post not found");
  return item;
};
export const getPublicSeo = async (pageKey) => PageSeo.findOne({ pageKey, isActive: true })
  .select("pageKey title description keywords canonicalUrl ogTitle ogDescription ogImage.url noIndex noFollow").lean();
