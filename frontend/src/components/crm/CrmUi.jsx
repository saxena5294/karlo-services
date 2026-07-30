import { Link } from "react-router-dom";

export const crmInput = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const colors = {
  new: "bg-blue-50 text-blue-700", open: "bg-blue-50 text-blue-700", active: "bg-emerald-50 text-emerald-700",
  converted: "bg-emerald-50 text-emerald-700", completed: "bg-emerald-50 text-emerald-700", resolved: "bg-emerald-50 text-emerald-700",
  urgent: "bg-rose-50 text-rose-700", high: "bg-orange-50 text-orange-700", lost: "bg-slate-100 text-slate-600",
  closed: "bg-slate-100 text-slate-600", cancelled: "bg-slate-100 text-slate-600", pending: "bg-amber-50 text-amber-700",
};

export const CrmBadge = ({ value = "unknown" }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${colors[value] || "bg-violet-50 text-violet-700"}`}>{String(value).replaceAll("_", " ")}</span>;

export const CrmHeader = ({ title, description, action }) => <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-slate-500">{description}</p></div>{action}</header>;

export const CrmPagination = ({ pagination, onPage }) => pagination?.pages > 1 && <div className="flex items-center justify-between text-sm text-slate-500"><span>Page {pagination.page} of {pagination.pages} · {pagination.total} records</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Next</button></div></div>;

export const CrmTable = ({ columns, items, link }) => <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column.key} className="px-5 py-4">{column.label}</th>)}<th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item._id || item.userId}>{columns.map((column) => <td key={column.key} className="px-5 py-4">{column.render ? column.render(item) : item[column.key] || "—"}</td>)}<td className="px-5 py-4"><Link to={link(item)} className="font-semibold text-blue-700">View</Link></td></tr>)}</tbody></table></div>;
