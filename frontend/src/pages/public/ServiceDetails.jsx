import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getServiceBySlug } from "../../api/serviceApi";
import VariantSelector from "../../components/services/VariantSelector";
import ServiceAvailabilityBadge from "../../components/dashboard/ServiceAvailabilityBadge";
import { variantPricingDisplay } from "../../utils/servicePresentation";

const ServiceDetails = () => {
  const { slug } = useParams(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const [service, setService] = useState(null); const [error, setError] = useState("");
  const selectedKey = params.get("type") || "";
  useEffect(() => { let active = true; getServiceBySlug(slug, selectedKey).then((result) => { if (!active) return; setService(result.service); if (result.canonicalUrl) navigate(result.canonicalUrl, { replace: true }); else if (!selectedKey && result.selectedVariantKey) setParams({ type: result.selectedVariantKey }, { replace: true }); }).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load this service.")); return () => { active = false; }; }, [slug, selectedKey, navigate, setParams]);
  const variant = useMemo(() => service?.variants?.find(({ key }) => key === selectedKey), [selectedKey, service]);
  if (error) return <div className="mx-auto max-w-4xl px-4 py-20"><p className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p></div>;
  if (!service) return <p className="mx-auto max-w-4xl px-4 py-20 text-slate-600">Loading service...</p>;
  const selectable = !service.variantCount || Boolean(variant && variant.availabilityStatus === "available");
  return <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8"><Link to="/services" className="font-semibold text-blue-700">Back to all services</Link><div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><p className="font-semibold text-blue-700">{service.category}</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{service.title}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{service.description}</p>
    {service.variantCount > 0 && <div className="mt-8"><VariantSelector variants={service.variants} selectedKey={selectedKey} onSelect={(type) => setParams({ type })} legend={service.variantSelectionLabel} /></div>}
    {variant && <section className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{variant.title}</h2><ServiceAvailabilityBadge status={variant.availabilityStatus} /></div><p className="mt-2 text-slate-600">{variant.description}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Total price</dt><dd className="font-bold">{variantPricingDisplay(variant)}</dd></div><div><dt className="text-slate-500">Processing time</dt><dd className="font-bold">{variant.processingTime?.displayText || "Contact support"}</dd></div></dl>{variant.requiredDocuments?.length > 0 && <div className="mt-5"><h3 className="font-bold">Required documents</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{variant.requiredDocuments.map((item) => <li key={item}>{item}</li>)}</ul></div>}</section>}
    <div className="mt-8 flex justify-end">{selectable ? <Link to={`/services/${service.slug}/apply${variant ? `?type=${variant.key}` : ""}`} className="min-h-12 rounded-xl bg-blue-700 px-6 py-3 text-center font-bold text-white">Apply now</Link> : <button type="button" disabled className="min-h-12 rounded-xl bg-slate-200 px-6 py-3 font-bold text-slate-500">Choose an available service type</button>}</div>
  </div></section>;
};
export default ServiceDetails;
