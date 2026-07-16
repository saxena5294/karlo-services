import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { Service } from "../models/serviceModel.js";
import { ServiceForm } from "../models/serviceFormModel.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const commonFields = [
  { name: "fullName", label: "Full name", type: "text", required: true, placeholder: "As shown on your documents" },
  { name: "email", label: "Email address", type: "email", required: true, placeholder: "you@example.com" },
  { name: "mobile", label: "Mobile number", type: "tel", required: true, placeholder: "+91 98765 43210" },
  { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
  {
    name: "preferredContact",
    label: "Preferred contact method",
    type: "radio",
    required: true,
    options: [
      { label: "Phone", value: "phone" },
      { label: "Email", value: "email" },
    ],
  },
  {
    name: "address",
    label: "Current address",
    type: "textarea",
    required: true,
    placeholder: "House number, street, city, state, PIN code",
  },
  {
    name: "documentType",
    label: "Primary identity document",
    type: "select",
    required: true,
    options: [
      { label: "Aadhaar Card", value: "aadhaar" },
      { label: "Voter ID", value: "voter-id" },
      { label: "Driving Licence", value: "driving-licence" },
    ],
  },
  {
    name: "identityDocument",
    label: "Upload identity document",
    type: "file",
    required: true,
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    helpText: "PDF, JPG, PNG or WEBP; maximum 5 MB.",
  },
  {
    name: "termsAccepted",
    label: "I confirm that the information provided is correct",
    type: "checkbox",
    required: true,
    options: [{ label: "I agree", value: "yes" }],
  },
];

const seedServiceForms = async () => {
  try {
    await connectDatabase();
    const services = await Service.find({ isActive: true });

    if (!services.length) throw new Error("No active services found. Seed services first.");

    for (const service of services) {
      await ServiceForm.findOneAndUpdate(
        { service: service._id },
        {
          $setOnInsert: {
            service: service._id,
            title: `${service.title} Application`,
            description: "Complete the form and upload the required documents.",
            fields: commonFields,
            isActive: true,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    console.log(`[service forms seed] Forms available: ${await ServiceForm.countDocuments()}`);
    console.log("[service forms seed] Existing form configurations were preserved");
  } catch (error) {
    console.error(`[service forms seed] Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  }
};

seedServiceForms();
