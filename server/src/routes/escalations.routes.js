import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const escalationsRouter = Router();

const quarters = ["Q1", "Q2", "Q3", "Q4"];

function daysBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function formatEscalations(rows) {
  const escalations = rows.map((item) => ({
    ...item,
    userName: item.user?.name || "Unknown",
    userRole: item.user?.role || "Unknown"
  }));
  const summary = escalations
    .filter((item) => item.status === "Pending")
    .reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {});
  return { escalations, summary };
}

async function fetchEscalations() {
  const rows = await prisma.escalation.findMany({
    include: { user: { select: { name: true, role: true } } },
    orderBy: [{ status: "asc" }, { triggeredAt: "desc" }]
  });
  return formatEscalations(rows);
}

escalationsRouter.get("/", requireAuth, requireRole("Admin"), async (_req, res) => {
  try {
    if (_req.user.sub?.startsWith("demo-")) return res.json(demoStore.getEscalations());
    return res.json(await fetchEscalations());
  } catch {
    return res.json(demoStore.getEscalations());
  }
});

escalationsRouter.post("/run", requireAuth, requireRole("Admin"), async (_req, res) => {
  try {
    if (_req.user.sub?.startsWith("demo-")) return res.json(demoStore.runEscalationCheck());
    const now = new Date();
    const cycleYear = now.getFullYear();
    const cycleOpen = new Date(`${cycleYear}-04-01T00:00:00.000Z`);
    const activeWindow = await prisma.quarterWindow.findFirst({ where: { isOpen: true }, orderBy: { quarter: "asc" } });
    const activeQuarter = activeWindow?.quarter || quarters[0];
    const admins = await prisma.user.findMany({ where: { role: "Admin" }, select: { id: true } });
    const checks = [];

    const employees = await prisma.user.findMany({
      where: { role: "Employee" },
      include: {
        goalSheets: {
          where: { cycleYear },
          include: {
            goals: { include: { achievements: { where: { quarter: activeQuarter } } } },
            checkIns: { where: { quarter: activeQuarter } }
          }
        }
      }
    });

    employees.forEach((employee) => {
      const sheet = employee.goalSheets[0];
      if (!sheet?.submittedAt) {
        const daysOverdue = daysBetween(cycleOpen, now) - 7;
        if (daysOverdue > 0) checks.push({ userId: employee.id, type: "Goal Sheets Overdue", daysOverdue });
      }
      if (sheet?.submittedAt && !sheet.approvedAt && employee.managerId) {
        const daysOverdue = daysBetween(sheet.submittedAt, now) - 5;
        if (daysOverdue > 0) checks.push({ userId: employee.managerId, type: "Manager Approvals Pending", daysOverdue });
      }
      if (sheet?.goals?.length && sheet.goals.some((goal) => !goal.achievements.length)) {
        checks.push({ userId: employee.id, type: "Quarterly Achievements Pending", daysOverdue: 1 });
      }
    });

    const managers = await prisma.user.findMany({
      where: { role: "Manager" },
      include: {
        employees: {
          include: {
            goalSheets: {
              where: { cycleYear },
              include: { checkIns: { where: { quarter: activeQuarter, isCompleted: true } } }
            }
          }
        }
      }
    });

    managers.forEach((manager) => {
      const hasPending = manager.employees.some((employee) => employee.goalSheets.some((sheet) => !sheet.checkIns.length));
      if (hasPending) checks.push({ userId: manager.id, type: "Manager Check-ins Pending", daysOverdue: 1 });
    });

    for (const check of checks) {
      const exists = await prisma.escalation.findFirst({ where: { userId: check.userId, type: check.type, status: "Pending" } });
      if (!exists) {
        await prisma.escalation.create({ data: check });
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: { userId: admin.id, message: `Escalation triggered: ${check.type}` }
            })
          )
        );
      }
    }

    console.info("Ethereal preview URL: https://ethereal.email/message/demo-escalation-preview");
    return res.json(await fetchEscalations());
  } catch {
    return res.json(demoStore.runEscalationCheck());
  }
});

escalationsRouter.put("/:id/resolve", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const escalation = await prisma.escalation.update({
      where: { id: req.params.id },
      data: { status: "Resolved", resolvedAt: new Date(), resolvedBy: req.user.sub, note: req.body.note || "" }
    });
    return res.json({ escalation });
  } catch {
    const escalation = demoStore.resolveEscalation(req.params.id, { note: req.body.note, resolvedBy: req.user.sub });
    if (!escalation) return res.status(404).json({ message: "Escalation not found" });
    return res.json({ escalation });
  }
});
