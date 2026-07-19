import { normalizeServiceForClient, Service } from "../models/serviceModel.js";
import { findServiceBySlugOrLegacy, resolveVariant } from "../services/serviceVariantService.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getServices = async (req, res) => {
  try {
    const { category, popular, search, availability } = req.query;
    const filter = { isActive: true, migrationStatus: { $ne: "migrated" } };
    if (category) filter.category = category;
    if (popular === "true") filter.isPopular = true;
    if (availability) filter.availabilityStatus = availability;
    if (search?.trim()) {
      const pattern = escapeRegex(search.trim());
      filter.$or = ["title", "slug", "category", "keywords", "variants.title", "variants.slug", "variants.keywords"].map((field) => ({ [field]: { $regex: pattern, $options: "i" } }));
    }
    const records = await Service.find(filter).sort({ displayOrder: 1, createdAt: -1 }).lean();
    const services = records.map(normalizeServiceForClient).filter((service) => !availability || service.availabilityStatus === availability);
    return res.status(200).json({ success: true, count: services.length, services });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to get services", error: error.message }); }
};

export const getServiceBySlug = async (req, res) => {
  try {
    const service = await findServiceBySlugOrLegacy(req.params.slug, { activeOnly: true });
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    const variant = resolveVariant(service, req.query.type, req.params.slug);
    return res.status(200).json({
      success: true,
      service: normalizeServiceForClient(service),
      selectedVariantKey: variant?.key || "",
      canonicalUrl: req.params.slug !== service.slug ? `/services/${service.slug}${variant ? `?type=${variant.key}` : ""}` : "",
    });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to get service", error: error.message }); }
};
