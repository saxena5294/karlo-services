import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPartnerApplications } from "../../api/partnerApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const statuses = ["Assigned", "Documents Required", "Processing", "Awaiting Admin Review", "Approved", "Completed", "Delivered", "Rejected", "Cancelled"];

const PartnerApplications = () => {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params);
  const page = Number(query.page) || 1;
  const key = params.toString();
  const [searchInput, setSearchInput] = useState(query.search || "");
  const [data, setData] = useState({ key: "", applications: [], pagination: null });
  const [error, setError] = useState({ key: "", message: "" });
  useEffect(() => {
    let current = true;
    getPartnerApplications({ ...Object.fromEntries(new URLSearchParams(key)), page, limit: 10 })
      .then((value) => current && setData({ key, ...value }))
      .catch((requestError) => current && setError({ key, message: requestError.response?.data?.message || "Unable to load assignments." }));
    return () => { current = false; };
  }, [key, page]);
  const update = (values) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name));
    setParams(next);
  };
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Priority", render: (item) => <span className="text-xs font-bold uppercase">{item.priority || "medium"}</span> },
    { label: "Due", render: (item) => item.expectedCompletionAt ? formatDate(item.expectedCompletionAt) : "—" },
    { label: "Assigned", render: (item) => formatDate(item.assignedAt) },
  ];
  const loading = data.key !== key && error.key !== key;
  const applications = data.key === key ? data.applications : [];
  const pagination = data.key === key ? data.pagination : null;
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Assigned applications</h1><p className="mt-1 text-slate-500">Search, prioritize, and process applications assigned to your partner profile.</p></div>
    <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3"><form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim(), page: "" }); }} className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-xl border py-2.5 pl-10 pr-3" placeholder="ID, customer, service" /></div><button className="rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Search</button></form><select value={query.status || ""} onChange={(event) => update({ status: event.target.value, page: "" })} className="rounded-xl border px-3"><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><select value={query.priority || ""} onChange={(event) => update({ priority: event.target.value, page: "" })} className="rounded-xl border px-3"><option value="">All priorities</option>{["low","medium","high","urgent"].map((value) => <option key={value}>{value}</option>)}</select></div>
    {loading ? <LoadingSkeleton count={5} /> : error.key === key ? <EmptyState title="Assignments unavailable" description={error.message} /> : applications.length ? <><ApplicationTable applications={applications} columns={columns} getRowLink={(item) => `/partner/applications/${item._id}`} />{pagination?.pages > 1 && <div className="flex justify-between"><span className="text-sm text-slate-500">Page {page} of {pagination.pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => update({ page: page - 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.pages} onClick={() => update({ page: page + 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div>}</> : <EmptyState title="No assignments" description="Admin-assigned work will appear here." />}
  </div>;
};

export default PartnerApplications;
