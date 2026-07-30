import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCrmEntity } from "../../../api/crmApi";
import CrmActivityPanels from "../../../components/crm/CrmActivityPanels";
import { CrmBadge, CrmHeader } from "../../../components/crm/CrmUi";
import EmptyState from "../../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../../utils/dashboardFormatters";

const CrmEntityDetails = ({ type }) => {
  const { id } = useParams(); const [data, setData] = useState(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setData(await getCrmEntity(`${type}s`, id)); setError(""); } catch (requestError) { setError(requestError.response?.data?.message || `Unable to load ${type}.`); } }, [id, type]);
  useEffect(() => { let active = true; getCrmEntity(`${type}s`, id).then((result) => { if (active) { setData(result); setError(""); } }).catch((requestError) => active && setError(requestError.response?.data?.message || `Unable to load ${type}.`)); return () => { active = false; }; }, [id, type]);
  if (error) return <EmptyState title={`${type} unavailable`} description={error}/>;
  if (!data) return <LoadingSkeleton count={8}/>;
  const profile = data[type]; const title = profile.name || profile.businessName || profile.displayName; const sourceId = profile.userId;
  return <div className="space-y-7"><CrmHeader title={title} description={`${type[0].toUpperCase()}${type.slice(1)} CRM profile · ${sourceId}`}/><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Contact</p><strong className="mt-1 block">{profile.email || "No email"}</strong><span className="text-sm text-slate-500">{profile.mobile || profile.phone || "No phone"}</span></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Status</p><div className="mt-2"><CrmBadge value={profile.status || profile.verificationStatus || "active"}/></div></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Applications</p><strong className="mt-1 block text-2xl">{data.applications?.length || data.performance?.total || 0}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Last activity</p><strong className="mt-1 block">{formatDate(profile.lastActivity || profile.updatedAt)}</strong></div></section>{data.applications?.length > 0 && <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Applications and assignments</h2><div className="mt-4 divide-y">{data.applications.map((item) => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link to={`/admin/applications/${item._id}`} className="font-semibold text-blue-700">{item.applicationNumber}</Link><p className="text-xs text-slate-500">{item.service?.title || "Service"} · {formatDate(item.createdAt)}</p></div><CrmBadge value={item.status}/></div>)}</div></section>}<CrmActivityPanels entityType={type} entityId={sourceId} data={data} onRefresh={load}/></div>;
};
export default CrmEntityDetails;
