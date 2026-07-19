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

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const uploadCmsImage = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(imageMimeTypes.has(file.mimetype) ? null : new Error("Only JPG, PNG, and WEBP images are allowed"), imageMimeTypes.has(file.mimetype)),
}).single("image");
