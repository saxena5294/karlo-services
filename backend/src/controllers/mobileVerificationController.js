import { sendMobileOtp, verifyMobileOtp } from "../services/mobileVerificationService.js";
export const sendOtp = async (req, res, next) => { try { res.json({ success: true, ...(await sendMobileOtp(req.auth.userId, req.body.mobileNumber)) }); } catch (error) { next(error); } };
export const verifyOtp = async (req, res, next) => { try { res.json({ success: true, ...(await verifyMobileOtp(req.auth.userId, req.body.mobileNumber, req.body.otp)) }); } catch (error) { next(error); } };
