import mongoose from "mongoose";

export const PARTNER_VERIFICATION_STATUSES = Object.freeze([
  "pending", "under_review", "approved", "rejected", "suspended",
]);

const verificationDocumentSchema = new mongoose.Schema({
  documentType: { type: String, required: true, trim: true },
  publicId: { type: String, required: true, trim: true },
  secureUrl: { type: String, required: true, trim: true },
  originalName: { type: String, trim: true, default: "" },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  line1: { type: String, trim: true, default: "" },
  line2: { type: String, trim: true, default: "" },
  landmark: { type: String, trim: true, default: "" },
}, { _id: false });

const partnerProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, trim: true, index: true },
  businessName: { type: String, required: true, trim: true, maxlength: 160 },
  ownerName: { type: String, required: true, trim: true, maxlength: 120 },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: addressSchema, default: () => ({}) },
  city: { type: String, required: true, trim: true, index: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true, index: true },
  gstNumber: { type: String, trim: true, uppercase: true, default: "" },
  businessType: { type: String, required: true, trim: true },
  servicesOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  serviceCategories: { type: [String], default: [] },
  serviceAreas: { type: [String], default: [] },
  verificationStatus: { type: String, enum: PARTNER_VERIFICATION_STATUSES, default: "pending", index: true },
  verificationDocuments: { type: [verificationDocumentSchema], default: [], select: false },
  availability: { type: Boolean, default: true, index: true },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, min: 0, default: 0 },
  totalLeads: { type: Number, min: 0, default: 0 },
  acceptedLeads: { type: Number, min: 0, default: 0 },
  completedLeads: { type: Number, min: 0, default: 0 },
  walletBalance: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, collection: "partnerprofiles" });

partnerProfileSchema.index({ verificationStatus: 1, isActive: 1, availability: 1 });
partnerProfileSchema.index({ serviceCategories: 1 });
partnerProfileSchema.index({ servicesOffered: 1 });
partnerProfileSchema.index({ serviceAreas: 1 });

export const PartnerProfile = mongoose.model("PartnerProfile", partnerProfileSchema);

