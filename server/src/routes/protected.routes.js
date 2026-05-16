import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";

export const protectedRouter = Router();

protectedRouter.get("/employee", requireAuth, requireRole("Employee", "Manager", "Admin"), (req, res) => {
  res.json({ message: "Employee dashboard data", user: req.user });
});

protectedRouter.get("/manager", requireAuth, requireRole("Manager", "Admin"), (req, res) => {
  res.json({ message: "Manager dashboard data", user: req.user });
});

protectedRouter.get("/admin", requireAuth, requireRole("Admin"), (req, res) => {
  res.json({ message: "Admin dashboard data", user: req.user });
});
