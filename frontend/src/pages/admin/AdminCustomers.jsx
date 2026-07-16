import { useEffect, useState } from "react";
import { getAdminCustomers } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getAdminCustomers({ search: applied || undefined, limit: 50 }).then((response) => active && setData(response)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load customers.")); return () => { active = false; }; }, [applied]);
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Customers</h2><p className="mt-1 text-slate-500">Unique customer identities derived from application ownership.</p></div><form onSubmit={(event) => { event.preventDefault(); setData(null); setApplied(search.trim()); }} className="flex max-w-xl gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search customers" placeholder="Customer name or user ID" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5" /><button className="rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white">Search</button></form>
    {!data && !error ? <LoadingSkeleton count={4} /> : error ? <EmptyState title="Customers unavailable" description={error} /> : !data.customers.length ? <EmptyState title="No customers" description="Owned applications will create customer records here." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Applications</th><th className="px-5 py-4">Completed</th><th className="px-5 py-4">Active</th><th className="px-5 py-4">Latest</th></tr></thead><tbody className="divide-y">{data.customers.map((item) => <tr key={item.userId}><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.userId}</p></td><td className="px-5 py-4"><p>{item.email || "—"}</p><p className="text-xs text-slate-500">{item.phone || "—"}</p></td><td className="px-5 py-4 font-semibold">{item.totalApplications}</td><td className="px-5 py-4">{item.completedApplications}</td><td className="px-5 py-4">{item.activeApplications}</td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.latestApplicationDate)}</td></tr>)}</tbody></table></div>}
  </div>;
};
export default AdminCustomers;
