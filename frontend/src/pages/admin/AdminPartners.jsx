import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { decidePartner, getAdminPartners, getPendingPartnerApprovals } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const decisionsFor = (item) => {
  if (!item.onboardingComplete && !item._id) return [];
  return item.verificationStatus === "pending" || item.verificationStatus === "under_review"
    ? ["approve", "reject"]
    : item.account?.status === "active" ? ["suspend", "deactivate"] : ["activate"];
};

const AdminPartners = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const [partners, setPartners] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState({});

  const load = useCallback(() => {
    const request = status === "pending"
      ? getPendingPartnerApprovals({ limit: 100 })
      : getAdminPartners({ verificationStatus: status || undefined, limit: 100 });
    request.then((response) => setPartners(response.partners))
      .catch((error) => setFeedback({ type: "error", message: error.response?.data?.message || "Unable to load partners." }));
  }, [status]);
  useEffect(load, [load]);

  const act = async (item, decision) => {
    setBusyId(item._id); setFeedback({ type: "", message: "" });
    try {
      const result = await decidePartner(item._id, decision, notes[item._id] || "");
      setPartners((current) => current
        .map((partner) => partner._id === item._id ? { ...partner, ...result.partner, account: result.account } : partner)
        .filter((partner) => !status || partner.verificationStatus === status));
      setFeedback({ type: "success", message: `${item.businessName} account updated successfully.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Unable to update partner." });
    } finally { setBusyId(""); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Partners</h1><p className="mt-1 text-slate-500">Review synchronized Partner accounts and business profiles.</p></div>
    <select value={status} onChange={(event) => setSearchParams(event.target.value ? { status: event.target.value } : {})} className="rounded-xl border px-3 py-2"><option value="">All verification states</option>{["pending", "under_review", "approved", "rejected", "suspended"].map((value) => <option key={value}>{value}</option>)}</select>
    {feedback.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{feedback.message}</p>}
    {!partners ? <LoadingSkeleton count={5} /> : !partners.length
      ? <EmptyState title="No partners" description="Partner onboarding submissions matching this filter will appear here." />
      : <div className="grid gap-4 lg:grid-cols-2">{partners.map((item) => {
        const rowId = item._id || item.account?._id || item.userId;
        return <article key={rowId} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-3"><div>{item._id ? <Link to={`/admin/partners/${item._id}`} className="font-bold text-blue-700">{item.businessName}</Link> : <h2 className="font-bold">{item.businessName}</h2>}<p className="mt-1 text-sm text-slate-600">{item.ownerName || item.account?.name || "Partner"} · {item.mobile || item.account?.mobile || "No mobile"}</p><p className="text-xs text-slate-500">{item.email || item.account?.email || "No email"}{item.city ? ` · ${item.city}, ${item.state}` : " · Business profile not submitted"}</p></div><span className="h-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase text-amber-800">{item.account?.approval?.status || item.verificationStatus}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-400">Registered</span><p className="font-semibold">{formatDate(item.createdAt)}</p></div><div><span className="text-slate-400">Account</span><p className="font-semibold capitalize">{item.account?.status || "unlinked"}</p></div></div>
          {!item._id ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This account selected the Partner role but has not persisted its business profile. Ask the Partner to reopen and submit onboarding before approval.</p> : <><input value={notes[item._id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item._id]: event.target.value }))} maxLength={500} placeholder="Internal decision note (optional)" className="mt-4 w-full rounded-lg border px-3 py-2 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><Link to={`/admin/partners/${item._id}`} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700">View</Link>{decisionsFor(item).map((decision) => <button key={decision} disabled={busyId === item._id} onClick={() => act(item, decision)} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${decision === "approve" || decision === "activate" ? "bg-emerald-700 text-white" : decision === "reject" || decision === "suspend" ? "bg-rose-700 text-white" : "border"}`}>{busyId === item._id ? "Updating…" : decision[0].toUpperCase() + decision.slice(1)}</button>)}</div></>}
        </article>;
      })}</div>}
  </div>;
};

export default AdminPartners;
