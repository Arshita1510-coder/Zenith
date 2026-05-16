import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const adminRouter = Router();

adminRouter.get("/quarter-windows", requireAuth, requireRole("Admin", "Manager", "Employee"), async (_req, res) => {
  try {
    const windows = await prisma.quarterWindow.findMany({ orderBy: { quarter: "asc" } });
    return res.json({ windows });
  } catch {
    return res.json({ windows: demoStore.getWindows(), mode: "demo-memory" });
  }
});

adminRouter.post("/quarter-windows", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { quarter, isOpen } = req.body;
    const window = await prisma.quarterWindow.upsert({
      where: { quarter },
      update: { isOpen: Boolean(isOpen), updatedBy: req.user.sub },
      create: { quarter, isOpen: Boolean(isOpen), updatedBy: req.user.sub }
    });
    return res.json({ window });
  } catch {
    const window = demoStore.setWindow(req.body.quarter, req.body.isOpen, req.user.sub);
    if (!window) {
      return res.status(404).json({ message: "Quarter not found" });
    }
    return res.json({ window, mode: "demo-memory" });
  }
});

adminRouter.get("/cycle", requireAuth, requireRole("Admin"), async (_req, res) => {
  try {
    const windows = await prisma.quarterWindow.findMany({ orderBy: { quarter: "asc" } });
    return res.json({ activeCycleYear: new Date().getFullYear(), windows });
  } catch {
    return res.json(demoStore.getCycle());
  }
});

adminRouter.put("/cycle", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { cycleYear, windows = [] } = req.body;
    const updatedWindows = await Promise.all(
      windows.map((window) =>
        prisma.quarterWindow.upsert({
          where: { quarter: window.quarter },
          update: { isOpen: Boolean(window.isOpen), updatedBy: req.user.sub },
          create: { quarter: window.quarter, isOpen: Boolean(window.isOpen), updatedBy: req.user.sub }
        })
      )
    );
    return res.json({ activeCycleYear: Number(cycleYear), windows: updatedWindows });
  } catch {
    return res.json(demoStore.updateCycle(req.body, req.user.sub));
  }
});

adminRouter.get("/users", requireAuth, requireRole("Admin"), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, managerId: true } });
    return res.json({ users });
  } catch {
    return res.json({ users: demoStore.getUsers() });
  }
});

adminRouter.put("/user/:userId/manager", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.userId }, data: { managerId: req.body.managerId || null } });
    return res.json({ user });
  } catch {
    const user = demoStore.reassignManager(req.params.userId, req.body.managerId, req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  }
});

adminRouter.get("/goals", requireAuth, requireRole("Admin"), (_req, res) => {
  res.json({ goals: demoStore.searchGoals(_req.query.search || "") });
});

adminRouter.post("/unlock-goal/:goalId", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.goalId } });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    await prisma.auditLog.create({
      data: {
        entityType: "Goal",
        entityId: goal.id,
        goalId: goal.id,
        fieldChanged: "Goal lock",
        oldValue: "Locked",
        newValue: "Unlocked",
        changedBy: req.user.sub,
        changeDescription: "Admin unlocked a goal"
      }
    });
    await prisma.achievement.updateMany({ where: { goalId: goal.id }, data: { isLocked: false } });
    return res.json({ goal });
  } catch {
    const goal = demoStore.unlockGoal(req.params.goalId, req.user.sub);
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    return res.json({ goal });
  }
});

adminRouter.get("/org", requireAuth, requireRole("Admin"), (_req, res) => {
  res.json({ org: demoStore.getOrg() });
});
