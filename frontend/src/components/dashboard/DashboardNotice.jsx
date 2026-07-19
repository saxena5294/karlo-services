import { Info, Lightbulb, ShieldAlert, TriangleAlert } from "lucide-react";
import { dashboardNotices } from "../../config/dashboardNotices";

const styles = {
  info: [Info, "border-blue-200 bg-blue-50 text-blue-950"],
  tip: [Lightbulb, "border-emerald-200 bg-emerald-50 text-emerald-950"],
  warning: [TriangleAlert, "border-amber-200 bg-amber-50 text-amber-950"],
  neutral: [ShieldAlert, "border-slate-200 bg-slate-100 text-slate-800"],
};

export const AnnouncementCard = ({ notice }) => {
  const [Icon, className] = styles[notice.type] || styles.info;
  return <article className={`rounded-2xl border p-4 ${className}`}><div className="flex gap-3"><Icon className="mt-0.5 shrink-0" size={19} /><div><h3 className="font-bold">{notice.title}</h3><p className="mt-1 text-sm leading-6 opacity-90">{notice.message}</p></div></div></article>;
};

const DashboardNotice = ({ audience }) => {
  const notices = dashboardNotices.filter((notice) => notice.isActive && ["all", audience].includes(notice.audience)).sort((a, b) => a.priority - b.priority);
  return <section aria-labelledby={`${audience}-notices`}><div className="mb-4"><h2 id={`${audience}-notices`} className="text-xl font-bold">Notices & important updates</h2><p className="mt-1 text-sm text-slate-500">Please review these service and submission updates.</p></div><div className="grid gap-3 lg:grid-cols-2">{notices.map((notice) => <AnnouncementCard key={notice.id} notice={notice} />)}</div></section>;
};

export default DashboardNotice;
