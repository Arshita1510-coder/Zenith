import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";

export const goalSheetsRouter = Router();

function getMyGoalSheet(req, res) {
  const sheet = demoStore.getGoalSheet(req.user.sub, req.params.quarter || "Q1");
  if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
  return res.json(sheet);
}

goalSheetsRouter.get("/my", requireAuth, requireRole("Employee"), getMyGoalSheet);
goalSheetsRouter.get("/my/:quarter", requireAuth, requireRole("Employee"), getMyGoalSheet);

goalSheetsRouter.put("/my", requireAuth, requireRole("Employee"), (req, res) => {
  const result = demoStore.saveGoalSheet(req.user.sub, req.body.goals || []);
  return res.status(result.status).json(result.body);
});

goalSheetsRouter.post("/my/submit", requireAuth, requireRole("Employee"), (req, res) => {
  const result = demoStore.submitGoalSheet(req.user.sub);
  return res.status(result.status).json(result.body);
});
