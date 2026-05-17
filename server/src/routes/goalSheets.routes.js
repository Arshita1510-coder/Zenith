import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const goalSheetsRouter = Router();

async function getMyGoalSheet(req, res) {
  const quarter = req.params.quarter || "Q1";
  try {
    if (req.user.sub?.startsWith("demo-")) {
      const sheet = demoStore.getGoalSheet(req.user.sub, quarter);
      if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
      return res.json(sheet);
    }

    const employeeId = req.user.sub;
    const cycleYear = new Date().getFullYear();

    // Find or create goal sheet for active cycle year
    let sheet = await prisma.goalSheet.findFirst({
      where: { employeeId, cycleYear },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true, managerId: true } },
        goals: {
          include: { achievements: { where: { quarter } } }
        }
      }
    });

    if (!sheet) {
      sheet = await prisma.goalSheet.create({
        data: { employeeId, cycleYear, status: "Draft" },
        include: {
          employee: { select: { id: true, name: true, email: true, role: true, managerId: true } },
          goals: {
            include: { achievements: { where: { quarter } } }
          }
        }
      });
    }

    const manager = sheet.employee.managerId
      ? await prisma.user.findUnique({
          where: { id: sheet.employee.managerId },
          select: { id: true, name: true, email: true, role: true, managerId: true }
        })
      : null;

    const windows = await prisma.quarterWindow.findUnique({ where: { quarter } });
    const activeWindow = windows || { quarter, isOpen: false };

    const formattedGoals = sheet.goals.map(({ achievements, ...goal }) => {
      const achievement = achievements[0] || null;
      return {
        ...goal,
        achievement,
        progress: achievement
          ? {
              scorePercent: achievement.scorePercent,
              scoreLabel: achievement.scoreLabel,
              band: achievement.scorePercent >= 80 ? "green" : achievement.scorePercent >= 50 ? "amber" : "red"
            }
          : { scorePercent: null, scoreLabel: "Pending", band: "neutral" }
      };
    });

    return res.json({
      employee: sheet.employee,
      manager,
      goalSheet: {
        id: sheet.id,
        employeeId: sheet.employeeId,
        cycleYear: sheet.cycleYear,
        status: sheet.status,
        submittedAt: sheet.submittedAt,
        approvedAt: sheet.approvedAt
      },
      quarter,
      window: activeWindow,
      summary: {
        updatedGoals: formattedGoals.filter((g) => g.achievement).length,
        totalGoals: formattedGoals.length
      },
      goals: formattedGoals
    });
  } catch (error) {
    console.error("Prisma error in getMyGoalSheet:", error);
    const sheet = demoStore.getGoalSheet(req.user.sub, quarter);
    if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });
    return res.json(sheet);
  }
}

goalSheetsRouter.get("/my", requireAuth, requireRole("Employee"), getMyGoalSheet);
goalSheetsRouter.get("/my/:quarter", requireAuth, requireRole("Employee"), getMyGoalSheet);

