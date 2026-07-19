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

export const assertVariantAvailable = (service, variantKey, legacySlug = "") => {
  if (!(service?.variants || []).length) return null;
  const variant = resolveVariant(service, variantKey, legacySlug);
  if (!variant) {
    const error = new Error(variantKey ? "Selected service type was not found" : "Choose a service type before continuing");
    error.statusCode = 400; throw error;
  }
  if (variant.isActive === false) { const error = new Error("Selected service type is inactive"); error.statusCode = 400; throw error; }
  if ((variant.availabilityStatus || "available") !== "available") { const error = new Error(variant.availabilityMessage || "Selected service type is not currently available"); error.statusCode = 400; throw error; }
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
