import crypto from "node:crypto";
import streamifier from "streamifier";
import { getCloudinary } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

const FOLDER = "karlo-services/declaration-forms";

const safeSegment = (value) => String(value ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 120) || "declaration";

export const hasPdfSignature = (buffer) =>
  Buffer.isBuffer(buffer) && buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));

export const uploadDeclarationPdf = (file, slug) => new Promise((resolve, reject) => {
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  let upload;
  try {
    upload = getCloudinary().uploader.upload_stream(
      {
        folder: FOLDER,
        // Raw Cloudinary assets keep the extension as part of the public ID.
        public_id: `${safeSegment(slug)}-${uniqueSuffix}.pdf`,
        resource_type: "raw",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(new ApiError(502, "Cloudinary upload failed"));
        return resolve(result);
      },
    );
  } catch {
    reject(new ApiError(502, "Cloudinary upload failed"));
    return;
  }
  streamifier.createReadStream(file.buffer).pipe(upload);
});

export const deleteDeclarationPdf = async (publicId, resourceType = "raw") => {
  if (!publicId) return;
  await getCloudinary().uploader.destroy(publicId, {
    resource_type: resourceType || "raw",
    invalidate: true,
  });
};
