import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminServices, updateServiceStatus } from "../../api/adminApi";
import ConfirmDialog from "../../components/dashboard/ConfirmDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import ServiceAvailabilityBadge from "../../components/dashboard/ServiceAvailabilityBadge";
import { formatINR, pricingDisplay, processingTimeFor } from "../../utils/servicePresentation";

const headings = ["Service", "Category", "Government Fee", "Service Charge", "Total", "Processing Time", "Availability", "Active", "Popular", "Featured", "Actions"];
const selectClass = "min-h-11 rounded-xl border px-3";

const AdminServices = () => {
  const [services, setServices] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ search: "", category: "", availability: "", active: "", popular: "", featured: "" });

  useEffect(() => {
    let active = true;
    getAdminServices({ limit: 100 }).then((response) => active && setServices(response.services)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load services."));
    return () => { active = false; };
  }, [refresh]);

  const categories = useMemo(() => [...new Set((services || []).map(({ category }) => category).filter(Boolean))].sort(), [services]);
  const filtered = useMemo(() => (services || []).filter((service) => {
    const query = filters.search.trim().toLowerCase();
    return (!query || [service.title, service.slug, service.category].some((value) => value?.toLowerCase().includes(query)))
      && (!filters.category || service.category === filters.category)
      && (!filters.availability || (service.availabilityStatus || "available") === filters.availability)
      && (!filters.active || String(service.isActive) === filters.active)
      && (!filters.popular || String(service.isPopular) === filters.popular)
      && (!filters.featured || String(service.isFeatured) === filters.featured);
  }), [filters, services]);

  const confirm = async () => {
    setBusy(true);
    try { await updateServiceStatus(pending._id, { isActive: !pending.isActive }); setPending(null); setRefresh((value) => value + 1); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to update service."); setPending(null); }
    finally { setBusy(false); }
  };

  const priceCells = (item) => {
    const display = pricingDisplay(item);
    if (display.mode !== "fixed") return ["—", "—", display.value];
    return [display.pricing.requiresAdminReview ? "Review required" : formatINR(display.pricing.governmentFee), formatINR(display.pricing.serviceCharge), formatINR(display.pricing.totalAmount)];
  };
  const actions = (item) => <div className="flex flex-wrap gap-2"><Link to={`/admin/services/${item._id}/edit`} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700">Edit</Link><button type="button" onClick={() => setPending(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">{item.isActive ? "Deactivate" : "Activate"}</button></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-2xl font-bold">Services</h2><p className="mt-1 text-slate-500">Manage pricing, processing time, availability, and dynamic forms.</p></div><Link to="/admin/services/new" className="inline-flex h-fit min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} /> New service</Link></div>
    {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="relative sm:col-span-2 lg:col-span-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input aria-label="Search services" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search title, slug, category" className="min-h-11 w-full rounded-xl border py-2 pl-10 pr-3" /></label>
      <select aria-label="Filter category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} className={selectClass}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      <select aria-label="Filter availability" value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })} className={selectClass}><option value="">All availability</option><option value="available">Available</option><option value="coming_soon">Coming Soon</option><option value="temporarily_unavailable">Temporarily Unavailable</option></select>
      <select aria-label="Filter active status" value={filters.active} onChange={(event) => setFilters({ ...filters, active: event.target.value })} className={selectClass}><option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option></select>
      <select aria-label="Filter popular status" value={filters.popular} onChange={(event) => setFilters({ ...filters, popular: event.target.value })} className={selectClass}><option value="">Popular and standard</option><option value="true">Popular</option><option value="false">Not popular</option></select>
      <select aria-label="Filter featured status" value={filters.featured} onChange={(event) => setFilters({ ...filters, featured: event.target.value })} className={selectClass}><option value="">Featured and standard</option><option value="true">Featured</option><option value="false">Not featured</option></select>
    </section>

    {!services ? <LoadingSkeleton count={5} /> : !filtered.length ? <EmptyState title="No matching services" description="Change the filters or create a service." /> : <>
      <div className="space-y-4 lg:hidden">{filtered.map((item) => { const [government, charge, total] = priceCells(item); return <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.category} · {item.slug}</p></div><ServiceAvailabilityBadge status={item.availabilityStatus || "available"} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Government Fee</dt><dd className="font-semibold">{government}</dd></div><div><dt className="text-slate-500">Service Charge</dt><dd className="font-semibold">{charge}</dd></div><div><dt className="text-slate-500">Total / Pricing</dt><dd className="font-semibold">{total}</dd></div><div><dt className="text-slate-500">Processing</dt><dd className="font-semibold">{processingTimeFor(item)}</dd></div><div><dt className="text-slate-500">Active</dt><dd>{item.isActive ? "Yes" : "No"}</dd></div><div><dt className="text-slate-500">Popular / Featured</dt><dd>{item.isPopular ? "Popular" : "Standard"} · {item.isFeatured ? "Featured" : "Not featured"}</dd></div></dl>{item.pricing?.requiresAdminReview && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pricing requires Admin review.</p>}<div className="mt-4">{actions(item)}</div></article>; })}</div>
      <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headings.map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((item) => { const [government, charge, total] = priceCells(item); return <tr key={item._id} className="align-top"><td className="px-4 py-4"><p className="font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.slug}{item.pricing?.requiresAdminReview ? " · Review pricing" : ""}</p></td><td className="px-4 py-4">{item.category}</td><td className="px-4 py-4">{government}</td><td className="px-4 py-4">{charge}</td><td className="max-w-48 px-4 py-4 font-semibold">{total}</td><td className="max-w-44 px-4 py-4">{processingTimeFor(item)}</td><td className="px-4 py-4"><ServiceAvailabilityBadge status={item.availabilityStatus || "available"} /></td><td className="px-4 py-4">{item.isActive ? "Yes" : "No"}</td><td className="px-4 py-4">{item.isPopular ? "Yes" : "No"}</td><td className="px-4 py-4">{item.isFeatured ? "Yes" : "No"}</td><td className="px-4 py-4">{actions(item)}</td></tr>; })}</tbody></table></div>
    </>}
    <ConfirmDialog open={Boolean(pending)} title={pending?.isActive ? "Deactivate service?" : "Activate service?"} description={pending?.isActive ? "The service will disappear from public listings. Existing applications and files remain unchanged." : "The record will become public; availability still controls whether applications are accepted."} confirmLabel={pending?.isActive ? "Deactivate" : "Activate"} busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />
  </div>;
};

export default AdminServices;
