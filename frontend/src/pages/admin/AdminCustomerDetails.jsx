import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminCustomer } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../utils/dashboardFormatters";

const AdminCustomerDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getAdminCustomer(id).then(setData).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load customer.")); }, [id]);
  if (error) return <EmptyState title="Customer unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={4} />;
  const { customer, applications } = data;
  return <div className="space-y-6"><div><Link to="/admin/customers" className="text-sm font-semibold text-blue-700">← Customers</Link><h1 className="mt-2 text-2xl font-bold">{customer.name || "Customer"}</h1><p className="text-sm text-slate-500">{customer.userId}</p></div><section className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">{[["Email", customer.email || "—"], ["Mobile", customer.mobile || "—"], ["Status", customer.status], ["Joined", formatDate(customer.createdAt)]].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</section><section><h2 className="text-lg font-bold">Applications ({applications.length})</h2>{applications.length ? <div className="mt-3 overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr></thead><tbody className="divide-y">{applications.map((item) => <tr key={item._id}><td className="px-4 py-3"><Link to={`/admin/applications/${item._id}`} className="font-semibold text-blue-700">{item.applicationNumber}</Link></td><td className="px-4 py-3">{item.service?.title || "Service"}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">This customer has not submitted an application yet.</p>}</section></div>;
};

export default AdminCustomerDetails;
