import { ApiError } from "../utils/ApiError.js";
export const verifyCaptcha = async (token, remoteIp) => {
  if (process.env.NODE_ENV !== "production" && token === "development-bypass") return true;
  const provider = process.env.CAPTCHA_PROVIDER?.trim(); const secret = process.env.CAPTCHA_SECRET_KEY?.trim();
  if (!provider || !secret) throw new ApiError(503, "CAPTCHA provider is not configured");
  const urls = { turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify", recaptcha: "https://www.google.com/recaptcha/api/siteverify" }; const url = urls[provider]; if (!url) throw new ApiError(503, "Unsupported CAPTCHA provider");
  const body = new URLSearchParams({ secret, response: String(token || ""), ...(remoteIp ? { remoteip: remoteIp } : {}) }); const response = await fetch(url, { method: "POST", body }); if (!response.ok) throw new ApiError(502, "CAPTCHA verification service is unavailable"); const result = await response.json(); if (!result.success) throw new ApiError(400, "CAPTCHA verification failed"); return true;
};
