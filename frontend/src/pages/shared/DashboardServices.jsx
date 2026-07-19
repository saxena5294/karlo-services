import { useEffect, useMemo, useState } from "react";
import { getAllServices } from "../../api/serviceApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import ServiceCard from "../../components/home/ServiceCard";

const categories = [["instant-services", "Instant Services"], ["government-id", "Government ID Cards"], ["education", "Education"], ["sarkari-result", "Sarkari Result"], ["online-forms", "Online Forms"], ["other-services", "Other Services"]];
const categoryFor = (service) => service.dashboardCategory || "other-services";

const DashboardServices = () => {
  const [services, setServices] = useState(null); const [error, setError] = useState(""); const [search, setSearch] = useState("");
  useEffect(() => { let active = true; getAllServices().then((result) => active && setServices(result.services || [])).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load services.")); return () => { active = false; }; }, []);
  const filtered = useMemo(() => (services || []).filter((service) => [service.title, service.slug, service.description, service.category, service.subcategory, ...(service.keywords || []), ...(service.variants || []).flatMap((variant) => [variant.title, variant.slug, ...(variant.keywords || [])])].some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()))), [search, services]);
  if (error) return <EmptyState title="Services unavailable" description={error} />;
  if (!services) return <LoadingSkeleton count={6} />;
  return <div className="space-y-7"><header><h1 className="text-2xl font-bold">Services</h1><p className="mt-1 text-slate-500">Browse the managed service catalogue with current pricing and availability.</p><label className="mt-4 block max-w-xl"><span className="sr-only">Search services</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, category or service" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label></header>{!filtered.length ? <EmptyState title="No matching services" description="Try a different search." /> : categories.map(([key, label]) => { const items = filtered.filter((service) => categoryFor(service) === key); if (!items.length) return null; return <section key={key}><h2 className="text-xl font-bold">{label}</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((service) => <ServiceCard key={service._id} service={service} />)}</div></section>; })}</div>;
};

export default DashboardServices;
