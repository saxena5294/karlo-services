import { useEffect, useState } from "react";
import { getAuditLogs } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminAuditLogs=()=>{const [data,setData]=useState(null);const [error,setError]=useState("");useEffect(()=>{getAuditLogs({limit:100}).then(setData).catch((e)=>setError(e.response?.data?.message||"Unable to load audit logs."));},[]);return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Audit logs</h2><p className="mt-1 text-slate-500">Redacted, append-only records of important administrative actions.</p></div>{error&&<EmptyState title="Audit logs unavailable" description={error}/>} {!data?<LoadingSkeleton count={6}/>:!data.auditLogs.length?<EmptyState title="No audit events" description="Important admin mutations will be recorded here."/>:<div className="space-y-3">{data.auditLogs.map((log)=><article key={log._id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{log.summary}</strong><span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span></div><p className="mt-1 text-xs text-slate-500">{log.actorUserId} · {log.action} · {log.entityType}:{log.entityId}</p></article>)}</div>}</div>};
export default AdminAuditLogs;
