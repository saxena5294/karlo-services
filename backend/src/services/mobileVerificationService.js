import crypto from "crypto";
import { MobileOtp } from "../models/mobileOtpModel.js";
import { ApiError } from "../utils/ApiError.js";

const OTP_EXPIRY_MS = 5 * 60 * 1000; const RESEND_MS = 60 * 1000; const WINDOW_MS = 60 * 60 * 1000; const MAX_SENDS = 5; const MAX_ATTEMPTS = 5;
export const normalizeIndianMobile = (value) => { const digits = String(value || "").replace(/\D/g, ""); const mobile = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits; if (!/^[6-9]\d{9}$/.test(mobile)) throw new ApiError(400, "Enter a valid 10-digit Indian mobile number"); return mobile; };
const secret = (name) => { const value = process.env[name]?.trim(); if (value) return value; if (process.env.NODE_ENV !== "production") return `karlo-development-${name}`; throw new ApiError(503, `${name} is not configured`); };
const otpHash = (userId, mobile, otp) => crypto.createHmac("sha256", secret("OTP_HASH_SECRET")).update(`${userId}:${mobile}:${otp}`).digest("hex");
const safeEqual = (left, right) => { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const sendSms = async (mobileNumber, otp) => {
  if (process.env.NODE_ENV !== "production") return;
  const url = process.env.SMS_PROVIDER_URL?.trim(); const token = process.env.SMS_PROVIDER_TOKEN?.trim();
  if (!url || !token) throw new ApiError(503, "SMS provider is not configured");
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ mobileNumber: `91${mobileNumber}`, template: "karlo_mobile_verification", variables: { otp, expiresInMinutes: 5 } }) });
  if (!response.ok) throw new ApiError(502, "Unable to send verification OTP");
};

export const sendMobileOtp = async (userId, value) => {
  const mobileNumber = normalizeIndianMobile(value); const now = new Date(); const existing = await MobileOtp.findOne({ userId, mobileNumber });
  if (existing && existing.resendAvailableAt > now) throw new ApiError(429, `Please wait ${Math.ceil((existing.resendAvailableAt - now) / 1000)} seconds before resending`);
  const inWindow = existing && now - existing.windowStartedAt < WINDOW_MS; const sendCount = inWindow ? existing.sendCount + 1 : 1;
  if (sendCount > MAX_SENDS) throw new ApiError(429, "OTP send limit reached. Try again later");
  const otp = String(crypto.randomInt(100000, 1000000)); await sendSms(mobileNumber, otp);
  await MobileOtp.findOneAndUpdate({ userId, mobileNumber }, { $set: { otpHash: otpHash(userId, mobileNumber, otp), expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), resendAvailableAt: new Date(now.getTime() + RESEND_MS), attemptsRemaining: MAX_ATTEMPTS, sendCount, windowStartedAt: inWindow ? existing.windowStartedAt : now, verifiedAt: null, verificationTokenHash: null, verificationExpiresAt: null, consumedAt: null } }, { upsert: true, runValidators: true, setDefaultsOnInsert: true });
  return { mobileNumber, expiresInSeconds: OTP_EXPIRY_MS / 1000, resendAfterSeconds: RESEND_MS / 1000, ...(process.env.NODE_ENV !== "production" ? { developmentOtp: otp } : {}) };
};

const signToken = (payload) => { const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url"); const signature = crypto.createHmac("sha256", secret("OTP_TOKEN_SECRET")).update(encoded).digest("base64url"); return `${encoded}.${signature}`; };
export const verifyMobileOtp = async (userId, value, otpValue) => {
  const mobileNumber = normalizeIndianMobile(value); const otp = String(otpValue || "").trim(); if (!/^\d{6}$/.test(otp)) throw new ApiError(400, "Enter the 6-digit OTP");
  const record = await MobileOtp.findOne({ userId, mobileNumber }); if (!record || record.expiresAt <= new Date()) throw new ApiError(400, "OTP has expired. Request a new OTP"); if (record.attemptsRemaining <= 0) throw new ApiError(429, "Maximum OTP attempts reached");
  if (!safeEqual(record.otpHash, otpHash(userId, mobileNumber, otp))) { record.attemptsRemaining -= 1; await record.save(); throw new ApiError(400, `Incorrect OTP. ${record.attemptsRemaining} attempts remaining`); }
  const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const mobileVerificationToken = signToken({ userId, mobileNumber, exp: verificationExpiresAt.getTime(), nonce: crypto.randomBytes(24).toString("base64url") });
  record.verifiedAt = new Date(); record.otpHash = crypto.randomBytes(32).toString("hex"); record.expiresAt = verificationExpiresAt; record.verificationTokenHash = crypto.createHash("sha256").update(mobileVerificationToken).digest("hex"); record.verificationExpiresAt = verificationExpiresAt; record.consumedAt = null; await record.save();
  return { mobileNumber, mobileVerificationToken };
};
export const validateMobileVerificationToken = (token, userId, value) => { const mobileNumber = normalizeIndianMobile(value); const [encoded, signature] = String(token || "").split("."); if (!encoded || !signature) throw new ApiError(400, "Mobile verification is required"); const expected = crypto.createHmac("sha256", secret("OTP_TOKEN_SECRET")).update(encoded).digest("base64url"); if (!safeEqual(signature, expected)) throw new ApiError(400, "Mobile verification is invalid"); let payload; try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { throw new ApiError(400, "Mobile verification is invalid"); } if (payload.userId !== userId || payload.mobileNumber !== mobileNumber || payload.exp < Date.now()) throw new ApiError(400, "Mobile verification has expired or does not match"); return mobileNumber; };
export const consumeMobileVerificationToken = async (token, userId, value, session) => {
  const mobileNumber = validateMobileVerificationToken(token, userId, value);
  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
  const consumed = await MobileOtp.findOneAndUpdate(
    { userId, mobileNumber, verificationTokenHash: tokenHash, verificationExpiresAt: { $gt: new Date() }, consumedAt: null },
    { $set: { consumedAt: new Date() } },
    { new: true, session }
  ).select("_id");
  if (!consumed) throw new ApiError(409, "Mobile verification has already been used or has expired");
  return mobileNumber;
};
