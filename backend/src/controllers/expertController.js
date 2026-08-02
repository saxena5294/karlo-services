import {
  addExpertRemark as addExpertRemarkService,
  getExpertApplicationById as getExpertApplicationByIdService,
  getExpertApplications as getExpertApplicationsService,
  getExpertDashboardSummary as getExpertDashboardSummaryService,
  requestApplicationDocuments as requestApplicationDocumentsService,
  updateExpertApplicationStatus as updateExpertApplicationStatusService,
  getExpertProfile as getExpertProfileService,
  uploadExpertCompletionDocuments,
} from "../services/applicationService.js";
import { ExpertProfile } from "../models/expertProfileModel.js";
import { User } from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";

export const getExpertDashboardSummary = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, ...(await getExpertDashboardSummaryService(req.auth.userId)) });
  } catch (error) { return next(error); }
};

export const getExpertProfile = async (req, res, next) => {
  try { return res.status(200).json({ success: true, profile: await getExpertProfileService(req.auth.userId) }); }
  catch (error) { return next(error); }
};

export const updateExpertProfile = async (req, res, next) => {
  try {
    const allowed = ["displayName", "phone", "categories", "skills", "availability"];
    const unexpected = Object.keys(req.body).filter((key) => !allowed.includes(key));
    if (unexpected.length) throw new ApiError(400, `Expert cannot update: ${unexpected.join(", ")}`);
    const updates = Object.fromEntries(allowed.filter((key) => key in req.body).map((key) => [key, req.body[key]]));
    const profile = await ExpertProfile.findOneAndUpdate(
      { userId: req.auth.userId },
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!profile) throw new ApiError(404, "Expert profile not found");
    await User.updateOne({ clerkUserId: req.auth.userId }, { $set: { name: profile.displayName, mobile: profile.phone } });
    return res.json({ success: true, profile });
  } catch (error) { return next(error); }
};

export const uploadCompletionDocuments = async (req, res, next) => {
  try {
    const documents = await uploadExpertCompletionDocuments({ expertId: req.auth.userId, id: req.params.id, files: req.files || [] });
    return res.status(201).json({ success: true, documents });
  } catch (error) { return next(error); }
};

export const getExpertApplications = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, ...(await getExpertApplicationsService(req.auth.userId, req.query)) });
  } catch (error) { return next(error); }
};

export const getExpertApplicationById = async (req, res, next) => {
  try {
    const application = await getExpertApplicationByIdService(req.auth.userId, req.params.id);
    return res.status(200).json({ success: true, application });
  } catch (error) { return next(error); }
};

export const updateExpertApplicationStatus = async (req, res, next) => {
  try {
    const application = await updateExpertApplicationStatusService({ expertId: req.auth.userId, id: req.params.id, status: req.body.status, remarks: req.body.remarks });
    return res.status(200).json({ success: true, message: "Application status updated successfully", application });
  } catch (error) { return next(error); }
};

export const addExpertRemark = async (req, res, next) => {
  try {
    await addExpertRemarkService({ expertId: req.auth.userId, id: req.params.id, remarks: req.body.remarks });
    return res.status(201).json({ success: true, message: "Remark added successfully" });
  } catch (error) { return next(error); }
};

export const requestApplicationDocuments = async (req, res, next) => {
  try {
    const application = await requestApplicationDocumentsService({ expertId: req.auth.userId, id: req.params.id, remarks: req.body.remarks });
    return res.status(200).json({ success: true, message: "Document request added successfully", application });
  } catch (error) { return next(error); }
};
