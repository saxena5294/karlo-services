import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptLead, getLeadDetails } from "../../api/partnerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const PartnerLeadDetails = () => {
  const { id } = useParams(); const navigate = useNavigate(); const [lead, setLead] = useState(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; getLeadDetails(id).then((response) => active && setLead(response.lead)).catch((requestError) => active && setError(requestError.response?.data?.message || "Lead not found.")); return () => { active = false; }; }, [id]);
  const accept = async () => { setBusy(true); setError(""); try { const response = await acceptLead(id); navigate(`/partner/applications/${response.lead.application}`); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to accept this lead."); setBusy(false); } };
  if (error && !lead) return <EmptyState title="Lead unavailable" description={error} action={<Link to="/partner/leads" className="font-semibold text-blue-700">Back to leads</Link>} />;
  if (!lead) return <LoadingSkeleton count={4} />;
  return <div className="space-y-6"><Link to="/partner/leads" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={17} /> Back to leads</Link>{error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}<section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">{lead.category}</p><h2 className="mt-2 text-2xl font-bold">{lead.serviceTitle}</h2><p className="mt-2 text-slate-500">{lead.city} · {lead.pincode}</p></div><StatusBadge status={lead.status} /></div><div className="mt-6 rounded-xl bg-slate-50 p-5"><h3 className="font-bold">Safe requirement summary</h3><p className="mt-2 leading-7 text-slate-700">{lead.safeRequirementSummary}</p></div><dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-slate-500">Lead price</dt><dd className="mt-1 text-xl font-bold">₹{lead.leadPrice}</dd></div><div><dt className="text-sm text-slate-500">Published</dt><dd className="mt-1 font-semibold">{formatDate(lead.createdAt)}</dd></div><div><dt className="text-sm text-slate-500">Expires</dt><dd className="mt-1 font-semibold">{formatDate(lead.expiresAt)}</dd></div></dl><div className="mt-6 flex gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><ShieldCheck className="shrink-0" size={20} /><p>Customer identity, contact information, application data and documents remain hidden until this lead is accepted.</p></div>{lead.status === "open" && <button type="button" disabled={busy} onClick={accept} className="mt-6 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Accepting securely..." : "Accept lead"}</button>}</section></div>;
};
export default PartnerLeadDetails;
