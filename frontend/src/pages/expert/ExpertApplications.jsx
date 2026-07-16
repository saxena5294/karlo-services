import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getExpertApplications } from "../../api/expertApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const statuses = ["Assigned", "Documents Required", "Processing", "Approved", "Completed", "Rejected", "Cancelled"];

const ExpertApplications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(Number.parseInt(searchParams.get("page"), 10) || 1, 1);
  const queryKey = `${status}|${search}|${page}`;
  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState({ key: "", applications: [], pagination: null });
  const [requestError, setRequestError] = useState({ key: "", message: "" });

  useEffect(() => {
    let isCurrent = true;
    getExpertApplications({ page, limit: 10, status: status || undefined, search: search || undefined })
      .then((response) => {
        if (isCurrent) setResult({ key: queryKey, applications: response.applications, pagination: response.pagination });
      })
      .catch((error) => {
        if (isCurrent) setRequestError({ key: queryKey, message: error.response?.data?.message || "Unable to load assignments." });
      });
    return () => {
      isCurrent = false;
    };
  }, [page, queryKey, search, status]);

  const updateQuery = (values) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next);
  };
  const submitSearch = (event) => {
    event.preventDefault();
    updateQuery({ search: searchInput.trim(), page: "" });
  };

  const loading = result.key !== queryKey && requestError.key !== queryKey;
  const error = requestError.key === queryKey ? requestError.message : "";
  const applications = result.key === queryKey ? result.applications : [];
  const pagination = result.key === queryKey ? result.pagination : null;
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "whitespace-nowrap font-semibold" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Assigned", render: (item) => formatDate(item.assignedAt), cellClassName: "whitespace-nowrap text-slate-500" },
    { label: "Updated", render: (item) => formatDate(item.updatedAt), cellClassName: "whitespace-nowrap text-slate-500" },
  ];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Assigned applications</h2><p className="mt-1 text-slate-500">Only applications currently assigned to your expert identity are shown.</p></div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]">
        <form onSubmit={submitSearch} className="flex min-w-0 gap-2"><label htmlFor="expert-search" className="sr-only">Search assignments</label><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input id="expert-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Number, customer, or service" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><button type="submit" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Search</button></form>
        <select aria-label="Filter by status" value={status} onChange={(event) => updateQuery({ status: event.target.value, page: "" })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>

      {loading ? <LoadingSkeleton count={4} /> : error ? <EmptyState title="Assignments unavailable" description={error} /> : !applications.length ? <EmptyState title="No matching assignments" description={search || status ? "Try clearing the search or status filter." : "No applications are assigned to you yet."} /> : <>
        <ApplicationTable applications={applications} columns={columns} getRowLink={(item) => `/expert/applications/${item._id}`} renderMobile={(item) => <><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{item.service?.title}</p><p className="mt-1 break-all text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm font-medium">{item.customerName}</p><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Assigned</dt><dd className="mt-1 text-slate-600">{formatDate(item.assignedAt)}</dd></div><div><dt className="text-slate-400">Updated</dt><dd className="mt-1 text-slate-600">{formatDate(item.updatedAt)}</dd></div></dl></>} />
        {pagination?.pages > 1 && <div className="flex items-center justify-between gap-4"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: String(page - 1) })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => updateQuery({ page: String(page + 1) })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>}
      </>}
    </div>
  );
};

export default ExpertApplications;
