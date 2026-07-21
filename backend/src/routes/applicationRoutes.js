import express from "express";
import {
  assignApplication,
  getAdminApplications,
  getApplicationDetails,
  getCustomerApplications,
  submitApplication,
  trackApplication,
  updateApplicationStatus,
} from "../controllers/applicationController.js";
import { uploadApplicationFiles } from "../middlewares/uploadMiddleware.js";
import { uploadSingleApplicationFile } from "../middlewares/uploadMiddleware.js";
import { downloadDocument, listDocuments, previewDocument, replaceDocument, verifyDocument } from "../controllers/documentController.js";
import {
  developmentAuth,
  requireRole,
} from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();

router.get("/track/:applicationNumber", trackApplication);

router.get("/:applicationId/documents", developmentAuth, listDocuments);
router.get("/:applicationId/documents/:documentId/preview", developmentAuth, previewDocument);
router.get("/:applicationId/documents/:documentId/download", developmentAuth, downloadDocument);
router.patch("/:applicationId/documents/:documentId/verification", developmentAuth, verifyDocument);
router.post("/:applicationId/documents/:documentId/replacement", developmentAuth, uploadSingleApplicationFile, replaceDocument);

// TODO(Clerk): protect with customer authentication and derive customerId from req.auth.
router.get(
  "/customer/:customerId",
  developmentAuth,
  requireRole(ROLES.CUSTOMER),
  getCustomerApplications
);

// TODO(Clerk): protect all admin routes with admin role authorization.
router.get("/admin", developmentAuth, requireRole(ROLES.ADMIN), getAdminApplications);
router.patch(
  "/:applicationNumber/assign",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  assignApplication
);

// TODO(Clerk): retain admin authorization when production authentication is connected.
router.patch(
  "/:applicationNumber/status",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  updateApplicationStatus
);

// TODO(Clerk): retain the current admin-only legacy details endpoint.
router.get(
  "/:applicationNumber",
  developmentAuth,
  requireRole(ROLES.ADMIN),
  getApplicationDetails
);

// TODO(Clerk): attach customer identity from req.auth when signed-in submission is required.
router.post("/:slug", developmentAuth, requireRole(ROLES.CUSTOMER), uploadApplicationFiles, submitApplication);

export default router;
