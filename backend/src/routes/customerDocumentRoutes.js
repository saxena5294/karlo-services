import express from "express";
import * as controller from "../controllers/customerDocumentController.js";
import { developmentAuth } from "../middlewares/developmentAuthMiddleware.js";
import { uploadCustomerDocument } from "../middlewares/uploadMiddleware.js";

const router = express.Router();
router.use(developmentAuth);

router.get("/types", controller.types);
router.get("/my", controller.myDocuments);
router.get("/", controller.list);
router.post("/", uploadCustomerDocument, controller.upload);
router.get("/:id", controller.details);
router.put("/:id", controller.update);
router.get("/:id/preview", controller.preview);
router.get("/:id/download", controller.download);
router.post("/:id/replace", uploadCustomerDocument, controller.replace);
router.delete("/:id", controller.remove);
router.post("/:id/restore", controller.restore);
router.get("/:id/versions", controller.versions);
router.get("/:id/versions/:versionId/download", controller.downloadVersion);
router.post("/:id/versions/:versionId/restore", controller.restoreVersion);
router.patch("/:id/verify", controller.verify);
router.patch("/:id/lock", controller.lock);
router.patch("/:id/unlock", controller.unlock);

export default router;
