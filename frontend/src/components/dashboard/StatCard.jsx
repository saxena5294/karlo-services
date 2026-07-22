import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const accents = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

const StatCard = ({ title, value, icon: Icon, accent = "blue", description, to, featured = false }) => {
  const content = (
    <article
      className={`group relative flex h-full min-h-36 min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 ${
        to
          ? "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          : "border-slate-200"
      } ${featured ? "sm:min-h-40" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5 text-slate-600">{title}</p>
          <p className={`mt-3 whitespace-nowrap font-bold tracking-tight text-slate-950 ${featured ? "text-4xl" : "text-3xl"}`}>
            {value ?? 0}
          </p>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accents[accent] || accents.blue}`} aria-hidden="true">
            <Icon size={21} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-4 flex min-h-5 items-end justify-between gap-3">
        {description && <p className="text-xs leading-5 text-slate-500">{description}</p>}
        {to && <ArrowUpRight className="ml-auto shrink-0 text-slate-400 transition group-hover:text-slate-700" size={17} aria-hidden="true" />}
      </div>
    </article>
  );

  return to ? (
    <Link to={to} aria-label={`${title}: ${value ?? 0}. ${description || "View details"}`} className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : content;
};

export default StatCard;
