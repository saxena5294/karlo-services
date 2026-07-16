import { BriefcaseBusiness, CircleCheck, IndianRupee, ListChecks, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPartnerDashboardSummary } from "../../api/partnerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const PartnerDashboard = () => {
  const [data, setData] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getPartnerDashboardSummary().then((response) => active && setData(response)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load partner dashboard.")); return () => { active = false; }; }, []);
  if (error) return <EmptyState title="Dashboard unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={5} />;
  const cards = [["Available Leads", data.summary.availableLeads, Store, "blue"], ["Accepted Leads", data.summary.acceptedLeads, ListChecks, "violet"], ["Active Work", data.summary.activeWork, BriefcaseBusiness, "amber"], ["Completed Work", data.summary.completedWork, CircleCheck, "emerald"], ["Wallet Balance", `₹${data.summary.walletBalance}`, IndianRupee, "blue"]];
  return <div className="space-y-8"><section><h2 className="text-2xl font-bold">Partner marketplace</h2><p className="mt-1 text-slate-500">Browse suitable leads and manage accepted service work.</p>{data.verificationStatus !== "approved" && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Your verification status is <strong>{data.verificationStatus}</strong>. Lead acceptance becomes available after approval.</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([title, value, icon, accent]) => <StatCard key={title} title={title} value={value} icon={icon} accent={accent} />)}</div></section>
    <section><div className="mb-4 flex justify-between"><div><h3 className="text-xl font-bold">Recent matching leads</h3><p className="mt-1 text-sm text-slate-500">Only privacy-safe marketplace details are shown before acceptance.</p></div><Link to="/partner/leads" className="text-sm font-semibold text-blue-700">View all</Link></div>{data.recentLeads.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.recentLeads.map((lead) => <Link key={lead._id} to={`/partner/leads/${lead._id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"><div className="flex justify-between gap-3"><h4 className="font-bold">{lead.serviceTitle}</h4><StatusBadge status={lead.status} /></div><p className="mt-2 text-sm text-slate-500">{lead.city} · {lead.pincode}</p><p className="mt-3 line-clamp-2 text-sm">{lead.safeRequirementSummary}</p><div className="mt-4 flex justify-between text-xs text-slate-500"><span>₹{lead.leadPrice}</span><span>{formatDate(lead.createdAt)}</span></div></Link>)}</div> : <EmptyState title="No matching leads" description="New approved marketplace leads will appear here." />}</section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between"><h3 className="font-bold">Recent notifications</h3><Link to="/partner/notifications" className="text-sm font-semibold text-blue-700">View all</Link></div><div className="mt-3 divide-y">{data.recentNotifications.length ? data.recentNotifications.map((notification) => <Link key={notification._id} to={notification.link} className="block py-3"><div className="flex justify-between gap-3"><p className="font-semibold">{notification.title}</p><span className="text-xs text-slate-400">{formatDate(notification.createdAt)}</span></div><p className="mt-1 text-sm text-slate-500">{notification.message}</p></Link>) : <p className="py-4 text-sm text-slate-500">No recent notifications.</p>}</div></section>
  </div>;
};
export default PartnerDashboard;
