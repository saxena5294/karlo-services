import { Link } from "react-router-dom";

const ServiceCard = ({ service }) => {
  const {
    icon = "📄",
    title,
    description,
    price,
    processingTime,
    slug,
    category,
  } = service;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl sm:h-14 sm:w-14 sm:rounded-2xl sm:text-3xl">
          {icon}
        </div>

        {category && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {category}
          </span>
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
        {description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
        <div>
          <p className="text-xs text-slate-500">Starting from</p>
          <p className="mt-1 font-bold text-slate-900">
            ₹{Number(price).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">Processing time</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {processingTime}
          </p>
        </div>
      </div>

      <Link
        to={`/services/${slug}`}
        className="mt-6 block rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-base"
      >
        View and Apply
      </Link>
    </article>
  );
};

export default ServiceCard;