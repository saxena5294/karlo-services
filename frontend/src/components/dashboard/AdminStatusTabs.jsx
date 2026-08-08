const AdminStatusTabs = ({ tabs, activeStatus, counts = {}, onChange }) => (
  <div className="flex flex-wrap gap-2" aria-label="Status filters">
    {tabs.map(({ value, label }) => {
      const selected = activeStatus === value;
      return (
        <button
          key={value || "all"}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(value)}
          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${selected ? "border-blue-700 bg-blue-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}
        >
          {label} <span className={selected ? "text-blue-100" : "text-slate-400"}>({counts[value || "all"] ?? 0})</span>
        </button>
      );
    })}
  </div>
);

export default AdminStatusTabs;
