import mongoose from "mongoose";
import { FULFILLMENT_TYPES, FULFILLMENT_TYPE_VALUES } from "../constants/fulfillmentConstants.js";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Service slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
    },
    icon: {
      type: String,
      default: "📄",
    },
    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Price cannot be negative"],
    },
    processingTime: {
      type: String,
      required: [true, "Processing time is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Service category is required"],
      trim: true,
    },
    requiredDocuments: { type: [String], default: [] },
    eligibility: { type: [String], default: [] },
    instructions: { type: [String], default: [] },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fulfillmentType: {
      type: String,
      enum: FULFILLMENT_TYPE_VALUES,
      default: FULFILLMENT_TYPES.INTERNAL,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "services",
  }
);

export const Service = mongoose.model("Service", serviceSchema);
