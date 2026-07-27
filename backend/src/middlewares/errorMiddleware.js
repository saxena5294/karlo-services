export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorMiddleware = (error, _req, res, _next) => {
  const isUploadError =
    error?.name === "MulterError" ||
    error?.message?.includes("files are allowed") ||
    error?.message?.includes("PDF files are allowed");
  const statusCode = isUploadError ? 400 : error.statusCode || error.status || 500;
  const exposeError = statusCode < 500 || process.env.NODE_ENV === "development";
  const message = error?.code === "LIMIT_FILE_SIZE"
    ? "PDF must be smaller than 10 MB"
    : error?.code === "LIMIT_UNEXPECTED_FILE"
      ? "Use declarationFile as the PDF upload field"
      : error.message || "Request failed";

  if (process.env.NODE_ENV === "development") {
    console.error(error);
  } else if (statusCode >= 500) {
    console.error(`${error?.name || "Error"}: request failed with status ${statusCode}`);
  }

  res.status(statusCode).json({
    success: false,
    message: exposeError ? message : "Internal server error",
    details: exposeError ? error.details : undefined,
    // Keep validation responses compatible with the existing Dynamic Form client.
    errors: exposeError && Array.isArray(error.details) ? error.details : undefined,
    stack:
      process.env.NODE_ENV === "development"
        ? error.stack
        : undefined,
  });
};
