import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";

export const analyticsRouter = Router();

analyticsRouter.get("/", requireAuth, requireRole("Manager", "Admin"), (req, res) => {
  const managerId = req.user.role === "Manager" ? req.user.sub : req.query.managerId || undefined;
  res.json(demoStore.getAnalytics({ managerId, quarter: req.query.quarter || "Q1" }));
});
