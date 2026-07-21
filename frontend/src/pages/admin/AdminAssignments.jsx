import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminAssignments } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminAssignments = () => {
  const [data, setData] = useState(null); const [error, setError] = useState(""); const [type, setType] = useState("");
  useEffect(() => { let active = true; getAdminAssignments({ assignmentType: type || undefined, limit: 100 }).then((result) => active && setData(result)).catch((e) => active && setError(e.response?.data?.message || "Unable to load assignments.")); return () => { active = false; }; }, [type]);
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Assignments</h2><p className="mt-1 text-slate-500">Current and historical expert and partner ownership.</p></div><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border px-3 py-2"><option value="">All types</option><option value="expert">Expert</option><option value="partner">Partner</option></select>{error && <EmptyState title="Assignments unavailable" description={error} />}{!data ? <LoadingSkeleton count={5} /> : !data.assignments.length ? <EmptyState title="No assignments" description="Assignments will appear when applications are routed." /> : <div className="grid gap-3">{data.assignments.map((item) => <Link key={item._id} to={`/admin/applications/${item.application?._id}`} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.application?.applicationNumber || "Archived application"}</strong><span className={`rounded-full px-2 py-1 text-xs ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "Active" : "Ended"}</span></div><p className="mt-2 text-sm text-slate-600">{item.assignmentType === "expert" ? item.expertUserId : item.partnerUserId} · {formatDate(item.createdAt)}</p></Link>)}</div>}</div>;
};
export default AdminAssignments;
