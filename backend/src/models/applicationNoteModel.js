import mongoose from "mongoose";

const applicationNoteSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    remarks: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "applicationnotes" }
);

applicationNoteSchema.index({ application: 1, createdAt: -1 });

export const ApplicationNote = mongoose.model("ApplicationNote", applicationNoteSchema);
