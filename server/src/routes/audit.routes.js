import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const auditRouter = Router();

function paginate(rows, page = 1, pageSize = 25) {
  const currentPage = Math.max(Number(page) || 1, 1);
  const size = Math.min(Math.max(Number(pageSize) || 25, 5), 100);
  const start = (currentPage - 1) * size;
  return { rows: rows.slice(start, start + size), total: rows.length, page: currentPage, pageSize: size };
}

auditRouter.get("/", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const { from, to, employeeId, employeeName, page, pageSize } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: {
        changedAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined
        }
      },
      include: { user: true },
      orderBy: { changedAt: "desc" }
    });
    const rows = logs
      .map((log) => ({
        id: log.id,
        timestamp: log.changedAt,
        user: log.user.name,
        role: log.user.role,
        goalTitle: log.entityType === "Goal" ? log.entityId : log.entityType,
        employeeId: null,
        fieldChanged: log.fieldChanged || "Change",
        oldValue: log.oldValue || "",
        newValue: log.newValue || "",
        description: log.changeDescription
      }))
      .filter((row) => (!employeeId || row.employeeId === employeeId) && (!employeeName || row.employeeName?.toLowerCase().includes(String(employeeName).toLowerCase())));
    return res.json(paginate(rows, page, pageSize));
  } catch {
    const rows = demoStore.getAuditLogs(req.query).map((log) => ({
      id: log.id,
      timestamp: log.changedAt,
      user: log.userName,
      role: log.userRole,
      goalTitle: log.goalTitle,
      employeeId: log.employeeId,
      employeeName: log.employeeName,
      fieldChanged: log.fieldChanged,
      oldValue: log.oldValue,
      newValue: log.newValue,
      description: log.changeDescription
    }));
    return res.json(paginate(rows, req.query.page, req.query.pageSize));
  }
});
