import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes.js";
import { protectedRouter } from "./routes/protected.routes.js";
import { achievementsRouter } from "./routes/achievements.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { checkInsRouter } from "./routes/checkins.routes.js";
import { escalationsRouter } from "./routes/escalations.routes.js";
import { goalSheetsRouter } from "./routes/goalSheets.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET environment variable is missing. Using default secure fallback key.");
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow all origins for the hackathon portal to ensure zero CORS blocks on Vercel or preview domains
      return callback(null, true);
    }
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/checkins", checkInsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/escalations", escalationsRouter);
app.use("/api/goal-sheets", goalSheetsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/protected", protectedRouter);
app.use("/achievements", achievementsRouter);
app.use("/checkins", checkInsRouter);
app.use("/admin", adminRouter);
app.use("/analytics", analyticsRouter);
app.use("/reports", reportsRouter);
app.use("/audit-logs", auditRouter);
app.use("/escalations", escalationsRouter);
app.use("/goal-sheets", goalSheetsRouter);
app.use("/notifications", notificationsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(port, () => {
    console.info(`Goal tracking API listening on http://localhost:${port}`);
  });
}

export default app;
