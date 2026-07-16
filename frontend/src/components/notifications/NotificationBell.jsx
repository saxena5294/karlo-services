import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/notificationApi";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = ({ portal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;
    const refreshCount = () => {
      getUnreadNotificationCount()
        .then((response) => isCurrent && setUnreadCount(response.count))
        .catch(() => isCurrent && setUnreadCount(0));
    };
    refreshCount();
    window.addEventListener("focus", refreshCount);
    window.addEventListener("notifications:changed", refreshCount);
    return () => {
      isCurrent = false;
      window.removeEventListener("focus", refreshCount);
      window.removeEventListener("notifications:changed", refreshCount);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const toggleDropdown = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (!nextOpen) return;
    setLoading(true);
    setError("");
    try {
      const response = await getNotifications({ page: 1, limit: 6 });
      setNotifications(response.notifications);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setUnreadCount((count) => Math.max(count - 1, 0));
      } catch {
        // Navigation remains useful even if the read receipt fails.
      }
    }
    setIsOpen(false);
    navigate(notification.link);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={toggleDropdown} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={isOpen} aria-haspopup="dialog">
        <Bell size={20} />
        <NotificationBadge count={unreadCount} />
      </button>
      {isOpen && <NotificationDropdown portal={portal} notifications={notifications} loading={loading} error={error} unreadCount={unreadCount} markingAll={markingAll} onNotificationClick={openNotification} onMarkAllRead={markAllRead} />}
    </div>
  );
};

export default NotificationBell;
