import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAcceptedLeads, getAvailableLeads } from "../../api/partnerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const PartnerLeads = ({ mode = "available" }) => {
  const [params, setParams] = useSearchParams(); const [result, setResult] = useState(null); const [error, setError] = useState("");
  const queryKey = `${mode}|${params.toString()}`;
  useEffect(() => { let active = true; const query = Object.fromEntries(params); const request = mode === "available" ? getAvailableLeads(query) : getAcceptedLeads({ ...query, completed: mode === "completed" }); request.then((response) => active && setResult({ key: queryKey, ...response })).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load leads.")); return () => { active = false; }; }, [mode, params, queryKey]);
  const update = (name, value) => { const next = new URLSearchParams(params); value ? next.set(name, value) : next.delete(name); setParams(next); };
  const titles = { available: ["Available leads", "Matching open opportunities with privacy-safe customer details."], accepted: ["Accepted leads", "Applications accepted by your partner identity."], completed: ["Completed leads", "Your completed marketplace work."] };
  const data = result?.key === queryKey ? result : null;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">{titles[mode][0]}</h2><p className="mt-1 text-slate-500">{titles[mode][1]}</p></div>{mode === "available" && <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"><label className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input aria-label="City" value={params.get("city") || ""} onChange={(event) => update("city", event.target.value)} placeholder="Filter city" className="w-full rounded-xl border py-2.5 pl-10 pr-3" /></label><input aria-label="Category" value={params.get("category") || ""} onChange={(event) => update("category", event.target.value)} placeholder="Category" className="rounded-xl border px-3" /><input aria-label="Pincode" value={params.get("pincode") || ""} onChange={(event) => update("pincode", event.target.value)} placeholder="Pincode" className="rounded-xl border px-3" /></div>}{error ? <EmptyState title="Leads unavailable" description={error} /> : !data ? <LoadingSkeleton count={5} /> : !data.leads.length ? <EmptyState title="No leads found" description="No leads currently match this view." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.leads.map((lead) => { const href = mode === "available" ? `/partner/leads/${lead._id}` : `/partner/applications/${lead.application}`; return <Link key={lead._id} to={href} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-blue-300"><div className="flex justify-between gap-3"><h3 className="font-bold">{lead.serviceTitle}</h3><StatusBadge status={lead.status} /></div><p className="mt-2 text-sm text-slate-500">{lead.category} · {lead.city} · {lead.pincode}</p><p className="mt-3 line-clamp-3 text-sm leading-6">{lead.safeRequirementSummary}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>Lead price ₹{lead.leadPrice}</span><span>{formatDate(lead.acceptedAt || lead.createdAt)}</span></div></Link>; })}</div>}</div>;
};
export default PartnerLeads;

