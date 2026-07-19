import {
  CircleCheck,
  Clock3,
  FileWarning,
  FilePlus2,
  Files,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerDashboardSummary } from "../../api/customerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";
import AdvertisementBanner from "../../components/dashboard/AdvertisementBanner";
import DashboardNotice from "../../components/dashboard/DashboardNotice";

const CustomerDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getCustomerDashboardSummary()
      .then((response) => isCurrent && setData(response))
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.response?.data?.message || "Unable to load your dashboard.");
        }
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (error) {
    return <EmptyState title="Dashboard unavailable" description={error} />;
  }

  if (!data) return <LoadingSkeleton count={5} />;

  const { summary, recentApplications } = data;
  const stats = [
    ["Total Applications", summary.total, Files, "blue"],
    ["Submitted", summary.submitted, FilePlus2, "amber"],
    ["Processing", summary.processing, Clock3, "violet"],
    ["Completed", summary.completed, CircleCheck, "emerald"],
    ["Documents Required", summary.documentsRequired, FileWarning, "rose"],
  ];

  return (
    <div className="space-y-8">
      <DashboardNotice audience="customer" />
      <AdvertisementBanner />
      <section>
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="mt-1 text-slate-500">Here is the latest activity across your service applications.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(([title, value, icon, accent]) => (
            <StatCard key={title} title={title} value={value} icon={icon} accent={accent} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/services" className="group rounded-2xl bg-blue-700 p-6 text-white shadow-sm transition hover:bg-blue-800">
          <FilePlus2 size={28} />
          <h2 className="mt-4 text-xl font-bold">Browse services</h2>
          <p className="mt-2 text-sm leading-6 text-blue-100">Start a new application using a service-specific form.</p>
          <span className="mt-5 inline-block text-sm font-semibold group-hover:underline">Explore services →</span>
        </Link>
        <Link to="/track" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300">
          <Search size={28} className="text-blue-700" />
          <h2 className="mt-4 text-xl font-bold">Track an application</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use an application number for a quick public status check.</p>
          <span className="mt-5 inline-block text-sm font-semibold text-blue-700 group-hover:underline">Open tracker →</span>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Recent applications</h2>
            <p className="mt-1 text-sm text-slate-500">Your five most recently submitted applications.</p>
          </div>
          <Link to="/customer/applications" className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">View all</Link>
        </div>

        {!recentApplications.length ? (
          <EmptyState
            title="No applications yet"
            description="Choose a service to submit your first application."
            action={<Link to="/services" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Browse services</Link>}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-200 md:hidden">
              {recentApplications.map((application) => (
                <Link key={application._id} to={`/customer/applications/${application._id}`} className="block p-5 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-bold">{application.service?.title}</p><p className="mt-1 break-all text-xs text-slate-500">{application.applicationNumber}</p></div>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Submitted {formatDate(application.createdAt)}</p>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Application</th><th className="px-5 py-4">Service</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4"><span className="sr-only">Open</span></th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {recentApplications.map((application) => (
                    <tr key={application._id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 font-semibold">{application.applicationNumber}</td><td className="px-5 py-4">{application.service?.title}</td><td className="px-5 py-4"><StatusBadge status={application.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(application.createdAt)}</td><td className="px-5 py-4 text-right"><Link to={`/customer/applications/${application._id}`} className="font-semibold text-blue-700 hover:underline">View</Link></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CustomerDashboard;
