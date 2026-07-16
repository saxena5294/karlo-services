import { BellRing } from "lucide-react";
import { formatDate } from "../../utils/dashboardFormatters";

const NotificationItem = ({ notification, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(notification)}
    className={`flex w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${notification.isRead ? "bg-white" : "bg-blue-50/60"}`}
  >
    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
      <BellRing size={17} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-slate-900">{notification.title}</span>
        {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
      </span>
      <span className="mt-1 block break-words text-sm leading-5 text-slate-600">{notification.message}</span>
      <span className="mt-2 block text-xs text-slate-400">{notification.serviceTitle} · {formatDate(notification.createdAt)}</span>
    </span>
  </button>
);

export default NotificationItem;
