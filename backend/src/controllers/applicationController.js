import {
  assignApplication as assignApplicationService,
  getAdminApplications as getAdminApplicationsService,
  getApplicationDetails as getApplicationDetailsService,
  getCustomerApplications as getCustomerApplicationsService,
  getRetailerApplications as getRetailerApplicationsService,
  submitApplication as submitApplicationService,
  updateApplicationStatus as updateApplicationStatusService,
} from "../services/applicationService.js";
import { ROLES } from "../constants/roleConstants.js";

// Clerk will populate the same req.auth interface later.
const getActorId = (req) => req.auth?.userId || "system";

export const submitApplication = async (req, res, next) => {
  try {
    const application = await submitApplicationService({
      serviceSlug: req.params.slug,
      variantKey: req.body.variantKey,
      body: req.body,
      files: req.files || [],
      customerId: req.auth?.role === ROLES.CUSTOMER ? req.auth.userId : null,
      updatedBy: getActorId(req),
      submittedByRole: req.auth?.role,
      idempotencyKey: req.get("idempotency-key"),
      remoteIp: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      applicationNumber: application.applicationNumber,
      status: application.status,
      receipt: {
        applicationId: application._id,
        serviceName: application.serviceName,
        variantTitle: application.variantTitle,
        applicantName: application.applicantName,
        mobileNumber: application.mobileNumber,
        submittedAt: application.submittedAt,
        documentCount: application.receipt?.documentCount || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const application = await updateApplicationStatusService({
      applicationNumber: req.params.applicationNumber,
      status: req.body.status,
      remarks: req.body.remarks,
      updatedBy: getActorId(req),
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

export const assignRetailer = async (req, res, next) => {
  try {
    const application = await assignApplicationService({
      applicationNumber: req.params.applicationNumber,
      assignmentType: req.body.assignmentType || "expert",
      assignedExpertId: req.body.assignedExpertId || req.body.retailerId,
      assignedPartnerId: req.body.assignedPartnerId,
      remarks: req.body.remarks,
      updatedBy: getActorId(req),
    });

    return res.status(200).json({
      success: true,
      message: "Application assignment updated successfully",
      application,
    });
  } catch (error) {
    return next(error);
  }
};

export const getApplicationDetails = async (req, res, next) => {
  try {
    const application = await getApplicationDetailsService(req.params.applicationNumber);
    return res.status(200).json({ success: true, application });
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

export const getRetailerApplications = async (req, res, next) => {
  try {
    const retailerId = req.auth.role === ROLES.EXPERT
      ? req.auth.userId
      : req.params.retailerId;
    const result = await getRetailerApplicationsService(retailerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const getAdminApplications = async (req, res, next) => {
  try {
    const result = await getAdminApplicationsService(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const trackApplication = async (req, res, next) => {
  try {
    const details = await getApplicationDetailsService(req.params.applicationNumber);
    const application = {
      applicationNumber: details.applicationNumber,
      service: details.service,
      status: details.status,
      timeline: details.timeline,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
      // Retained as a response alias so the existing public tracker keeps working.
      statusHistory: details.timeline.map(({ status, remarks, createdAt }) => ({
        status,
        message: remarks,
        changedAt: createdAt,
      })),
    };

    return res.status(200).json({ success: true, application });
  } catch (error) {
    return next(error);
  }
};
