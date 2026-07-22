import { CircleCheck, Clock3, FileCheck2, FileText, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ApplicationTable from "./ApplicationTable";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const AssigneeDashboard = ({ role, loadSummary }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    loadSummary().then((value) => current && setData(value)).catch((requestError) => {
      if (current) setError(requestError.response?.data?.message || "Unable to load your dashboard.");
    });
    return () => { current = false; };
  }, [loadSummary]);
  if (error) return <EmptyState title="Dashboard unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={5} />;
  const base = `/${role}`;
  const { profile = {}, summary = {}, recentAssignments = [] } = data;
  const stats = [
    ["Assigned Work", summary.assigned, FileText, "blue"],
    ["Processing", summary.processing, Clock3, "violet"],
    ["Documents Required", summary.documentsRequired, FileWarning, "amber"],
    ["Awaiting Admin Review", summary.awaitingAdminReview, FileCheck2, "cyan"],
    ["Completed", summary.completed ?? summary.completedToday, CircleCheck, "emerald"],
  ];
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Assigned", render: (item) => formatDate(item.assignedAt), cellClassName: "text-slate-500" },
  ];
  return <div className="space-y-8">
    <section><h1 className="text-2xl font-bold">Welcome, {profile.name || role}</h1><p className="mt-1 text-slate-500">Process only the applications assigned to you and submit completed work for admin review.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([title, value, icon, accent]) => <StatCard key={title} title={title} value={value || 0} icon={icon} accent={accent} />)}</div></section>
    <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Recent assignments</h2><p className="mt-1 text-sm text-slate-500">Your five latest assigned applications.</p></div><Link to={`${base}/applications`} className="text-sm font-semibold text-blue-700 hover:underline">View all</Link></div>{recentAssignments.length ? <ApplicationTable applications={recentAssignments} columns={columns} getRowLink={(item) => `${base}/applications/${item._id}`} renderMobile={(item) => <><div className="flex justify-between gap-3"><div><p className="font-bold">{item.service?.title}</p><p className="text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm">{item.customerName}</p></>} /> : <EmptyState title="No assignments" description="Applications assigned by an administrator will appear here." />}</section>
  </div>;
};

export default AssigneeDashboard;
