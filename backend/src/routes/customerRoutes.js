import express from "express";
import {
  getCustomerApplicationById,
  getCustomerApplications,
  getCustomerDashboardSummary,
} from "../controllers/customerController.js";
import {
  developmentAuth,
  requireRole,
} from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();

// TODO(Clerk): replace developmentAuth with Clerk middleware; controllers stay unchanged.
router.use(developmentAuth, requireRole(ROLES.CUSTOMER));

router.get("/dashboard-summary", getCustomerDashboardSummary);
router.get("/applications", getCustomerApplications);
router.get("/applications/:id", getCustomerApplicationById);

export default router;
