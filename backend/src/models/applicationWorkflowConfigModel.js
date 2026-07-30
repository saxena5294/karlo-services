import mongoose from "mongoose";
import {
  APPLICATION_STATUS_TRANSITIONS,
  APPLICATION_STATUS_VALUES,
} from "../constants/applicationConstants.js";

const transitionSchema = new mongoose.Schema(
  {
    from: { type: String, enum: APPLICATION_STATUS_VALUES, required: true },
    to: {
      type: [{ type: String, enum: APPLICATION_STATUS_VALUES }],
      required: true,
      validate: {
        validator: (values) => new Set(values).size === values.length,
        message: "Workflow transition targets must be unique",
      },
    },
  },
  { _id: false }
);

const applicationWorkflowConfigSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["default"], default: "default", unique: true },
    name: { type: String, trim: true, maxlength: 120, default: "Default application lifecycle" },
    statuses: {
      type: [{ type: String, enum: APPLICATION_STATUS_VALUES }],
      default: () => [...APPLICATION_STATUS_VALUES],
      validate: {
        validator: (values) => values.length > 0 && new Set(values).size === values.length,
        message: "Workflow statuses must be a non-empty unique list",
      },
    },
    transitions: {
      type: [transitionSchema],
      default: () => Object.entries(APPLICATION_STATUS_TRANSITIONS).map(([from, to]) => ({
        from,
        to: [...to],
      })),
    },
    updatedBy: { type: String, trim: true, required: true },
  },
  { timestamps: true, collection: "applicationworkflowconfigs" }
);

applicationWorkflowConfigSchema.pre("validate", function validateWorkflowGraph() {
  const statuses = new Set(this.statuses || []);
  const sources = new Set();
  for (const transition of this.transitions || []) {
    if (sources.has(transition.from)) {
      this.invalidate("transitions", `Duplicate transition source: ${transition.from}`);
    }
    sources.add(transition.from);
    if (!statuses.has(transition.from) || transition.to.some((status) => !statuses.has(status))) {
      this.invalidate("transitions", "Every transition must reference an enabled workflow status");
    }
    if (transition.to.includes(transition.from)) {
      this.invalidate("transitions", `A status cannot transition to itself: ${transition.from}`);
    }
  }
});

export const ApplicationWorkflowConfig = mongoose.model(
  "ApplicationWorkflowConfig",
  applicationWorkflowConfigSchema
);
