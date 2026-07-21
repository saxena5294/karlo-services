import mongoose from "mongoose";

const expertProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    categories: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    availability: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ["active", "inactive", "unavailable"],
      default: "active",
      index: true,
    },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: "expertprofiles" }
);

export const ExpertProfile =
  mongoose.models.ExpertProfile || mongoose.model("ExpertProfile", expertProfileSchema);
