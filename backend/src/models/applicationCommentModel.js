import mongoose from "mongoose";
import { ROLE_VALUES } from "../constants/roleConstants.js";

const applicationCommentSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  visibility: { type: String, enum: ["internal", "public"], default: "internal", index: true },
  authorUserId: { type: String, required: true, trim: true },
  authorRole: { type: String, enum: ROLE_VALUES, required: true },
  editedAt: { type: Date, default: null },
}, { timestamps: true, collection: "applicationcomments" });

applicationCommentSchema.index({ application: 1, visibility: 1, createdAt: -1 });

export const ApplicationComment = mongoose.model("ApplicationComment", applicationCommentSchema);
