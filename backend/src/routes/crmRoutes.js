import express from "express";
import * as controller from "../controllers/crmController.js";
import { ROLES } from "../constants/roleConstants.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";

const router = express.Router();
router.use(developmentAuth, requireRole(ROLES.ADMIN));

router.get("/overview", controller.overview);
router.get("/customers", controller.customers);
router.get("/customers/:id", controller.customer);
router.get("/partners", controller.partners);
router.get("/partners/:id", controller.partner);
router.get("/experts", controller.experts);
router.get("/experts/:id", controller.expert);
router.get("/leads", controller.leads);
router.post("/leads", controller.createLead);
router.get("/leads/:id", controller.lead);
router.patch("/leads/:id", controller.updateLead);
router.post("/leads/:id/convert", controller.convertLead);
router.get("/tickets", controller.tickets);
router.post("/tickets", controller.createTicket);
router.get("/tickets/:id", controller.ticket);
router.patch("/tickets/:id", controller.updateTicket);
router.get("/follow-ups", controller.followUps);
router.post("/follow-ups", controller.createFollowUp);
router.patch("/follow-ups/:id", controller.updateFollowUp);
router.delete("/follow-ups/:id", controller.removeFollowUp);
router.get("/:entityType/:entityId/notes", controller.notes);
router.post("/:entityType/:entityId/notes", controller.createNote);
router.patch("/notes/:id", controller.updateNote);
router.delete("/notes/:id", controller.removeNote);
router.get("/:entityType/:entityId/communications", controller.communications);
router.post("/:entityType/:entityId/communications", controller.createCommunication);

export default router;
