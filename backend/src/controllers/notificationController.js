import {
  getUnreadNotificationCount as getUnreadNotificationCountService,
  getUserNotifications as getUserNotificationsService,
  markAllNotificationsAsRead as markAllNotificationsAsReadService,
  markNotificationAsRead as markNotificationAsReadService,
} from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const result = await getUserNotificationsService({
      userId: req.auth.userId,
      role: req.auth.role,
      query: req.query,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await getUnreadNotificationCountService({
      userId: req.auth.userId,
      role: req.auth.role,
    });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    return next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await markNotificationAsReadService({
      userId: req.auth.userId,
      role: req.auth.role,
      notificationId: req.params.id,
    });
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    return next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const updatedCount = await markAllNotificationsAsReadService({
      userId: req.auth.userId,
      role: req.auth.role,
    });
    return res.status(200).json({ success: true, updatedCount });
  } catch (error) {
    return next(error);
  }
};
