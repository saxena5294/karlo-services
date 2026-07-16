import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/notificationApi";
import NotificationList from "../../components/notifications/NotificationList";

const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const page = Math.max(Number.parseInt(searchParams.get("page"), 10) || 1, 1);
  const queryKey = `${filter}|${page}`;
  const [result, setResult] = useState({ key: "", notifications: [], pagination: null });
  const [requestError, setRequestError] = useState({ key: "", message: "" });
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    getNotifications({ page, limit: 12, isRead: filter === "unread" ? false : undefined })
      .then((response) => {
        if (isCurrent) setResult({ key: queryKey, notifications: response.notifications, pagination: response.pagination });
      })
      .catch((error) => {
        if (isCurrent) setRequestError({ key: queryKey, message: error.response?.data?.message || "Unable to load notifications." });
      });
    return () => {
      isCurrent = false;
    };
  }, [filter, page, queryKey]);

  const notifications = result.key === queryKey ? result.notifications : [];
  const pagination = result.key === queryKey ? result.pagination : null;
  const loading = result.key !== queryKey && requestError.key !== queryKey;
  const error = requestError.key === queryKey ? requestError.message : "";

  const changeFilter = (nextFilter) => {
    const next = new URLSearchParams();
    if (nextFilter === "unread") next.set("filter", "unread");
    setSearchParams(next);
  };

  const changePage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        window.dispatchEvent(new Event("notifications:changed"));
      } catch {
        // Keep the related application accessible if the read receipt fails.
      }
    }
    navigate(notification.link);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      window.dispatchEvent(new Event("notifications:changed"));
      if (filter === "unread") {
        setResult({ key: queryKey, notifications: [], pagination: { ...pagination, total: 0, pages: 0 } });
      } else {
        setResult((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, isRead: true })) }));
      }
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">Notifications</h2><p className="mt-1 text-slate-500">Application assignments, status changes, remarks, and document requests.</p></div><button type="button" disabled={markingAll || !notifications.some((item) => !item.isRead)} onClick={markAllRead} className="self-start rounded-xl border border-blue-700 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{markingAll ? "Updating..." : "Mark all as read"}</button></div>

      <div className="flex gap-2 border-b border-slate-200"><button type="button" onClick={() => changeFilter("all")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${filter === "all" ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500"}`}>All</button><button type="button" onClick={() => changeFilter("unread")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${filter === "unread" ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500"}`}>Unread</button></div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><NotificationList notifications={notifications} loading={loading} error={error} onNotificationClick={openNotification} /></div>

      {pagination?.pages > 1 && <div className="flex items-center justify-between gap-4"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => changePage(page + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div></div>}
    </div>
  );
};

export default NotificationsPage;
