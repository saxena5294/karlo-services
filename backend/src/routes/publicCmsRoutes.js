import express from "express";
import { getPublicDashboardContent, getPublicFaqs, getPublicHomepage } from "../controllers/cms/publicCmsController.js";
const router = express.Router(); router.get("/homepage", getPublicHomepage); router.get("/dashboard", getPublicDashboardContent); router.get("/faqs", getPublicFaqs); export default router;
