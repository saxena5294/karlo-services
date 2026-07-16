import express from "express";
import cors from "cors";
import serviceRoutes from "./routes/serviceRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import retailerRoutes from "./routes/retailerRoutes.js";
import expertRoutes from "./routes/expertRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/errorMiddleware.js";

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
app.use("/api/customer", customerRoutes);
app.use("/api/retailer", retailerRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
