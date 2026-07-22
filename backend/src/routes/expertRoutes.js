import express from "express";
import * as controller from "../controllers/expertController.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";
import { uploadApplicationFiles } from "../middlewares/uploadMiddleware.js";

const router = express.Router();
router.use(developmentAuth, requireRole(ROLES.EXPERT));
router.get("/dashboard-summary", controller.getExpertDashboardSummary);
router.get("/profile", controller.getExpertProfile);
router.get("/applications", controller.getExpertApplications);
router.get("/applications/:id", controller.getExpertApplicationById);
router.patch("/applications/:id/status", controller.updateExpertApplicationStatus);
router.post("/applications/:id/remarks", controller.addExpertRemark);
router.post("/applications/:id/request-documents", controller.requestApplicationDocuments);
router.post("/applications/:id/completion-documents", uploadApplicationFiles, controller.uploadCompletionDocuments);
export default router;
