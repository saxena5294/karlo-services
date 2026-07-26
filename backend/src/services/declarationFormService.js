import mongoose from "mongoose";
import { DeclarationForm, DECLARATION_FORM_AUDIENCES } from "../models/declarationFormModel.js";
import { ApiError } from "../utils/ApiError.js";

const PUBLIC_FIELDS = "_id title slug category description language fileUrl fileName fileType isPopular displayOrder";
const ADMIN_FIELDS = "+createdBy +updatedBy";
const MAX_PAGE_SIZE = 100;
const MUTABLE_FIELDS = [
  "title",
  "slug",
  "category",
  "description",
  "language",
  "fileUrl",
  "publicId",
  "fileName",
  "fileType",
  "visibleTo",
  "displayOrder",
  "isPopular",
  "isActive",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cleanText = (value) => String(value ?? "").trim();
const parseBoolean = (value, label) => {
  if (value === undefined || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new ApiError(400, `${label} must be true or false`);
};
const parsePositiveInteger = (value, fallback, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};
const throwPersistenceError = (error) => {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "identifier";
    throw new ApiError(409, `A declaration form with this ${field} already exists`);
  }
  if (error?.name === "ValidationError") {
    const details = Object.values(error.errors || {}).map(({ message }) => message);
    throw new ApiError(400, details[0] || "Declaration form metadata is invalid", details);
  }
  throw error;
};

export const slugify = (value) => cleanText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const buildDeclarationFormFilter = (role, query = {}, includeInactive = false) => {
  if (!includeInactive && !DECLARATION_FORM_AUDIENCES.includes(role)) {
    throw new ApiError(403, "Declaration forms are unavailable for this role");
  }

  const filter = includeInactive ? {} : { isActive: true, visibleTo: role };
  const search = cleanText(query.search);
  const category = cleanText(query.category);
  const language = cleanText(query.language);
  const popular = parseBoolean(query.popular, "popular");

  if (search) {
    const matcher = new RegExp(escapeRegex(search.slice(0, 100)), "i");
    filter.$or = [
      { title: matcher },
      { description: matcher },
      { category: matcher },
      { language: matcher },
    ];
  }
  if (category) filter.category = category.slice(0, 100);
  if (language) filter.language = language.slice(0, 80);
  if (popular !== undefined) filter.isPopular = popular;
  if (includeInactive) {
    const active = parseBoolean(query.active, "active");
    if (active !== undefined) filter.isActive = active;
  }

  return filter;
};

export const listDeclarationForms = async (role, query = {}) => {
  const filter = buildDeclarationFormFilter(role, query);
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 24, MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;
  const [forms, total, categories, languages] = await Promise.all([
    DeclarationForm.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ displayOrder: 1, isPopular: -1, title: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DeclarationForm.countDocuments(filter),
    DeclarationForm.distinct("category", { isActive: true, visibleTo: role }),
    DeclarationForm.distinct("language", { isActive: true, visibleTo: role }),
  ]);

  return {
    forms,
    filters: {
      categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      languages: languages.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getDeclarationDownload = async (id, role) => {
  if (!mongoose.isValidObjectId(id) || !DECLARATION_FORM_AUDIENCES.includes(role)) {
    throw new ApiError(404, "Declaration form not found");
  }

  const form = await DeclarationForm.findOneAndUpdate(
    { _id: id, isActive: true, visibleTo: role },
    { $inc: { downloadCount: 1 } },
    { returnDocument: "after" },
  ).select("fileUrl");

  if (!form) throw new ApiError(404, "Declaration form not found");
  return form.fileUrl;
};

const pickPayload = (payload, partial = false) => {
  const unexpected = Object.keys(payload || {}).filter((key) => !MUTABLE_FIELDS.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  const result = Object.fromEntries(
    MUTABLE_FIELDS.filter((key) => payload?.[key] !== undefined).map((key) => [key, payload[key]]),
  );
  if (!partial || result.title !== undefined || result.slug !== undefined) {
    result.slug = slugify(result.slug || result.title);
    if (!result.slug) throw new ApiError(400, "A valid slug is required");
  }
  if (result.visibleTo) result.visibleTo = [...new Set(result.visibleTo)];
  return result;
};

export const adminListDeclarationForms = async (query = {}) => {
  const filter = buildDeclarationFormFilter(null, query, true);
  const searchLimit = parsePositiveInteger(query.limit, 100, MAX_PAGE_SIZE);
  return DeclarationForm.find(filter)
    .select(ADMIN_FIELDS)
    .sort({ displayOrder: 1, title: 1 })
    .limit(searchLimit)
    .lean();
};

export const adminCreateDeclarationForm = async (payload, adminId) => {
  const values = pickPayload(payload);
  try {
    return await DeclarationForm.create({ ...values, createdBy: adminId, updatedBy: adminId });
  } catch (error) {
    return throwPersistenceError(error);
  }
};

export const adminUpdateDeclarationForm = async (id, payload, adminId) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Declaration form not found");
  const values = pickPayload(payload, true);
  if (!Object.keys(values).length) throw new ApiError(400, "At least one field is required");
  let form;
  try {
    form = await DeclarationForm.findByIdAndUpdate(
      id,
      { $set: { ...values, updatedBy: adminId } },
      { returnDocument: "after", runValidators: true },
    ).select(ADMIN_FIELDS).lean();
  } catch (error) {
    return throwPersistenceError(error);
  }
  if (!form) throw new ApiError(404, "Declaration form not found");
  return form;
};

export const adminDeleteDeclarationForm = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Declaration form not found");
  const form = await DeclarationForm.findByIdAndDelete(id).select("_id").lean();
  if (!form) throw new ApiError(404, "Declaration form not found");
};
