import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { Service } from "../models/serviceModel.js";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

const services = [
  {
    title: "PAN Card",
    slug: "pan-card",
    description: "Apply for a new PAN card or request corrections easily.",
    icon: "🪪",
    price: 199,
    processingTime: "7–15 days",
    category: "Identity",
    isPopular: true,
    isActive: true,
  },
  {
    title: "Passport Service",
    slug: "passport-service",
    description: "Get assistance with passport and renewal applications.",
    icon: "🛂",
    price: 499,
    processingTime: "15–30 days",
    category: "Identity",
    isPopular: true,
    isActive: true,
  },
  {
    title: "Income Certificate",
    slug: "income-certificate",
    description: "Apply online for an income certificate with document support.",
    icon: "📄",
    price: 149,
    processingTime: "7–10 days",
    category: "Certificate",
    isPopular: true,
    isActive: true,
  },
  {
    title: "Domicile Certificate",
    slug: "domicile-certificate",
    description: "Submit your domicile certificate application securely.",
    icon: "🏠",
    price: 149,
    processingTime: "7–15 days",
    category: "Certificate",
    isPopular: true,
    isActive: true,
  },
  {
    title: "ITR Filing",
    slug: "itr-filing",
    description: "File your income tax return with professional assistance.",
    icon: "🧾",
    price: 599,
    processingTime: "1–3 days",
    category: "Tax",
    isPopular: true,
    isActive: true,
  },
  {
    title: "GST Registration",
    slug: "gst-registration",
    description: "Register your business for GST with complete guidance.",
    icon: "🏢",
    price: 999,
    processingTime: "3–7 days",
    category: "Business",
    isPopular: true,
    isActive: true,
  },
];

const seedServices = async () => {
  try {
    await connectDatabase();

    console.log(`[services seed] Collection: ${Service.collection.name}`);

    await Service.deleteMany({});
    const createdServices = await Service.insertMany(services);
    const servicesCount = await Service.countDocuments();

    console.log(`[services seed] Inserted: ${createdServices.length}`);
    console.log(`[services seed] Services count after insert: ${servicesCount}`);

    if (servicesCount !== services.length) {
      throw new Error(
        `Expected ${services.length} services after seeding, found ${servicesCount}`
      );
    }
  } catch (error) {
    console.error(`[services seed] Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("[services seed] MongoDB connection closed");
    }
  }
};

seedServices();
