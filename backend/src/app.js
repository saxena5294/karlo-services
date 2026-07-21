import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRoutes from "./routes/healthRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import expertRoutes from "./routes/expertRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicCmsRoutes from "./routes/publicCmsRoutes.js";
import adminCmsRoutes from "./routes/adminCmsRoutes.js";
import dashboardModuleRoutes from "./routes/dashboardModuleRoutes.js";
import adminDashboardModuleRoutes from "./routes/adminDashboardModuleRoutes.js";
import mobileVerificationRoutes from "./routes/mobileVerificationRoutes.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/errorMiddleware.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      callback(null, !origin || origin === frontendUrl);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use("/api/health", healthRoutes);

app.use("/api/services", serviceRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicCmsRoutes);
app.use("/api/admin/cms", adminCmsRoutes);
app.use("/api/dashboard", dashboardModuleRoutes);
app.use("/api/admin/dashboard-modules", adminDashboardModuleRoutes);
app.use("/api/mobile-verification", mobileVerificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
