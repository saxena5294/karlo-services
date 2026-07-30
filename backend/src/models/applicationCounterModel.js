import mongoose from "mongoose";

const applicationCounterSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true, min: 2000, max: 9999 },
    sequence: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    timestamps: true,
    collection: "applicationcounters",
  }
);

export const ApplicationCounter = mongoose.model(
  "ApplicationCounter",
  applicationCounterSchema
);
