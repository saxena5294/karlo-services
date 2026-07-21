import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI is required");

await mongoose.connect(uri);

const totals = { matched: 0, modified: 0 };
const record = (label, result) => {
  const matched = result.matchedCount || 0;
  const modified = result.modifiedCount || 0;
  totals.matched += matched;
  totals.modified += modified;
  console.log(`${label}: matched=${matched}, modified=${modified}`);
};

try {
  const db = mongoose.connection.db;
  const roleFields = [
    ["users", "role"],
    ["profiles", "role"],
    ["notifications", "recipientRole"],
    ["auditlogs", "actorRole"],
    ["applications", "submittedByRole"],
    ["supporttickets", "createdByRole"],
    ["paymenthistories", "userRole"],
    ["rewards", "userRole"],
    ["referralprofiles", "userRole"],
    ["referrals", "referrerRole"],
    ["referrals", "referredRole"],
  ];

  for (const [collectionName, field] of roleFields) {
    const result = await db.collection(collectionName).updateMany(
      { [field]: "retailer" },
      { $set: { [field]: "partner" } }
    );
    record(`${collectionName}.${field}`, result);
  }

  for (const field of ["files", "additionalDocuments", "completionDocuments"]) {
    const result = await db.collection("applications").updateMany(
      { [`${field}.uploadedByRole`]: "retailer" },
      { $set: { [`${field}.$[document].uploadedByRole`]: "partner" } },
      { arrayFilters: [{ "document.uploadedByRole": "retailer" }] }
    );
    record(`applications.${field}.uploadedByRole`, result);
  }

  record(
    "supporttickets.replies.authorRole",
    await db.collection("supporttickets").updateMany(
      { "replies.authorRole": "retailer" },
      { $set: { "replies.$[reply].authorRole": "partner" } },
      { arrayFilters: [{ "reply.authorRole": "retailer" }] }
    )
  );

  const applications = db.collection("applications");
  record(
    "applications partner assignments",
    await applications.updateMany(
      { assignmentType: "retailer" },
      [{ $set: { assignmentType: "partner", assignedPartnerId: { $ifNull: ["$assignedPartnerId", "$assignedRetailerId"] } } }]
    )
  );
  record(
    "applications expert assignment IDs",
    await applications.updateMany(
      { assignedExpertId: { $in: [null, ""] }, assignedRetailerId: { $nin: [null, ""] }, assignmentType: { $ne: "partner" } },
      [{ $set: { assignedExpertId: "$assignedRetailerId", assignmentType: "expert" } }]
    )
  );
  record(
    "applications legacy assignment field cleanup",
    await applications.updateMany(
      { assignedRetailerId: { $exists: true } },
      { $unset: { assignedRetailerId: "" } }
    )
  );

  const assignments = db.collection("applicationassignments");
  record(
    "applicationassignments partner assignments",
    await assignments.updateMany(
      { assignmentType: "retailer" },
      [{ $set: { assignmentType: "partner", partnerUserId: { $ifNull: ["$partnerUserId", "$retailerUserId"] } } }]
    )
  );
  record(
    "applicationassignments expert IDs",
    await assignments.updateMany(
      { expertUserId: { $in: [null, ""] }, retailerUserId: { $nin: [null, ""] }, assignmentType: { $ne: "partner" } },
      [{ $set: { expertUserId: "$retailerUserId", assignmentType: "expert" } }]
    )
  );
  record(
    "applicationassignments legacy field cleanup",
    await assignments.updateMany(
      { retailerUserId: { $exists: true } },
      { $unset: { retailerUserId: "" } }
    )
  );

  const legacyProfiles = await db.collection("retailerprofiles").find({}).toArray();
  if (legacyProfiles.length) {
    const result = await db.collection("expertprofiles").bulkWrite(
      legacyProfiles.map((profile) => ({
        updateOne: {
          filter: { _id: profile._id },
          update: { $setOnInsert: profile },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    const copied = result.upsertedCount || 0;
    totals.matched += legacyProfiles.length;
    totals.modified += copied;
    console.log(`expertprofiles copy: matched=${legacyProfiles.length}, modified=${copied}`);
  } else {
    console.log("expertprofiles copy: matched=0, modified=0");
  }

  console.log(`Role migration complete: matched=${totals.matched}, modified=${totals.modified}`);
  console.log("The legacy profile collection was preserved as a read-only migration source.");
} finally {
  await mongoose.disconnect();
}
