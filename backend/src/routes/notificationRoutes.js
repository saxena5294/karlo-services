import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "../controllers/notificationController.js";
import { developmentAuth } from "../middlewares/developmentAuthMiddleware.js";

const router = express.Router();

// TODO(Clerk): replace developmentAuth; controllers continue reading req.auth.
router.use(developmentAuth);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
