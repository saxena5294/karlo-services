import ServiceAvailabilityBadge from "../dashboard/ServiceAvailabilityBadge";
import { formatINR, pricingFor, variantPricingDisplay } from "../../utils/servicePresentation";

const VariantSelector = ({ variants = [], selectedKey = "", onSelect, legend = "Choose Service Type" }) => <fieldset>
  <legend className="text-xl font-bold text-slate-900">{legend}</legend>
  <p className="mt-1 text-sm text-slate-600">Pricing, documents, processing time, and form fields update with your selection.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
    {variants.map((variant) => { const available = variant.isActive !== false && (variant.availabilityStatus || "available") === "available"; const selected = variant.key === selectedKey; const pricing = pricingFor(variant); return <label key={variant.key} className={`relative rounded-2xl border-2 p-4 ${available ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${selected ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <input type="radio" name="variant" value={variant.key} checked={selected} disabled={!available} onChange={() => onSelect(variant.key)} className="sr-only" />
      <div className="flex items-start justify-between gap-3"><span className="font-bold text-slate-900">{variant.title}</span><ServiceAvailabilityBadge status={variant.availabilityStatus || "available"} /></div>
      {variant.description && <p className="mt-2 text-sm leading-5 text-slate-600">{variant.description}</p>}
      <dl className="mt-3 space-y-1 text-sm"><div className="flex justify-between gap-2"><dt className="text-slate-500">Price</dt><dd className="text-right font-semibold">{variantPricingDisplay(variant)}</dd></div>{pricing.pricingMode === "fixed" && <><div className="flex justify-between"><dt className="text-slate-500">Government fee</dt><dd>{formatINR(pricing.governmentFee)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Service charge</dt><dd>{formatINR(pricing.serviceCharge)}</dd></div></>}<div className="flex justify-between gap-2"><dt className="text-slate-500">Processing</dt><dd className="text-right">{variant.processingTime?.displayText || "Contact support"}</dd></div></dl>
      {!available && variant.availabilityMessage && <p className="mt-2 text-xs font-medium text-amber-800">{variant.availabilityMessage}</p>}
    </label>; })}
  </div>
</fieldset>;
export default VariantSelector;
