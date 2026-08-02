import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "../controllers/notificationController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const router = express.Router();

router.use(requireAuth, requireRole(...ROLE_VALUES));

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
