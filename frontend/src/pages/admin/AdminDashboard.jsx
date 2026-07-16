import { Activity, CircleCheck, CircleX, FileText, Store, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboardSummary } from "../../api/adminApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getAdminDashboardSummary().then((response) => active && setData(response)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load dashboard."));
    return () => { active = false; };
  }, []);
  if (error) return <EmptyState title="Dashboard unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={6} />;
  const { summary } = data;
  const cards = [
    ["Total Applications", summary.totalApplications, FileText, "blue"], ["Today", summary.todayApplications, Activity, "amber"],
    ["Submitted", summary.submitted, Activity, "amber"], ["Unassigned", summary.unassigned, FileText, "rose"],
    ["Assigned to Experts", summary.assignedToExperts, Store, "blue"], ["Assigned to Partners", summary.assignedToPartners, Store, "violet"], ["Processing", summary.processing, Activity, "violet"],
    ["Documents Required", summary.documentsRequired, FileText, "amber"], ["Completed", summary.completed, CircleCheck, "emerald"],
    ["Rejected", summary.rejected, CircleX, "rose"], ["Active Services", summary.activeServices, Wrench, "blue"],
    ["Active Customers", summary.totalCustomers, Users, "violet"], ["Active Experts", summary.activeExperts, Store, "emerald"],
    ["Open Leads", summary.openLeads, Store, "blue"], ["Accepted Leads", summary.acceptedLeads, CircleCheck, "emerald"],
    ["Pending Partner Approvals", summary.pendingPartnerApprovals, Users, "amber"], ["Active Partners", summary.activePartners, Store, "emerald"],
  ];
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold whitespace-nowrap" },
    { label: "Customer", render: (item) => item.customerName }, { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> }, { label: "Submitted", render: (item) => formatDate(item.createdAt), cellClassName: "whitespace-nowrap text-slate-500" },
  ];
  return <div className="space-y-8"><section><h2 className="text-2xl font-bold">Operations overview</h2><p className="mt-1 text-slate-500">Live application, service, customer, and expert statistics.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([title, value, icon, accent]) => <StatCard key={title} title={title} value={value} icon={icon} accent={accent} />)}</div></section>
    <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Applications by status</h3><div className="mt-4 space-y-3">{data.applicationsByStatus.map((item) => <div key={item._id} className="flex justify-between text-sm"><StatusBadge status={item._id} /><span className="font-bold">{item.count}</span></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Applications by service</h3><div className="mt-4 space-y-3">{data.applicationsByService.slice(0, 8).map((item) => <div key={String(item.serviceId)} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.serviceTitle}</span><span className="font-bold">{item.count}</span></div>)}</div></div></section>
    <section><div className="mb-4 flex justify-between"><h3 className="text-xl font-bold">Recent applications</h3><Link to="/admin/applications" className="text-sm font-semibold text-blue-700">View all</Link></div>{data.recentApplications.length ? <ApplicationTable applications={data.recentApplications} columns={columns} getRowLink={(item) => `/admin/applications/${item._id}`} renderMobile={(item) => <><div className="flex justify-between gap-3"><div><p className="font-bold">{item.service?.title}</p><p className="text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm">{item.customerName}</p></>} /> : <EmptyState title="No applications" description="Submitted applications will appear here." />}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Recent activity</h3><div className="mt-4 divide-y divide-slate-100">{data.recentActivity.map((item) => <div key={item._id} className="py-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{item.application?.applicationNumber || "Application"} · {item.status}</span><span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span></div><p className="mt-1 text-slate-500">{item.remarks}</p></div>)}</div></section>
  </div>;
};
export default AdminDashboard;
