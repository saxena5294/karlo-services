import {
  getCustomerApplicationById as getCustomerApplicationByIdService,
  getCustomerApplications as getCustomerApplicationsService,
  getCustomerDashboardSummary as getCustomerDashboardSummaryService,
} from "../services/applicationService.js";

export const getCustomerDashboardSummary = async (req, res, next) => {
  try {
    const result = await getCustomerDashboardSummaryService(req.auth.userId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerApplications = async (req, res, next) => {
  try {
    const result = await getCustomerApplicationsService(req.auth.userId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerApplicationById = async (req, res, next) => {
  try {
    const application = await getCustomerApplicationByIdService(
      req.auth.userId,
      req.params.id
    );
    return res.status(200).json({ success: true, application });
  } catch (error) {
    return next(error);
  }
};
