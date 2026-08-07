import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminExpert } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminExpertDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getAdminExpert(id).then(setData).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load expert.")); }, [id]);
  if (error) return <EmptyState title="Expert unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={4} />;
  const { expert, account, applications, approvalHistory } = data;
  return <div className="space-y-6"><div><Link to="/admin/experts" className="text-sm font-semibold text-blue-700">← Experts</Link><h1 className="mt-2 text-2xl font-bold">{expert.displayName}</h1><p className="text-sm text-slate-500">{expert.userId}</p></div><section className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">{[["Email", expert.email || account?.email || "—"], ["Mobile", expert.phone || account?.mobile || "—"], ["Profile", expert.status], ["Account", account?.status || "Unlinked"]].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>)}</section><section><h2 className="text-lg font-bold">Assigned applications ({applications.length})</h2><p className="mt-2 text-sm text-slate-500">{applications.length ? applications.map((item) => item.applicationNumber).join(", ") : "No assigned applications."}</p></section><section><h2 className="text-lg font-bold">Approval history</h2>{approvalHistory.length ? <ol className="mt-3 space-y-2">{approvalHistory.map((item) => <li key={item._id} className="rounded-xl border bg-white p-4"><p className="font-semibold">{item.summary}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)} · {item.actorUserId}</p></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No approval actions recorded yet.</p>}</section></div>;
};

export default AdminExpertDetails;
