import {
  Activity,
  ArrowRight,
  CircleCheck,
  CircleX,
  Clock3,
  FileClock,
  FilePlus2,
  FileText,
  Handshake,
  LayoutGrid,
  Store,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboardSummary } from "../../api/adminApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const SectionHeading = ({ title, description }) => (
  <div>
    <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h2>
    {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
  </div>
);

const MetricGrid = ({ items, featured = false }) => (
  <div className={`mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${featured ? "xl:grid-cols-5" : "xl:grid-cols-4 2xl:grid-cols-5"}`}>
    {items.map((item) => <StatCard key={item.title} {...item} featured={featured} />)}
  </div>
);

const EmptyChart = ({ message }) => (
  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-sm text-slate-500">
    {message}
  </div>
);

const StatusChart = memo(({ items }) => {
  const normalized = items.filter((item) => Number(item.count) > 0);
  const total = normalized.reduce((sum, item) => sum + item.count, 0);
  const colors = ["#2563eb", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#64748b", "#06b6d4", "#ec4899"];
  const stops = normalized.map((item, index) => {
    const previousTotal = normalized.slice(0, index).reduce((sum, entry) => sum + entry.count, 0);
    const start = (previousTotal / total) * 100;
    const end = ((previousTotal + item.count) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  if (!total) return <EmptyChart message="No application status data yet." />;
  return (
    <div className="grid min-h-56 items-center gap-6 sm:grid-cols-[auto_1fr]">
      <div className="relative mx-auto h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }} role="img" aria-label={`${total} applications grouped by status`}>
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <strong className="text-2xl text-slate-950">{total}</strong>
          <span className="text-xs text-slate-500">applications</span>
        </div>
      </div>
      <ul className="space-y-2.5" aria-label="Application status legend">
        {normalized.slice(0, 8).map((item, index) => (
          <li key={item._id} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-600">{item._id}</span>
            <strong className="tabular-nums text-slate-900">{item.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
});
StatusChart.displayName = "StatusChart";

const ServiceChart = memo(({ items }) => {
  const normalized = items.filter((item) => Number(item.count) > 0).slice(0, 6);
  const maximum = Math.max(...normalized.map((item) => item.count), 0);
  if (!maximum) return <EmptyChart message="No service activity to chart yet." />;
  return (
    <div className="min-h-56 space-y-4 pt-1" role="img" aria-label="Top services by application count">
      {normalized.map((item) => (
        <div key={String(item.serviceId)}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-600" title={item.serviceTitle}>{item.serviceTitle}</span>
            <strong className="shrink-0 tabular-nums text-slate-900">{item.count}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${Math.max((item.count / maximum) * 100, 4)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
});
ServiceChart.displayName = "ServiceChart";

const DashboardSkeleton = () => (
  <div className="space-y-9" aria-label="Loading admin dashboard" role="status">
    <div className="animate-pulse"><div className="h-8 w-64 rounded bg-slate-200" /><div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" /></div>
    {[5, 6, 5].map((count, sectionIndex) => (
      <section key={count + sectionIndex} className="animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: count }, (_, index) => <div key={index} className="h-40 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="mt-5 h-9 w-20 rounded bg-slate-100" /><div className="mt-5 h-3 w-4/5 rounded bg-slate-100" /></div>)}
        </div>
      </section>
    ))}
    <span className="sr-only">Loading dashboard data...</span>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAdminDashboardSummary()
      .then((response) => active && setData(response))
      .catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load dashboard."));
    return () => { active = false; };
  }, []);

  const columns = useMemo(() => [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold whitespace-nowrap" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Submitted", render: (item) => formatDate(item.createdAt), cellClassName: "whitespace-nowrap text-slate-500" },
  ], []);

  if (error) return <EmptyState title="Dashboard unavailable" description={error} />;
  if (!data) return <DashboardSkeleton />;

  const { summary } = data;
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const primaryMetrics = [
    { title: "Total Applications", value: summary.totalApplications, icon: FileText, accent: "blue", description: "All submitted applications", to: "/admin/applications" },
    { title: "Today's Applications", value: summary.todayApplications, icon: Activity, accent: "amber", description: summary.todayApplications ? "Received since midnight" : "No applications received today", to: `/admin/applications?dateFrom=${localDate}&dateTo=${localDate}` },
    { title: "Processing", value: summary.processing, icon: Clock3, accent: "violet", description: summary.processing ? "Currently being processed" : "No applications in processing", to: "/admin/applications?status=Processing" },
    { title: "Completed", value: summary.completed, icon: CircleCheck, accent: "emerald", description: "Successfully completed", to: "/admin/applications?status=Completed" },
    { title: "Active Customers", value: summary.totalCustomers, icon: Users, accent: "violet", description: "Customers using the platform", to: "/admin/customers" },
    { title: "Active Partners", value: summary.activePartners, icon: Handshake, accent: "emerald", description: "Approved service partners", to: "/admin/partners" },
  ];
  const applicationMetrics = [
    { title: "Submitted", value: summary.submitted, icon: FilePlus2, accent: "blue", description: "Awaiting initial review", to: "/admin/applications?status=Submitted" },
    { title: "Unassigned", value: summary.unassigned, icon: FileClock, accent: "rose", description: summary.unassigned ? "Needs an assignee" : "No unassigned applications", to: "/admin/applications?assignmentType=none" },
    { title: "Assigned to Experts", value: summary.assignedToExperts, icon: UserCheck, accent: "blue", description: "Active expert assignments", to: "/admin/applications?assignmentType=expert" },
    { title: "Assigned to Partners", value: summary.assignedToPartners, icon: Store, accent: "violet", description: "Active partner assignments", to: "/admin/applications?assignmentType=partner" },
    { title: "Documents Required", value: summary.documentsRequired, icon: FileText, accent: "amber", description: summary.documentsRequired ? "Waiting for customer documents" : "No documents pending", to: "/admin/applications?status=Documents%20Required" },
    { title: "Awaiting Admin Review", value: summary.awaitingAdminReview, icon: FileClock, accent: "amber", description: "Completed work requiring admin review", to: "/admin/applications?status=Awaiting%20Admin%20Review" },
    { title: "Rejected", value: summary.rejected, icon: CircleX, accent: "rose", description: summary.rejected ? "Applications not approved" : "No rejected applications", to: "/admin/applications?status=Rejected" },
  ];
  const businessMetrics = [
    { title: "Active Experts", value: summary.activeExperts, icon: UserCheck, accent: "emerald", description: "Available for assignments", to: "/admin/experts" },
    { title: "Active Services", value: summary.activeServices, icon: Wrench, accent: "blue", description: "Services visible to customers", to: "/admin/services" },
    { title: "Assigned Work", value: summary.assignedApplications, icon: FileText, accent: "blue", description: "Applications assigned to experts and partners", to: "/admin/applications" },
    { title: "Pending Document Requests", value: summary.pendingDocumentRequests, icon: FileClock, accent: "amber", description: "Applications waiting for customer documents", to: "/admin/applications?status=Documents%20Required" },
    { title: "Pending Partner Approvals", value: summary.pendingPartnerApprovals, icon: Users, accent: "amber", description: summary.pendingPartnerApprovals ? "Requires admin review" : "No approvals pending" },
  ];
  const quickActions = [
    { label: "New Service", description: "Add to the catalogue", icon: FilePlus2, to: "/admin/services/new" },
    { label: "View Applications", description: "Review incoming work", icon: FileText, to: "/admin/applications" },
    { label: "Manage Partners", description: "Verify and support", icon: Handshake, to: "/admin/partners" },
    { label: "Manage Experts", description: "Review availability", icon: UserCheck, to: "/admin/experts" },
    { label: "Manage Customers", description: "View customer records", icon: Users, to: "/admin/customers" },
  ];

  return (
    <div className="space-y-10 pb-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Admin workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Operations at a glance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Monitor applications, platform capacity, and partner activity from one focused view.</p>
        </div>
        <Link to="/admin/reports" className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          View reports <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <section aria-labelledby="operations-heading">
        <div id="operations-heading"><SectionHeading title="Operations overview" description="The metrics that need attention most often." /></div>
        <MetricGrid items={primaryMetrics} featured />
      </section>

      <section aria-labelledby="quick-actions-heading">
        <div id="quick-actions-heading"><SectionHeading title="Quick actions" description="Jump directly into common admin workflows." /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickActions.map(({ label, description, icon: Icon, to }) => (
            <Link key={label} to={to} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2" aria-label={`${label}: ${description}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-700"><Icon size={19} aria-hidden="true" /></span>
              <span className="min-w-0"><strong className="block text-sm text-slate-900">{label}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="application-status-heading">
        <div id="application-status-heading"><SectionHeading title="Application status" description="Workload grouped by its current stage and assignment." /></div>
        <MetricGrid items={applicationMetrics} />
      </section>

      <section aria-labelledby="business-overview-heading">
        <div id="business-overview-heading"><SectionHeading title="Platform & business overview" description="Capacity, services, leads, and partner onboarding." /></div>
        <MetricGrid items={businessMetrics} />
      </section>

      <section aria-labelledby="insights-heading">
        <div id="insights-heading"><SectionHeading title="Application insights" description="A lightweight view of status distribution and service demand." /></div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><LayoutGrid size={18} aria-hidden="true" /></span><div><h3 className="font-bold text-slate-950">Applications by status</h3><p className="text-xs text-slate-500">Current distribution across every stage</p></div></div><StatusChart items={data.applicationsByStatus} /></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Wrench size={18} aria-hidden="true" /></span><div><h3 className="font-bold text-slate-950">Applications by service</h3><p className="text-xs text-slate-500">Top services by application volume</p></div></div><ServiceChart items={data.applicationsByService} /></article>
        </div>
      </section>

      <section aria-labelledby="recent-applications-heading">
        <div className="mb-5 flex items-end justify-between gap-4"><div id="recent-applications-heading"><SectionHeading title="Recent applications" description="The latest submissions across all services." /></div><Link to="/admin/applications" className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800">View all</Link></div>
        {data.recentApplications.length ? <ApplicationTable applications={data.recentApplications} columns={columns} getRowLink={(item) => `/admin/applications/${item._id}`} renderMobile={(item) => <><div className="flex justify-between gap-3"><div><p className="font-bold">{item.service?.title}</p><p className="text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm">{item.customerName}</p></>} /> : <EmptyState title="No recent applications" description="Newly submitted applications will appear here." />}
      </section>

      <section aria-labelledby="recent-activity-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div id="recent-activity-heading"><SectionHeading title="Recent activity" description="Latest application updates and assignments." /></div>
        {data.recentActivity.length ? <ol className="mt-5 divide-y divide-slate-100">{data.recentActivity.map((item) => <li key={item._id} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Activity size={15} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><p className="font-semibold text-slate-800">{item.application?.applicationNumber || "Application"} <span className="font-normal text-slate-500">moved to</span> {item.status}</p><time className="shrink-0 text-xs text-slate-400" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div><p className="mt-1 text-sm leading-6 text-slate-500">{item.remarks || "Application status updated."}</p></div></li>)}</ol> : <div className="mt-5"><EmptyChart message="No recent activity yet. Updates will appear here as work progresses." /></div>}
      </section>
    </div>
  );
};

export default AdminDashboard;
