import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const conditionalRuleSchema = new mongoose.Schema({
  field: { type: String, required: true, trim: true },
  operator: { type: String, enum: ["equals", "not_equals", "in"], default: "equals" },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use a valid field name"],
    },
    label: { type: String, required: true, trim: true },
    labelHindi: { type: String, trim: true, default: "" },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "email",
        "tel",
        "number",
        "date",
        "textarea",
        "select",
        "radio",
        "checkbox",
        "file",
      ],
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, trim: true, default: "" },
    helpText: { type: String, trim: true, default: "" },
    options: { type: [optionSchema], default: [] },
    accept: { type: String, trim: true, default: "" },
    multiple: { type: Boolean, default: false },
    maxFileSizeMb: { type: Number, min: 0.1, max: 25, default: 5 },
    maxFiles: { type: Number, min: 1, max: 10, default: 1 },
    allowCamera: { type: Boolean, default: false },
    capture: { type: String, enum: ["", "user", "environment"], default: "" },
    documentOptions: { type: [optionSchema], default: [] },
    examples: { type: [String], default: [] },
    conditional: { type: conditionalRuleSchema, default: null },
    collapsed: { type: Boolean, default: false },
    minLength: { type: Number, min: 0 },
    maxLength: { type: Number, min: 1, max: 5000 },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    section: { type: String, trim: true, default: "default" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      match: [/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Use a valid section ID"],
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const serviceFormSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    sections: { type: [sectionSchema], default: [] },
    fields: {
      type: [fieldSchema],
      validate: {
        validator(fields) {
          return fields.length > 0 && new Set(fields.map(({ name }) => name)).size === fields.length;
        },
        message: "A form needs fields with unique names",
      },
    },
    isActive: { type: Boolean, default: true },
    requireEmail: { type: Boolean, default: false },
    allowAdditionalDocuments: { type: Boolean, default: true },
    maxAdditionalDocuments: { type: Number, min: 0, max: 6, default: 6 },
    termsUrl: { type: String, trim: true, default: "/terms" },
    captchaRequired: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "serviceforms" }
);

serviceFormSchema.path("fields").validate(
  (fields) =>
    fields.every(
      (field) =>
        !["select", "radio"].includes(field.type) || field.options.length > 0
    ),
  "Select and radio fields need at least one option"
);

export const ServiceForm = mongoose.model("ServiceForm", serviceFormSchema);
