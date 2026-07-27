import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { DeclarationForm } from "../models/declarationFormModel.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

/*
 * LEGACY / MANUAL IMPORT ONLY.
 *
 * New declaration forms must be uploaded through the Admin Declaration Forms page.
 * Keep this script only for importing older Cloudinary-hosted PDFs. It never runs at
 * application startup and never uploads or removes a Cloudinary asset.
 */
export const declarationFormsSeedData = [
  {
    title: "Aadhaar Declaration",
    slug: "aadhaar-declaration",
    category: "Identity",
    description: "Declaration form for Aadhaar-related service requests.",
    language: "English",
    publicId: "karlo-services/declaration-forms/REPLACE_WITH_AADHAAR_PUBLIC_ID",
    fileUrl: "REPLACE_WITH_AADHAAR_CLOUDINARY_HTTPS_URL",
    fileName: "aadhaar-declaration.pdf",
    fileType: "pdf",
    visibleTo: ["customer", "partner"],
    displayOrder: 10,
    isPopular: true,
    isActive: true,
  },
  {
    title: "PAN Declaration",
    slug: "pan-declaration",
    category: "Tax",
    description: "Declaration form for PAN-related service requests.",
    language: "English",
    publicId: "karlo-services/declaration-forms/REPLACE_WITH_PAN_PUBLIC_ID",
    fileUrl: "REPLACE_WITH_PAN_CLOUDINARY_HTTPS_URL",
    fileName: "pan-declaration.pdf",
    fileType: "pdf",
    visibleTo: ["customer", "partner"],
    displayOrder: 20,
    isPopular: true,
    isActive: true,
  },
  {
    title: "Income Declaration",
    slug: "income-declaration",
    category: "Income",
    description: "Declaration form for income-related service requests.",
    language: "English",
    publicId: "karlo-services/declaration-forms/REPLACE_WITH_INCOME_PUBLIC_ID",
    fileUrl: "REPLACE_WITH_INCOME_CLOUDINARY_HTTPS_URL",
    fileName: "income-declaration.pdf",
    fileType: "pdf",
    visibleTo: ["customer", "partner"],
    displayOrder: 30,
    isPopular: true,
    isActive: true,
  },
];

const hasPlaceholder = ({ publicId, fileUrl }) => (
  String(publicId).includes("REPLACE_")
  || String(fileUrl).startsWith("REPLACE_")
);

const seedDeclarationForms = async () => {
  const pending = declarationFormsSeedData.filter(hasPlaceholder);
  if (pending.length) {
    console.error(
      `[declaration forms seed] Replace Cloudinary placeholders for: ${pending.map(({ title }) => title).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  try {
    await Promise.all(declarationFormsSeedData.map((form) => new DeclarationForm(form).validate()));
    await connectDatabase();
    const operations = declarationFormsSeedData.map((form) => ({
      updateOne: {
        filter: { publicId: form.publicId },
        update: {
          $set: { ...form, updatedBy: "declaration-seed" },
          $setOnInsert: { downloadCount: 0, createdBy: "declaration-seed" },
        },
        upsert: true,
      },
    }));
    const result = await DeclarationForm.bulkWrite(operations, { ordered: false });
    console.log(
      `[declaration forms seed] Inserted ${result.upsertedCount}; updated ${result.modifiedCount}; matched ${result.matchedCount}.`,
    );
  } catch (error) {
    console.error(`[declaration forms seed] Failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  }
};

seedDeclarationForms();
