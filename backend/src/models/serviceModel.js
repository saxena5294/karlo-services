import mongoose from "mongoose";

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
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "services",
  }
);

export const Service = mongoose.model("Service", serviceSchema);
