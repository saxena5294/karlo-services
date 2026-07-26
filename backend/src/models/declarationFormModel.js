import mongoose from "mongoose";

const AUDIENCES = ["customer", "partner"];
const HTTPS_URL = /^https:\/\/[\w.-]+(?:[/:?#][^\s]*)?$/i;

const declarationFormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase letters, numbers, and hyphens only"],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    language: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: "English",
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => HTTPS_URL.test(value),
        message: "Declaration file URL must use HTTPS",
      },
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 500,
      match: [
        /^karlo-services\/declaration-forms\/.+/,
        "Cloudinary public ID must be inside karlo-services/declaration-forms",
      ],
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    fileType: {
      type: String,
      enum: ["pdf"],
      default: "pdf",
      lowercase: true,
      trim: true,
    },
    visibleTo: {
      type: [{ type: String, enum: AUDIENCES }],
      required: true,
      validate: {
        validator: (roles) => Array.isArray(roles) && roles.length > 0,
        message: "At least one audience is required",
      },
    },
    displayOrder: {
      type: Number,
      min: 0,
      default: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    downloadCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    createdBy: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    updatedBy: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
  },
  {
    timestamps: true,
    collection: "declarationforms",
    optimisticConcurrency: true,
  },
);

declarationFormSchema.index({ isActive: 1, visibleTo: 1, displayOrder: 1, title: 1 });
declarationFormSchema.index({ isActive: 1, visibleTo: 1, isPopular: 1, displayOrder: 1 });
declarationFormSchema.index({ category: 1, language: 1 });

export const DeclarationForm = mongoose.model("DeclarationForm", declarationFormSchema);
export const DECLARATION_FORM_AUDIENCES = Object.freeze(AUDIENCES);
