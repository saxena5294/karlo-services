import express from "express";
import * as controller from "../controllers/adminController.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";
import { ROLES } from "../constants/roleConstants.js";

const router = express.Router();

// TODO(Clerk): replace developmentAuth; retain the admin role guard contract.
router.use(developmentAuth, requireRole(ROLES.ADMIN));

router.get("/dashboard-summary", controller.dashboardSummary);
router.get("/applications", controller.listApplications);
router.get("/applications/:id", controller.applicationDetails);
router.get("/assignments", controller.assignments);
router.patch("/applications/:id/assign", controller.assignApplication);
router.patch("/applications/:id/status", controller.updateApplicationStatus);
router.post("/applications/:id/remarks", controller.addApplicationRemark);
router.post("/applications/:id/request-documents", controller.requestDocuments);
router.post("/applications/:id/publish-lead", controller.publishLead);
router.get("/customers", controller.listCustomers);
router.get("/customers/:id", controller.customerDetails);
router.get("/experts", controller.listExperts);
router.post("/experts", controller.createExpert);
router.patch("/experts/:id", controller.updateExpert);
router.get("/partners", controller.listPartners);
router.get("/partners/:id", controller.partnerDetails);
router.patch("/partners/:id", controller.updatePartner);
router.patch("/partners/:id/verification", controller.verifyPartner);
router.get("/leads", controller.listLeads);
router.post("/leads", controller.createLead);
router.get("/leads/:id", controller.leadDetails);
router.patch("/leads/:id", controller.updateLead);
router.post("/leads/:id/assign", controller.assignLead);
router.get("/services", controller.listServices);
router.post("/services", controller.createService);
router.get("/services/:id", controller.serviceDetails);
router.patch("/services/:id", controller.updateService);
router.patch("/services/:id/status", controller.updateServiceStatus);
router.get("/services/:id/form", controller.serviceForm);
router.put("/services/:id/form", controller.updateServiceForm);
router.get("/reports/summary", controller.reportsSummary);
router.get("/content", controller.content);
router.post("/content", controller.createContent);
router.patch("/content/:id", controller.updateContent);
router.get("/audit-logs", controller.auditLogs);
router.get("/settings", controller.settings);
router.put("/settings", controller.saveSetting);

export default router;
