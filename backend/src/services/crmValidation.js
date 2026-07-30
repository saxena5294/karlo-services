import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { cleanDate, cleanEnum, cleanText } from "./cmsValidation.js";

export const escapeCrmRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const crmPage = (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const assertCrmQuery = (query, allowed) => {
  const common = ["search", "page", "limit", "sortBy", "sortOrder", "dateFrom", "dateTo"];
  const extra = Object.keys(query).filter((key) => !common.includes(key) && !allowed.includes(key));
  if (extra.length) throw new ApiError(400, `Unexpected query parameters: ${extra.join(", ")}`);
};

export const crmDateRange = (query, field = "createdAt") => {
  if (!query.dateFrom && !query.dateTo) return {};
  const range = {};
  if (query.dateFrom) range.$gte = cleanDate(query.dateFrom, "dateFrom");
  if (query.dateTo) {
    const end = cleanDate(query.dateTo, "dateTo");
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  if (range.$gte && range.$lte && range.$lte < range.$gte) throw new ApiError(400, "dateTo must be on or after dateFrom");
  return { [field]: range };
};

export const crmSort = (query, allowed, fallback = "createdAt") => {
  const sortBy = query.sortBy || fallback;
  if (!allowed.includes(sortBy)) throw new ApiError(400, `sortBy must be one of: ${allowed.join(", ")}`);
  const order = query.sortOrder || "desc";
  if (!["asc", "desc"].includes(order)) throw new ApiError(400, "sortOrder must be asc or desc");
  return { [sortBy]: order === "asc" ? 1 : -1 };
};

export const cleanCrmEntityId = (value, name = "entityId") => cleanText(value, name, { required: true, max: 160 });
export const cleanCrmEnum = cleanEnum;
export const assertCrmObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `${label} must be a valid MongoDB ObjectId`);
  return value;
};
