import { getEffectiveFields } from "../services/formConfigurationService.js";
import { ServiceForm } from "../models/serviceFormModel.js";
import { assertVariantAvailable, findServiceBySlugOrLegacy, variantForm } from "../services/serviceVariantService.js";
import { normalizeServiceForClient } from "../models/serviceModel.js";

export const getServiceForm = async (req, res) => {
  try {
    const service = await findServiceBySlugOrLegacy(req.params.slug);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    if (!service.isActive) return res.status(400).json({ success: false, message: "This service is currently inactive." });
    const variant = assertVariantAvailable(service, req.query.type, req.params.slug);
    if (!variant && (service.availabilityStatus || "available") !== "available") return res.status(400).json({ success: false, message: service.availabilityMessage || "This service is not currently available." });
    const storedForm = await ServiceForm.findOne({ service: service._id, isActive: true });
    const configured = variantForm(storedForm, variant);
    if (!configured) return res.status(404).json({ success: false, message: "Application form is not configured for this service" });
    configured.sections = [...(configured.sections || [])].sort((a, b) => a.order - b.order);
    configured.fields = getEffectiveFields(configured);
    return res.status(200).json({ success: true, service: normalizeServiceForClient(service), variant: variant || null, form: configured, canonicalUrl: req.params.slug !== service.slug ? `/services/${service.slug}/apply${variant ? `?type=${variant.key}` : ""}` : "" });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to get form configuration" }); }
};
