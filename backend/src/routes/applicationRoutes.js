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
import { deleteDocument, downloadDocument, listDocuments, previewDocument, replaceDocument, uploadAdditionalDocument, verifyDocument } from "../controllers/documentController.js";
import {
  requireAuth,
  requireRole,
} from "../middlewares/authMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";
import * as workflowController from "../controllers/applicationWorkflowController.js";

const router = express.Router();

router.get("/track/:applicationNumber", trackApplication);

router.get("/:applicationId/documents", requireAuth, listDocuments);
router.get("/:applicationId/documents/:documentId/preview", requireAuth, previewDocument);
router.get("/:applicationId/documents/:documentId/download", requireAuth, downloadDocument);
router.patch("/:applicationId/documents/:documentId/verification", requireAuth, verifyDocument);
router.post("/:applicationId/documents/:documentId/replacement", requireAuth, uploadSingleApplicationFile, replaceDocument);
router.post("/:applicationId/documents", requireAuth, uploadSingleApplicationFile, uploadAdditionalDocument);
router.delete("/:applicationId/documents/:documentId", requireAuth, requireRole(ROLES.ADMIN), deleteDocument);
router.get("/:applicationId/workflow", requireAuth, workflowController.workflow);
router.post("/:applicationId/comments", requireAuth, workflowController.createComment);
router.patch("/:applicationId/comments/:commentId", requireAuth, workflowController.updateComment);
router.delete("/:applicationId/comments/:commentId", requireAuth, workflowController.deleteComment);

router.get(
  "/customer/:customerId",
  requireAuth,
  requireRole(ROLES.CUSTOMER),
  getCustomerApplications
);

router.get("/admin", requireAuth, requireRole(ROLES.ADMIN), getAdminApplications);
router.patch(
  "/:applicationNumber/assign",
  requireAuth,
  requireRole(ROLES.ADMIN),
  assignApplication
);

router.patch(
  "/:applicationNumber/status",
  requireAuth,
  requireRole(ROLES.ADMIN),
  updateApplicationStatus
);

router.get(
  "/:applicationNumber",
  requireAuth,
  requireRole(ROLES.ADMIN),
  getApplicationDetails
);

router.post("/:slug", requireAuth, requireRole(ROLES.CUSTOMER), uploadApplicationFiles, submitApplication);

export default router;
