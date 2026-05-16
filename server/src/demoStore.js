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
  status: "Approved",
  submittedAt: "2026-06-20T10:00:00.000Z",
  approvedAt: "2026-06-25T10:00:00.000Z"
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

  getAuditLogs({ from, to, employeeId } = {}) {
    return auditLogs.filter((log) => {
      const timestamp = new Date(log.changedAt).getTime();
      return (!from || timestamp >= new Date(from).getTime()) && (!to || timestamp <= new Date(to).getTime()) && (!employeeId || log.employeeId === employeeId);
    });
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
