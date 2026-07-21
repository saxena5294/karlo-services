import mongoose from "mongoose";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_VALUES } from "../constants/fulfillmentConstants.js";

const applicationAssignmentSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    assignmentType: { type: String, enum: ASSIGNMENT_TYPE_VALUES, required: true },
    expertUserId: { type: String, trim: true, default: null },
    partnerUserId: { type: String, trim: true, default: null },
    assignedBy: { type: String, required: true, trim: true },
    remarks: { type: String, trim: true, maxlength: 1000, default: "" },
    isActive: { type: Boolean, default: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "applicationassignments" }
);

applicationAssignmentSchema.pre("validate", function normalizeAssignment() {
  if (this.assignmentType === ASSIGNMENT_TYPES.EXPERT) {
    this.partnerUserId = null;
  } else {
    this.expertUserId = null;
  }
  if (!this.expertUserId && !this.partnerUserId) {
    this.invalidate("assignmentType", "An expert or partner assignee is required");
  }
});

applicationAssignmentSchema.index({ application: 1, createdAt: -1 });
applicationAssignmentSchema.index({ expertUserId: 1, createdAt: -1 });
applicationAssignmentSchema.index({ partnerUserId: 1, createdAt: -1 });
applicationAssignmentSchema.index(
  { application: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "one_active_assignment" }
);

export const ApplicationAssignment = mongoose.model(
  "ApplicationAssignment",
  applicationAssignmentSchema
);
