import { normalizeServiceForClient, Service } from "../models/serviceModel.js";

export const findServiceBySlugOrLegacy = async (slug, { activeOnly = false } = {}) => {
  const cleanSlug = String(slug || "").trim().toLowerCase();
  const filter = { $or: [{ slug: cleanSlug }, { legacySlugs: cleanSlug }] };
  if (activeOnly) filter.isActive = true;
  let service = await Service.findOne(filter);
  if (service?.migrationStatus === "migrated" && service.migratedTo) service = await Service.findById(service.migratedTo);
  if (!service) {
    const legacy = await Service.findOne({ slug: cleanSlug, migrationStatus: "migrated", migratedTo: { $ne: null } });
    if (legacy) service = await Service.findById(legacy.migratedTo);
  }
  if (activeOnly && service && !service.isActive) return null;
  return service;
};

export const resolveVariant = (service, requestedKey, requestedSlug = "") => {
  const key = String(requestedKey || "").trim().toLowerCase();
  const slug = String(requestedSlug || "").trim().toLowerCase();
  const variants = (service?.variants || []).filter(({ isActive }) => isActive !== false);
  if (!variants.length) return null;
  if (key) return variants.find((item) => item.key === key || item.slug === key) || null;
  if (slug && slug !== service.slug) return variants.find((item) => item.slug === slug || (item.legacySlugs || []).includes(slug)) || null;
  return variants.length === 1 ? variants[0] : null;
};

const variantError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const normalizeVariantKey = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw variantError("The selected service variant is invalid.");
  const key = value.trim().toLowerCase();
  if (!key) throw variantError("A service variant is required.");
  return key;
};

export const assertVariantAvailable = (service, variantKey, legacySlug = "") => {
  const key = normalizeVariantKey(variantKey);
  const variants = service?.variants || [];
  if (!variants.length) {
    if (key) throw variantError("This service does not support variants.");
    return null;
  }

  const requestedSlug = String(legacySlug || "").trim().toLowerCase();
  const legacyVariantSlug = !key && requestedSlug && requestedSlug !== service.slug
    ? requestedSlug
    : null;
  if (!key && !legacyVariantSlug) throw variantError("A service variant is required.");

  const selectedValue = key || legacyVariantSlug;
  const variant = variants.find((item) =>
    item.key === selectedValue ||
    item.slug === selectedValue ||
    (item.legacySlugs || []).includes(selectedValue));
  if (!variant) throw variantError("The selected service variant is invalid.");
  if (variant.isActive === false) throw variantError("The selected service variant is inactive.");
  if ((variant.availabilityStatus || "available") !== "available") {
    throw variantError(variant.availabilityMessage || "The selected service variant is currently unavailable.");
  }
  return variant;
};

export const variantForm = (baseForm, variant) => {
  if (!variant?.formConfiguration) return baseForm;
  const override = variant.formConfiguration;
  return {
    ...(baseForm?.toObject ? baseForm.toObject() : baseForm),
    ...override,
    sections: override.sections || baseForm?.sections || [],
    fields: override.fields || baseForm?.fields || [],
  };
};

export const publicService = (service, options) => normalizeServiceForClient(service, options);
