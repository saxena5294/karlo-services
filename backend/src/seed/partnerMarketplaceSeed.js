import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Application } from "../models/applicationModel.js";
import { Lead } from "../models/leadModel.js";
import { PartnerProfile } from "../models/partnerProfileModel.js";

await connectDatabase();
try {
  const profile = await PartnerProfile.findOneAndUpdate(
    { userId: "dev_partner_001" },
    { $set: {
      businessName: "Karlo Demo Service Center",
      ownerName: "Demo Partner",
      mobile: "9999999999",
      email: "partner@example.test",
      address: { line1: "Demo Market Road" },
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440001",
      businessType: "CSC",
      serviceCategories: [],
      serviceAreas: ["Nagpur"],
      verificationStatus: "approved",
      availability: true,
      isActive: true,
    } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
  );

  const application = await Application.findOne({
    fulfillmentType: { $in: ["partner", "hybrid"] },
    assignedExpertId: { $in: [null, ""] },
    assignedPartnerId: { $in: [null, ""] },
  }).populate("service", "title category");

  if (application) {
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
    await Lead.findOneAndUpdate(
      { application: application._id },
      { $setOnInsert: {
        applicationNumber: application.applicationNumber,
        service: application.service._id,
        serviceTitle: application.service.title,
        category: application.service.category,
        city: "Nagpur",
        pincode: "440001",
        safeRequirementSummary: `Complete the requested ${application.service.title} service. Private applicant data is available only after acceptance.`,
        leadPrice: 50,
        status: "open",
        publishedByAdminId: "dev_admin_001",
        publishedAt: new Date(),
        expiresAt,
      } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    console.log(`Created or retained a sample lead for ${application.applicationNumber}.`);
  } else {
    console.log("No unassigned partner/hybrid application exists; seeded the partner profile only.");
  }
  console.log(`Development partner ready: ${profile.userId}`);
} finally {
  await mongoose.disconnect();
}
