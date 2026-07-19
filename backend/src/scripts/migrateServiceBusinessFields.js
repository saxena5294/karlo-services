import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDatabase } from "../config/database.js";
import { Service } from "../models/serviceModel.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const run = async () => {
  try {
    await connectDatabase();
    const records = await Service.collection.find({ $or: [{ pricing: { $exists: false } }, { estimatedProcessingTime: { $exists: false } }, { availabilityStatus: { $exists: false } }] }).toArray();
    if (!records.length) { console.log("[service migration] No legacy services require migration."); return; }
    const operations = records.map((record) => {
      const set = {};
      if (!record.pricing) set.pricing = { governmentFee: 0, serviceCharge: Number(record.price || 0), totalAmount: Number(record.price || 0), pricingMode: "fixed", pricingNote: "Legacy price preserved as service charge; government fee requires Admin review.", requiresAdminReview: true };
      if (!record.estimatedProcessingTime) set.estimatedProcessingTime = { value: null, unit: "days", displayText: record.processingTime || "Contact support" };
      if (!record.availabilityStatus) set.availabilityStatus = "available";
      if (record.availabilityMessage == null) set.availabilityMessage = "";
      return { updateOne: { filter: { _id: record._id }, update: { $set: set } } };
    });
    const result = await Service.bulkWrite(operations, { ordered: false });
    console.log(`[service migration] Reviewed: ${records.length}; updated: ${result.modifiedCount || 0}. All migrated prices are flagged for Admin review.`);
  } catch (error) {
    console.error(`[service migration] Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  }
};

run();
