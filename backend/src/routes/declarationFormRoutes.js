import express from "express";
import * as controller from "../controllers/declarationFormController.js";
import { ROLES } from "../constants/roleConstants.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";

const router = express.Router();

router.use(developmentAuth, requireRole(ROLES.CUSTOMER, ROLES.PARTNER));
router.get("/", controller.list);
router.get("/:id/preview", controller.preview);
router.get("/:id/download", controller.download);

export default router;
