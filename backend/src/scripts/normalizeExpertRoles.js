import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI is required");

await mongoose.connect(uri);

try {
  const db = mongoose.connection.db;
  const applications = db.collection("applications");
  const assignments = db.collection("applicationassignments");

  await applications.updateMany(
    { customerUserId: { $exists: false }, customerId: { $nin: [null, ""] } },
    [{ $set: { customerUserId: "$customerId" } }]
  );
  await applications.updateMany(
    { assignedExpertId: { $exists: false }, assignedRetailerId: { $nin: [null, ""] } },
    [{ $set: { assignedExpertId: "$assignedRetailerId", assignmentType: "expert" } }]
  );
  await applications.updateMany(
    { fulfillmentType: { $exists: false } },
    { $set: { fulfillmentType: "internal" } }
  );
  await applications.updateMany(
    { assignmentType: { $exists: false }, assignedPartnerId: { $nin: [null, ""] } },
    { $set: { assignmentType: "partner" } }
  );

  await db.collection("services").updateMany(
    { fulfillmentType: { $exists: false } },
    { $set: { fulfillmentType: "internal" } }
  );
  await db.collection("notifications").updateMany(
    { recipientRole: "retailer" },
    { $set: { recipientRole: "expert" } }
  );

  await assignments.updateMany(
    { retailerUserId: { $nin: [null, ""] }, assignmentType: { $exists: false } },
    [{ $set: { assignmentType: "expert", expertUserId: "$retailerUserId", isActive: false } }]
  );

  const latestAssignments = await assignments.aggregate([
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: "$application", assignment: { $first: "$$ROOT" } } },
    { $lookup: { from: "applications", localField: "_id", foreignField: "_id", as: "applicationDocument" } },
    { $unwind: "$applicationDocument" },
    { $match: { $expr: { $or: [
      { $and: [
        { $eq: ["$assignment.assignmentType", "expert"] },
        { $eq: ["$assignment.expertUserId", { $ifNull: ["$applicationDocument.assignedExpertId", "$applicationDocument.assignedRetailerId"] }] },
      ] },
      { $and: [
        { $eq: ["$assignment.assignmentType", "partner"] },
        { $eq: ["$assignment.partnerUserId", "$applicationDocument.assignedPartnerId"] },
      ] },
    ] } } },
    { $project: { assignmentId: "$assignment._id" } },
  ]).toArray();
  await assignments.updateMany(
    { isActive: { $ne: false } },
    { $set: { isActive: false, endedAt: new Date() } }
  );
  if (latestAssignments.length) {
    await assignments.updateMany(
      { _id: { $in: latestAssignments.map(({ assignmentId }) => assignmentId) } },
      { $set: { isActive: true }, $unset: { endedAt: "" } }
    );
  }

  console.log(`Normalized ${latestAssignments.length} application assignment histories.`);
  console.log("The retailerprofiles collection was intentionally retained and is now read as ExpertProfile.");
} finally {
  await mongoose.disconnect();
}
