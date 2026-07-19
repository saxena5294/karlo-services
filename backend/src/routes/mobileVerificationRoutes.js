import express from "express";
import { ROLES } from "../constants/roleConstants.js";
import { sendOtp, verifyOtp } from "../controllers/mobileVerificationController.js";
import { developmentAuth, requireRole } from "../middlewares/developmentAuthMiddleware.js";
const router = express.Router(); router.use(developmentAuth, requireRole(ROLES.CUSTOMER)); router.post("/send", sendOtp); router.post("/verify", verifyOtp); export default router;
