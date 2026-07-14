import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true },
    originalName: { type: String, required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String, default: "" },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    message: { type: String, default: "Application submitted successfully" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    serviceForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceForm",
      required: true,
    },
    formData: { type: mongoose.Schema.Types.Mixed, required: true },
    files: { type: [fileSchema], default: [] },
    status: {
      type: String,
      enum: ["submitted", "under_review", "processing", "completed", "rejected"],
      default: "submitted",
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true, collection: "applications" }
);

export const Application = mongoose.model("Application", applicationSchema);
