const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const formatINR = (value) => inr.format(Number(value || 0));

export const pricingFor = (service = {}) => {
  const legacy = Number(service.price || 0);
  return {
    governmentFee: Number(service.pricing?.governmentFee || 0),
    serviceCharge: Number(service.pricing?.serviceCharge ?? legacy),
    totalAmount: Number(service.pricing?.totalAmount ?? legacy),
    pricingMode: service.pricing?.pricingMode || "fixed",
    pricingNote: service.pricing?.pricingNote || "",
    requiresAdminReview: Boolean(service.pricing?.requiresAdminReview),
  };
};

export const processingTimeFor = (service = {}) => {
  const processing = service.estimatedProcessingTime || {};
  if (processing.displayText) return processing.displayText;
  if (processing.unit === "instant") return "Instant";
  if (processing.unit === "depends_on_verification") return "Depends on verification";
  if (processing.unit === "contact_support") return "Contact support";
  if (processing.unit === "not_applicable") return "Not applicable";
  if (processing.value != null) return `${processing.value} ${processing.unit || "days"}`;
  return service.processingTime || "Contact support";
};

export const pricingDisplay = (service = {}) => {
  if (service.priceSummary) return { mode: "summary", label: "Price", value: service.priceSummary.displayText, pricing: pricingFor(service), summary: service.priceSummary };
  const pricing = pricingFor(service);
  if (pricing.pricingMode === "free") return { mode: "free", label: "Government Fee", value: "Free", pricing };
  if (pricing.pricingMode !== "fixed") return { mode: "note", label: "Fee", value: pricing.pricingNote || "Contact support", pricing };
  return { mode: "fixed", pricing };
};

export const variantPricingDisplay = (variant = {}) => {
  const pricing = pricingFor(variant);
  if (pricing.pricingMode === "free") return "Free";
  if (pricing.pricingMode !== "fixed") return pricing.pricingNote || "Contact support";
  return formatINR(pricing.totalAmount);
};
