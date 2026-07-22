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

export const getExpertDashboardSummary = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, ...(await getExpertDashboardSummaryService(req.auth.userId)) });
  } catch (error) { return next(error); }
};

export const getExpertProfile = async (req, res, next) => {
  try { return res.status(200).json({ success: true, profile: await getExpertProfileService(req.auth.userId) }); }
  catch (error) { return next(error); }
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
