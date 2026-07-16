import {
  addRetailerRemark as addRetailerRemarkService,
  getRetailerApplicationById as getRetailerApplicationByIdService,
  getRetailerApplications as getRetailerApplicationsService,
  getRetailerDashboardSummary as getRetailerDashboardSummaryService,
  requestApplicationDocuments as requestApplicationDocumentsService,
  updateRetailerApplicationStatus as updateRetailerApplicationStatusService,
} from "../services/applicationService.js";

export const getRetailerDashboardSummary = async (req, res, next) => {
  try {
    const result = await getRetailerDashboardSummaryService(req.auth.userId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getRetailerApplications = async (req, res, next) => {
  try {
    const result = await getRetailerApplicationsService(req.auth.userId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getRetailerApplicationById = async (req, res, next) => {
  try {
    const application = await getRetailerApplicationByIdService(
      req.auth.userId,
      req.params.id
    );
    return res.status(200).json({ success: true, application });
  } catch (error) {
    return next(error);
  }
};

export const updateRetailerApplicationStatus = async (req, res, next) => {
  try {
    const application = await updateRetailerApplicationStatusService({
      retailerId: req.auth.userId,
      id: req.params.id,
      status: req.body.status,
      remarks: req.body.remarks,
    });
    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      application,
    });
  } catch (error) {
    return next(error);
  }
};

export const addRetailerRemark = async (req, res, next) => {
  try {
    await addRetailerRemarkService({
      retailerId: req.auth.userId,
      id: req.params.id,
      remarks: req.body.remarks,
    });
    return res.status(201).json({ success: true, message: "Remark added successfully" });
  } catch (error) {
    return next(error);
  }
};

export const requestApplicationDocuments = async (req, res, next) => {
  try {
    const application = await requestApplicationDocumentsService({
      retailerId: req.auth.userId,
      id: req.params.id,
      remarks: req.body.remarks,
    });
    return res.status(200).json({
      success: true,
      message: "Document request added successfully",
      application,
    });
  } catch (error) {
    return next(error);
  }
};
