import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const checkInsRouter = Router();

checkInsRouter.get("/team/:managerId/:quarter", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    const { managerId, quarter } = req.params;

    if (req.user.role === "Manager" && req.user.sub !== managerId) {
      return res.status(403).json({ message: "Managers can only view their own team" });
    }

    if (req.user.sub?.startsWith("demo-")) {
      return res.json(demoStore.getTeamDashboard(managerId, quarter));
    }

    const reportees = await prisma.user.findMany({
      where: { managerId },
      select: { id: true, name: true, email: true, role: true, managerId: true }
    });

    const windows = await prisma.quarterWindow.findUnique({ where: { quarter } });
    const dashboards = await Promise.all(
      reportees.map(async (employee) => {
        const sheet = await prisma.goalSheet.findFirst({
          where: { employeeId: employee.id },
          include: {
            goals: { where: { isLocked: true }, include: { achievements: { where: { quarter } } } },
            checkIns: { where: { managerId, quarter } }
          }
        });

        const goals =
          sheet?.goals.map(({ achievements, ...goal }) => ({
            ...goal,
            achievement: achievements[0] || null
          })) || [];

        return {
          employee,
          goalSheet: sheet ? { id: sheet.id, employeeId: sheet.employeeId, cycleYear: sheet.cycleYear, status: sheet.status } : null,
          quarter,
          window: windows,
          summary: { updatedGoals: goals.filter((goal) => goal.achievement).length, totalGoals: goals.length },
          goals,
          checkIn: sheet?.checkIns[0] || null
        };
      })
    );

    return res.json({ quarter, window: windows, reportees: dashboards });
  } catch {
    return res.json(demoStore.getTeamDashboard(req.params.managerId, req.params.quarter));
  }
});

checkInsRouter.post("/", requireAuth, requireRole("Manager"), async (req, res) => {
  try {
    const { goalSheetId, quarter, comment, isCompleted } = req.body;
    const sheet = await prisma.goalSheet.findUnique({ where: { id: goalSheetId }, include: { employee: true } });

    if (!sheet || sheet.employee.managerId !== req.user.sub) {
      return res.status(403).json({ message: "Managers can only check in with direct reportees" });
    }

    const checkIn = await prisma.checkIn.upsert({
      where: { goalSheetId_managerId_quarter: { goalSheetId, managerId: req.user.sub, quarter } },
      update: { comment, isCompleted },
      create: { goalSheetId, managerId: req.user.sub, quarter, comment, isCompleted }
    });

    return res.status(201).json({ checkIn });
  } catch {
    const checkIn = demoStore.submitCheckIn({ managerId: req.user.sub, ...req.body });
    return res.status(201).json({ checkIn });
  }
});

checkInsRouter.get("/:managerId/:quarter", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    const { managerId, quarter } = req.params;

    if (req.user.role === "Manager" && req.user.sub !== managerId) {
      return res.status(403).json({ message: "Managers can only view their own check-ins" });
    }

    const checkIns = await prisma.checkIn.findMany({ where: { managerId, quarter } });
    return res.json({ checkIns });
  } catch {
    return res.json({ checkIns: demoStore.getCheckIns(req.params.managerId, req.params.quarter) });
  }
});

checkInsRouter.post("/approve-goal-sheet", requireAuth, requireRole("Manager"), async (req, res) => {
  try {
    const sheet = await prisma.goalSheet.findUnique({ where: { id: req.body.goalSheetId }, include: { employee: true } });
    if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
    if (sheet.employee.managerId !== req.user.sub) {
      return res.status(403).json({ message: "Managers can only approve direct reportees" });
    }
    const goalSheet = await prisma.goalSheet.update({
      where: { id: sheet.id },
      data: { status: "Approved", approvedAt: new Date() }
    });
    await prisma.notification.create({
      data: {
        userId: sheet.employeeId,
        message: `Your goal sheet has been approved by ${req.user.name || "your manager"}`
      }
    });
    console.info("Ethereal preview URL: https://ethereal.email/message/demo-goal-approval-preview");
    return res.json({ goalSheet });
  } catch {
    const sheet = demoStore.approveGoalSheet(req.body.goalSheetId, req.user.sub);
    if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
    return res.json({ goalSheet: sheet });
  }
});

checkInsRouter.post("/return-goal-sheet", requireAuth, requireRole("Manager"), (req, res) => {
  const sheet = demoStore.returnGoalSheet(req.body.goalSheetId, req.user.sub, req.body.comment);
  if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
  return res.json({ goalSheet: sheet });
});
