export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorMiddleware = (error, _req, res, _next) => {
  console.error(error);

  const isUploadError =
    error?.name === "MulterError" || error?.message?.includes("files are allowed");
  const statusCode = isUploadError ? 400 : error.statusCode || error.status || 500;
  const exposeError = statusCode < 500 || process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    message: exposeError ? error.message || "Request failed" : "Internal server error",
    details: exposeError ? error.details : undefined,
    // Keep validation responses compatible with the existing Dynamic Form client.
    errors: exposeError && Array.isArray(error.details) ? error.details : undefined,
    stack:
      process.env.NODE_ENV === "development"
        ? error.stack
        : undefined,
  });
};
