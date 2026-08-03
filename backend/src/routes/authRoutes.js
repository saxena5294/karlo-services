import express from "express";
import * as controller from "../controllers/authController.js";
import { requireAuth, resolveAuthProfile } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.get("/me", resolveAuthProfile, controller.me);
router.use(requireAuth);
router.patch("/me", controller.updateProfile);
router.post("/register-role", controller.registerRole);
router.post("/onboarding/partner", controller.startPartnerOnboarding);
router.post("/onboarding/expert", controller.startExpertOnboarding);

export default router;
