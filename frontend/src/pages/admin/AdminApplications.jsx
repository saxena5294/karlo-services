import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminApplications, getAdminExperts, getAdminPartners, getAdminServices } from "../../api/adminApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const statuses = ["Pending", "Submitted", "In Review", "Assigned", "Documents Required", "Waiting For Documents", "Documents Uploaded", "Payment Verified", "Verification Pending", "Verified", "Processing", "Awaiting Admin Review", "Approved", "Completed", "Delivered", "Rejected", "Cancelled", "Archived"];
const priorities = ["low", "medium", "high", "urgent"];
const AdminApplications = () => {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params);
  const page = Number(query.page) || 1;
  const key = params.toString();
  const [searchInput, setSearchInput] = useState(query.search || "");
  const [data, setData] = useState({ key: "", applications: [], pagination: null });
  const [error, setError] = useState({ key: "", message: "" });
  const [options, setOptions] = useState({ services: [], experts: [], partners: [] });
  useEffect(() => { let active = true; Promise.all([getAdminServices({ limit: 100 }), getAdminExperts({ limit: 100 }), getAdminPartners({ limit: 100 })]).then(([services, experts, partners]) => active && setOptions({ services: services.services, experts: experts.experts, partners: partners.partners })).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; const requestQuery = Object.fromEntries(new URLSearchParams(key)); getAdminApplications({ ...requestQuery, limit: 15 }).then((response) => active && setData({ key, applications: response.applications, pagination: response.pagination })).catch((requestError) => active && setError({ key, message: requestError.response?.data?.message || "Unable to load applications." })); return () => { active = false; }; }, [key]);
  const update = (values) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name)); setParams(next); };
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold whitespace-nowrap" }, { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title }, { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Priority", render: (item) => <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${item.priority === "urgent" ? "bg-rose-50 text-rose-700" : item.priority === "high" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{item.priority || "medium"}</span> },
    { label: "Assignee", render: (item) => item.assigneeName }, { label: "Due", render: (item) => item.expectedCompletionAt ? <span className={new Date(item.expectedCompletionAt) < new Date() && !item.actualCompletionAt ? "font-semibold text-rose-700" : ""}>{formatDate(item.expectedCompletionAt)}</span> : "—" },
    { label: "Submitted", render: (item) => formatDate(item.createdAt), cellClassName: "whitespace-nowrap text-slate-500" },
    { label: "Updated", render: (item) => formatDate(item.updatedAt), cellClassName: "whitespace-nowrap text-slate-500" },
  ];
  const loading = data.key !== key && error.key !== key;
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Application management</h2><p className="mt-1 text-slate-500">Search, filter, assign, and review every application.</p></div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4"><form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim(), page: "" }); }} className="flex gap-2 lg:col-span-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input aria-label="Search applications" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3" placeholder="ID, customer, mobile, service, partner, expert" /></div><button className="rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Search</button></form>
      <select aria-label="Status" value={query.status || ""} onChange={(event) => update({ status: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Service" value={query.serviceId || ""} onChange={(event) => update({ serviceId: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">All services</option>{options.services.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select>
      <select aria-label="Expert" value={query.expertId || ""} onChange={(event) => update({ expertId: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">All experts</option>{options.experts.map((item) => <option key={item._id} value={item.userId}>{item.displayName}</option>)}</select>
      <select aria-label="Partner" value={query.partnerId || ""} onChange={(event) => update({ partnerId: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">All partners</option>{options.partners.map((item) => <option key={item._id} value={item.userId}>{item.businessName}</option>)}</select>
      <select aria-label="Priority" value={query.priority || ""} onChange={(event) => update({ priority: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">All priorities</option>{priorities.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Archive state" value={query.archived || ""} onChange={(event) => update({ archived: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">Active applications</option><option value="true">Archived applications</option><option value="false">Explicitly active</option></select>
      <select aria-label="Deletion state" value={query.deleted || ""} onChange={(event) => update({ deleted: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3"><option value="">Current records</option><option value="true">Deleted records</option></select>
      <input aria-label="Date from" type="date" value={query.dateFrom || ""} onChange={(event) => update({ dateFrom: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3 py-2" /><input aria-label="Date to" type="date" value={query.dateTo || ""} onChange={(event) => update({ dateTo: event.target.value, page: "" })} className="rounded-xl border border-slate-300 px-3 py-2" />
      <input aria-label="Minimum processing days" type="number" min="0" step="1" value={query.processingDaysMin || ""} onChange={(event) => update({ processingDaysMin: event.target.value, page: "" })} placeholder="Min processing days" className="rounded-xl border border-slate-300 px-3 py-2" /><input aria-label="Maximum processing days" type="number" min="0" step="1" value={query.processingDaysMax || ""} onChange={(event) => update({ processingDaysMax: event.target.value, page: "" })} placeholder="Max processing days" className="rounded-xl border border-slate-300 px-3 py-2" />
      <select aria-label="Sort applications" value={`${query.sortBy || "createdAt"}:${query.sortOrder || "desc"}`} onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split(":"); update({ sortBy, sortOrder, page: "" }); }} className="rounded-xl border border-slate-300 px-3"><option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="expectedCompletionAt:asc">Due date</option><option value="priority:desc">Priority</option><option value="updatedAt:desc">Recently updated</option></select>
    </div>
    {loading ? <LoadingSkeleton count={5} /> : error.key === key ? <EmptyState title="Applications unavailable" description={error.message} /> : !data.applications.length ? <EmptyState title="No matching applications" description="Adjust the filters and try again." /> : <><ApplicationTable applications={data.applications} columns={columns} getRowLink={(item) => `/admin/applications/${item._id}`} renderMobile={(item) => <><div className="flex justify-between gap-3"><div><p className="font-bold">{item.service?.title}</p><p className="text-xs text-slate-500">{item.applicationNumber}</p></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm">{item.customerName} · {item.assigneeName}</p></>} />{data.pagination?.pages > 1 && <div className="flex justify-between"><span className="text-sm text-slate-500">Page {page} of {data.pagination.pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => update({ page: page - 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page >= data.pagination.pages} onClick={() => update({ page: page + 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div>}</>}
  </div>;
};
export default AdminApplications;
