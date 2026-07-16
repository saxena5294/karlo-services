import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  updatedBy: { type: String, required: true, trim: true },
}, { timestamps: true, collection: "platformsettings" });

export const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);
