import { ApiError } from "../utils/ApiError.js";

export const assertServiceCanAcceptApplications = (service) => {
  if (!service) throw new ApiError(404, "Service not found");
  if (!service.isActive) throw new ApiError(400, "This service is currently inactive.");
  if ((service.availabilityStatus || "available") !== "available") throw new ApiError(400, service.availabilityMessage || "This service is not currently available.");
  return service;
};
