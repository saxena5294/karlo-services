import { getPublicHomepage as loadHomepage } from "../../services/cmsService.js";
import { getPublicDashboardContent as loadDashboardContent } from "../../services/cmsService.js";
import { getPublicFaqs as loadFaqs } from "../../services/cmsService.js";
export const getPublicHomepage = async (_req, res, next) => { try { res.json({ success: true, data: await loadHomepage() }); } catch (error) { next(error); } };
export const getPublicDashboardContent = async (_req, res, next) => { try { res.json({ success: true, data: await loadDashboardContent() }); } catch (error) { next(error); } };
export const getPublicFaqs = async (req, res, next) => { try { res.json({ success: true, data: await loadFaqs(req.query) }); } catch (error) { next(error); } };
