import crypto from "crypto";
import streamifier from "streamifier";
import { getCloudinary } from "../config/cloudinary.js";
import { Application } from "../models/applicationModel.js";
import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";

const createApplicationNumber = () =>
  `KARLO-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const uploadBuffer = (file, applicationNumber) =>
  new Promise((resolve, reject) => {
    const upload = getCloudinary().uploader.upload_stream(
      {
        folder: `karlo-services/${applicationNumber}`,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    streamifier.createReadStream(file.buffer).pipe(upload);
  });

const normalizeBodyValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.trim();
  return value;
};

const isMissing = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

const matchesAcceptRule = (file, accept = "") => {
  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (!rules.length) return true;

  const mimeType = file.mimetype.toLowerCase();
  const fileName = file.originalname.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith(".")) return fileName.endsWith(rule);
    if (rule.endsWith("/*")) return mimeType.startsWith(rule.slice(0, -1));
    return mimeType === rule;
  });
};

const hasAllowedFileSignature = (file) => {
  const { buffer, mimetype } = file;

  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimetype === "image/webp") {
    return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }

  if (mimetype === "application/pdf") {
    return buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  }

  return false;
};

const removeUploadedFiles = async (files) => {
  if (!files.length) return;

  const cloudinary = getCloudinary();
  await Promise.allSettled(
    files.map(async ({ publicId, resourceType }) =>
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    )
  );
};

const validateSubmission = (form, body, files) => {
  const errors = [];
  const allowedFields = new Set(form.fields.map(({ name }) => name));
  const filesByField = files.reduce((groups, file) => {
    groups[file.fieldname] = [...(groups[file.fieldname] || []), file];
    return groups;
  }, {});

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) errors.push(`Unexpected field: ${key}`);
  }

  for (const file of files) {
    const config = form.fields.find(({ name }) => name === file.fieldname);
    if (!config || config.type !== "file") errors.push(`Unexpected file field: ${file.fieldname}`);
  }

  for (const field of form.fields) {
    const value = body[field.name];
    const missingValue = isMissing(value);
    const fieldFiles = filesByField[field.name] || [];

    if (Array.isArray(value) && field.type !== "checkbox") {
      errors.push(`${field.label} accepts only one value`);
    }

    if (field.required && field.type === "file" && !fieldFiles.length) {
      errors.push(`${field.label} is required`);
    } else if (field.required && field.type !== "file" && missingValue) {
      errors.push(`${field.label} is required`);
    }

    if (field.options.length && !missingValue) {
      const allowed = new Set(field.options.map(({ value: optionValue }) => optionValue));
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => !allowed.has(item))) errors.push(`${field.label} has an invalid value`);
    }

    if (field.type === "number" && !missingValue) {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        errors.push(`${field.label} must be a valid number`);
      } else if (field.min !== undefined && numberValue < field.min) {
        errors.push(`${field.label} must be at least ${field.min}`);
      } else if (field.max !== undefined && numberValue > field.max) {
        errors.push(`${field.label} must be no more than ${field.max}`);
      }
    }

    if (field.type === "email" && !missingValue) {
      const email = String(value).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`${field.label} must be a valid email address`);
      }
    }

    if (field.type === "date" && !missingValue) {
      const date = String(value).trim();
      const parsedDate = new Date(`${date}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        errors.push(`${field.label} must be a valid date`);
      }
    }

    if (field.type === "file") {
      if (!field.multiple && fieldFiles.length > 1) {
        errors.push(`${field.label} accepts only one file`);
      }
      if (fieldFiles.some((file) => !matchesAcceptRule(file, field.accept))) {
        errors.push(`${field.label} contains an unsupported file type`);
      }
      if (fieldFiles.some((file) => !hasAllowedFileSignature(file))) {
        errors.push(`${field.label} does not contain a valid JPEG, PNG, WEBP, or PDF file`);
      }
    }
  }

  return errors;
};

export const submitApplication = async (req, res) => {
  const uploadedFiles = [];

  try {
    const service = await Service.findOne({ slug: req.params.slug, isActive: true });
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    const form = await ServiceForm.findOne({ service: service._id, isActive: true });
    if (!form) {
      return res.status(404).json({ success: false, message: "Application form is not configured" });
    }

    const files = req.files || [];
    const errors = validateSubmission(form, req.body, files);
    if (errors.length) return res.status(400).json({ success: false, message: "Invalid application", errors });

    const applicationNumber = createApplicationNumber();
    for (const file of files) {
      const result = await uploadBuffer(file, applicationNumber);
      uploadedFiles.push({
        fieldName: file.fieldname,
        originalName: file.originalname,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        format: result.format || "",
        size: result.bytes ?? file.size,
      });
    }

    const formData = Object.fromEntries(
      form.fields
        .filter(({ type }) => type !== "file")
        .map(({ name, type }) => {
          const value = normalizeBodyValue(req.body[name]);
          if (type === "checkbox" && value !== undefined) {
            return [name, Array.isArray(value) ? value : [value]];
          }
          return [name, value];
        })
        .filter(([, value]) => value !== undefined)
    );

    const application = await Application.create({
      applicationNumber,
      service: service._id,
      serviceForm: form._id,
      formData,
      files: uploadedFiles,
      statusHistory: [{ status: "submitted", message: "Application submitted successfully" }],
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      applicationNumber: application.applicationNumber,
      status: application.status,
    });
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);
    return res.status(500).json({ success: false, message: "Unable to submit application" });
  }
};

export const trackApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      applicationNumber: req.params.applicationNumber.toUpperCase(),
    })
      .select("applicationNumber service status statusHistory createdAt updatedAt")
      .populate("service", "title slug processingTime")
      .lean();

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.status(200).json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to track application" });
  }
};
