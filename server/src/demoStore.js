import bcrypt from "bcryptjs";
import { computeProgress, isQuarterOpenByCalendar, quarters, scoreBand } from "./progress.js";

const demoPassword = "Password123!";
let activeCycleYear = 2026;

const users = [
  { id: "demo-employee", name: "Emery Employee", email: "employee@atomquest.test", role: "Employee", managerId: "demo-manager", department: "Revenue" },
  { id: "demo-employee-2", name: "Rowan Reporter", email: "rowan@atomquest.test", role: "Employee", managerId: "demo-manager", department: "Revenue" },
  { id: "demo-employee-3", name: "Casey Contributor", email: "casey@atomquest.test", role: "Employee", managerId: "demo-manager", department: "Operations" },
  { id: "demo-manager", name: "Morgan Manager", email: "manager@atomquest.test", role: "Manager", managerId: null, department: "Revenue" },
  { id: "demo-admin", name: "Avery Admin", email: "admin@atomquest.test", role: "Admin", managerId: null, department: "People Ops" }
];

const goalTemplates = [
  ["Growth", "Sales revenue", "Deliver new-business revenue for the cycle.", "Min", "100000", 30],
  ["Operations", "Customer turnaround time", "Keep average resolution TAT under the planned ceiling.", "Max", "48", 20],
  ["Delivery", "Enablement launch", "Complete the enablement rollout by the committed date.", "Timeline", "2026-07-30", 20],
  ["Risk", "Safety incidents", "Maintain zero reportable incidents.", "Zero", "0", 15],
  ["Capability", "Training completions", "Complete assigned learning modules for the team charter.", "Min", "10", 15]
];

const employeeUsers = users.filter((user) => user.role === "Employee");
const goalSheets = employeeUsers.map((employee) => ({
  id: `goalsheet-${employee.id}-2026`,
  employeeId: employee.id,
  cycleYear: 2026,
  status: employee.id === "demo-employee-3" ? "Draft" : employee.id === "demo-employee" ? "Submitted" : "Approved",
  submittedAt: employee.id === "demo-employee-3" ? null : "2026-04-20T10:00:00.000Z",
  approvedAt: employee.id === "demo-employee-2" ? "2026-04-25T10:00:00.000Z" : null
}));

const goals = goalSheets.flatMap((sheet) =>
  goalTemplates.map(([thrustArea, title, description, uomType, target, weightage], index) => ({
    id: `${sheet.employeeId}-goal-${index + 1}`,
    goalSheetId: sheet.id,
    thrustArea,
    title,
    description,
    uomType,
    target,
    weightage,
    status: "Active",
    isShared: true,
    isLocked: true
  }))
);

const achievements = [];
const checkIns = [];
const auditLogs = [];
const escalations = [];
const notifications = [
  {
    id: "notif-q2-open",
    userId: "demo-employee",
    message: "Q2 check-in window is now open - please update your achievements",
    isRead: false,
    createdAt: new Date().toISOString()
  }
];
const windows = quarters.map((quarter) => ({
  quarter,
  isOpen: quarter === "Q1" || quarter === "Q2" || isQuarterOpenByCalendar(quarter),
  updatedBy: "demo-admin",
  updatedAt: new Date().toISOString()
}));

seedDemoProgress();

function seedDemoProgress() {
  addAchievement("demo-employee-2-goal-1", "Q1", "103000", "Completed");
  addAchievement("demo-employee-2-goal-2", "Q1", "44", "Completed");
  addAchievement("demo-employee-2-goal-4", "Q1", "0", "Completed");
  addAchievement("demo-employee-3-goal-1", "Q1", "42000", "OnTrack");

  checkIns.push({
    id: "checkin-rowan-q1",
    goalSheetId: "goalsheet-demo-employee-2-2026",
    managerId: "demo-manager",
    quarter: "Q1",
    comment: "Reviewed Q1 outcomes and closed actions.",
    isCompleted: true,
    createdAt: new Date().toISOString()
  });
}

