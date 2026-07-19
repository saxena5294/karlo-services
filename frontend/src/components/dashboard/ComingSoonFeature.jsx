const ComingSoonFeature = ({ title, description = "This service will be available soon.", icon: Icon, badge = "Coming Soon", className = "", compact = false }) => (
  <section
    aria-disabled="true"
    title="This service will be available soon."
    className={`cursor-not-allowed rounded-2xl border border-slate-200 bg-white opacity-60 shadow-sm ${compact ? "p-4" : "p-6"} ${className}`}
  >
    <div className="flex items-start gap-4">
      {Icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon size={22} /></span>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={`${compact ? "text-sm" : "text-lg"} font-bold text-slate-700`}>{title}</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{badge}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  </section>
);

export default ComingSoonFeature;
