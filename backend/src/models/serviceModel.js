import mongoose from "mongoose";
import { FULFILLMENT_TYPES, FULFILLMENT_TYPE_VALUES } from "../constants/fulfillmentConstants.js";

export const PRICING_MODES = ["fixed", "variable", "government_portal", "contact_support", "free"];
export const PROCESSING_TIME_UNITS = ["minutes", "hours", "days", "weeks", "months", "instant", "depends_on_verification", "contact_support", "not_applicable"];
export const AVAILABILITY_STATUSES = ["available", "coming_soon", "temporarily_unavailable"];

export const pricingSchema = new mongoose.Schema({
  governmentFee: { type: Number, min: 0, default: 0 },
  serviceCharge: { type: Number, min: 0, default: 0 },
  totalAmount: { type: Number, min: 0, default: 0 },
  pricingMode: { type: String, enum: PRICING_MODES, default: "fixed" },
  pricingNote: { type: String, trim: true, maxlength: 300, default: "" },
  requiresAdminReview: { type: Boolean, default: false },
}, { _id: false });

export const estimatedProcessingTimeSchema = new mongoose.Schema({
  value: { type: Number, min: 0, default: null },
  unit: { type: String, enum: PROCESSING_TIME_UNITS, default: "days" },
  displayText: { type: String, trim: true, maxlength: 200, default: "" },
}, { _id: false });

const variantSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9][a-z0-9_-]*$/ },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  keywords: { type: [String], default: [] },
  pricing: { type: pricingSchema, default: () => ({}) },
  processingTime: { type: estimatedProcessingTimeSchema, default: () => ({}) },
  availabilityStatus: { type: String, enum: AVAILABILITY_STATUSES, default: "available" },
  availabilityMessage: { type: String, trim: true, maxlength: 300, default: "" },
  requiredDocuments: { type: [String], default: [] },
  formConfiguration: { type: mongoose.Schema.Types.Mixed, default: null },
  terms: { type: [String], default: [] },
  displayOrder: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const processingFallback = ({ value, unit, displayText } = {}) => {
  if (displayText?.trim()) return displayText.trim();
  if (["instant", "depends_on_verification", "contact_support", "not_applicable"].includes(unit)) return ({ instant: "Instant", depends_on_verification: "Depends on verification", contact_support: "Contact support", not_applicable: "Not applicable" })[unit];
  return value == null ? "Contact support" : `${value} ${unit}`;
};

const normalizePricing = (pricing) => {
  pricing ||= {};
  if (pricing.pricingMode === "free") { pricing.governmentFee = 0; pricing.serviceCharge = 0; }
  pricing.totalAmount = Number((Number(pricing.governmentFee || 0) + Number(pricing.serviceCharge || 0)).toFixed(2));
};

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, trim: true },
  icon: { type: String, default: "Document" }, image: { type: String, trim: true, default: "" },
  price: { type: Number, min: 0, default: 0 }, pricing: { type: pricingSchema, default: () => ({}) },
  processingTime: { type: String, trim: true, default: "Contact support" }, estimatedProcessingTime: { type: estimatedProcessingTimeSchema, default: () => ({}) },
  processingTimeOverride: { type: String, trim: true, maxlength: 200, default: "" },
  variantSelectionLabel: { type: String, trim: true, maxlength: 100, default: "Choose Service Type" },
  category: { type: String, required: true, trim: true }, subcategory: { type: String, trim: true, maxlength: 120, default: "" },
  dashboardCategory: { type: String, enum: ["instant-services", "government-id", "education", "sarkari-result", "online-forms", "other-services"], default: "other-services", index: true },
  availabilityStatus: { type: String, enum: AVAILABILITY_STATUSES, default: "available", index: true }, availabilityMessage: { type: String, trim: true, maxlength: 300, default: "" },
  requiredDocuments: { type: [String], default: [] }, eligibility: { type: [String], default: [] }, instructions: { type: [String], default: [] }, keywords: { type: [String], default: [] },
  isPopular: { type: Boolean, default: false }, isFeatured: { type: Boolean, default: false }, isActive: { type: Boolean, default: true }, displayOrder: { type: Number, min: 0, default: 0 },
  fulfillmentType: { type: String, enum: FULFILLMENT_TYPE_VALUES, default: FULFILLMENT_TYPES.INTERNAL, index: true },
  variants: { type: [variantSchema], default: [] },
  legacyServiceIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }, legacySlugs: { type: [String], default: [] },
  migrationSource: { type: String, trim: true, default: "" }, migratedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null }, migrationStatus: { type: String, enum: ["", "parent", "migrated"], default: "" },
}, { timestamps: true, collection: "services" });

