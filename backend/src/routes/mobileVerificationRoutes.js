import express from "express";
import { ROLES } from "../constants/roleConstants.js";
import { sendOtp, verifyOtp } from "../controllers/mobileVerificationController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
const router = express.Router(); router.use(requireAuth, requireRole(ROLES.CUSTOMER)); router.post("/send", sendOtp); router.post("/verify", verifyOtp); export default router;
