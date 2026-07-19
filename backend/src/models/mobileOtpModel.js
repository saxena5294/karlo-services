import mongoose from "mongoose";
const mobileOtpSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, index: true }, mobileNumber: { type: String, required: true, match: /^[6-9]\d{9}$/, index: true }, otpHash: { type: String, required: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } }, resendAvailableAt: { type: Date, required: true }, attemptsRemaining: { type: Number, min: 0, default: 5 }, sendCount: { type: Number, min: 1, default: 1 }, windowStartedAt: { type: Date, required: true }, verifiedAt: { type: Date, default: null },
}, { timestamps: true, collection: "mobileotps" });
mobileOtpSchema.index({ userId: 1, mobileNumber: 1 }, { unique: true });
export const MobileOtp = mongoose.model("MobileOtp", mobileOtpSchema);