serviceSchema.pre("validate", function normalizeBusinessFields() {
  if (!["fixed", "free"].includes(this.pricing?.pricingMode) && !this.pricing?.pricingNote?.trim()) this.invalidate("pricing.pricingNote", "Pricing note is required for non-fixed pricing");
  normalizePricing(this.pricing);
  for (const variant of this.variants || []) {
    if (!["fixed", "free"].includes(variant.pricing?.pricingMode) && !variant.pricing?.pricingNote?.trim()) variant.invalidate("pricing.pricingNote", "Pricing note is required for non-fixed pricing");
    normalizePricing(variant.pricing);
    variant.key = variant.key?.trim().toLowerCase();
    variant.slug = variant.slug?.trim().toLowerCase();
    variant.keywords = [...new Set((variant.keywords || []).map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  }
  const keys = (this.variants || []).map(({ key }) => key); const slugs = (this.variants || []).map(({ slug }) => slug);
  if (new Set(keys).size !== keys.length) this.invalidate("variants", "Variant keys must be unique");
  if (new Set(slugs).size !== slugs.length) this.invalidate("variants", "Variant slugs must be unique");
  this.price = this.pricing.totalAmount; this.processingTime = processingFallback(this.estimatedProcessingTime);
});

serviceSchema.index({ category: 1, availabilityStatus: 1, isActive: 1 });
serviceSchema.index({ migrationStatus: 1, isActive: 1, displayOrder: 1 });
serviceSchema.index({ title: "text", slug: "text", category: "text", keywords: "text", "variants.title": "text", "variants.keywords": "text" });

const activeVariants = (service) => (service.variants || []).filter(({ isActive }) => isActive !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
const availabilitySummary = (variants, fallback) => {
  if (!variants.length) return fallback || "available";
  if (variants.some(({ availabilityStatus }) => (availabilityStatus || "available") === "available")) return "available";
  if (variants.every(({ availabilityStatus }) => availabilityStatus === "coming_soon")) return "coming_soon";
  return "temporarily_unavailable";
};
const priceSummary = (variants, fallback) => {
  if (!variants.length) return { type: "single", minimum: fallback.totalAmount, maximum: fallback.totalAmount, displayText: `\u20B9${fallback.totalAmount}` };
  const modes = new Set(variants.map(({ pricing }) => pricing?.pricingMode || "fixed"));
  if (modes.has("variable")) return { type: "variable", displayText: "Variable pricing" };
  if (modes.has("government_portal")) return { type: "government_portal", displayText: variants.find(({ pricing }) => pricing?.pricingMode === "government_portal")?.pricing?.pricingNote || "Government/portal fee applies" };
  if (modes.has("contact_support")) return { type: "contact_support", displayText: "Contact support" };
  const totals = variants.map(({ pricing }) => Number(pricing?.totalAmount ?? (Number(pricing?.governmentFee || 0) + Number(pricing?.serviceCharge || 0))));
  const minimum = Math.min(...totals); const maximum = Math.max(...totals);
  return { type: minimum === maximum ? "single" : "range", minimum, maximum, displayText: minimum === maximum ? `\u20B9${minimum}` : `\u20B9${minimum}-\u20B9${maximum}` };
};
const processingSummary = (service, variants) => {
  if (service.processingTimeOverride) return { displayText: service.processingTimeOverride };
  const texts = [...new Set(variants.map(({ processingTime }) => processingFallback(processingTime)).filter(Boolean))];
  return { displayText: texts.length === 1 ? texts[0] : texts.length ? "Variable by service type" : processingFallback(service.estimatedProcessingTime) };
};

export const normalizeServiceForClient = (record, { includeInactiveVariants = false } = {}) => {
  const service = record?.toObject ? record.toObject() : { ...record };
  const legacyPrice = Number(service.price || 0); const hasPricing = Boolean(record?.pricing || service.pricing);
  service.pricing = { governmentFee: Number(service.pricing?.governmentFee || 0), serviceCharge: Number(service.pricing?.serviceCharge ?? legacyPrice), totalAmount: Number(service.pricing?.totalAmount ?? legacyPrice), pricingMode: service.pricing?.pricingMode || "fixed", pricingNote: service.pricing?.pricingNote || (hasPricing ? "" : "Legacy price preserved as service charge; government fee requires Admin review."), requiresAdminReview: service.pricing?.requiresAdminReview ?? !hasPricing };
  service.estimatedProcessingTime = { value: service.estimatedProcessingTime?.value ?? null, unit: service.estimatedProcessingTime?.unit || "days", displayText: service.estimatedProcessingTime?.displayText || service.processingTime || "Contact support" };
  const variants = activeVariants(service); service.variants = includeInactiveVariants ? (service.variants || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) : variants;
  service.variantCount = variants.length; service.availableVariantCount = variants.filter(({ availabilityStatus }) => (availabilityStatus || "available") === "available").length;
  service.priceSummary = priceSummary(variants, service.pricing); service.processingSummary = processingSummary(service, variants); service.availabilityStatus = availabilitySummary(variants, service.availabilityStatus);
  service.isParentService = variants.length > 0; service.availabilityMessage ||= "";
  return service;
};

export const Service = mongoose.model("Service", serviceSchema);
