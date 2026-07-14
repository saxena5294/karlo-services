import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use a valid field name"],
    },
    label: { type: String, required: true, trim: true },
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
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
  },
  { _id: true }
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
