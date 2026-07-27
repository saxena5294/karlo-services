import mongoose from "mongoose";
import { DeclarationForm, DECLARATION_FORM_AUDIENCES } from "../models/declarationFormModel.js";
import { ApiError } from "../utils/ApiError.js";
import {
  deleteDeclarationPdf,
  hasPdfSignature,
  uploadDeclarationPdf,
} from "./declarationPdfStorageService.js";

export const DECLARATION_CATEGORIES = Object.freeze([
  "Identity",
  "Aadhaar",
  "PAN",
  "Tax",
  "Income",
  "Passport",
  "Education",
  "Certificates",
  "Property",
  "Banking",
  "Driving Licence",
  "Other",
]);
export const DECLARATION_LANGUAGES = Object.freeze(["English", "Hindi", "Bilingual"]);

const PUBLIC_FIELDS = "_id title slug category description language fileUrl fileName fileType fileSize mimeType isPopular displayOrder";
const ADMIN_FIELDS = "+createdBy +updatedBy";
const MAX_PAGE_SIZE = 100;
const METADATA_FIELDS = [
  "title",
  "slug",
  "category",
  "description",
  "language",
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
const parseDisplayOrder = (value) => {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(400, "Display order must be a non-negative whole number");
  }
  return parsed;
};
const parseVisibleTo = (value) => {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(parsed)) throw new ApiError(400, "Visibility must be a list");
  const roles = [...new Set(parsed.map(cleanText).filter(Boolean))];
  if (!roles.length) throw new ApiError(400, "Select at least one visibility option");
  if (roles.some((role) => !DECLARATION_FORM_AUDIENCES.includes(role))) {
    throw new ApiError(400, "Visibility can include only customer and partner");
  }
  return roles;
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
    DeclarationForm.find(filter).select(PUBLIC_FIELDS)
      .sort({ displayOrder: 1, isPopular: -1, title: 1 }).skip(skip).limit(limit).lean(),
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

const pickMetadata = (payload, partial = false) => {
  const unexpected = Object.keys(payload || {}).filter((key) => !METADATA_FIELDS.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  const result = Object.fromEntries(
    METADATA_FIELDS.filter((key) => payload?.[key] !== undefined).map((key) => [key, payload[key]]),
  );
  if (!partial) {
    for (const field of ["title", "category", "language"]) {
      if (!cleanText(result[field])) throw new ApiError(400, `${field[0].toUpperCase()}${field.slice(1)} is required`);
    }
  }
  if (!partial || result.title !== undefined || result.slug !== undefined) {
    result.slug = slugify(result.slug || result.title);
    if (!result.slug) throw new ApiError(400, "A valid slug is required");
  }
  if (result.title !== undefined) result.title = cleanText(result.title);
  if (result.category !== undefined) {
    result.category = cleanText(result.category);
    if (!DECLARATION_CATEGORIES.includes(result.category)) throw new ApiError(400, "Select a valid category");
  }
  if (result.language !== undefined) {
    result.language = cleanText(result.language);
    if (!DECLARATION_LANGUAGES.includes(result.language)) throw new ApiError(400, "Select a valid language");
  }
  if (result.description !== undefined) result.description = cleanText(result.description);
  if (result.visibleTo !== undefined) result.visibleTo = parseVisibleTo(result.visibleTo);
  if (!partial && result.visibleTo === undefined) result.visibleTo = [...DECLARATION_FORM_AUDIENCES];
  if (result.displayOrder !== undefined) result.displayOrder = parseDisplayOrder(result.displayOrder);
  if (result.isPopular !== undefined) result.isPopular = parseBoolean(result.isPopular, "Popular");
  if (result.isActive !== undefined) result.isActive = parseBoolean(result.isActive, "Active");
  return result;
};

const validatePdf = (file, requiredMessage) => {
  if (!file) throw new ApiError(400, requiredMessage);
  if (file.mimetype !== "application/pdf") throw new ApiError(400, "Only PDF files are allowed");
  if (file.size > 10 * 1024 * 1024) throw new ApiError(400, "PDF must be smaller than 10 MB");
  if (!hasPdfSignature(file.buffer)) throw new ApiError(400, "The selected file is not a valid PDF");
};

const uploadedFileValues = (upload, file) => ({
  publicId: upload.public_id,
  fileUrl: upload.secure_url,
  fileName: file.originalname,
  fileType: "pdf",
  mimeType: file.mimetype,
  fileSize: upload.bytes ?? file.size,
  cloudinaryAssetId: upload.asset_id || "",
  cloudinaryVersion: upload.version,
  cloudinaryResourceType: upload.resource_type || "raw",
});

const cleanupUploadedPdf = async (publicId, resourceType, context) => {
  try {
    await deleteDeclarationPdf(publicId, resourceType);
  } catch (error) {
    console.error(`Declaration PDF ${context} cleanup failed`, {
      publicId,
      reason: error?.message || "Unknown Cloudinary error",
    });
  }
};

export const adminListDeclarationForms = async (query = {}) => {
  const filter = buildDeclarationFormFilter(null, query, true);
  const searchLimit = parsePositiveInteger(query.limit, 100, MAX_PAGE_SIZE);
  return DeclarationForm.find(filter).select(ADMIN_FIELDS)
    .sort({ displayOrder: 1, title: 1 }).limit(searchLimit).lean();
};

export const adminCreateDeclarationForm = async (payload, file, adminId) => {
  const values = pickMetadata(payload);
  validatePdf(file, "Declaration PDF is required");
  if (await DeclarationForm.exists({ slug: values.slug })) {
    throw new ApiError(409, "A declaration form with this slug already exists");
  }
  const upload = await uploadDeclarationPdf(file, values.slug);
  try {
    return await DeclarationForm.create({
      ...values,
      ...uploadedFileValues(upload, file),
      createdBy: adminId,
      updatedBy: adminId,
    });
  } catch (error) {
    await cleanupUploadedPdf(upload.public_id, upload.resource_type, "create rollback");
    return throwPersistenceError(error);
  }
};

export const adminUpdateDeclarationForm = async (id, payload, adminId) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Declaration form not found");
  const values = pickMetadata(payload, true);
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

export const adminReplaceDeclarationPdf = async (id, file, adminId) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Declaration form not found");
  validatePdf(file, "Declaration PDF is required");
  const existing = await DeclarationForm.findById(id).select("slug publicId cloudinaryResourceType").lean();
  if (!existing) throw new ApiError(404, "Declaration form not found");
  const upload = await uploadDeclarationPdf(file, existing.slug);
  let updated;
  try {
    updated = await DeclarationForm.findByIdAndUpdate(
      id,
      { $set: { ...uploadedFileValues(upload, file), updatedBy: adminId } },
      { returnDocument: "after", runValidators: true },
    ).select(ADMIN_FIELDS).lean();
    if (!updated) throw new ApiError(404, "Declaration form not found");
  } catch (error) {
    await cleanupUploadedPdf(upload.public_id, upload.resource_type, "replacement rollback");
    if (error instanceof ApiError) throw error;
    throwPersistenceError(error);
  }
  await cleanupUploadedPdf(existing.publicId, existing.cloudinaryResourceType, "old asset");
  return updated;
};

export const adminDeleteDeclarationForm = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Declaration form not found");
  const form = await DeclarationForm.findByIdAndDelete(id)
    .select("publicId cloudinaryResourceType").lean();
  if (!form) throw new ApiError(404, "Declaration form not found");
  await cleanupUploadedPdf(form.publicId, form.cloudinaryResourceType, "hard delete");
};
