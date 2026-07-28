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
        // Cloudinary treats PDFs as image assets. This keeps preview and signed
        // delivery compatible with production accounts while preserving the PDF.
        public_id: `${safeSegment(slug)}-${uniqueSuffix}`,
        resource_type: "image",
        format: "pdf",
        type: "upload",
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

export const createDeclarationPdfAccessUrl = ({
  publicId,
  resourceType = "raw",
  deliveryType = "upload",
}, attachment = false) => {
  if (!publicId) throw new ApiError(502, "Declaration PDF storage metadata is incomplete");
  return getCloudinary().utils.private_download_url(publicId, "pdf", {
    resource_type: resourceType || "raw",
    type: deliveryType || "upload",
    attachment,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
  });
};

export const fetchDeclarationPdf = async (asset, attachment = false) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(
      createDeclarationPdfAccessUrl(asset, attachment),
      { signal: controller.signal },
    );
    if (!response.ok) {
      throw new ApiError(
        502,
        response.status === 401 || response.status === 403
          ? "Cloudinary denied PDF delivery. Enable PDF delivery in the Cloudinary product environment security settings."
          : "Declaration PDF could not be retrieved from storage",
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!hasPdfSignature(buffer)) {
      throw new ApiError(502, "Stored declaration file is not a valid PDF");
    }
    return buffer;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === "AbortError") {
      throw new ApiError(504, "Declaration PDF retrieval timed out");
    }
    throw new ApiError(502, "Declaration PDF could not be retrieved from storage");
  } finally {
    clearTimeout(timeout);
  }
};

export const deleteDeclarationPdf = async (
  publicId,
  resourceType = "raw",
  deliveryType = "upload",
) => {
  if (!publicId) return;
  await getCloudinary().uploader.destroy(publicId, {
    resource_type: resourceType || "raw",
    type: deliveryType || "upload",
    invalidate: true,
  });
};
