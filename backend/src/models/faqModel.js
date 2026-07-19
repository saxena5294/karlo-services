import mongoose from "mongoose";

export const FAQ_CATEGORIES = ["General", "Services", "Documents", "Applications", "Payments", "OTP & Security", "Technical", "Refund", "Support", "Partner"];
export const FAQ_AUDIENCES = ["public", "customer", "partner"];

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  answer: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, enum: FAQ_CATEGORIES, default: "General", index: true },
  displayOrder: { type: Number, min: 0, default: 0 },
  // Backward-compatible alias retained for existing CMS clients and records.
  order: { type: Number, min: 0, default: 0 },
  isFeatured: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true },
  audience: { type: [{ type: String, enum: FAQ_AUDIENCES }], default: () => [...FAQ_AUDIENCES], validate: { validator: (value) => value.length > 0 && new Set(value).size === value.length, message: "FAQ audience must contain unique supported values" } },
  keywords: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: [], validate: { validator: (value) => value.length <= 20, message: "FAQ keywords cannot contain more than 20 values" } },
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "faqs" });

faqSchema.pre("validate", function synchronizeDisplayOrder() {
  if (this.isModified("displayOrder")) this.order = this.displayOrder;
  else if (this.order != null && this.displayOrder === 0) this.displayOrder = this.order;
});

faqSchema.index({ category: 1, status: 1, isActive: 1, deletedAt: 1, displayOrder: 1 });
faqSchema.index({ audience: 1, isFeatured: -1, displayOrder: 1 });
faqSchema.index({ question: "text", answer: "text", keywords: "text", category: "text" });

export const FAQ = mongoose.model("FAQ", faqSchema);
