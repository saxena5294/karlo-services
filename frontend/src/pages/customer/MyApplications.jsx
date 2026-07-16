import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerApplications } from "../../api/customerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const statuses = [
  "Submitted",
  "Assigned",
  "Documents Required",
  "Processing",
  "Approved",
  "Completed",
  "Rejected",
  "Cancelled",
];

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getCustomerApplications({ page, limit: 10, status: status || undefined, search: search || undefined })
      .then((response) => {
        if (isCurrent) {
          setApplications(response.applications);
          setPagination(response.pagination);
        }
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.response?.data?.message || "Unable to load applications.");
      })
      .finally(() => isCurrent && setLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [page, search, status]);

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === search && page === 1) return;
    setLoading(true);
    setError("");
    setPage(1);
    setSearch(nextSearch);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My applications</h2>
        <p className="mt-1 text-slate-500">Search, filter, and review applications associated with your account.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]">
        <form onSubmit={submitSearch} className="flex min-w-0 gap-2">
          <label htmlFor="application-search" className="sr-only">Search applications</label>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input id="application-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Number or service title" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="submit" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Search</button>
        </form>
        <div>
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select id="status-filter" value={status} onChange={(event) => { setLoading(true); setError(""); setStatus(event.target.value); setPage(1); }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} />
      ) : error ? (
        <EmptyState title="Applications unavailable" description={error} />
      ) : !applications.length ? (
        <EmptyState
          title="No matching applications"
          description={search || status ? "Try clearing your search or status filter." : "You have not submitted an application yet."}
          action={<Link to="/services" className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Browse services</Link>}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-200 md:hidden">
              {applications.map((application) => (
                <article key={application._id} className="p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-bold">{application.service?.title}</h2><p className="mt-1 break-all text-xs text-slate-500">{application.applicationNumber}</p></div><StatusBadge status={application.status} /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Submitted</dt><dd className="mt-1 text-slate-600">{formatDate(application.createdAt)}</dd></div><div><dt className="text-slate-400">Last updated</dt><dd className="mt-1 text-slate-600">{formatDate(application.updatedAt)}</dd></div></dl>
                  <Link to={`/customer/applications/${application._id}`} className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">View details →</Link>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Application</th><th className="px-5 py-4">Service</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Last updated</th><th className="px-5 py-4"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {applications.map((application) => (
                    <tr key={application._id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 font-semibold">{application.applicationNumber}</td><td className="px-5 py-4">{application.service?.title}</td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(application.createdAt)}</td><td className="px-5 py-4"><StatusBadge status={application.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(application.updatedAt)}</td><td className="px-5 py-4 text-right"><Link to={`/customer/applications/${application._id}`} className="font-semibold text-blue-700 hover:underline">View</Link></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination?.pages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2"><button type="button" disabled={pagination.page <= 1} onClick={() => { setLoading(true); setError(""); setPage((value) => value - 1); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page >= pagination.pages} onClick={() => { setLoading(true); setError(""); setPage((value) => value + 1); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next</button></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyApplications;
