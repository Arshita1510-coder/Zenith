import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth.routes.js";
import { protectedRouter } from "./routes/protected.routes.js";
import { achievementsRouter } from "./routes/achievements.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { checkInsRouter } from "./routes/checkins.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

app.use(cors({ origin: clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/checkins", checkInsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/protected", protectedRouter);
app.use("/achievements", achievementsRouter);
app.use("/checkins", checkInsRouter);
app.use("/admin", adminRouter);
app.use("/reports", reportsRouter);
app.use("/audit-logs", auditRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

app.listen(port, () => {
  console.log(`Goal tracking API listening on http://localhost:${port}`);
});
