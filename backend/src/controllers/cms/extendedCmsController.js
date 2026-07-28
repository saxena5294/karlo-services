import { NOTICE_TYPES } from "../../models/noticeModel.js";
import { SEO_PAGE_KEYS } from "../../models/pageSeoModel.js";
import {
  createExtended,
  getExtended,
  getPublicBlog,
  getPublicCategories,
  getPublicNotices,
  getPublicSeo,
  listExtended,
  listPublicBlogs,
  removeExtended,
  replaceExtendedImage,
  slugifyCms,
  updateExtended,
} from "../../services/cmsExtendedService.js";
import {
  assertAllowedFields,
  cleanBoolean,
  cleanDate,
  cleanEnum,
  cleanLink,
  cleanNumber,
  cleanText,
} from "../../services/cmsValidation.js";
import { writeAuditLog } from "../../services/auditService.js";
import { ApiError } from "../../utils/ApiError.js";

const fields = {
  category: ["name", "slug", "description", "icon", "displayOrder", "isActive", "seoTitle", "seoDescription"],
  notice: ["title", "message", "type", "linkText", "linkUrl", "priority", "isPinned", "startsAt", "endsAt", "isActive"],
  blog: ["title", "slug", "excerpt", "content", "category", "tags", "author", "status", "publishedAt", "scheduledAt", "seoTitle", "seoDescription", "seoKeywords", "isFeatured"],
  seo: ["pageKey", "title", "description", "keywords", "canonicalUrl", "ogTitle", "ogDescription", "noIndex", "noFollow", "isActive"],
};
const required = {
  category: ["name"],
  notice: ["title", "message"],
  blog: ["title", "excerpt", "content", "author"],
  seo: ["pageKey", "title", "description"],
};
const parseArray = (value, name, maximum = 30) => {
  let items = value;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = items.split(","); }
  }
  if (!Array.isArray(items) || items.length > maximum) throw new ApiError(400, `${name} must be an array of at most ${maximum} values`);
  return [...new Set(items.map((item) => cleanText(item, name, { max: 60 }).toLowerCase()).filter(Boolean))];
};

const sanitize = (type, body, creating = false) => {
  assertAllowedFields(body, fields[type]);
  const output = {};
  for (const key of required[type]) {
    if (creating || body[key] !== undefined) {
      const limits = { name: 120, title: 220, message: 1500, excerpt: 700, content: 50000, author: 120, pageKey: 40, description: type === "seo" ? 500 : 1000 };
      output[key] = cleanText(body[key], key, { required: true, max: limits[key] || 500 });
    }
  }
  const optionalText = {
    category: { slug: 160, description: 1000, icon: 120, seoTitle: 180, seoDescription: 500 },
    notice: { linkText: 80, linkUrl: 500 },
    blog: { slug: 240, category: 120, seoTitle: 180, seoDescription: 500 },
    seo: { canonicalUrl: 500, ogTitle: 180, ogDescription: 500 },
  }[type];
  for (const [key, max] of Object.entries(optionalText)) {
    if (body[key] !== undefined) output[key] = cleanText(body[key], key, { max });
  }
  if (["category", "blog"].includes(type) && (creating || body.slug !== undefined || body.title !== undefined || body.name !== undefined)) {
    output.slug = slugifyCms(body.slug || body.title || body.name);
    if (!output.slug) throw new ApiError(400, "A valid slug is required");
  }
  if (type === "category") {
    if (body.displayOrder !== undefined) output.displayOrder = cleanNumber(body.displayOrder, "displayOrder", 0, 100000);
    if (body.isActive !== undefined) output.isActive = cleanBoolean(body.isActive, "isActive");
  }
  if (type === "notice") {
    if (body.type !== undefined) output.type = cleanEnum(body.type, "type", NOTICE_TYPES);
    if (body.linkUrl !== undefined) output.linkUrl = cleanLink(body.linkUrl, "linkUrl");
    if (body.priority !== undefined) output.priority = cleanNumber(body.priority, "priority", 0, 100000);
    for (const key of ["isPinned", "isActive"]) if (body[key] !== undefined) output[key] = cleanBoolean(body[key], key);
    for (const key of ["startsAt", "endsAt"]) if (body[key] !== undefined) output[key] = cleanDate(body[key], key);
  }
  if (type === "blog") {
    if (body.status !== undefined) output.status = cleanEnum(body.status, "status", ["draft", "published"]);
    for (const key of ["publishedAt", "scheduledAt"]) if (body[key] !== undefined) output[key] = cleanDate(body[key], key);
    if (body.tags !== undefined) output.tags = parseArray(body.tags, "tags");
    if (body.seoKeywords !== undefined) output.seoKeywords = parseArray(body.seoKeywords, "seoKeywords");
    if (body.isFeatured !== undefined) output.isFeatured = cleanBoolean(body.isFeatured, "isFeatured");
    if (output.status === "published" && !output.publishedAt) output.publishedAt = output.scheduledAt || new Date();
  }
  if (type === "seo") {
    if (body.pageKey !== undefined) output.pageKey = cleanEnum(body.pageKey, "pageKey", SEO_PAGE_KEYS);
    if (body.keywords !== undefined) output.keywords = parseArray(body.keywords, "keywords");
    if (body.canonicalUrl !== undefined) output.canonicalUrl = cleanLink(body.canonicalUrl, "canonicalUrl");
    for (const key of ["noIndex", "noFollow", "isActive"]) if (body[key] !== undefined) output[key] = cleanBoolean(body[key], key);
  }
  return output;
};

const send = (handler, status = 200) => async (req, res, next) => {
  try {
    const data = await handler(req);
    return res.status(status).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const collectionController = (type) => ({
  list: send((req) => listExtended(type, req.query)),
  get: send(async (req) => ({ item: await getExtended(type, req.params.id) })),
  create: send(async (req) => {
    const payload = sanitize(type, req.body, true);
    const item = req.file
      ? await replaceExtendedImage(type, null, req.file, payload, req.auth.userId)
      : await createExtended(type, payload, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.create`, entityType: type, entityId: item._id, summary: `Created ${type}`, after: item });
    return { item };
  }, 201),
  update: send(async (req) => {
    const current = await getExtended(type, req.params.id);
    const payload = sanitize(type, req.body);
    if (type === "notice") {
      const start = payload.startsAt !== undefined ? payload.startsAt : current.startsAt;
      const end = payload.endsAt !== undefined ? payload.endsAt : current.endsAt;
      if (start && end && end <= start) throw new ApiError(400, "endsAt must be later than startsAt");
    }
    const item = req.file
      ? await replaceExtendedImage(type, req.params.id, req.file, payload, req.auth.userId)
      : await updateExtended(type, req.params.id, payload, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.update`, entityType: type, entityId: item._id, summary: `Updated ${type}`, after: item });
    return { item };
  }),
  remove: send(async (req) => {
    const item = await removeExtended(type, req.params.id, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.delete`, entityType: type, entityId: item._id, summary: `Removed ${type}` });
    return { item };
  }),
});

export const publicCategories = send(async () => ({ items: await getPublicCategories() }));
export const publicNotices = send(async () => ({ items: await getPublicNotices() }));
export const publicBlogs = send((req) => listPublicBlogs(req.query));
export const publicBlog = send(async (req) => ({ item: await getPublicBlog(req.params.slug) }));
export const publicSeo = send(async (req) => ({ item: await getPublicSeo(req.params.pageKey) }));
