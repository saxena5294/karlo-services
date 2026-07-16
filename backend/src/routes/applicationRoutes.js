import express from "express";
import {
  assignRetailer,
  getAdminApplications,
  getApplicationDetails,
  getCustomerApplications,
  getRetailerApplications,
  submitApplication,
  trackApplication,
  updateApplicationStatus,
} from "../controllers/applicationController.js";
import { uploadApplicationFiles } from "../middlewares/uploadMiddleware.js";
import {
  developmentAuth,
  optionalDevelopmentAuth,
  requireRole,
} from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();

router.get("/track/:applicationNumber", trackApplication);

// TODO(Clerk): protect with customer authentication and derive customerId from req.auth.
router.get(
  "/customer/:customerId",
  developmentAuth,
  requireRole(ROLES.CUSTOMER),
  getCustomerApplications
);

// TODO(Clerk): protect with retailer role authorization and derive retailerId from req.auth.
router.get(
  "/retailer/:retailerId",
  developmentAuth,
  requireRole(ROLES.EXPERT, ROLES.ADMIN),
  getRetailerApplications
);

// TODO(Clerk): protect all admin routes with admin role authorization.
router.get("/admin", developmentAuth, requireRole(ROLES.ADMIN), getAdminApplications);
router.patch(
  "/:applicationNumber/assign",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  assignRetailer
);

// TODO(Clerk): protect with retailer/admin role authorization.
router.patch(
  "/:applicationNumber/status",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  updateApplicationStatus
);

// TODO(Clerk): allow only the owning customer, assigned retailer, or an admin.
router.get(
  "/:applicationNumber",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  getApplicationDetails
);

// TODO(Clerk): attach customer identity from req.auth when signed-in submission is required.
router.post("/:slug", optionalDevelopmentAuth, uploadApplicationFiles, submitApplication);

export default router;
