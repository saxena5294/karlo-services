import mongoose from "mongoose";
import {
  Notification,
  NOTIFICATION_ROLES,
  NOTIFICATION_TYPES,
} from "../models/notificationModel.js";
import { Service } from "../models/serviceModel.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../constants/roleConstants.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const sanitizeNotificationText = (value, maxLength = 500) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const getPagination = ({ page, limit } = {}) => {
  const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
};

const validateRecipient = (recipientUserId, recipientRole) => {
  if (!recipientUserId?.trim()) throw new ApiError(400, "Notification recipient is required");
  if (!NOTIFICATION_ROLES.includes(recipientRole)) {
    throw new ApiError(400, "Invalid notification recipient role");
  }
};

const recipientRoleFilter = (role) => role;

export const createNotification = async ({
  recipientUserId,
  recipientRole,
  type,
  title,
  message,
  application,
  applicationNumber,
  serviceTitle,
  link,
  metadata = {},
  dedupeKey,
  session,
}) => {
  validateRecipient(recipientUserId, recipientRole);
  if (!NOTIFICATION_TYPES.includes(type)) throw new ApiError(400, "Invalid notification type");

  const notification = {
    recipientUserId: recipientUserId.trim(),
    recipientRole,
    type,
    title: sanitizeNotificationText(title, 120),
    message: sanitizeNotificationText(message),
    application,
    applicationNumber,
    serviceTitle: sanitizeNotificationText(serviceTitle || "Service application", 120),
    link,
    metadata,
    dedupeKey,
  };

  if (!dedupeKey) {
    const [created] = await Notification.create([notification], { session });
    return created;
  }

  return Notification.findOneAndUpdate(
    { dedupeKey },
    { $setOnInsert: notification },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      session,
    }
  );
};

export const createApplicationNotification = async ({
  application,
  recipientUserId,
  recipientRole,
  type,
  title,
  message,
  eventKey,
  metadata,
  session,
}) => {
  if (!recipientUserId) return null;
  const serviceTitle = application.service?.title || (
    await Service.findById(application.service).select("title").session(session).lean()
  )?.title || "Service application";
  const rolePath = recipientRole === "admin" ? "admin" : recipientRole;

  return createNotification({
    recipientUserId,
    recipientRole,
    type,
    title,
    message,
    application: application._id,
    applicationNumber: application.applicationNumber,
    serviceTitle,
    link: `/${rolePath}/applications/${application._id}`,
    metadata,
    dedupeKey: eventKey
      ? `${eventKey}:${recipientRole}:${recipientUserId}:${type}`
      : undefined,
    session,
  });
};

export const getUserNotifications = async ({ userId, role, query = {} }) => {
  validateRecipient(userId, role);
  const { page, limit, skip } = getPagination(query);
  const filter = { recipientUserId: userId.trim(), recipientRole: recipientRoleFilter(role) };
  if (query.isRead !== undefined) {
    if (!['true', 'false'].includes(String(query.isRead).toLowerCase())) {
      throw new ApiError(400, "isRead must be true or false");
    }
    filter.isRead = String(query.isRead).toLowerCase() === "true";
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getUnreadNotificationCount = async ({ userId, role }) => {
  validateRecipient(userId, role);
  return Notification.countDocuments({
    recipientUserId: userId.trim(),
    recipientRole: recipientRoleFilter(role),
    isRead: false,
  });
};

export const markNotificationAsRead = async ({ userId, role, notificationId }) => {
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(404, "Notification not found");
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientUserId: userId.trim(), recipientRole: recipientRoleFilter(role) },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  if (!notification) throw new ApiError(404, "Notification not found");
  return notification;
};

export const markAllNotificationsAsRead = async ({ userId, role }) => {
  validateRecipient(userId, role);
  const result = await Notification.updateMany(
    { recipientUserId: userId.trim(), recipientRole: recipientRoleFilter(role), isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return result.modifiedCount;
};