goalSheetsRouter.put("/my", requireAuth, requireRole("Employee"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      const result = demoStore.saveGoalSheet(req.user.sub, req.body.goals || []);
      return res.status(result.status).json(result.body);
    }

    const employeeId = req.user.sub;
    const cycleYear = new Date().getFullYear();
    const requestedGoals = req.body.goals || [];

    if (requestedGoals.length > 8) {
      return res.status(400).json({ message: "A goal sheet can include at most 8 goals." });
    }

    let sheet = await prisma.goalSheet.findFirst({
      where: { employeeId, cycleYear }
    });

    if (!sheet) {
      sheet = await prisma.goalSheet.create({
        data: { employeeId, cycleYear, status: "Draft" }
      });
    }

    if (sheet.status === "Submitted" || sheet.status === "Approved") {
      return res.status(409).json({ message: "Submitted or approved goal sheets are read-only." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goal.deleteMany({
        where: { goalSheetId: sheet.id }
      });

      if (requestedGoals.length > 0) {
        await tx.goal.createMany({
          data: requestedGoals.map((goal, index) => ({
            goalSheetId: sheet.id,
            thrustArea: goal.thrustArea || "General",
            title: goal.title || `Goal ${index + 1}`,
            description: goal.description || "",
            uomType: goal.uomType || "Min",
            target: String(goal.target ?? ""),
            weightage: Number(goal.weightage || 0),
            status: "Draft",
            isShared: Boolean(goal.isShared),
            isLocked: false
          }))
        });
      }
    });

    const updated = await prisma.goalSheet.findFirst({
      where: { id: sheet.id },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true, managerId: true } },
        goals: {
          include: { achievements: { where: { quarter: "Q1" } } }
        }
      }
    });

    const manager = updated.employee.managerId
      ? await prisma.user.findUnique({
          where: { id: updated.employee.managerId },
          select: { id: true, name: true, email: true, role: true, managerId: true }
        })
      : null;

    const formattedGoals = updated.goals.map(({ achievements, ...goal }) => ({
      ...goal,
      achievement: achievements[0] || null,
      progress: { scorePercent: null, scoreLabel: "Pending", band: "neutral" }
    }));

    return res.json({
      employee: updated.employee,
      manager,
      goalSheet: {
        id: updated.id,
        employeeId: updated.employeeId,
        cycleYear: updated.cycleYear,
        status: updated.status,
        submittedAt: updated.submittedAt,
        approvedAt: updated.approvedAt
      },
      quarter: "Q1",
      window: { quarter: "Q1", isOpen: true },
      summary: {
        updatedGoals: 0,
        totalGoals: formattedGoals.length
      },
      goals: formattedGoals
    });
  } catch (error) {
    console.error("Prisma error in saveGoalSheet:", error);
    const result = demoStore.saveGoalSheet(req.user.sub, req.body.goals || []);
    return res.status(result.status).json(result.body);
  }
});

goalSheetsRouter.post("/my/submit", requireAuth, requireRole("Employee"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      const result = demoStore.submitGoalSheet(req.user.sub);
      return res.status(result.status).json(result.body);
    }

    const employeeId = req.user.sub;
    const cycleYear = new Date().getFullYear();

    const sheet = await prisma.goalSheet.findFirst({
      where: { employeeId, cycleYear },
      include: { goals: true, employee: true }
    });

    if (!sheet) return res.status(404).json({ message: "Goal sheet not found" });

    const goalsToValidate = sheet.goals;
    if (!goalsToValidate.length) return res.status(400).json({ message: "Add at least one goal before submitting." });
    if (goalsToValidate.length > 8) return res.status(400).json({ message: "A goal sheet can include at most 8 goals." });
    if (goalsToValidate.some((goal) => Number(goal.weightage) < 10)) return res.status(400).json({ message: "Each goal must have at least 10% weightage." });
    const total = goalsToValidate.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
    if (total !== 100) return res.status(400).json({ message: `Total weightage must equal 100%. Current total is ${total}%.` });

    await prisma.goalSheet.update({
      where: { id: sheet.id },
      data: { status: "Submitted", submittedAt: new Date() }
    });

    await prisma.goal.updateMany({
      where: { goalSheetId: sheet.id },
      data: { isLocked: true }
    });

    if (sheet.employee.managerId) {
      await prisma.notification.create({
        data: {
          userId: sheet.employee.managerId,
          message: `${sheet.employee.name} has submitted their goal sheet for your approval`
        }
      });
    }

    const updated = await prisma.goalSheet.findFirst({
      where: { id: sheet.id },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true, managerId: true } },
        goals: {
          include: { achievements: { where: { quarter: "Q1" } } }
        }
      }
    });

    const manager = updated.employee.managerId
      ? await prisma.user.findUnique({
          where: { id: updated.employee.managerId },
          select: { id: true, name: true, email: true, role: true, managerId: true }
        })
      : null;

    const formattedGoals = updated.goals.map(({ achievements, ...goal }) => ({
      ...goal,
      achievement: achievements[0] || null,
      progress: { scorePercent: null, scoreLabel: "Pending", band: "neutral" }
    }));

    return res.json({
      employee: updated.employee,
      manager,
      goalSheet: {
        id: updated.id,
        employeeId: updated.employeeId,
        cycleYear: updated.cycleYear,
        status: updated.status,
        submittedAt: updated.submittedAt,
        approvedAt: updated.approvedAt
      },
      quarter: "Q1",
      window: { quarter: "Q1", isOpen: true },
      summary: {
        updatedGoals: 0,
        totalGoals: formattedGoals.length
      },
      goals: formattedGoals
    });
  } catch (error) {
    console.error("Prisma error in submitGoalSheet:", error);
    const result = demoStore.submitGoalSheet(req.user.sub);
    return res.status(result.status).json(result.body);
  }
});
