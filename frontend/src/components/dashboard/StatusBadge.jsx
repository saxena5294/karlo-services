const normalizeStatus = (status = "") => status.toLowerCase().replaceAll("_", " ");

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const styles = {
    submitted: "bg-blue-50 text-blue-700 ring-blue-600/20",
    assigned: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    open: "bg-blue-50 text-blue-700 ring-blue-600/20",
    accepted: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    draft: "bg-slate-100 text-slate-700 ring-slate-600/20",
    expired: "bg-slate-100 text-slate-700 ring-slate-600/20",
    "documents required": "bg-amber-50 text-amber-700 ring-amber-600/20",
    "under review": "bg-violet-50 text-violet-700 ring-violet-600/20",
    processing: "bg-violet-50 text-violet-700 ring-violet-600/20",
    approved: "bg-teal-50 text-teal-700 ring-teal-600/20",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-600/20",
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[normalized] || styles.cancelled}`}>
      {status || "Unknown"}
    </span>
  );
};

export default StatusBadge;
