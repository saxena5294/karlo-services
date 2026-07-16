import { useEffect, useState } from "react";
import { getAdminReports } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";

const ReportTable = ({ title, rows, labelKey, valueKey = "count" }) => <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">{title}</h3><div className="mt-4 divide-y divide-slate-100">{rows.map((item, index) => <div key={`${item[labelKey]}-${index}`} className="flex justify-between gap-4 py-3 text-sm"><span className="truncate">{item[labelKey] || "Unassigned"}</span><span className="font-bold">{item[valueKey]}</span></div>)}</div></section>;

const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getAdminReports().then((response) => active && setReports(response.reports)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load reports.")); return () => { active = false; }; }, []);
  if (error) return <EmptyState title="Reports unavailable" description={error} />;
  if (!reports) return <LoadingSkeleton count={5} />;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Operational reports</h2><p className="mt-1 text-slate-500">Application outcomes and processing performance. No financial reporting is included.</p></div><div className="grid gap-4 sm:grid-cols-3"><StatCard title="Completion Rate" value={`${reports.completionRate.toFixed(1)}%`} /><StatCard title="Rejection Rate" value={`${reports.rejectionRate.toFixed(1)}%`} accent="rose" /><StatCard title="Average Processing" value={reports.averageProcessingMs ? `${(reports.averageProcessingMs / 86400000).toFixed(1)} days` : "—"} accent="violet" /></div><div className="grid gap-6 lg:grid-cols-2"><ReportTable title="By status" rows={reports.byStatus} labelKey="_id" /><ReportTable title="By service" rows={reports.byService} labelKey="serviceTitle" /><ReportTable title="By expert" rows={reports.byExpert} labelKey="_id" /><ReportTable title="Submitted by date" rows={reports.byDate} labelKey="_id" /></div></div>;
};

export default AdminReports;
