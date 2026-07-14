import express from "express";
import { submitApplication, trackApplication } from "../controllers/applicationController.js";
import { uploadApplicationFiles } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/track/:applicationNumber", trackApplication);
router.post("/:slug", uploadApplicationFiles, submitApplication);

export default router;
