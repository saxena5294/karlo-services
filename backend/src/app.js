import express from "express";
import cors from "cors";
import serviceRoutes from "./routes/serviceRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      callback(null, !origin || origin === frontendUrl);
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/services", serviceRoutes);
app.use("/api/applications", applicationRoutes);

app.use((error, _req, res, _next) => {
  if (error?.name === "MulterError" || error?.message?.includes("files are allowed")) {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: "Unexpected server error" });
});

export default app;
