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
    if (_req.user.sub?.startsWith("demo-")) return res.json({ users: demoStore.getUsers() });
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

adminRouter.get("/goals", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      return res.json({ goals: demoStore.searchGoals(req.query.search || "") });
    }
    const term = req.query.search || "";
    const goals = await prisma.goal.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { thrustArea: { contains: term, mode: "insensitive" } },
          { goalSheet: { employee: { name: { contains: term, mode: "insensitive" } } } }
        ]
      },
      include: {
        goalSheet: {
          include: {
            employee: { select: { id: true, name: true, email: true, role: true, department: true } }
          }
        }
      }
    });

    const formatted = goals.map(({ goalSheet, ...goal }) => ({
      ...goal,
      employee: goalSheet.employee
    }));

    return res.json({ goals: formatted });
  } catch (error) {
    console.error("Prisma error in searchGoals:", error);
    return res.json({ goals: demoStore.searchGoals(req.query.search || "") });
  }
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
    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: { isLocked: false }
    });
    await prisma.achievement.updateMany({ where: { goalId: goal.id }, data: { isLocked: false } });
    return res.json({ goal: updatedGoal });
  } catch {
    const goal = demoStore.unlockGoal(req.params.goalId, req.user.sub);
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    return res.json({ goal });
  }
});

adminRouter.put("/goal/:goalId", requireAuth, requireRole("Manager", "Admin"), async (req, res) => {
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.goalId } });
    if (!goal) return res.status(404).json({ message: "Goal not found" });

    const updates = {};
    if (req.body.target !== undefined && String(req.body.target) !== String(goal.target)) {
      updates.target = String(req.body.target);
      await prisma.auditLog.create({
        data: {
          entityType: "Goal",
          entityId: goal.id,
          goalId: goal.id,
          fieldChanged: "target",
          oldValue: goal.target,
          newValue: String(req.body.target),
          changedBy: req.user.sub,
          changeDescription: "Manager edited target during approval"
        }
      });
    }
    if (req.body.weightage !== undefined && Number(req.body.weightage) !== goal.weightage) {
      updates.weightage = Number(req.body.weightage);
      await prisma.auditLog.create({
        data: {
          entityType: "Goal",
          entityId: goal.id,
          goalId: goal.id,
          fieldChanged: "weightage",
          oldValue: String(goal.weightage),
          newValue: String(req.body.weightage),
          changedBy: req.user.sub,
          changeDescription: "Manager edited weightage during approval"
        }
      });
    }
    const updated = await prisma.goal.update({ where: { id: goal.id }, data: updates });
    return res.json({ goal: updated });
  } catch {
    const goal = demoStore.editGoal(req.params.goalId, req.body, req.user.sub);
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    return res.json({ goal });
  }
});

adminRouter.get("/org", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    if (req.user.sub?.startsWith("demo-")) {
      return res.json({ org: demoStore.getOrg() });
    }
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        department: true,
        employees: {
          select: { id: true, name: true, email: true, role: true, managerId: true, department: true }
        }
      }
    });

    const leaders = users.filter((u) => u.role === "Admin" || u.role === "Manager");
    const formatted = leaders.map((leader) => ({
      ...leader,
      reports: leader.employees
    }));

    return res.json({ org: formatted });
  } catch (error) {
    console.error("Prisma error in getOrg:", error);
    return res.json({ org: demoStore.getOrg() });
  }
});

adminRouter.post("/shared-goals", requireAuth, requireRole("Admin", "Manager"), async (req, res) => {
  try {
    const { thrustArea, title, description, uomType, target, weightage, targetDepartment } = req.body;
    
    // Find matching employees
    const employees = await prisma.user.findMany({
      where: {
        role: "Employee",
        department: targetDepartment || undefined
      }
    });

    if (!employees.length) {
      return res.status(400).json({ message: "No matching employees found in this department." });
    }

    const currentYear = new Date().getFullYear();

    // Iterate through all found employees and inject the goal
    const creations = employees.map(async (emp) => {
      // Find or create their GoalSheet
      let sheet = await prisma.goalSheet.findFirst({
        where: { employeeId: emp.id, cycleYear: currentYear }
      });
      if (!sheet) {
        sheet = await prisma.goalSheet.create({
          data: {
            employeeId: emp.id,
            cycleYear: currentYear,
            status: "Draft"
          }
        });
      }

      // Check if goal sheet is already approved
      // If approved, we inject as Active & Locked. If not, inject as Draft & Locked.
      const status = sheet.status === "Approved" ? "Active" : "Draft";

      // Append goal
      return prisma.goal.create({
        data: {
          goalSheetId: sheet.id,
          thrustArea,
          title,
          description,
          uomType,
          target: String(target),
          weightage: Number(weightage),
          isShared: true,
          isLocked: true,
          status
        }
      });
    });

    await Promise.all(creations);

    // Create notifications for each employee
    await Promise.all(
      employees.map((emp) =>
        prisma.notification.create({
          data: {
            userId: emp.id,
            message: `A corporate shared goal "${title}" has been assigned to your goal sheet by Admin.`
          }
        })
      )
    );

    return res.json({ success: true, message: `Successfully propagated shared goal to ${employees.length} employees.` });
  } catch (error) {
    console.error("Error propagating shared goals:", error);
    return res.status(500).json({ message: "Failed to propagate shared goals." });
  }
});
