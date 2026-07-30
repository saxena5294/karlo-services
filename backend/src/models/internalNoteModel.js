import mongoose from "mongoose";
import { CRM_ENTITY_TYPES } from "./followUpModel.js";

const internalNoteSchema = new mongoose.Schema({
  relatedEntityType: { type: String, enum: CRM_ENTITY_TYPES, required: true },
  relatedEntityId: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  visibility: { type: String, enum: ["admin_only"], default: "admin_only" },
  createdBy: { type: String, required: true, trim: true },
  updatedBy: { type: String, required: true, trim: true },
}, { timestamps: true, collection: "crminternalnotes" });

internalNoteSchema.index({ relatedEntityType: 1, relatedEntityId: 1, createdAt: -1 });

export const InternalNote = mongoose.model("InternalNote", internalNoteSchema);
