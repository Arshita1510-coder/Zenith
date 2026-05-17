import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const reportsRouter = Router();

function paginate(rows, page = 1, pageSize = 25) {
  const currentPage = Math.max(Number(page) || 1, 1);
  const size = Math.min(Math.max(Number(pageSize) || 25, 5), 100);
  const start = (currentPage - 1) * size;
  return { rows: rows.slice(start, start + size), total: rows.length, page: currentPage, pageSize: size };
}

reportsRouter.get("/achievement", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      const scopedManagerId = req.user.role === "Manager" ? req.user.sub : req.query.managerId;
      const rows = demoStore.getReportRows({ quarter: req.query.quarter, managerId: scopedManagerId, status: req.query.status });
      return res.json(paginate(rows, req.query.page, req.query.pageSize));
    }
    const { quarter, managerId, status, page, pageSize } = req.query;
    const scopedManagerId = req.user.role === "Manager" ? req.user.sub : managerId || undefined;
    const sheets = await prisma.goalSheet.findMany({
      where: { employee: scopedManagerId ? { managerId: scopedManagerId } : undefined },
      include: {
        employee: true,
        goals: { include: { achievements: quarter ? { where: { quarter } } : true } }
      }
    });

    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => {
        const achievement = goal.achievements[0];
        return {
          employeeId: sheet.employee.id,
          employeeName: sheet.employee.name,
          managerId: sheet.employee.managerId,
          department: sheet.employee.department || "Team",
          goalId: goal.id,
          goalTitle: goal.title,
          thrustArea: goal.thrustArea,
          uomType: goal.uomType,
          plannedTarget: goal.target,
          actualAchievement: achievement?.actual || "",
          progressScore: achievement?.scoreLabel || "Pending",
          scorePercent: achievement?.scorePercent ?? null,
          status: achievement?.progressStatus || "NotStarted",
          quarter: achievement?.quarter || quarter || "Q1"
        };
      })
    ).filter((row) => (!quarter || row.quarter === quarter) && (!status || row.status === status));

    return res.json(paginate(rows, page, pageSize));
  } catch {
    const scopedManagerId = req.user.role === "Manager" ? req.user.sub : req.query.managerId;
    const rows = demoStore.getReportRows({ quarter: req.query.quarter, managerId: scopedManagerId, status: req.query.status });
    return res.json(paginate(rows, req.query.page, req.query.pageSize));
  }
});

reportsRouter.get("/completion", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      return res.json(demoStore.getCompletion({ managerId: req.user.role === "Manager" ? req.user.sub : undefined }));
    }
    const managerId = req.user.role === "Manager" ? req.user.sub : undefined;
    const employees = await prisma.user.findMany({
      where: { role: "Employee", managerId },
      include: { goalSheets: { include: { goals: true, checkIns: true } }, manager: true }
    });
    const managers = await prisma.user.findMany({ where: { role: "Manager" } });
    const quarterList = ["Q1", "Q2", "Q3", "Q4"];
    const employeeRows = employees.map((employee) => {
      const sheet = employee.goalSheets[0];
      const quarters = Object.fromEntries(quarterList.map((quarter) => [quarter, Boolean(sheet?.checkIns.find((checkIn) => checkIn.quarter === quarter && checkIn.isCompleted))]));
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        managerId: employee.managerId,
        managerName: employee.manager?.name || "Unassigned",
        goalsSubmitted: sheet?.submittedAt ? sheet.goals.length : 0,
        goalsApproved: sheet?.status === "Approved" ? sheet.goals.length : 0,
        quarters
      };
    });
    const summaryCards = quarterList.map((quarter) => ({ quarter, completed: employeeRows.filter((row) => row.quarters[quarter]).length, total: employeeRows.length }));
    const managerRows = managers.map((manager) => {
      const team = employeeRows.filter((row) => row.managerId === manager.id);
      const completed = team.reduce((count, row) => count + quarterList.filter((quarter) => row.quarters[quarter]).length, 0);
      return { managerId: manager.id, managerName: manager.name, teamSize: team.length, checkInsCompleted: completed, checkInsPending: team.length * 4 - completed };
    });
    return res.json({ summaryCards, employeeRows, managerRows });
  } catch {
    return res.json(demoStore.getCompletion({ managerId: req.user.role === "Manager" ? req.user.sub : undefined }));
  }
});
