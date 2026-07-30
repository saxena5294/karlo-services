import multer from "multer";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const uploadApplicationFiles = multer({
  storage: multer.memoryStorage(),
  // The form engine applies each field's configured limit; this is the hard ceiling.
  limits: { fileSize: 10 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Please upload a JPG, PNG or PDF file smaller than 10 MB"));
    }
    callback(null, true);
  },
}).any();

export const uploadSingleApplicationFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Please upload a JPG, PNG or PDF file smaller than 10 MB"));
    }
    callback(null, true);
  },
}).single("file");

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const customerDocumentMaxMb = Math.min(
  Math.max(Number(process.env.CUSTOMER_DOCUMENT_MAX_MB) || 10, 1),
  25
);
export const uploadCustomerDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: customerDocumentMaxMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(["application/pdf", ...imageMimeTypes]);
    const accepted = allowed.has(file.mimetype);
    callback(accepted ? null : new Error("Only PDF, JPG, PNG, and WEBP documents are allowed"), accepted);
  },
}).single("file");
export const uploadCmsImage = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(imageMimeTypes.has(file.mimetype) ? null : new Error("Only JPG, PNG, and WEBP images are allowed"), imageMimeTypes.has(file.mimetype)),
}).single("image");

export const uploadDeclarationPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(new Error("Only PDF files are allowed"));
    }
    return callback(null, true);
  },
}).single("declarationFile");
