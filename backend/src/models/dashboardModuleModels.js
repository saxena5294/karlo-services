import mongoose from "mongoose";

const httpsUrl = (value) => !value || /^https:\/\/[\w.-]+(?:[/:?#][^\s]*)?$/i.test(value);
const roleField = { type: String, enum: ["customer", "partner"], required: true, index: true };

const softwareAssetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 }, description: { type: String, trim: true, maxlength: 1000, default: "" }, icon: { type: String, trim: true, default: "💻" }, version: { type: String, trim: true, maxlength: 80, default: "" }, fileSize: { type: String, trim: true, maxlength: 80, default: "" }, operatingSystem: { type: String, trim: true, maxlength: 160, default: "" }, downloadUrl: { type: String, required: true, trim: true, validate: { validator: httpsUrl, message: "Software download URL must use HTTPS" } }, installationGuide: { type: String, trim: true, maxlength: 2000, default: "" }, isActive: { type: Boolean, default: true, index: true }, order: { type: Number, min: 0, default: 0 }, createdBy: { type: String, required: true }, updatedBy: { type: String, required: true },
}, { timestamps: true, collection: "softwareassets" });
softwareAssetSchema.index({ isActive: 1, order: 1 });

const declarationFormSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 }, description: { type: String, trim: true, maxlength: 1000, default: "" }, category: { type: String, trim: true, maxlength: 100, default: "Other" }, language: { type: String, trim: true, maxlength: 80, default: "" }, version: { type: String, trim: true, maxlength: 80, default: "" }, fileUrl: { type: String, required: true, trim: true, validate: { validator: httpsUrl, message: "Declaration file URL must use HTTPS" } }, fileName: { type: String, required: true, trim: true, maxlength: 240 }, fileSize: { type: String, trim: true, maxlength: 80, default: "" }, isActive: { type: Boolean, default: true, index: true }, order: { type: Number, min: 0, default: 0 }, createdBy: { type: String, required: true }, updatedBy: { type: String, required: true },
}, { timestamps: true, collection: "declarationforms" });
declarationFormSchema.index({ isActive: 1, order: 1 });

const paymentRecordSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, trim: true }, userId: { type: String, required: true, trim: true, index: true }, userRole: roleField, applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null }, type: { type: String, enum: ["service_payment", "joining_fee", "renewal_fee", "refund", "cashback", "other"], required: true }, amount: { type: Number, required: true, min: 0 }, status: { type: String, enum: ["pending", "successful", "failed", "refunded"], required: true, index: true }, paymentMethod: { type: String, trim: true, default: "" }, referenceNumber: { type: String, trim: true, default: "" }, description: { type: String, trim: true, maxlength: 500, default: "" }, paidAt: { type: Date, default: null },
}, { timestamps: true, collection: "paymentrecords" });
paymentRecordSchema.index({ userId: 1, userRole: 1, createdAt: -1 });

const rewardRecordSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, index: true }, userRole: roleField, rewardType: { type: String, enum: ["referral", "cashback", "promotional", "other"], required: true }, amount: { type: Number, required: true, min: 0 }, source: { type: String, trim: true, maxlength: 160, default: "" }, referenceId: { type: String, trim: true, default: "" }, status: { type: String, enum: ["pending", "approved", "credited", "cancelled"], required: true, index: true }, description: { type: String, trim: true, maxlength: 500, default: "" }, creditedAt: { type: Date, default: null },
}, { timestamps: true, collection: "rewardrecords" });
rewardRecordSchema.index({ userId: 1, userRole: 1, createdAt: -1 });

const referralAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, unique: true }, userRole: roleField, referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
}, { timestamps: true, collection: "referralaccounts" });

const referralSchema = new mongoose.Schema({
  referrerUserId: { type: String, required: true, trim: true, index: true }, referredUserId: { type: String, required: true, unique: true, trim: true }, referralCode: { type: String, required: true, uppercase: true, trim: true }, referrerRole: roleField, referredRole: roleField, status: { type: String, enum: ["pending", "successful", "cancelled"], default: "pending", index: true }, rewardAmount: { type: Number, min: 0, default: 0 }, rewardStatus: { type: String, enum: ["not_eligible", "pending", "approved", "credited", "cancelled"], default: "not_eligible" }, completedAt: { type: Date, default: null },
}, { timestamps: true, collection: "referrals" });
referralSchema.index({ referrerUserId: 1, createdAt: -1 });

const renewalRequestSchema = new mongoose.Schema({
  partnerUserId: { type: String, required: true, trim: true, index: true }, periodStart: { type: Date, required: true }, periodEnd: { type: Date, required: true }, fee: { type: Number, min: 0, required: true }, status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", index: true }, requestedAt: { type: Date, default: Date.now }, reviewedAt: { type: Date, default: null }, reviewedBy: { type: String, default: "" }, remarks: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true, collection: "partnerrenewals" });
renewalRequestSchema.index({ partnerUserId: 1, createdAt: -1 });

const replySchema = new mongoose.Schema({ authorUserId: { type: String, required: true }, authorRole: { type: String, enum: ["customer", "partner", "admin"], required: true }, message: { type: String, required: true, trim: true, maxlength: 3000 }, createdAt: { type: Date, default: Date.now } }, { _id: true });
const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, trim: true }, createdByUserId: { type: String, required: true, trim: true, index: true }, createdByRole: roleField, category: { type: String, enum: ["service_query", "transaction_query", "feedback", "technical_issue", "other"], required: true }, subcategory: { type: String, trim: true, maxlength: 160, default: "" }, subject: { type: String, required: true, trim: true, maxlength: 200 }, description: { type: String, required: true, trim: true, maxlength: 5000 }, serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null }, transactionId: { type: String, trim: true, default: "" }, status: { type: String, enum: ["open", "in_progress", "waiting_for_user", "resolved", "closed"], default: "open", index: true }, priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" }, assignedAdminId: { type: String, default: "" }, replies: { type: [replySchema], default: [] }, closedAt: { type: Date, default: null },
}, { timestamps: true, collection: "supporttickets" });
supportTicketSchema.index({ createdByUserId: 1, createdByRole: 1, status: 1, updatedAt: -1 });

export const SoftwareAsset = mongoose.model("SoftwareAsset", softwareAssetSchema);
export const DeclarationForm = mongoose.model("DeclarationForm", declarationFormSchema);
export const PaymentRecord = mongoose.model("PaymentRecord", paymentRecordSchema);
export const RewardRecord = mongoose.model("RewardRecord", rewardRecordSchema);
export const ReferralAccount = mongoose.model("ReferralAccount", referralAccountSchema);
export const Referral = mongoose.model("Referral", referralSchema);
export const PartnerRenewal = mongoose.model("PartnerRenewal", renewalRequestSchema);
export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
