import { Link } from "react-router-dom";
import NotificationList from "./NotificationList";

const NotificationDropdown = ({ portal, notifications, loading, error, unreadCount, markingAll, onNotificationClick, onMarkAllRead }) => (
  <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="dialog" aria-label="Notifications">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div><p className="font-bold">Notifications</p><p className="text-xs text-slate-500">{unreadCount} unread</p></div>
      <button type="button" disabled={!unreadCount || markingAll} onClick={onMarkAllRead} className="text-xs font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400">{markingAll ? "Updating..." : "Mark all read"}</button>
    </div>
    <div className="max-h-[26rem] overflow-y-auto"><NotificationList notifications={notifications} loading={loading} error={error} onNotificationClick={onNotificationClick} /></div>
    <Link to={`/${portal}/notifications`} className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-slate-50">View all notifications</Link>
  </div>
);

export default NotificationDropdown;
