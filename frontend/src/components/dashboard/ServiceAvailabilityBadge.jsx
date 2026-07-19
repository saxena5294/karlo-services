const labels = { available: "Available", coming_soon: "Coming Soon", temporarily_unavailable: "Temporarily Unavailable" };
const styles = { available: "bg-emerald-50 text-emerald-700", coming_soon: "bg-amber-100 text-amber-800", temporarily_unavailable: "bg-slate-200 text-slate-700" };
const ServiceAvailabilityBadge = ({ status = "available" }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.available}`}>{labels[status] || labels.available}</span>;
export default ServiceAvailabilityBadge;
