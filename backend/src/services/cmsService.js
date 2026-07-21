import { Homepage, HOMEPAGE_SECTIONS } from "../models/homepageModel.js";
import { SiteSettings } from "../models/siteSettingsModel.js";
import { Banner } from "../models/bannerModel.js";
import { FAQ } from "../models/faqModel.js";
import { Testimonial } from "../models/testimonialModel.js";
import { normalizeServiceForClient, Service } from "../models/serviceModel.js";
import { ApiError } from "../utils/ApiError.js";
import { hasAllowedFileSignature, removeUploadedFiles, uploadBuffer } from "./applicationService.js";
import { assertObjectId, cleanEnum, cleanText } from "./cmsValidation.js";
import { FAQ_AUDIENCES, FAQ_CATEGORIES } from "../models/faqModel.js";

export const defaultHomepage = { key: "homepage", hero: { heading: "Government and digital services, made simple.", subheading: "Apply for trusted services from one secure platform.", primaryButton: { text: "Explore Services", link: "/services" }, secondaryButton: { text: "Track Application", link: "/track" }, image: { url: "", publicId: "" }, isActive: true }, featuredServiceIds: [], sectionVisibility: Object.fromEntries(HOMEPAGE_SECTIONS.map((key) => [key, true])), sectionOrder: [...HOMEPAGE_SECTIONS], status: "draft", publishedAt: null };
export const defaultSettings = { key: "main-settings", siteName: "Karlo Services", logo: { url: "", publicId: "", altText: "Karlo Services" }, contact: {}, socialLinks: {}, footer: { shortDescription: "Your trusted platform for government, financial and digital services.", copyrightText: "Karlo Services. All rights reserved.", supportText: "" }, legal: { serviceDisclaimer: "Karlo Services assists with preparing and submitting applications based on the information and documents provided by the customer. Final approval, verification, objection, rejection and processing time are determined by the concerned government department, portal or third-party authority.", refundDisclaimer: "Government fees or portal payments may be subject to the refund rules of the concerned authority. Karlo Services service charges may be non-refundable after processing has started, subject to the applicable refund policy." }, seo: { defaultKeywords: [], defaultImage: {} } };
export const getAdminHomepage = async () => { const homepage = await Homepage.findOneAndUpdate({ key: "homepage" }, { $setOnInsert: defaultHomepage }, { new: true, upsert: true, setDefaultsOnInsert: true }); if (homepage.status === "published" && !homepage.publishedSnapshot) { homepage.publishedSnapshot = { hero: homepage.hero.toObject(), featuredServiceIds: homepage.featuredServiceIds.map(String), sectionVisibility: homepage.sectionVisibility.toObject(), sectionOrder: [...homepage.sectionOrder] }; await homepage.save(); } return homepage; };
export const getAdminSettings = () => SiteSettings.findOneAndUpdate({ key: "main-settings" }, { $setOnInsert: defaultSettings }, { new: true, upsert: true, setDefaultsOnInsert: true });

const publicImage = (image) => image?.url ? { url: image.url, ...(image.altText ? { altText: image.altText } : {}) } : {};
export const getPublicHomepage = async () => {
  const now = new Date();
  const homepageRecord = await Homepage.findOne({ key: "homepage", $or: [{ status: "published" }, { publishedSnapshot: { $ne: null } }] }).select("hero featuredServiceIds sectionVisibility sectionOrder status publishedSnapshot").lean();
  const homepage = homepageRecord?.publishedSnapshot || (homepageRecord?.status === "published" ? homepageRecord : null);
  const featuredIds = homepage?.featuredServiceIds || [];
  const [banners, featuredServices, testimonials, faqs, settings] = await Promise.all([
    Banner.find(buildPublicBannerFilter(now)).select("title description image.url buttonText buttonLink position order startAt endAt").sort({ order: 1, createdAt: 1 }).lean(),
    Service.find({ _id: { $in: featuredIds }, isActive: true }).select("title slug description icon price pricing processingTime estimatedProcessingTime category subcategory isPopular availabilityStatus availabilityMessage").lean(),
    Testimonial.find({ status: "published", isActive: true, deletedAt: null }).select("customerName customerRole message rating image.url serviceId order").populate("serviceId", "title slug").sort({ order: 1, createdAt: 1 }).lean(),
    FAQ.find({ status: "published", isActive: true, deletedAt: null, $or: [{ audience: "public" }, { audience: { $exists: false } }] }).select("question answer category displayOrder order isFeatured audience keywords").sort({ isFeatured: -1, displayOrder: 1, order: 1, createdAt: 1 }).limit(8).lean(),
    SiteSettings.findOne({ key: "main-settings" }).select("siteName logo contact socialLinks footer legal seo").lean(),
  ]);
  const byId = new Map(featuredServices.map((item) => [String(item._id), item]));
  const safeSettings = settings ? { ...settings, logo: publicImage(settings.logo), seo: { ...settings.seo, defaultImage: publicImage(settings.seo?.defaultImage) } } : {};
  return { hero: homepage ? { ...homepage.hero, image: publicImage(homepage.hero?.image) } : {}, banners, featuredServices: featuredIds.map((id) => byId.get(String(id))).filter(Boolean).map(normalizeServiceForClient), testimonials, faqs, siteSettings: safeSettings, sectionVisibility: homepage?.sectionVisibility || {}, sectionOrder: homepage?.sectionOrder || [] };
};
export const buildPublicBannerFilter = (now = new Date(), position = "homepage") => ({ position, status: "published", isActive: true, deletedAt: null, $and: [{ $or: [{ startAt: null }, { startAt: { $lte: now } }] }, { $or: [{ endAt: null }, { endAt: { $gt: now } }] }] });

