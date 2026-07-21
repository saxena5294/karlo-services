import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "../controllers/notificationController.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const router = express.Router();

// TODO(Clerk): replace developmentAuth; controllers continue reading req.auth.
router.use(developmentAuth, requireRole(...ROLE_VALUES));

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
