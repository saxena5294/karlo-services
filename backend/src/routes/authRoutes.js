import express from "express";
import * as controller from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(requireAuth);
router.get("/me", controller.me);
router.patch("/me", controller.updateProfile);
router.post("/register-role", controller.registerRole);
router.post("/onboarding/partner", controller.startPartnerOnboarding);
router.post("/onboarding/expert", controller.startExpertOnboarding);

export default router;
