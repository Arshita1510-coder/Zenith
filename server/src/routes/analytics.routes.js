import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const analyticsRouter = Router();

analyticsRouter.get("/", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    const managerId = req.user.role === "Manager" ? req.user.sub : req.query.managerId || undefined;
    const quarter = req.query.quarter || "Q1";

    if (req.user.sub?.startsWith("demo-")) {
      return res.json(demoStore.getAnalytics({ managerId, quarter }));
    }

    // 1. Fetch scoped goals and employees
    const employees = await prisma.user.findMany({
      where: {
        role: "Employee",
        managerId: managerId
      },
      select: {
        id: true,
        name: true,
        goalSheets: {
          include: {
            goals: {
              include: {
                achievements: true
              }
            }
          }
        }
      }
    });

    const allGoals = employees.flatMap((emp) => emp.goalSheets.flatMap((sheet) => sheet.goals));

    // 2. Compute Distribution
    const thrustAreas = [...new Set(allGoals.map((g) => g.thrustArea))];
    const distribution = thrustAreas.map((area) => {
      const areaGoals = allGoals.filter((g) => g.thrustArea === area);
      const totalWeight = areaGoals.reduce((sum, g) => sum + g.weightage, 0);
      return {
        name: area,
        value: areaGoals.length,
        averageWeightage: areaGoals.length ? Math.round(totalWeight / areaGoals.length) : 0
      };
    });

    // 3. Compute Heatmap
    const heatmap = employees.map((employee) => {
      const sheet = employee.goalSheets[0];
      const goalsList = sheet?.goals || [];
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        goals: goalsList.map((goal) => {
          const achievement = goal.achievements.find((a) => a.quarter === quarter);
          return {
            goalId: goal.id,
            goalTitle: goal.title,
            quarter,
            score: achievement?.scorePercent ?? null,
            label: achievement?.scoreLabel || "Not Started"
          };
        })
      };
    });

    // 4. Compute Trend
    const quartersList = ["Q1", "Q2", "Q3", "Q4"];
    const trend = quartersList.map((q) => {
      const achievementsList = allGoals.flatMap((g) => g.achievements.filter((a) => a.quarter === q));
      const validScores = achievementsList.map((a) => a.scorePercent).filter((s) => s !== null && s !== undefined);
      const average = validScores.length
        ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length)
        : 0;
      return { quarter: q, average };
    });

    // 5. Compute Completion Rate
    const totalEmployeesCount = employees.length;
    let completedCheckinsCount = 0;

    const activeWindow = await prisma.quarterWindow.findFirst({
      where: { isOpen: true },
      orderBy: { quarter: "asc" }
    });
    const activeQuarter = activeWindow?.quarter || quarter;

    if (totalEmployeesCount > 0) {
      const completedSheets = await prisma.checkIn.count({
        where: {
          quarter: activeQuarter,
          isCompleted: true,
          goalSheet: {
            employee: {
              managerId: managerId
            }
          }
        }
      });
      completedCheckinsCount = completedSheets;
    }

    const completionRate = totalEmployeesCount
      ? Math.round((completedCheckinsCount / totalEmployeesCount) * 100)
      : 0;

    return res.json({ distribution, heatmap, trend, completionRate, activeQuarter });
  } catch (error) {
    console.error("Prisma error in getAnalytics:", error);
    const managerId = req.user.role === "Manager" ? req.user.sub : req.query.managerId || undefined;
    return res.json(demoStore.getAnalytics({ managerId, quarter: req.query.quarter || "Q1" }));
  }
});
