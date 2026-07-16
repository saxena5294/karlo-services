import express from "express";
import * as controller from "../controllers/expertController.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();
router.use(developmentAuth, requireRole(ROLES.EXPERT));
router.get("/dashboard-summary", controller.getExpertDashboardSummary);
router.get("/applications", controller.getExpertApplications);
router.get("/applications/:id", controller.getExpertApplicationById);
router.patch("/applications/:id/status", controller.updateExpertApplicationStatus);
router.post("/applications/:id/remarks", controller.addExpertRemark);
router.post("/applications/:id/request-documents", controller.requestApplicationDocuments);
export default router;

