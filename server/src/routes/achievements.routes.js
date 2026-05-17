import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { computeProgress, scoreBand } from "../progress.js";
import { prisma } from "../prisma.js";

export const achievementsRouter = Router();

async function getWindow(quarter) {
  const window = await prisma.quarterWindow.findUnique({ where: { quarter } });
  return window || { quarter, isOpen: false };
}

async function getEmployeeGoals(employeeId, quarter) {
  const sheet = await prisma.goalSheet.findFirst({
    where: { employeeId, status: "Approved" },
    include: {
      employee: { select: { id: true, name: true, email: true, role: true, managerId: true } },
      goals: {
        where: { isLocked: true },
        include: { achievements: { where: { quarter } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!sheet) return null;

  const window = await getWindow(quarter);
  const goals = sheet.goals.map(({ achievements, ...goal }) => {
    const achievement = achievements[0] || null;
    return {
      ...goal,
      achievement,
      progress: achievement
        ? {
            scorePercent: achievement.scorePercent,
            scoreLabel: achievement.scoreLabel,
            band: scoreBand(achievement.scorePercent)
          }
        : { scorePercent: null, scoreLabel: "Pending", band: "neutral" }
    };
  });

  return {
    employee: sheet.employee,
    goalSheet: {
      id: sheet.id,
      employeeId: sheet.employeeId,
      cycleYear: sheet.cycleYear,
      status: sheet.status,
      submittedAt: sheet.submittedAt,
      approvedAt: sheet.approvedAt
    },
    quarter,
    window,
    summary: { updatedGoals: goals.filter((goal) => goal.achievement).length, totalGoals: goals.length },
    goals
  };
}

achievementsRouter.get("/dashboard/:employeeId/:quarter", requireAuth, async (req, res, next) => {
  try {
    const { employeeId, quarter } = req.params;
    if (req.user.sub?.startsWith("demo-")) {
      const canView = req.user.role === "Admin" || req.user.sub === employeeId || (req.user.role === "Manager" && demoStore.canManagerView(req.user.sub, employeeId));
      if (!canView) return res.status(403).json({ message: "You cannot view this employee's goals" });
      return res.json(demoStore.getEmployeeDashboard(employeeId, quarter));
    }
    const canView =
      req.user.role === "Admin" ||
      req.user.sub === employeeId ||
      (req.user.role === "Manager" && (await prisma.user.count({ where: { id: employeeId, managerId: req.user.sub } })) > 0);

    if (!canView) {
      return res.status(403).json({ message: "You cannot view this employee's goals" });
    }

    const dashboard = await getEmployeeGoals(employeeId, quarter);
    if (!dashboard) {
      return res.status(404).json({ message: "Approved goal sheet not found" });
    }

    return res.json(dashboard);
  } catch {
    const { employeeId, quarter } = req.params;
    const canView = req.user.role === "Admin" || req.user.sub === employeeId || (req.user.role === "Manager" && demoStore.canManagerView(req.user.sub, employeeId));

    if (!canView) {
      return res.status(403).json({ message: "You cannot view this employee's goals" });
    }

    return res.json(demoStore.getEmployeeDashboard(employeeId, quarter));
  }
});

achievementsRouter.post("/", requireAuth, requireRole("Employee"), async (req, res, next) => {
  try {
    const { goalId, quarter, actual, progressStatus } = req.body;

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { goalSheet: true, achievements: { where: { quarter } } }
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (goal.goalSheet.employeeId !== req.user.sub) {
      return res.status(403).json({ message: "Employees can only update their own goals" });
    }

    const window = await getWindow(quarter);
    if (!window.isOpen) {
      return res.status(403).json({ message: "Check-in window is not currently open" });
    }

    const existing = goal.achievements[0];
    if (existing?.isLocked) {
      return res.status(409).json({ message: "This quarter's entry is locked" });
    }

    const progress = computeProgress(goal.uomType, goal.target, actual);
    const achievement = await prisma.achievement.upsert({
      where: { goalId_quarter: { goalId, quarter } },
      update: {
        actual,
        progressStatus,
        scorePercent: progress.scorePercent,
        scoreLabel: progress.scoreLabel,
        isLocked: true,
        submittedAt: new Date()
      },
      create: {
        goalId,
        quarter,
        actual,
        progressStatus,
        scorePercent: progress.scorePercent,
        scoreLabel: progress.scoreLabel,
        isLocked: true,
        submittedAt: new Date()
      }
    });

    if (existing && existing.actual !== actual) {
      await prisma.auditLog.create({
        data: {
          entityType: "Achievement",
          entityId: achievement.id,
          goalId,
          fieldChanged: `${quarter} actual achievement`,
          oldValue: existing.actual,
          newValue: actual,
          changedBy: req.user.sub,
          changeDescription: "Achievement update after initial submission"
        }
      });
    }

    return res.status(201).json({ achievement, progress: { ...progress, band: scoreBand(progress.scorePercent) } });
  } catch {
    const result = demoStore.logAchievement({ userId: req.user.sub, ...req.body });
    return res.status(result.status).json(result.body);
  }
});

achievementsRouter.get("/:employeeId/:quarter", requireAuth, async (req, res, next) => {
  try {
    const { employeeId, quarter } = req.params;
    const canView =
      req.user.role === "Admin" ||
      req.user.sub === employeeId ||
      (req.user.role === "Manager" && (await prisma.user.count({ where: { id: employeeId, managerId: req.user.sub } })) > 0);

    if (!canView) {
      return res.status(403).json({ message: "You cannot view this employee's achievements" });
    }

    const dashboard = await getEmployeeGoals(employeeId, quarter);
    return res.json({ goals: dashboard?.goals || [] });
  } catch {
    const { employeeId, quarter } = req.params;
    const canView = req.user.role === "Admin" || req.user.sub === employeeId || (req.user.role === "Manager" && demoStore.canManagerView(req.user.sub, employeeId));

    if (!canView) {
      return res.status(403).json({ message: "You cannot view this employee's achievements" });
    }

    return res.json({ goals: demoStore.getAchievements(employeeId, quarter) });
  }
});

achievementsRouter.post("/unlock", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { goalId, quarter } = req.body;
    const achievement = await prisma.achievement.update({
      where: { goalId_quarter: { goalId, quarter } },
      data: { isLocked: false }
    });
    return res.json({ achievement });
  } catch {
    const achievement = demoStore.unlockAchievement(req.body);
    if (!achievement) {
      return res.status(404).json({ message: "Achievement not found" });
    }
    return res.json({ achievement });
  }
});
