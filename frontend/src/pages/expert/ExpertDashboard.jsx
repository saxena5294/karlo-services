import { CircleCheck, Clock3, FileText, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExpertDashboardSummary } from "../../api/expertApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const ExpertDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getExpertDashboardSummary()
      .then((response) => isCurrent && setData(response))
      .catch((requestError) => {
        if (isCurrent) setError(requestError.response?.data?.message || "Unable to load the expert dashboard.");
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (error) return <EmptyState title="Dashboard unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={4} />;

  const { summary, recentAssignments } = data;
  const stats = [
    ["Assigned Applications", summary.assigned, FileText, "blue"],
    ["Processing", summary.processing, Clock3, "violet"],
    ["Documents Required", summary.documentsRequired, FileWarning, "amber"],
    ["Completed Today", summary.completedToday, CircleCheck, "emerald"],
  ];
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "whitespace-nowrap font-semibold" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Assigned", render: (item) => formatDate(item.assignedAt), cellClassName: "whitespace-nowrap text-slate-500" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold">Expert workspace</h2>
        <p className="mt-1 text-slate-500">Review assigned work and keep customers informed through the application timeline.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([title, value, icon, accent]) => <StatCard key={title} title={title} value={value} icon={icon} accent={accent} />)}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Recent assignments</h2><p className="mt-1 text-sm text-slate-500">The five latest applications assigned to you.</p></div><Link to="/expert/applications" className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">View all</Link></div>
        {!recentAssignments.length ? (
          <EmptyState title="No assignments" description="Applications assigned by an administrator will appear here." />
        ) : (
          <ApplicationTable
            applications={recentAssignments}
            columns={columns}
            getRowLink={(item) => `/expert/applications/${item._id}`}
            renderMobile={(item) => <><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{item.service?.title}</p><p className="mt-1 break-all text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm font-medium">{item.customerName}</p><p className="mt-1 text-xs text-slate-500">Assigned {formatDate(item.assignedAt)}</p></>}
          />
        )}
      </section>
    </div>
  );
};

export default ExpertDashboard;
