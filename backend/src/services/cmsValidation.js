import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { HOMEPAGE_SECTIONS } from "../models/homepageModel.js";

const unsafeText = /<\/?[a-z][^>]*>|javascript\s*:|data\s*:\s*text\/html/i;
export const assertAllowedFields = (body, allowed) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Request body must be an object");
  const unexpected = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
};
export const cleanText = (value, name, { required = false, max = 500 } = {}) => {
  if (value == null || value === "") { if (required) throw new ApiError(400, `${name} is required`); return ""; }
  if (typeof value !== "string") throw new ApiError(400, `${name} must be text`);
  const text = value.trim();
  if (required && !text) throw new ApiError(400, `${name} is required`);
  if (text.length > max) throw new ApiError(400, `${name} must be at most ${max} characters`);
  if (unsafeText.test(text)) throw new ApiError(400, `${name} contains unsafe HTML or a script URL`);
  return text;
};
export const cleanLink = (value, name = "URL", { relative = true } = {}) => {
  const text = cleanText(value, name, { max: 500 }); if (!text) return "";
  if (relative && text.startsWith("/") && !text.startsWith("//")) return text;
  let url; try { url = new URL(text); } catch { throw new ApiError(400, `${name} must be a valid URL`); }
  if (!["http:", "https:"].includes(url.protocol)) throw new ApiError(400, `${name} must use HTTP or HTTPS`);
  return url.toString();
};
export const cleanEmail = (value, name) => { const text = cleanText(value, name, { max: 254 }); if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new ApiError(400, `${name} must be a valid email`); return text.toLowerCase(); };
export const cleanPhone = (value, name) => { const text = cleanText(value, name, { max: 30 }); if (text && !/^\+?[0-9][0-9 ()-]{6,28}$/.test(text)) throw new ApiError(400, `${name} must be a valid phone number`); return text; };
export const cleanBoolean = (value, name) => { if (value === true || value === "true") return true; if (value === false || value === "false") return false; throw new ApiError(400, `${name} must be true or false`); };
export const cleanNumber = (value, name, min = 0, max = Number.MAX_SAFE_INTEGER) => { const number = Number(value); if (!Number.isFinite(number) || number < min || number > max) throw new ApiError(400, `${name} must be between ${min} and ${max}`); return number; };
export const cleanDate = (value, name) => { if (value == null || value === "") return null; const date = new Date(value); if (Number.isNaN(date.getTime())) throw new ApiError(400, `${name} must be a valid date`); return date; };
export const cleanEnum = (value, name, values) => { if (!values.includes(value)) throw new ApiError(400, `${name} must be one of: ${values.join(", ")}`); return value; };
export const assertObjectId = (value, name = "id") => { if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `${name} must be a valid MongoDB ObjectId`); return value; };
export const cleanSectionOrder = (value) => { if (!Array.isArray(value) || value.length !== HOMEPAGE_SECTIONS.length || new Set(value).size !== value.length || value.some((item) => !HOMEPAGE_SECTIONS.includes(item))) throw new ApiError(400, `sectionOrder must contain each supported section exactly once`); return value; };
export const cleanStatus = (value) => cleanEnum(value, "status", ["draft", "published"]);
