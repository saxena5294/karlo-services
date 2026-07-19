import { Link } from "react-router-dom";
import ServiceAvailabilityBadge from "../dashboard/ServiceAvailabilityBadge";
import { pricingDisplay, processingTimeFor } from "../../utils/servicePresentation";

const ServiceCard = ({ service }) => {
  const status = service.availabilityStatus || "available"; const available = status === "available"; const display = pricingDisplay(service);
  return <article aria-disabled={!available || undefined} className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${available ? "border-slate-200 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg" : "border-slate-200 opacity-65"}`}>
    <div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700" aria-hidden="true">{String(service.icon || "Service").slice(0, 3)}</span><ServiceAvailabilityBadge status={status} /></div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">{service.category}</p><h3 className="mt-1 text-xl font-bold text-slate-900">{service.title}</h3><p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{service.description}</p>
    <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
      {service.variantCount > 0 && <div className="flex justify-between gap-3"><dt className="text-slate-500">Options</dt><dd className="font-semibold">{service.availableVariantCount} of {service.variantCount} available</dd></div>}
      <div className="flex justify-between gap-3"><dt className="text-slate-500">{service.priceSummary?.type === "range" ? "Price range" : service.priceSummary?.type === "single" && service.variantCount ? "Starting from" : "Pricing"}</dt><dd className="text-right font-semibold text-blue-700">{display.value || service.priceSummary?.displayText || "Contact support"}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Processing time</dt><dd className="text-right font-semibold">{service.processingSummary?.displayText || processingTimeFor(service)}</dd></div>
    </dl>
    {!available && service.availabilityMessage && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{service.availabilityMessage}</p>}
    {available ? <Link to={`/services/${service.slug}`} className="mt-5 min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-center font-bold text-white hover:bg-blue-800">{service.variantCount ? "View Options" : "View Details & Apply"}</Link> : <button type="button" disabled className="mt-5 min-h-12 rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-500">{status === "coming_soon" ? "Coming Soon" : "Temporarily Unavailable"}</button>}
  </article>;
};
export default ServiceCard;
