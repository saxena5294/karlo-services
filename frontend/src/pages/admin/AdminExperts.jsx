import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { decideExpert, getAdminExperts } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const decisionsFor = (item) => item.status === "pending"
  ? ["approve", "reject"]
  : item.account?.status === "active" ? ["suspend", "deactivate"] : ["activate"];

const AdminExperts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const [experts, setExperts] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState({});

  const load = useCallback(() => {
    getAdminExperts({ status: status || undefined, limit: 100 })
      .then((response) => setExperts(response.experts))
      .catch((error) => setFeedback({ type: "error", message: error.response?.data?.message || "Unable to load experts." }));
  }, [status]);
  useEffect(load, [load]);

  const act = async (item, decision) => {
    setBusyId(item._id); setFeedback({ type: "", message: "" });
    try {
      const result = await decideExpert(item._id, decision, notes[item._id] || "");
      setExperts((current) => current
        .map((expert) => expert._id === item._id ? { ...expert, ...result.expert, account: result.account } : expert)
        .filter((expert) => !status || expert.status === status));
      setFeedback({ type: "success", message: `${item.displayName} account updated successfully.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Unable to update expert." });
    } finally { setBusyId(""); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Experts</h2><p className="mt-1 text-slate-500">Review synchronized Expert accounts, expertise, and approval state.</p></div>
    <select value={status} onChange={(event) => setSearchParams(event.target.value ? { status: event.target.value } : {})} className="rounded-xl border px-3 py-2">
      <option value="">All profile states</option>
      {["pending", "active", "rejected", "suspended", "inactive", "unavailable"].map((value) => <option key={value}>{value}</option>)}
    </select>
    {feedback.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{feedback.message}</p>}
    {!experts ? <LoadingSkeleton count={4} /> : !experts.length
      ? <EmptyState title="No experts" description="Expert onboarding submissions matching this filter will appear here." />
      : <div className="grid gap-4 lg:grid-cols-2">{experts.map((item) => <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex justify-between gap-4"><div><h3 className="font-bold">{item.displayName}</h3><p className="mt-1 text-sm text-slate-600">{item.email || item.account?.email || "No email"} · {item.phone || item.account?.mobile || "No mobile"}</p><p className="text-xs text-slate-500">{item.userId}</p></div><span className="h-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase text-amber-800">{item.status}</span></div>
        <p className="mt-3 text-sm text-slate-600">Expertise: {[...(item.categories || []), ...(item.skills || [])].join(", ") || "Not provided"}</p>
        <p className="mt-2 text-xs text-slate-500">Registered {formatDate(item.createdAt)} · Account {item.account?.status || "unlinked"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-blue-50 p-2"><strong className="block text-lg">{item.activeAssignments}</strong>Active</div><div className="rounded-lg bg-emerald-50 p-2"><strong className="block text-lg">{item.completedApplications}</strong>Done</div><div className="rounded-lg bg-amber-50 p-2"><strong className="block text-lg">{item.pendingApplications}</strong>Pending</div></div>
        <input value={notes[item._id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item._id]: event.target.value }))} maxLength={500} placeholder="Internal decision note (optional)" className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" />
        <div className="mt-3 flex flex-wrap gap-2"><Link to={`/admin/experts/${item._id}`} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">View</Link>{decisionsFor(item).map((decision) => <button key={decision} disabled={busyId === item._id} onClick={() => act(item, decision)} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${decision === "approve" || decision === "activate" ? "bg-emerald-700 text-white" : decision === "reject" || decision === "suspend" ? "bg-rose-700 text-white" : "border"}`}>{busyId === item._id ? "Updating…" : decision[0].toUpperCase() + decision.slice(1)}</button>)}</div>
      </article>)}</div>}
  </div>;
};

export default AdminExperts;
