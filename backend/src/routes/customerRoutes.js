import express from "express";
import {
  getCustomerApplicationById,
  getCustomerApplications,
  getCustomerDashboardSummary,
} from "../controllers/customerController.js";
import {
  requireAuth,
  requireRole,
} from "../middlewares/authMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.CUSTOMER));

router.get("/dashboard-summary", getCustomerDashboardSummary);
router.get("/applications", getCustomerApplications);
router.get("/applications/:id", getCustomerApplicationById);

export default router;
