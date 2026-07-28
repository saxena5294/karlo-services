import { Link } from "react-router-dom";

const colors = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-rose-200 bg-rose-50 text-rose-900",
};
const NoticeBar = ({ notices = [] }) => notices.length ? <section className="mx-auto max-w-7xl space-y-2 px-4 pt-4 sm:px-6 lg:px-8" aria-label="Current notices">{notices.map((notice) => <article key={notice._id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${colors[notice.type] || colors.info}`}><div><strong>{notice.title}</strong><span className="ml-2">{notice.message}</span></div>{notice.linkText && notice.linkUrl && <Link to={notice.linkUrl} className="font-bold underline">{notice.linkText}</Link>}</article>)}</section> : null;
export default NoticeBar;
