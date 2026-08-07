import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminCustomers, updateAdminCustomerStatus } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    getAdminCustomers({ search: applied || undefined, status: status || undefined, limit: 50 })
      .then((response) => active && setData(response))
      .catch((error) => active && setFeedback({ type: "error", message: error.response?.data?.message || "Unable to load customers." }));
    return () => { active = false; };
  }, [applied, status]);

  const changeStatus = async (customer, nextStatus) => {
    setBusyId(customer._id); setFeedback({ type: "", message: "" });
    try {
      const response = await updateAdminCustomerStatus(customer._id, { status: nextStatus });
      setData((current) => ({ ...current, customers: current.customers.map((item) => item._id === customer._id ? { ...item, ...response.customer } : item) }));
      setFeedback({ type: "success", message: `${customer.name || "Customer"} is now ${nextStatus}.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.response?.data?.message || "Unable to update customer." });
    } finally { setBusyId(""); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Customers</h2><p className="mt-1 text-slate-500">Every Clerk-linked customer synchronized in MongoDB, including customers with no applications yet.</p></div>
    <form onSubmit={(event) => { event.preventDefault(); setApplied(search.trim()); }} className="flex max-w-3xl flex-col gap-2 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search customers" placeholder="Name, email, mobile, or user ID" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5" />
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">All statuses</option>{["active", "inactive", "suspended"].map((value) => <option key={value}>{value}</option>)}</select>
      <button className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Search</button>
    </form>
    {feedback.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{feedback.message}</p>}
    {!data ? <LoadingSkeleton count={4} /> : !data.customers.length ? <EmptyState title="No customers" description="New synchronized customer accounts will appear here immediately." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Applications</th><th className="px-5 py-4">Last activity</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y">{data.customers.map((item) => <tr key={item._id}><td className="px-5 py-4"><p className="font-semibold">{item.name || "Customer"}</p><p className="text-xs text-slate-500">{item.userId}</p></td><td className="px-5 py-4"><p>{item.email || "—"}</p><p className="text-xs text-slate-500">{item.mobile || "—"}</p></td><td className="whitespace-nowrap px-5 py-4">{formatDate(item.createdAt)}</td><td className="px-5 py-4 font-semibold capitalize">{item.status}</td><td className="px-5 py-4 font-semibold">{item.totalApplications}</td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.lastActivity)}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><Link to={`/admin/customers/${item._id}`} className="rounded-lg border px-3 py-1.5 font-semibold text-blue-700">View</Link>{item.status === "active" ? <><button disabled={busyId === item._id} onClick={() => changeStatus(item, "inactive")} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">Deactivate</button><button disabled={busyId === item._id} onClick={() => changeStatus(item, "suspended")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-700 disabled:opacity-50">Suspend</button></> : <button disabled={busyId === item._id} onClick={() => changeStatus(item, "active")} className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Activate</button>}</div></td></tr>)}</tbody></table></div>}
  </div>;
};

export default AdminCustomers;