export const getPublicDashboardContent = async () => {
  const now = new Date();
  const [banners, settings] = await Promise.all([
    Banner.find(buildPublicBannerFilter(now, "dashboard")).select("title description image.url buttonText buttonLink position order startAt endAt").sort({ order: 1, createdAt: 1 }).lean(),
    SiteSettings.findOne({ key: "main-settings" }).select("siteName contact").lean(),
  ]);
  return { banners, siteSettings: settings || {} };
};

const faqAudienceFilter = (audience) => audience === "public"
  ? { $or: [{ audience: "public" }, { audience: { $exists: false } }] }
  : { audience: { $in: ["public", audience] } };
const normalizeFaq = (faq) => ({ ...faq, displayOrder: faq.displayOrder ?? faq.order ?? 0, audience: faq.audience?.length ? faq.audience : [...FAQ_AUDIENCES], keywords: faq.keywords || [], isFeatured: Boolean(faq.isFeatured) });

export const getPublicFaqs = async (query = {}) => {
  const audience = query.audience ? cleanEnum(query.audience, "audience", FAQ_AUDIENCES) : "public";
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100);
  const filter = { status: "published", isActive: true, deletedAt: null, ...faqAudienceFilter(audience) };
  if (query.category) filter.category = cleanEnum(query.category, "category", FAQ_CATEGORIES);
  if (query.featured !== undefined) {
    if (!["true", "false"].includes(String(query.featured))) throw new ApiError(400, "featured must be true or false");
    filter.isFeatured = String(query.featured) === "true";
  }
  if (query.search?.trim()) {
    const search = cleanText(query.search, "search", { max: 120 });
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$and = [{ $or: ["question", "answer", "keywords", "category"].map((field) => ({ [field]: { $regex: pattern, $options: "i" } })) }];
  }
  const categoryFilter = { status: "published", isActive: true, deletedAt: null, ...faqAudienceFilter(audience) };
  const [items, total, categories, featured] = await Promise.all([
    FAQ.find(filter).select("question answer category displayOrder order isFeatured audience keywords").sort({ isFeatured: -1, displayOrder: 1, order: 1, createdAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    FAQ.countDocuments(filter),
    FAQ.distinct("category", categoryFilter),
    FAQ.find({ ...categoryFilter, isFeatured: true }).select("question answer category displayOrder order isFeatured audience keywords").sort({ displayOrder: 1, order: 1 }).limit(8).lean(),
  ]);
  return { items: items.map(normalizeFaq), featured: featured.map(normalizeFaq), categories: FAQ_CATEGORIES.filter((category) => categories.includes(category)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const replaceCmsImage = async ({ file, folder, oldImage, update }) => {
  if (!file) throw new ApiError(400, "Image file is required");
  if (!hasAllowedFileSignature(file)) throw new ApiError(400, "Image content is not a valid JPG, PNG, or WEBP file");
  let uploaded;
  try {
    uploaded = await uploadBuffer(file, "cms", folder, { deliveryType: "upload" });
    const image = { url: uploaded.secure_url, publicId: uploaded.public_id };
    const document = await update(image);
    if (!document) throw new ApiError(404, "CMS record not found");
    if (oldImage?.publicId) await removeUploadedFiles([{ publicId: oldImage.publicId, resourceType: "image" }]);
    return document;
  } catch (error) {
    if (uploaded?.public_id) await removeUploadedFiles([{ publicId: uploaded.public_id, resourceType: "image" }]);
    throw error;
  }
};

const entityConfig = {
  banner: { Model: Banner, populate: null },
  faq: { Model: FAQ, populate: null },
  testimonial: { Model: Testimonial, populate: ["serviceId", "title slug"] },
};
const configFor = (type) => { const config = entityConfig[type]; if (!config) throw new ApiError(500, "Unknown CMS entity"); return config; };
export const listEntities = async (type, query = {}) => {
  const { Model, populate } = configFor(type); const filter = { deletedAt: null }; const allowed = new Set(["page", "limit", "status", "isActive", "search", ...(type === "banner" ? ["position"] : []), ...(type === "faq" ? ["category", "audience", "featured"] : [])]); const unexpected = Object.keys(query).filter((key) => !allowed.has(key)); if (unexpected.length) throw new ApiError(400, `Unexpected query parameters: ${unexpected.join(", ")}`);
  if (query.status) filter.status = cleanEnum(query.status, "status", ["draft", "published"]); if (query.position) filter.position = cleanEnum(query.position, "position", ["homepage", "services", "dashboard"]); if (query.category) filter.category = cleanText(query.category, "category", { max: 80 }); if (query.isActive !== undefined && query.isActive !== "") { if (!["true", "false"].includes(String(query.isActive))) throw new ApiError(400, "isActive must be true or false"); filter.isActive = String(query.isActive) === "true"; }
  if (type === "faq" && query.audience) filter.audience = cleanEnum(query.audience, "audience", FAQ_AUDIENCES); if (type === "faq" && query.featured !== undefined) { if (!["true", "false"].includes(String(query.featured))) throw new ApiError(400, "featured must be true or false"); filter.isFeatured = String(query.featured) === "true"; }
  if (query.search?.trim()) { const search = cleanText(query.search, "search", { max: 120 }); const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); if (type === "faq") filter.$or = ["question", "answer", "keywords", "category"].map((field) => ({ [field]: { $regex: pattern, $options: "i" } })); else filter[type === "testimonial" ? "customerName" : "title"] = { $regex: pattern, $options: "i" }; }
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1); const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100); const total = await Model.countDocuments(filter);
  let operation = Model.find(filter).sort(type === "faq" ? { displayOrder: 1, order: 1, createdAt: -1 } : { order: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit); if (populate) operation = operation.populate(...populate);
  const items = await operation.lean();
  return { items: type === "faq" ? items.map(normalizeFaq) : items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
export const getEntity = async (type, id) => { assertObjectId(id); const { Model, populate } = configFor(type); let operation = Model.findOne({ _id: id, deletedAt: null }); if (populate) operation = operation.populate(...populate); const item = await operation; if (!item) throw new ApiError(404, `${type} not found`); return item; };
export const createEntity = async (type, payload, userId) => configFor(type).Model.create({ ...payload, createdBy: userId, updatedBy: userId });
export const updateEntity = async (type, id, payload, userId) => { const item = await getEntity(type, id); Object.assign(item, payload, { updatedBy: userId }); await item.save(); return item; };
export const softDeleteEntity = async (type, id, userId) => { const item = await getEntity(type, id); item.deletedAt = new Date(); item.updatedBy = userId; await item.save(); return item; };
export const validateFeaturedServices = async (ids) => {
  if (!Array.isArray(ids)) throw new ApiError(400, "featuredServiceIds must be an array");
  ids.forEach((id) => assertObjectId(id, "featuredServiceId"));
  if (new Set(ids.map(String)).size !== ids.length) throw new ApiError(400, "Duplicate featured services are not allowed");
  const count = await Service.countDocuments({ _id: { $in: ids }, isActive: true });
  if (count !== ids.length) throw new ApiError(400, "Every featured service must exist and be active");
  return ids;
};
export const validateOptionalService = async (id) => { if (!id) return null; assertObjectId(id, "serviceId"); if (!await Service.exists({ _id: id, isActive: true })) throw new ApiError(400, "Selected service does not exist or is inactive"); return id; };