function addAchievement(goalId, quarter, actual, progressStatus) {
  const goal = goals.find((item) => item.id === goalId);
  const progress = computeProgress(goal.uomType, goal.target, actual);
  achievements.push({
    id: `achievement-${goalId}-${quarter}`,
    goalId,
    quarter,
    actual,
    progressStatus,
    scorePercent: progress.scorePercent,
    scoreLabel: progress.scoreLabel,
    isLocked: true,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function daysBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function daysSinceCycleOpen(now) {
  return daysBetween(new Date(`${activeCycleYear}-04-01T00:00:00.000Z`), now);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.managerId,
    department: user.department
  };
}

function userNameRole(userId) {
  const user = users.find((item) => item.id === userId);
  return { userName: user?.name || "Unknown", userRole: user?.role || "Unknown" };
}

function employeeForGoal(goal) {
  const sheet = goalSheets.find((item) => item.id === goal.goalSheetId);
  return users.find((item) => item.id === sheet?.employeeId);
}

function goalWithAchievement(goal, quarter) {
  const achievement = achievements.find((item) => item.goalId === goal.id && item.quarter === quarter) || null;
  return {
    ...goal,
    achievement,
    progress: achievement
      ? { scorePercent: achievement.scorePercent, scoreLabel: achievement.scoreLabel, band: scoreBand(achievement.scorePercent) }
      : { scorePercent: null, scoreLabel: "Pending", band: "neutral" }
  };
}

function dashboardForEmployee(employeeId, quarter) {
  const sheet = goalSheets.find((item) => item.employeeId === employeeId && item.cycleYear === activeCycleYear);
  if (!sheet) return null;

  const preparedGoals = goals.filter((goal) => goal.goalSheetId === sheet.id && goal.isLocked).map((goal) => goalWithAchievement(goal, quarter));
  return {
    employee: publicUser(users.find((user) => user.id === employeeId)),
    goalSheet: sheet,
    quarter,
    window: windows.find((window) => window.quarter === quarter),
    summary: { updatedGoals: preparedGoals.filter((goal) => goal.achievement).length, totalGoals: preparedGoals.length },
    goals: preparedGoals
  };
}

function reportRows({ quarter, managerId, status }) {
  return goals
    .map((goal) => {
      const sheet = goalSheets.find((item) => item.id === goal.goalSheetId);
      const employee = users.find((item) => item.id === sheet.employeeId);
      const achievement = achievements.find((item) => item.goalId === goal.id && (!quarter || item.quarter === quarter));
      const rowQuarter = achievement?.quarter || quarter || "Q1";
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        managerId: employee.managerId,
        department: employee.department,
        goalId: goal.id,
        goalTitle: goal.title,
        thrustArea: goal.thrustArea,
        uomType: goal.uomType,
        plannedTarget: goal.target,
        actualAchievement: achievement?.actual || "",
        progressScore: achievement?.scoreLabel || "Pending",
        scorePercent: achievement?.scorePercent ?? null,
        status: achievement?.progressStatus || "NotStarted",
        quarter: rowQuarter
      };
    })
    .filter((row) => (!managerId || row.managerId === managerId) && (!status || row.status === status) && (!quarter || row.quarter === quarter));
}

function addAuditLog({ changedBy, goalId, entityType = "Goal", entityId = goalId, fieldChanged, oldValue, newValue, changeDescription }) {
  const goal = goals.find((item) => item.id === goalId);
  const { userName, userRole } = userNameRole(changedBy);
  const log = {
    id: `audit-${auditLogs.length + 1}`,
    entityType,
    entityId,
    goalId,
    goalTitle: goal?.title || "Unknown goal",
    employeeId: goal ? employeeForGoal(goal)?.id : null,
    employeeName: goal ? employeeForGoal(goal)?.name : null,
    changedBy,
    userName,
    userRole,
    fieldChanged,
    oldValue: String(oldValue ?? ""),
    newValue: String(newValue ?? ""),
    changeDescription,
    changedAt: new Date().toISOString()
  };
  auditLogs.unshift(log);
  return log;
}

export const demoStore = {
  async findUserByEmail(email) {
    return users.find((user) => user.email === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    return users.find((user) => user.id === id) || null;
  },

  async verifyPassword(user, password) {
    return password === demoPassword || bcrypt.compare(password, user.passwordHash || "");
  },

  publicUser,

  getUsers() {
    return users.map(publicUser);
  },

  getWindows() {
    return windows;
  },

  getCycle() {
    return { activeCycleYear, windows };
  },

  setWindow(quarter, isOpen, updatedBy) {
    const window = windows.find((item) => item.quarter === quarter);
    if (!window) return null;
    window.isOpen = Boolean(isOpen);
    window.updatedBy = updatedBy;
    window.updatedAt = new Date().toISOString();
    return window;
  },

  updateCycle({ cycleYear, windows: requestedWindows }, changedBy) {
    if (cycleYear) activeCycleYear = Number(cycleYear);
    requestedWindows?.forEach((item) => this.setWindow(item.quarter, item.isOpen, changedBy));
    return this.getCycle();
  },

  getEmployeeDashboard(employeeId, quarter) {
    return dashboardForEmployee(employeeId, quarter);
  },

  getTeamDashboard(managerId, quarter) {
    const reportees = users.filter((user) => user.managerId === managerId);
    return {
      quarter,
      window: windows.find((window) => window.quarter === quarter),
      reportees: reportees.map((employee) => {
        const dashboard = dashboardForEmployee(employee.id, quarter);
        const checkIn = checkIns.find((item) => item.goalSheetId === dashboard.goalSheet.id && item.managerId === managerId && item.quarter === quarter) || null;
        return { ...dashboard, checkIn };
      })
    };
  },

  canManagerView(managerId, employeeId) {
    return users.some((user) => user.id === employeeId && user.managerId === managerId);
  },

  logAchievement({ userId, goalId, quarter, actual, progressStatus }) {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return { status: 404, body: { message: "Goal not found" } };
    if (employeeForGoal(goal)?.id !== userId) return { status: 403, body: { message: "Employees can only update their own goals" } };
    if (!windows.find((item) => item.quarter === quarter)?.isOpen) return { status: 403, body: { message: "Check-in window is not currently open" } };

    const existing = achievements.find((item) => item.goalId === goalId && item.quarter === quarter);
    if (existing?.isLocked) return { status: 409, body: { message: "This quarter's entry is locked" } };

    const progress = computeProgress(goal.uomType, goal.target, actual);
    const payload = {
      id: existing?.id || `achievement-${goalId}-${quarter}`,
      goalId,
      quarter,
      actual,
      progressStatus,
      scorePercent: progress.scorePercent,
      scoreLabel: progress.scoreLabel,
      isLocked: true,
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      if (existing.actual !== actual) {
        addAuditLog({
          changedBy: userId,
          goalId,
          fieldChanged: `${quarter} actual achievement`,
          oldValue: existing.actual,
          newValue: actual,
          changeDescription: "Achievement update after initial submission"
        });
      }
      Object.assign(existing, payload);
    } else {
      achievements.push(payload);
    }

    return { status: 201, body: { achievement: payload, progress: { ...progress, band: scoreBand(progress.scorePercent) } } };
  },

  unlockAchievement({ goalId, quarter }) {
    const items = achievements.filter((item) => item.goalId === goalId && (!quarter || item.quarter === quarter));
    items.forEach((item) => {
      item.isLocked = false;
    });
    return items[0] || null;
  },

  unlockGoal(goalId, changedBy) {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return null;
    const previous = goal.isLocked;
    this.unlockAchievement({ goalId });
    addAuditLog({
      changedBy,
      goalId,
      fieldChanged: "Goal lock",
      oldValue: previous ? "Locked" : "Unlocked",
      newValue: "Unlocked",
      changeDescription: "Admin unlocked a goal"
    });
    return goal;
  },

  editGoal(goalId, updates, changedBy) {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return null;
    ["target", "weightage"].forEach((field) => {
      if (updates[field] !== undefined && String(updates[field]) !== String(goal[field])) {
        addAuditLog({
          changedBy,
          goalId,
          fieldChanged: field,
          oldValue: goal[field],
          newValue: updates[field],
          changeDescription: `Manager edited ${field} during approval`
        });
        goal[field] = field === "weightage" ? Number(updates[field]) : String(updates[field]);
      }
    });
    return goal;
  },

  getAchievements(employeeId, quarter) {
    const dashboard = dashboardForEmployee(employeeId, quarter);
    return dashboard ? dashboard.goals : [];
  },

  submitCheckIn({ managerId, goalSheetId, quarter, comment, isCompleted }) {
    const existing = checkIns.find((item) => item.goalSheetId === goalSheetId && item.managerId === managerId && item.quarter === quarter);
    const payload = {
      id: existing?.id || `checkin-${goalSheetId}-${quarter}`,
      goalSheetId,
      managerId,
      quarter,
      comment,
      isCompleted: Boolean(isCompleted),
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    existing ? Object.assign(existing, payload) : checkIns.push(payload);
    return payload;
  },

  getCheckIns(managerId, quarter) {
    return checkIns.filter((item) => item.managerId === managerId && item.quarter === quarter);
  },

  getReportRows(filters = {}) {
    return reportRows(filters);
  },

  getCompletion({ managerId } = {}) {
    const employees = users.filter((user) => user.role === "Employee" && (!managerId || user.managerId === managerId));
    const employeeRows = employees.map((employee) => {
      const sheet = goalSheets.find((item) => item.employeeId === employee.id);
      const employeeGoals = goals.filter((goal) => goal.goalSheetId === sheet.id);
      const checkInByQuarter = Object.fromEntries(
        quarters.map((quarter) => [quarter, Boolean(checkIns.find((item) => item.goalSheetId === sheet.id && item.quarter === quarter && item.isCompleted))])
      );
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        managerId: employee.managerId,
        managerName: users.find((user) => user.id === employee.managerId)?.name || "Unassigned",
        goalsSubmitted: sheet.submittedAt ? employeeGoals.length : 0,
        goalsApproved: sheet.status === "Approved" ? employeeGoals.length : 0,
        quarters: checkInByQuarter
      };
    });

    const summaryCards = quarters.map((quarter) => ({
      quarter,
      completed: employeeRows.filter((row) => row.quarters[quarter]).length,
      total: employeeRows.length
    }));

    const managerRows = users
      .filter((user) => user.role === "Manager" && (!managerId || user.id === managerId))
      .map((manager) => {
        const team = employeeRows.filter((row) => row.managerId === manager.id);
        const completed = team.reduce((count, row) => count + quarters.filter((quarter) => row.quarters[quarter]).length, 0);
        const total = team.length * quarters.length;
        return { managerId: manager.id, managerName: manager.name, teamSize: team.length, checkInsCompleted: completed, checkInsPending: total - completed };
      });

    return { summaryCards, employeeRows, managerRows };
  },

  getAuditLogs({ from, to, employeeId, employeeName } = {}) {
    return auditLogs.filter((log) => {
      const timestamp = new Date(log.changedAt).getTime();
      return (
        (!from || timestamp >= new Date(from).getTime()) &&
        (!to || timestamp <= new Date(to).getTime()) &&
        (!employeeId || log.employeeId === employeeId) &&
        (!employeeName || log.employeeName?.toLowerCase().includes(employeeName.toLowerCase()))
      );
    });
  },

  runEscalationCheck() {
    const now = new Date();
    const checks = [];
    const activeQuarter = windows.find((window) => window.isOpen)?.quarter || "Q1";

    users.filter((user) => user.role === "Employee").forEach((employee) => {
      const sheet = goalSheets.find((item) => item.employeeId === employee.id);
      if (!sheet?.submittedAt) {
        checks.push({ userId: employee.id, type: "Goal Sheets Overdue", daysOverdue: daysSinceCycleOpen(now) - 7 });
      }

      const employeeGoals = goals.filter((goal) => goal.goalSheetId === sheet?.id);
      const updated = employeeGoals.filter((goal) => achievements.some((achievement) => achievement.goalId === goal.id && achievement.quarter === activeQuarter));
      if (activeQuarter && updated.length < employeeGoals.length) {
        checks.push({ userId: employee.id, type: "Quarterly Achievements Pending", daysOverdue: 2 });
      }
    });

    users.filter((user) => user.role === "Manager").forEach((manager) => {
      const reportSheets = goalSheets.filter((sheet) => users.find((user) => user.id === sheet.employeeId)?.managerId === manager.id);
      const missingCheckIns = reportSheets.filter((sheet) => !checkIns.some((checkIn) => checkIn.goalSheetId === sheet.id && checkIn.quarter === activeQuarter && checkIn.isCompleted));
      if (missingCheckIns.length) {
        checks.push({ userId: manager.id, type: "Manager Check-ins Pending", daysOverdue: 3 });
      }
    });

    const submittedPending = goalSheets.filter((sheet) => sheet.submittedAt && !sheet.approvedAt);
    submittedPending.forEach((sheet) => {
      const employee = users.find((user) => user.id === sheet.employeeId);
      const daysOverdue = daysBetween(new Date(sheet.submittedAt), now) - 5;
      if (employee?.managerId && daysOverdue > 0) checks.push({ userId: employee.managerId, type: "Manager Approvals Pending", daysOverdue });
    });

    checks.forEach((check) => {
      const exists = escalations.find((item) => item.userId === check.userId && item.type === check.type && item.status === "Pending");
      if (!exists) {
        escalations.push({
          id: `esc-${escalations.length + 1}`,
          ...check,
          status: "Pending",
          triggeredAt: now.toISOString(),
          resolvedAt: null,
          resolvedBy: null,
          note: ""
        });
        notifications.push({
          id: `notif-esc-${notifications.length + 1}`,
          userId: "demo-admin",
          message: `Escalation triggered: ${check.type}`,
          isRead: false,
          createdAt: now.toISOString()
        });
      }
    });

    console.log("Ethereal preview URL: https://ethereal.email/message/demo-escalation-preview");
    return this.getEscalations();
  },

  getEscalations() {
    const rows = escalations.map((item) => {
      const user = users.find((user) => user.id === item.userId);
      return { ...item, userName: user?.name || "Unknown", userRole: user?.role || "Unknown" };
    });
    const summary = rows
      .filter((item) => item.status === "Pending")
      .reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {});
    return { escalations: rows, summary };
  },

  resolveEscalation(id, { note, resolvedBy }) {
    const escalation = escalations.find((item) => item.id === id);
    if (!escalation) return null;
    escalation.status = "Resolved";
    escalation.note = note || "";
    escalation.resolvedBy = resolvedBy;
    escalation.resolvedAt = new Date().toISOString();
    return escalation;
  },

  getNotifications(userId) {
    return notifications.filter((item) => item.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  markNotificationRead(id) {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return null;
    notification.isRead = true;
    return notification;
  },

  approveGoalSheet(goalSheetId, managerId) {
    const sheet = goalSheets.find((item) => item.id === goalSheetId);
    if (!sheet) return null;
    sheet.status = "Approved";
    sheet.approvedAt = new Date().toISOString();
    const manager = users.find((item) => item.id === managerId);
    notifications.push({
      id: `notif-approved-${notifications.length + 1}`,
      userId: sheet.employeeId,
      message: `Your goal sheet has been approved by ${manager?.name || "your manager"}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    console.log("Ethereal preview URL: https://ethereal.email/message/demo-goal-approval-preview");
    return sheet;
  },

  getAnalytics({ managerId, quarter = "Q1" } = {}) {
    const scopedGoals = goals.filter((goal) => {
      const employee = employeeForGoal(goal);
      return !managerId || employee?.managerId === managerId;
    });
    const thrustAreas = [...new Set(scopedGoals.map((goal) => goal.thrustArea))];
    const employees = users.filter((user) => user.role === "Employee" && (!managerId || user.managerId === managerId));

    const distribution = thrustAreas.map((area) => ({
      name: area,
      value: scopedGoals.filter((goal) => goal.thrustArea === area).length,
      averageWeightage: Math.round(scopedGoals.filter((goal) => goal.thrustArea === area).reduce((sum, goal) => sum + goal.weightage, 0) / scopedGoals.filter((goal) => goal.thrustArea === area).length)
    }));

    const heatmap = employees.map((employee) => {
      const sheet = goalSheets.find((item) => item.employeeId === employee.id);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        goals: goals
          .filter((goal) => goal.goalSheetId === sheet?.id)
          .map((goal) => {
            const achievement = achievements.find((item) => item.goalId === goal.id && item.quarter === quarter);
            return { goalId: goal.id, goalTitle: goal.title, quarter, score: achievement?.scorePercent ?? null, label: achievement?.scoreLabel || "Not Started" };
          })
      };
    });

    const trend = quarters.map((item) => {
      const scores = scopedGoals
        .map((goal) => achievements.find((achievement) => achievement.goalId === goal.id && achievement.quarter === item)?.scorePercent)
        .filter((score) => Number.isFinite(score));
      return { quarter: item, average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0 };
    });

    const completion = this.getCompletion({ managerId });
    const activeQuarter = windows.find((window) => window.isOpen)?.quarter || quarter;
    const card = completion.summaryCards.find((item) => item.quarter === activeQuarter) || completion.summaryCards[0];
    const completionRate = card?.total ? Math.round((card.completed / card.total) * 100) : 0;

    return { distribution, heatmap, trend, completionRate, activeQuarter };
  },

  reassignManager(userId, managerId, changedBy) {
    const user = users.find((item) => item.id === userId);
    if (!user) return null;
    const oldManager = user.managerId;
    user.managerId = managerId || null;
    addAuditLog({
      changedBy,
      entityType: "User",
      entityId: userId,
      fieldChanged: "Reporting manager",
      oldValue: users.find((item) => item.id === oldManager)?.name || "Unassigned",
      newValue: users.find((item) => item.id === managerId)?.name || "Unassigned",
      changeDescription: `Admin reassigned ${user.name}'s manager`
    });
    return publicUser(user);
  },

  searchGoals(search = "") {
    const term = search.toLowerCase();
    return goals
      .map((goal) => ({ ...goal, employee: publicUser(employeeForGoal(goal)) }))
      .filter((goal) => !term || goal.title.toLowerCase().includes(term) || goal.employee.name.toLowerCase().includes(term));
  },

  getOrg() {
    return users
      .filter((user) => user.role !== "Employee")
      .map((leader) => ({ ...publicUser(leader), reports: users.filter((user) => user.managerId === leader.id).map(publicUser) }));
  }
};
