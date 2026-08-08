import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { decideExpert, getAdminExperts } from "../../api/adminApi";
import AdminStatusTabs from "../../components/dashboard/AdminStatusTabs";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const tabs = [
  { value: "", label: "All" }, { value: "pending", label: "Pending" }, { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "suspended", label: "Suspended" }, { value: "inactive", label: "Inactive" },
];
const decisionsFor = (item) => item.status === "pending" ? ["approve", "reject"] : item.status === "suspended" ? ["activate", "deactivate"] : item.account?.status === "active" ? ["suspend", "deactivate"] : ["activate"];

const AdminExperts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState({});
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const updateQuery = (updates) => { const next = new URLSearchParams(searchParams); Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setSearchParams(next); };
  const load = useCallback(() => {
    return getAdminExperts({ status: status || undefined, search: searchParams.get("search") || undefined, approvalStatus: searchParams.get("approvalStatus") || undefined, category: searchParams.get("category") || undefined, dateFrom: searchParams.get("dateFrom") || undefined, dateTo: searchParams.get("dateTo") || undefined, page, limit: 12 })
      .then((response) => { setData(response); return response; })
      .catch((error) => { setFeedback({ type: "error", message: error.response?.data?.message || "Unable to load experts." }); throw error; });
  }, [page, searchParams, status]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const act = async (item, decision) => { setBusyId(item._id); setFeedback({ type: "", message: "" }); try { await decideExpert(item._id, decision, notes[item._id] || ""); await load(); setFeedback({ type: "success", message: `${item.displayName} account updated successfully.` }); } catch (error) { setFeedback({ type: "error", message: error.response?.data?.message || "Unable to update expert." }); } finally { setBusyId(""); } };
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Experts</h1><p className="mt-1 text-slate-500">Review Expert onboarding, expertise, assignments, approval, and access state.</p></div>
    <AdminStatusTabs tabs={tabs} activeStatus={status} counts={data?.statusCounts} onChange={(value) => updateQuery({ status: value, page: "" })} />
    <form onSubmit={(event) => { event.preventDefault(); updateQuery({ search: search.trim(), page: "" }); }} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, mobile or email" className="rounded-xl border px-3 py-2 text-sm xl:col-span-2" />
      <input value={searchParams.get("category") || ""} onChange={(event) => updateQuery({ category: event.target.value, page: "" })} placeholder="Expertise or category" className="rounded-xl border px-3 py-2 text-sm" />
      <select value={searchParams.get("approvalStatus") || ""} onChange={(event) => updateQuery({ approvalStatus: event.target.value, page: "" })} className="rounded-xl border px-3 py-2 text-sm"><option value="">Any approval status</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
      <input type="date" aria-label="Registered from" value={searchParams.get("dateFrom") || ""} onChange={(event) => updateQuery({ dateFrom: event.target.value, page: "" })} className="rounded-xl border px-3 py-2 text-sm" />
      <div className="flex gap-2"><input type="date" aria-label="Registered to" value={searchParams.get("dateTo") || ""} onChange={(event) => updateQuery({ dateTo: event.target.value, page: "" })} className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" /><button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Search</button></div>
    </form>
    {feedback.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{feedback.message}</p>}
    {!data ? <LoadingSkeleton count={4} /> : !data.experts.length ? <EmptyState title="No experts" description="Expert onboarding submissions matching these filters will appear here." /> : <div className="grid gap-4 lg:grid-cols-2">{data.experts.map((item) => <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-4"><div><Link to={`/admin/experts/${item._id}`} className="font-bold text-blue-700">{item.displayName}</Link><p className="mt-1 text-sm text-slate-600">{item.email || item.account?.email || "No email"} · {item.phone || item.account?.mobile || "No mobile"}</p></div><span className="h-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase text-amber-800">{item.account?.status === "inactive" ? "inactive" : item.status === "active" ? "approved" : item.status.replaceAll("_", " ")}</span></div>
      <p className="mt-3 text-sm text-slate-600">Expertise: {[...(item.categories || []), ...(item.skills || [])].join(", ") || "Not provided"}</p><p className="mt-2 text-xs text-slate-500">Registered {formatDate(item.createdAt)} · Approval {item.account?.approval?.status || item.status}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-blue-50 p-2"><strong className="block text-lg">{item.activeAssignments}</strong>Active</div><div className="rounded-lg bg-emerald-50 p-2"><strong className="block text-lg">{item.completedApplications}</strong>Done</div><div className="rounded-lg bg-amber-50 p-2"><strong className="block text-lg">{item.pendingApplications}</strong>Pending</div></div>
      <input value={notes[item._id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item._id]: event.target.value }))} maxLength={500} placeholder="Internal decision note (optional)" className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" />
      <div className="mt-3 flex flex-wrap gap-2"><Link to={`/admin/experts/${item._id}`} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">View details & work</Link><Link to={`/admin/crm/experts/${encodeURIComponent(item.userId)}`} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">CRM details</Link>{decisionsFor(item).map((decision) => <button key={decision} type="button" disabled={busyId === item._id} onClick={() => act(item, decision)} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${decision === "approve" || decision === "activate" ? "bg-emerald-700 text-white" : decision === "reject" || decision === "suspend" ? "bg-rose-700 text-white" : "border"}`}>{busyId === item._id ? "Updating…" : decision[0].toUpperCase() + decision.slice(1)}</button>)}</div>
    </article>)}</div>}
    {data && pagination.pages > 1 && <nav className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm" aria-label="Expert pages"><span>{pagination.total} experts · Page {pagination.page} of {pagination.pages}</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1} onClick={() => updateQuery({ page: String(page - 1) })} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page >= pagination.pages} onClick={() => updateQuery({ page: String(page + 1) })} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></nav>}
  </div>;
};

export default AdminExperts;
