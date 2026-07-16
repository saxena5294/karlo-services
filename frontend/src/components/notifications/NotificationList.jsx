import { BellOff } from "lucide-react";
import NotificationItem from "./NotificationItem";

const NotificationList = ({ notifications, loading, error, onNotificationClick }) => {
  if (loading) {
    return <div className="space-y-3 p-4" role="status" aria-label="Loading notifications">{Array.from({ length: 3 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-slate-100 p-4"><div className="h-4 w-1/2 rounded bg-slate-200" /><div className="mt-3 h-3 w-4/5 rounded bg-slate-100" /></div>)}</div>;
  }
  if (error) return <p className="px-5 py-8 text-center text-sm text-rose-700">{error}</p>;
  if (!notifications.length) return <div className="px-5 py-10 text-center"><BellOff className="mx-auto text-slate-400" size={28} /><p className="mt-3 font-semibold">No notifications</p><p className="mt-1 text-sm text-slate-500">Application updates will appear here.</p></div>;

  return <div className="divide-y divide-slate-100">{notifications.map((notification) => <NotificationItem key={notification._id} notification={notification} onClick={onNotificationClick} />)}</div>;
};

export default NotificationList;
