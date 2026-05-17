const STORAGE_KEY = "atomquest_goal_portal_v1";
const SUPABASE_URL = "https://hfngakvgrdgvrjobjkqq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xT8G1-blk3XuOjjpBA8aoQ_NBte8p3B";
const SUPABASE_STATE_KEY = "atomquest-demo-state";
let supabaseClient = null;
let backendStatus = "Connecting to Supabase";
let syncTimer = null;
let currentAuthUser = null;

const seedState = {
  isAuthenticated: false,
  activeUserId: "u-emp-1",
  activeView: "dashboard",
  currentQuarter: "Q1",
  users: [
    { id: "u-emp-1", name: "Ananya Rao", email: "ananya@atomquest.com", role: "Employee", department: "Sales", managerId: "u-mgr-1" },
    { id: "u-emp-2", name: "Rohan Mehta", email: "rohan@atomquest.com", role: "Employee", department: "Operations", managerId: "u-mgr-1" },
    { id: "u-mgr-1", name: "Meera Nair", email: "meera@atomquest.com", role: "Manager", department: "Business", managerId: "u-admin-1" },
    { id: "u-admin-1", name: "HR Admin", email: "admin@atomquest.com", role: "Admin", department: "Human Resources", managerId: null }
  ],
  cycles: [
    { id: "cycle-2026", name: "FY 2026 Goal Cycle", status: "Open", goalOpen: "1 May", q1: "July", q2: "October", q3: "January", q4: "March / April" }
  ],
  goals: [
    {
      id: "g-1",
      employeeId: "u-emp-1",
      thrustArea: "Revenue Growth",
      title: "Grow enterprise revenue",
      description: "Increase revenue from enterprise accounts through renewal and upsell motion.",
      uomType: "min",
      target: "1200000",
      weightage: 40,
      status: "Approved",
      progressStatus: "On Track",
      sharedGroupId: null,
      primaryOwnerId: null,
      locked: true
    },
    {
      id: "g-2",
      employeeId: "u-emp-1",
      thrustArea: "Customer Success",
      title: "Improve renewal rate",
      description: "Raise portfolio renewal rate by improving health checks and sponsor engagement.",
      uomType: "min",
      target: "92",
      weightage: 35,
      status: "Approved",
      progressStatus: "On Track",
      sharedGroupId: null,
      primaryOwnerId: null,
      locked: true
    },
    {
      id: "g-3",
      employeeId: "u-emp-1",
      thrustArea: "Process Excellence",
      title: "Reduce quote turnaround time",
      description: "Reduce average turnaround time for approved quote requests.",
      uomType: "max",
      target: "24",
      weightage: 25,
      status: "Approved",
      progressStatus: "Not Started",
      sharedGroupId: null,
      primaryOwnerId: null,
      locked: true
    },
    {
      id: "g-4",
      employeeId: "u-emp-2",
      thrustArea: "Safety",
      title: "Zero critical incidents",
      description: "Maintain zero critical safety incidents through preventive controls.",
      uomType: "zero",
      target: "0",
      weightage: 50,
      status: "Submitted",
      progressStatus: "Not Started",
      sharedGroupId: "shared-safety",
      primaryOwnerId: "u-emp-2",
      locked: false
    },
    {
      id: "g-5",
      employeeId: "u-emp-2",
      thrustArea: "Operations",
      title: "Improve dispatch adherence",
      description: "Improve dispatch adherence across priority customer shipments.",
      uomType: "min",
      target: "96",
      weightage: 50,
      status: "Submitted",
      progressStatus: "On Track",
      sharedGroupId: null,
      primaryOwnerId: null,
      locked: false
    }
  ],
  checkins: [
    { id: "c-1", goalId: "g-1", employeeId: "u-emp-1", quarter: "Q1", actual: "550000", status: "On Track", managerComment: "Good start. Keep focus on two largest renewal accounts.", updatedAt: "2026-07-08" },
    { id: "c-2", goalId: "g-2", employeeId: "u-emp-1", quarter: "Q1", actual: "45", status: "On Track", managerComment: "Add weekly risk review for red accounts.", updatedAt: "2026-07-08" },
    { id: "c-3", goalId: "g-3", employeeId: "u-emp-1", quarter: "Q1", actual: "30", status: "Not Started", managerComment: "Needs process owner support.", updatedAt: "2026-07-08" }
  ],
  auditLogs: [
    { id: "a-1", actor: "HR Admin", action: "Cycle opened", subject: "FY 2026 Goal Cycle", before: "-", after: "Open", at: "2026-05-01 09:00" },
    { id: "a-2", actor: "Meera Nair", action: "Approved goals", subject: "Ananya Rao", before: "Submitted", after: "Approved and locked", at: "2026-05-04 14:20" }
  ],
  notifications: [
    { id: "n-1", userId: "u-emp-1", type: "Reminder", message: "Q1 check-in window is active for July - please update your achievements.", isRead: false, createdAt: "2026-07-01 09:00" },
    { id: "n-2", userId: "u-mgr-1", type: "Approval", message: "Rohan Mehta has submitted their goal sheet for your approval.", isRead: false, createdAt: "2026-05-06 11:30" },
    { id: "n-3", userId: "u-admin-1", type: "Escalation", message: "Two SLA risks are active in the escalation dashboard.", isRead: false, createdAt: "2026-05-10 08:30" }
  ],
  escalations: [
    { id: "e-1", userId: "u-emp-2", type: "Manager approval pending", triggeredAt: "2026-05-11", resolvedAt: null, resolvedBy: null, note: "", status: "Pending", sourceKey: "approval-u-emp-2" },
    { id: "e-2", userId: "u-emp-1", type: "Quarterly achievement pending", triggeredAt: "2026-07-08", resolvedAt: null, resolvedBy: null, note: "", status: "Pending", sourceKey: "achievement-u-emp-1-Q1" }
  ],
  darkMode: false,
  integrations: [
    { id: "i-1", name: "Microsoft Entra ID SSO", status: "Ready for configuration" },
    { id: "i-2", name: "Email notifications", status: "Template workflow enabled" },
    { id: "i-3", name: "Microsoft Teams reminders", status: "Webhook placeholder enabled" }
  ]
};

let state = loadState();
let chartInstances = [];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedState);
  try {
    return { ...structuredClone(seedState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueSupabaseSync();
}

async function initSupabase() {
  if (!window.supabase) {
    backendStatus = "Supabase library not loaded";
    render();
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentAuthUser = null;
      state.isAuthenticated = false;
      render();
    }
  });
  await hydrateFromSupabase();

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    await activateSupabaseUser(data.session.user);
  }
}

async function hydrateFromSupabase() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("app_state")
    .select("state")
    .eq("id", SUPABASE_STATE_KEY)
    .maybeSingle();

  if (error) {
    backendStatus = "Supabase needs schema setup";
    render();
    return;
  }

  if (data?.state) {
    state = { ...structuredClone(seedState), ...data.state };
    state.isAuthenticated = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    backendStatus = "Supabase connected";
    render();
    return;
  }

  backendStatus = "Supabase connected";
  await syncStateToSupabase();
  render();
}

function mapProfileToUser(profile) {
  return {
    id: profile.id,
    name: profile.full_name || profile.email,
    email: profile.email,
    role: profile.role,
    department: profile.department || "General",
    managerId: profile.manager_id || null
  };
}

async function loadProfilesFromSupabase() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,full_name,role,department,manager_id")
    .order("full_name", { ascending: true });

  if (error) {
    backendStatus = "Profiles table needs setup";
    return false;
  }

  if (data?.length) {
    state.users = data.map(mapProfileToUser);
  }

  return true;
}

async function activateSupabaseUser(authUser) {
  currentAuthUser = authUser;
  let { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id,email,full_name,role,department,manager_id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    backendStatus = "Profiles table needs setup";
    state.isAuthenticated = false;
    return { ok: false, message: "Profile table is not ready. Run the updated Supabase SQL first." };
  }

  if (!profile) {
    state.isAuthenticated = false;
    return { ok: false, message: "Login blocked. This account exists in Auth but has not been added to the Admin-managed profiles table." };
  }

  await loadProfilesFromSupabase();
  if (!state.users.some((user) => user.id === profile.id)) {
    state.users.push(mapProfileToUser(profile));
  }

  state.isAuthenticated = true;
  state.activeUserId = profile.id;
  state.activeView = "dashboard";
  backendStatus = "Supabase auth connected";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  return { ok: true };
}

function queueSupabaseSync() {
  if (!supabaseClient) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncStateToSupabase, 350);
}

async function syncStateToSupabase() {
  if (!supabaseClient) return;
  const persistedState = { ...state, isAuthenticated: false };
  const { error } = await supabaseClient.from("app_state").upsert({
    id: SUPABASE_STATE_KEY,
    state: persistedState,
    updated_at: new Date().toISOString()
  });

  backendStatus = error ? "Supabase sync failed" : "Supabase synced";
  render();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function currentUser() {
  return state.users.find((user) => user.id === state.activeUserId) || state.users[0];
}

function ensureDemoDataset() {
  seedState.users.forEach((seedUser) => {
    if (!state.users.some((user) => user.id === seedUser.id || user.email?.toLowerCase() === seedUser.email.toLowerCase())) {
      state.users.push(structuredClone(seedUser));
    }
  });
  if (!state.goals?.length) state.goals = structuredClone(seedState.goals);
  if (!state.checkins?.length) state.checkins = structuredClone(seedState.checkins);
  if (!state.auditLogs?.length) state.auditLogs = structuredClone(seedState.auditLogs);
  if (!state.notifications?.length) state.notifications = structuredClone(seedState.notifications);
  if (!state.cycles?.length) state.cycles = structuredClone(seedState.cycles);
  if (!state.escalations?.length) state.escalations = structuredClone(seedState.escalations);
  if (!state.integrations?.length) state.integrations = structuredClone(seedState.integrations);
  if (typeof state.darkMode !== "boolean") state.darkMode = false;
  state.notifications = state.notifications.map((item) => ({
    id: item.id || uid("notification"),
    userId: item.userId || state.activeUserId || "u-admin-1",
    type: item.type || "Reminder",
    message: item.message || item.trigger || "Portal notification",
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt || new Date().toLocaleString()
  }));
  state.escalations = state.escalations.map((item) => ({
    id: item.id || uid("escalation"),
    userId: item.userId || "u-admin-1",
    type: item.type || item.trigger || "Escalation",
    triggeredAt: item.triggeredAt || new Date().toISOString().slice(0, 10),
    resolvedAt: item.resolvedAt || null,
    resolvedBy: item.resolvedBy || null,
    note: item.note || "",
    status: item.status === "Resolved" ? "Resolved" : "Pending",
    sourceKey: item.sourceKey || item.id || uid("source")
  }));
}

function userName(id) {
  return state.users.find((user) => user.id === id)?.name || "Unknown";
}

function roleViews(role) {
  if (role === "Employee") return ["dashboard", "goals", "checkins", "reports"];
  if (role === "Manager") return ["dashboard", "approvals", "team", "shared", "analytics", "reports"];
  return ["dashboard", "admin", "escalations", "analytics", "shared", "reports", "audit"];
}

function viewLabel(view) {
  return {
    dashboard: "Dashboard",
    goals: "Goal Sheet",
    checkins: "Check-ins",
    approvals: "Approvals",
    team: "Team Progress",
    shared: "Shared Goals",
    reports: "Reports",
    admin: "Admin Console",
    escalations: "Escalations",
    analytics: "Analytics",
    audit: "Audit Trail"
  }[view] || view;
}

function ensureAllowedView() {
  const allowed = roleViews(currentUser().role);
  if (!allowed.includes(state.activeView)) state.activeView = allowed[0];
}

function enforceRoleAccess(expectedRole, user) {
  if (!expectedRole) return true;
  if (expectedRole === "Manager" && user.role === "Manager") return true;
  if (expectedRole === "Admin" && user.role === "Admin") return true;
  return user.role === expectedRole;
}

function setView(view) {
  state.activeView = view;
  saveState();
  render();
}

function setUser(userId) {
  state.activeUserId = userId;
  ensureAllowedView();
  saveState();
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function goalsForEmployee(employeeId) {
  return state.goals.filter((goal) => goal.employeeId === employeeId);
}

function teamMembers(managerId) {
  return state.users.filter((user) => user.managerId === managerId && user.role === "Employee");
}

function totalWeightage(employeeId) {
  return goalsForEmployee(employeeId).reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
}

function getCheckin(goalId, quarter = state.currentQuarter) {
  return state.checkins.find((checkin) => checkin.goalId === goalId && checkin.quarter === quarter);
}

function progressScore(goal, actualValue) {
  const actual = Number(actualValue);
  const target = Number(goal.target);
  if (actualValue === "" || actualValue == null) return 0;
  if (goal.uomType === "zero") return actual === 0 ? 100 : 0;
  if (goal.uomType === "timeline") return actual <= target ? 100 : Math.max(0, Math.round((target / actual) * 100));
  if (!target || !actual) return 0;
  if (goal.uomType === "max") return Math.min(150, Math.round((target / actual) * 100));
  return Math.min(150, Math.round((actual / target) * 100));
}

function averageScore(goals) {
  const scored = goals
    .map((goal) => {
      const checkin = getCheckin(goal.id);
      return checkin ? progressScore(goal, checkin.actual) : null;
    })
    .filter((score) => score !== null);
  return scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : 0;
}

function scopedEmployees(user) {
  if (user.role === "Employee") return [user];
  if (user.role === "Manager") return teamMembers(user.id);
  return state.users.filter((item) => item.role === "Employee");
}

function scopedGoals(user) {
  const employeeIds = scopedEmployees(user).map((employee) => employee.id);
  return state.goals.filter((goal) => employeeIds.includes(goal.employeeId));
}

function daysBetween(dateString, now = new Date()) {
  const then = new Date(dateString);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((now - then) / 86400000));
}

function unreadNotifications(userId = state.activeUserId) {
  return state.notifications.filter((item) => item.userId === userId && !item.isRead);
}

function addNotification(userId, type, message) {
  if (!userId) return;
  state.notifications.unshift({
    id: uid("notification"),
    userId,
    type,
    message,
    isRead: false,
    createdAt: new Date().toLocaleString()
  });
}

function logDemoEmail(to, subject, body) {
  const previewId = Math.random().toString(36).slice(2, 10);
  console.log(`[Ethereal demo email preview] https://ethereal.email/message/${previewId}`);
  console.log({ to, subject, body });
}

function addEscalation(userId, type, triggeredAt, sourceKey) {
  const existing = state.escalations.find((item) => item.sourceKey === sourceKey && item.status === "Pending");
  if (existing) return false;
  state.escalations.unshift({
    id: uid("escalation"),
    userId,
    type,
    triggeredAt,
    resolvedAt: null,
    resolvedBy: null,
    note: "",
    status: "Pending",
    sourceKey
  });
  return true;
}

function runEscalationCheck() {
  const now = new Date();
  const cycleOpen = new Date("2026-05-01T00:00:00");
  let created = 0;
  state.users.filter((user) => user.role === "Employee").forEach((employee) => {
    const employeeGoals = goalsForEmployee(employee.id);
    const hasSubmitted = employeeGoals.some((goal) => ["Submitted", "Approved"].includes(goal.status));
    if (!hasSubmitted && daysBetween(cycleOpen, now) > 7) {
      if (addEscalation(employee.id, "Goal sheet overdue", "2026-05-08", `goal-sheet-${employee.id}`)) created += 1;
    }

    const submittedPending = employeeGoals.some((goal) => goal.status === "Submitted");
    if (submittedPending) {
      if (addEscalation(employee.managerId || employee.id, "Manager approval pending", "2026-05-06", `approval-${employee.id}`)) created += 1;
    }

    const approvedGoals = employeeGoals.filter((goal) => goal.status === "Approved");
    const missingAchievements = approvedGoals.some((goal) => !getCheckin(goal.id, state.currentQuarter));
    if (missingAchievements && ["Q1", "Q2", "Q3", "Q4"].includes(state.currentQuarter)) {
      if (addEscalation(employee.id, "Quarterly achievement pending", new Date().toISOString().slice(0, 10), `achievement-${employee.id}-${state.currentQuarter}`)) created += 1;
    }
  });

  state.users.filter((user) => user.role === "Manager").forEach((manager) => {
    const teamGoals = scopedGoals(manager).filter((goal) => goal.status === "Approved");
    const missingComments = teamGoals.some((goal) => !getCheckin(goal.id, state.currentQuarter)?.managerComment);
    if (missingComments) {
      if (addEscalation(manager.id, "Manager check-in comment pending", new Date().toISOString().slice(0, 10), `manager-checkin-${manager.id}-${state.currentQuarter}`)) created += 1;
    }
  });

  if (created) addNotification(state.users.find((user) => user.role === "Admin")?.id, "Escalation", `${created} new escalation item(s) were detected.`);
  logAudit(state.activeUserId, "Ran escalation check", "Escalation Engine", "-", `${created} created`);
  saveState();
  return created;
}

function roleSummary(user) {
  if (user.role === "Employee") return "Create and submit goals, update quarterly achievements, review manager feedback, and track locked approved goals.";
  if (user.role === "Manager") return "Approve or return team goals, tune targets and weightages, run quarterly check-ins, and monitor planned vs actual progress.";
  return "Manage users, hierarchy, cycles, escalations, audit trails, analytics, reporting, and exception unlocks.";
}

function goalValidation(employeeId) {
  const goals = goalsForEmployee(employeeId);
  const errors = [];
  if (goals.length > 8) errors.push("Maximum 8 goals are allowed.");
  if (goals.some((goal) => Number(goal.weightage) < 10)) errors.push("Each goal must have at least 10% weightage.");
  if (totalWeightage(employeeId) !== 100) errors.push("Total goal weightage must equal 100%.");
  return errors;
}

function statusPill(status) {
  const kind = status === "Approved" || status === "Completed" ? "success" : status === "Returned" ? "danger" : "warning";
  return `<span class="pill ${kind}">${escapeHtml(status)}</span>`;
}

function logAudit(actorId, action, subject, before, after) {
  state.auditLogs.unshift({
    id: uid("audit"),
    actor: userName(actorId),
    action,
    subject,
    before,
    after,
    at: new Date().toLocaleString()
  });
}

function render() {
  document.body.classList.toggle("dark", Boolean(state.darkMode));
  if (!state.isAuthenticated) {
    renderLogin();
    return;
  }

  ensureAllowedView();
  const user = currentUser();
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <h1>AtomQuest</h1>
          <span>Goal Setting & Tracking Portal</span>
        </div>
        <div class="role-panel">
          <label>Signed in as</label>
          <div class="signed-in-user">
            <strong>${escapeHtml(user.name)}</strong>
            <span>${escapeHtml(user.email || "")}</span>
          </div>
        </div>
        <nav class="nav">
          ${roleViews(user.role).map((view) => `<button class="${state.activeView === view ? "active" : ""}" data-view="${view}">${viewLabel(view)}</button>`).join("")}
        </nav>
        <div class="notice">
          <strong>${escapeHtml(user.role)}</strong><br>
          ${escapeHtml(user.department)}<br>
          Active quarter: ${state.currentQuarter}
        </div>
      </aside>
      <main class="main">
        ${renderTopbar(user)}
        <div class="page-transition">${renderActiveView(user)}</div>
      </main>
    </div>
  `;
  bindBaseEvents();
  setTimeout(renderChartsForActiveView, 0);
}

function renderLogin() {
  const roleCards = [
    { role: "Employee", copy: "Create goals, submit for approval, update quarterly achievements." },
    { role: "Manager", copy: "Review team goal sheets, approve/rework, run check-ins." },
    { role: "Admin", copy: "Control users, hierarchy, cycles, audit, reports, escalations." }
  ];
  document.getElementById("app").innerHTML = `
    <main class="login-page">
      <section class="login-hero">
        <div>
          <span class="pill success">Supabase-backed demo</span>
          <h1>AtomQuest</h1>
          <p>Goal Setting & Tracking Portal for employee goals, manager approvals, quarterly check-ins, and HR governance.</p>
        </div>
        <div class="login-samples">
          <strong>Role-based access</strong>
          <span>Only users present in the Admin-managed profile database can enter.</span>
          <span>No public signup or self-service role changes are exposed.</span>
        </div>
      </section>
      <section class="login-card">
        <h2>Sign in</h2>
        <p>Select the access lane for your assigned role, then use a backend-created account.</p>
        <div class="role-choice" id="loginRoleChoice">
          ${roleCards.map((item) => `<button type="button" data-login-role="${item.role}" class="${item.role === "Employee" ? "active" : ""}"><strong>${item.role}</strong><span>${item.copy}</span></button>`).join("")}
        </div>
        <form id="loginForm" class="grid" autocomplete="on">
          <input type="hidden" name="role" value="Employee">
          <div class="field">
            <label>Email ID</label>
            <input class="input" type="email" name="email" placeholder="name@company.com" required>
          </div>
          <div class="field">
            <label>Password</label>
            <input class="input" type="password" name="password" placeholder="Enter password" required>
          </div>
          <button class="btn primary" type="submit">Login</button>
          <div id="loginError" class="notice danger hidden"></div>
        </form>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-login-role]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-login-role]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector("[name='role']").value = button.dataset.loginRole;
  }));

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const expectedRole = String(form.get("role"));
    const errorBox = document.getElementById("loginError");
    const button = event.currentTarget.querySelector("button[type='submit']");

    if (!supabaseClient) {
      errorBox.textContent = "Supabase is still connecting. Please wait a moment and try again.";
      errorBox.classList.remove("hidden");
      return;
    }

    button.disabled = true;
    button.textContent = "Logging in...";
    errorBox.classList.add("hidden");

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        errorBox.textContent = error?.message || "Invalid email ID or password.";
        errorBox.classList.remove("hidden");
        button.disabled = false;
        button.textContent = "Login";
        return;
      }

      const result = await activateSupabaseUser(data.user);
      if (!result.ok) {
        const visibleErrorBox = document.getElementById("loginError") || errorBox;
        visibleErrorBox.textContent = result.message;
        visibleErrorBox.classList.remove("hidden");
        await supabaseClient.auth.signOut();
        button.disabled = false;
        button.textContent = "Login";
        return;
      }

      const signedIn = currentUser();
      if (!enforceRoleAccess(expectedRole, signedIn)) {
        errorBox.textContent = `This user is assigned as ${signedIn.role}, not ${expectedRole}.`;
        errorBox.classList.remove("hidden");
        await supabaseClient.auth.signOut();
        state.isAuthenticated = false;
        saveState();
        button.disabled = false;
        button.textContent = "Login";
      }
    } catch (loginError) {
      errorBox.textContent = loginError.message || "Login failed. Please check your Supabase setup.";
      errorBox.classList.remove("hidden");
      button.disabled = false;
      button.textContent = "Login";
    }
  });

}

function renderTopbar(user) {
  const unread = unreadNotifications(user.id).length;
  return `
    <div class="topbar">
      <div>
        <h2>${viewLabel(state.activeView)}</h2>
        <p>Welcome, ${escapeHtml(user.name)}. Manage goals, approvals, check-ins, reporting, and governance from one workspace.</p>
      </div>
      <div class="actions">
        <span class="pill ${backendStatus.includes("failed") || backendStatus.includes("needs") || backendStatus.includes("not") ? "danger" : "success"}">${escapeHtml(backendStatus)}</span>
        <div class="notification-wrap">
          <button class="icon-btn" id="notificationBell" title="Notifications">Bell${unread ? `<span>${unread}</span>` : ""}</button>
          <div class="notification-menu hidden" id="notificationMenu">
            <strong>Notifications</strong>
            ${renderNotificationItems(user.id)}
          </div>
        </div>
        <button class="btn" id="darkToggle">${state.darkMode ? "Light mode" : "Dark mode"}</button>
        <select id="quarterSwitch" class="select">
          ${["Q1", "Q2", "Q3", "Q4"].map((q) => `<option value="${q}" ${q === state.currentQuarter ? "selected" : ""}>${q}</option>`).join("")}
        </select>
        <button class="btn" id="resetDemo">Reset portal data</button>
        <button class="btn danger" id="logout">Logout</button>
      </div>
    </div>
  `;
}

function renderNotificationItems(userId) {
  const items = state.notifications.filter((item) => item.userId === userId).slice(0, 6);
  if (!items.length) return `<div class="empty compact">No notifications.</div>`;
  return items.map((item) => `
    <button class="notification-item ${item.isRead ? "" : "unread"}" data-read-notification="${item.id}">
      <span>${escapeHtml(item.message)}</span>
      <small>${escapeHtml(item.createdAt)}</small>
    </button>
  `).join("");
}

function renderActiveView(user) {
  if (state.activeView === "dashboard") return renderDashboard(user);
  if (state.activeView === "goals") return renderGoalSheet(user);
  if (state.activeView === "checkins") return renderEmployeeCheckins(user);
  if (state.activeView === "approvals") return renderApprovals(user);
  if (state.activeView === "team") return renderTeamProgress(user);
  if (state.activeView === "shared") return renderSharedGoals(user);
  if (state.activeView === "reports") return renderReports(user);
  if (state.activeView === "admin") return renderAdmin(user);
  if (state.activeView === "escalations") return renderEscalations();
  if (state.activeView === "analytics") return renderAnalytics(user);
  if (state.activeView === "audit") return renderAudit();
  return "";
}

function renderDashboard(user) {
  const employeeIds = user.role === "Employee" ? [user.id] : user.role === "Manager" ? teamMembers(user.id).map((member) => member.id) : state.users.filter((item) => item.role === "Employee").map((item) => item.id);
  const goals = state.goals.filter((goal) => employeeIds.includes(goal.employeeId));
  const approved = goals.filter((goal) => goal.status === "Approved").length;
  const submitted = goals.filter((goal) => goal.status === "Submitted").length;
  const checkinsDone = goals.filter((goal) => getCheckin(goal.id)).length;
  const completion = goals.length ? Math.round((checkinsDone / goals.length) * 100) : 0;
  const score = averageScore(goals);
  return `
    <section class="stats">
      <div class="stat"><strong>${goals.length}</strong><span>Total goals</span></div>
      <div class="stat"><strong>${approved}</strong><span>Approved goals</span></div>
      <div class="stat"><strong>${submitted}</strong><span>Pending approvals</span></div>
      <div class="stat"><strong>${score}%</strong><span>Average progress score</span></div>
    </section>
    <section class="panel dashboard-hero">
      <div>
        <span class="pill success">${escapeHtml(user.role)} Dashboard</span>
        <h3>${escapeHtml(roleSummary(user))}</h3>
        <p>Protected route access is derived from the role stored against the authenticated profile. Cross-role screens are hidden and reset automatically.</p>
      </div>
      <div class="metric-ring" style="--value:${completion}"><strong>${completion}%</strong><span>${state.currentQuarter} check-in completion</span></div>
    </section>
    <section class="grid two">
      <div class="panel">
        <h3>Cycle Schedule</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Period</th><th>Window</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td>Goal Setting</td><td>1 May</td><td>Create, submit, approve</td></tr>
              <tr><td>Q1</td><td>July</td><td>Planned vs actual update</td></tr>
              <tr><td>Q2</td><td>October</td><td>Quarterly progress review</td></tr>
              <tr><td>Q3</td><td>January</td><td>Quarterly progress review</td></tr>
              <tr><td>Q4 / Annual</td><td>March / April</td><td>Final achievement capture</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h3>Current Alerts</h3>
        <div class="goal-list">
          ${state.notifications.filter((item) => item.userId === user.id).slice(0, 3).map((item) => `<div class="notice warning"><strong>${escapeHtml(item.type)}</strong><br>${escapeHtml(item.message)}<br><span class="footer-note">${escapeHtml(item.createdAt)}</span></div>`).join("") || `<div class="empty compact">No alerts for your role.</div>`}
          ${goalValidation(user.role === "Employee" ? user.id : "u-emp-2").length ? `<div class="notice danger">${goalValidation(user.role === "Employee" ? user.id : "u-emp-2").join("<br>")}</div>` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderGoalSheet(user) {
  const goals = goalsForEmployee(user.id);
  const errors = goalValidation(user.id);
  const canSubmit = goals.length > 0 && errors.length === 0 && goals.some((goal) => goal.status === "Draft" || goal.status === "Returned");
  return `
    <section class="grid">
      <div class="panel">
        <h3>Create Goal</h3>
        ${errors.length ? `<div class="notice danger">${errors.map(escapeHtml).join("<br>")}</div>` : `<div class="notice">Goal sheet is valid when total weightage equals 100%, every goal is at least 10%, and max count is 8.</div>`}
        <form id="goalForm" class="grid" autocomplete="off">
          <div class="form-row">
            <div class="field span-3"><label>Thrust Area</label><input class="input" name="thrustArea" required></div>
            <div class="field span-3"><label>Goal Title</label><input class="input" name="title" required></div>
            <div class="field span-2"><label>UoM</label><select class="select" name="uomType"><option value="min">Numeric / % Min</option><option value="max">Numeric / % Max</option><option value="timeline">Timeline</option><option value="zero">Zero-based</option></select></div>
            <div class="field span-2"><label>Target</label><input class="input" name="target" required></div>
            <div class="field span-2"><label>Weightage</label><input class="input" name="weightage" type="number" min="10" max="100" required></div>
            <div class="field span-12"><label>Description</label><textarea class="textarea" name="description" required></textarea></div>
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">Add goal</button>
            <button class="btn secondary" type="button" id="submitGoals" ${canSubmit ? "" : "disabled"}>Submit to manager</button>
          </div>
        </form>
      </div>
      <div class="panel">
        <h3>Your Goal Sheet</h3>
        <p class="footer-note">Total weightage: ${totalWeightage(user.id)}% | Goal count: ${goals.length}/8</p>
        ${renderGoalCards(goals, { employeeMode: true })}
      </div>
    </section>
  `;
}

function renderGoalCards(goals, options = {}) {
  if (!goals.length) return `<div class="empty">No goals yet.</div>`;
  return `<div class="goal-list">${goals.map((goal) => {
    const checkin = getCheckin(goal.id);
    const score = checkin ? progressScore(goal, checkin.actual) : 0;
    return `
      <article class="goal-card ${goal.sharedGroupId ? "shared" : ""}">
        <div class="goal-head">
          <div>
            <h4>${escapeHtml(goal.title)}</h4>
            <p>${escapeHtml(goal.description)}</p>
          </div>
          ${statusPill(goal.status)}
        </div>
        <div class="meta">
          <span class="pill">${escapeHtml(goal.thrustArea)}</span>
          <span class="pill">UoM: ${escapeHtml(goal.uomType)}</span>
          <span class="pill">Target: ${escapeHtml(goal.target)}</span>
          <span class="pill">Weightage: ${goal.weightage}%</span>
          ${goal.sharedGroupId ? `<span class="pill">Shared KPI</span>` : ""}
          ${goal.locked ? `<span class="pill success">Locked</span>` : ""}
        </div>
        <div class="progress"><span style="width:${Math.min(score, 100)}%"></span></div>
        <div class="footer-note">${state.currentQuarter} score: ${score}% ${checkin ? `| Actual: ${escapeHtml(checkin.actual)} | ${escapeHtml(checkin.status)}` : "| No check-in entered"}</div>
        ${renderGoalActions(goal, options)}
      </article>
    `;
  }).join("")}</div>`;
}

function renderGoalActions(goal, options) {
  if (options.employeeMode && goal.sharedGroupId && !goal.locked && goal.status !== "Submitted") {
    return `
      <div class="form-row">
        <div class="field span-3"><label>Recipient Weightage</label><input class="input" type="number" min="10" max="100" data-shared-weight="${goal.id}" value="${goal.weightage}"></div>
        <div class="field span-9"><label>Read-only shared KPI</label><input class="input" value="Title and target are controlled by the shared goal owner" readonly></div>
      </div>
      <div class="actions"><button class="btn primary" data-save-shared-weight="${goal.id}">Save weightage</button></div>
    `;
  }
  if (options.employeeMode && !goal.locked && goal.status !== "Submitted") {
    return `<div class="actions"><button class="btn danger" data-delete-goal="${goal.id}">Delete</button></div>`;
  }
  if (options.managerMode && goal.status === "Submitted") {
    return `
      <div class="form-row">
        <div class="field span-3"><label>Target</label><input class="input" data-manager-target="${goal.id}" value="${escapeHtml(goal.target)}"></div>
        <div class="field span-3"><label>Weightage</label><input class="input" type="number" data-manager-weight="${goal.id}" value="${goal.weightage}"></div>
        <div class="field span-6"><label>Return comment</label><input class="input" data-return-comment="${goal.id}" placeholder="Required only when returning"></div>
      </div>
      <div class="actions">
        <button class="btn primary" data-approve-goal="${goal.id}">Approve</button>
        <button class="btn warning" data-return-goal="${goal.id}">Return for rework</button>
      </div>
    `;
  }
  if (options.adminMode && goal.locked) {
    return `<div class="actions"><button class="btn warning" data-unlock-goal="${goal.id}">Unlock goal</button></div>`;
  }
  return "";
}

function renderEmployeeCheckins(user) {
  const approvedGoals = goalsForEmployee(user.id).filter((goal) => goal.status === "Approved");
  return `
    <section class="panel">
      <h3>${state.currentQuarter} Achievement Capture</h3>
      <div class="notice">Enter actual achievement and progress status for approved goals. Scores are for tracking only, not performance ratings.</div>
      <div class="goal-list">
        ${approvedGoals.length ? approvedGoals.map((goal) => renderCheckinForm(goal, false)).join("") : `<div class="empty">No approved goals are ready for check-in.</div>`}
      </div>
    </section>
  `;
}

function renderCheckinForm(goal, managerMode) {
  const checkin = getCheckin(goal.id) || {};
  const score = progressScore(goal, checkin.actual);
  return `
    <article class="goal-card">
      <div class="goal-head">
        <div>
          <h4>${escapeHtml(goal.title)}</h4>
          <p>Employee: ${escapeHtml(userName(goal.employeeId))} | Planned target: ${escapeHtml(goal.target)}</p>
        </div>
        <span class="pill">${score}% score</span>
      </div>
      <div class="form-row">
        <div class="field span-3"><label>Actual Achievement</label><input class="input" data-actual="${goal.id}" value="${escapeHtml(checkin.actual || "")}"></div>
        <div class="field span-3"><label>Status</label><select class="select" data-progress-status="${goal.id}">
          ${["Not Started", "On Track", "Completed"].map((status) => `<option ${status === (checkin.status || goal.progressStatus) ? "selected" : ""}>${status}</option>`).join("")}
        </select></div>
        <div class="field span-6"><label>Manager Comment</label><input class="input" data-manager-comment="${goal.id}" value="${escapeHtml(checkin.managerComment || "")}" ${managerMode ? "" : "readonly"}></div>
      </div>
      <div class="actions">
        <button class="btn primary" data-save-checkin="${goal.id}">${managerMode ? "Save check-in comment" : "Save achievement"}</button>
      </div>
    </article>
  `;
}

function renderApprovals(user) {
  const members = teamMembers(user.id);
  const submitted = state.goals.filter((goal) => members.some((member) => member.id === goal.employeeId) && goal.status === "Submitted");
  return `
    <section class="panel">
      <h3>Goal Approval Queue</h3>
      ${submitted.length ? submitted.map((goal) => `
        <div class="card">
          <h3>${escapeHtml(userName(goal.employeeId))}</h3>
          ${renderGoalCards([goal], { managerMode: true })}
        </div>
      `).join("") : `<div class="empty">No goal sheets are waiting for approval.</div>`}
    </section>
  `;
}

function renderTeamProgress(user) {
  const members = teamMembers(user.id);
  const goals = state.goals.filter((goal) => members.some((member) => member.id === goal.employeeId));
  return `
    <section class="panel">
      <h3>Planned vs Actual</h3>
      <div class="goal-list">
        ${goals.filter((goal) => goal.status === "Approved").map((goal) => renderCheckinForm(goal, true)).join("") || `<div class="empty">No approved team goals yet.</div>`}
      </div>
    </section>
  `;
}

function renderSharedGoals(user) {
  const employees = state.users.filter((item) => item.role === "Employee");
  return `
    <section class="grid">
      <div class="panel">
        <h3>Push Departmental KPI</h3>
        <form id="sharedGoalForm" class="grid">
          <div class="form-row">
            <div class="field span-3"><label>Primary Owner</label><select class="select" name="primaryOwnerId">${employees.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></div>
            <div class="field span-3"><label>Thrust Area</label><input class="input" name="thrustArea" required></div>
            <div class="field span-3"><label>Goal Title</label><input class="input" name="title" required></div>
            <div class="field span-3"><label>Target</label><input class="input" name="target" required></div>
            <div class="field span-3"><label>UoM</label><select class="select" name="uomType"><option value="min">Numeric / % Min</option><option value="max">Numeric / % Max</option><option value="timeline">Timeline</option><option value="zero">Zero-based</option></select></div>
            <div class="field span-3"><label>Default Weightage</label><input class="input" name="weightage" type="number" min="10" max="100" value="10" required></div>
            <div class="field span-6"><label>Assign To</label><select class="select" name="assignees" multiple size="3">${employees.map((item) => `<option value="${item.id}" selected>${escapeHtml(item.name)}</option>`).join("")}</select></div>
            <div class="field span-12"><label>Description</label><textarea class="textarea" name="description" required></textarea></div>
          </div>
          <button class="btn primary" type="submit">Push shared goal</button>
        </form>
      </div>
      <div class="panel">
        <h3>Shared Goal Assignments</h3>
        ${renderGoalCards(state.goals.filter((goal) => goal.sharedGroupId), { adminMode: user.role === "Admin" })}
      </div>
    </section>
  `;
}

function renderReports() {
  const rows = state.goals.map((goal) => {
    const checkin = getCheckin(goal.id);
    return {
      employee: userName(goal.employeeId),
      department: state.users.find((user) => user.id === goal.employeeId)?.department || "",
      goal: goal.title,
      thrustArea: goal.thrustArea,
      target: goal.target,
      actual: checkin?.actual || "",
      quarter: state.currentQuarter,
      status: checkin?.status || goal.status,
      score: checkin ? progressScore(goal, checkin.actual) : 0
    };
  });
  const departments = [...new Set(rows.map((row) => row.department || "General"))];
  const statusGroups = ["Approved", "Submitted", "Draft", "Returned", "Completed", "On Track", "Not Started"];
  const thrustAreas = [...new Set(state.goals.map((goal) => goal.thrustArea))];
  const managers = state.users.filter((item) => item.role === "Manager");
  return `
    <section class="stats">
      <div class="stat"><strong>${averageScore(state.goals)}%</strong><span>Achievement report score</span></div>
      <div class="stat"><strong>${state.goals.filter((goal) => goal.status === "Approved").length}</strong><span>Approved goals</span></div>
      <div class="stat"><strong>${state.auditLogs.length}</strong><span>Audit events</span></div>
      <div class="stat"><strong>${state.goals.filter((goal) => goal.sharedGroupId).length}</strong><span>Shared KPI links</span></div>
    </section>
    <section class="grid two">
      <div class="panel">
        <h3>Team Performance Heatmap</h3>
        <div class="heatmap">
          ${departments.map((department) => {
            const deptGoals = state.goals.filter((goal) => (state.users.find((item) => item.id === goal.employeeId)?.department || "General") === department);
            const deptScore = averageScore(deptGoals);
            return `<div class="heat-cell" style="--heat:${deptScore}"><strong>${escapeHtml(department)}</strong><span>${deptScore}%</span></div>`;
          }).join("")}
        </div>
      </div>
      <div class="panel">
        <h3>Goal Distribution Analysis</h3>
        <div class="bar-list">
          ${thrustAreas.map((area) => {
            const count = state.goals.filter((goal) => goal.thrustArea === area).length;
            const width = Math.max(8, Math.round((count / Math.max(state.goals.length, 1)) * 100));
            return `<div><span>${escapeHtml(area)} (${count})</span><div class="progress"><span style="width:${width}%"></span></div></div>`;
          }).join("")}
        </div>
      </div>
      <div class="panel">
        <h3>Completion Dashboard</h3>
        <div class="bar-list">
          ${statusGroups.map((status) => {
            const count = state.goals.filter((goal) => goal.status === status || goal.progressStatus === status).length;
            const width = Math.max(4, Math.round((count / Math.max(state.goals.length, 1)) * 100));
            return `<div><span>${escapeHtml(status)} (${count})</span><div class="progress"><span style="width:${width}%"></span></div></div>`;
          }).join("")}
        </div>
      </div>
      <div class="panel">
        <h3>Manager Effectiveness</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Manager</th><th>Team</th><th>Approval Queue</th><th>Team Score</th></tr></thead>
            <tbody>
              ${managers.map((manager) => {
                const members = teamMembers(manager.id);
                const memberIds = members.map((member) => member.id);
                const teamGoals = state.goals.filter((goal) => memberIds.includes(goal.employeeId));
                return `<tr><td>${escapeHtml(manager.name)}</td><td>${members.length}</td><td>${teamGoals.filter((goal) => goal.status === "Submitted").length}</td><td>${averageScore(teamGoals)}%</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <button class="btn primary" id="exportCsv">Export CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Department</th><th>Goal</th><th>Planned Target</th><th>Actual</th><th>Quarter</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.employee)}</td><td>${escapeHtml(row.department)}</td><td>${escapeHtml(row.goal)}</td><td>${escapeHtml(row.target)}</td><td>${escapeHtml(row.actual)}</td><td>${row.quarter}</td><td>${escapeHtml(row.status)}</td><td>${row.score}%</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAdmin() {
  const employees = state.users.filter((user) => user.role === "Employee");
  const managers = state.users.filter((user) => user.role === "Manager");
  return `
    <section class="grid two">
      <div class="panel">
        <h3>User Management</h3>
        <form id="adminUserForm" class="grid" autocomplete="off">
          <div class="form-row">
            <div class="field span-3"><label>Full Name</label><input class="input" name="name" required></div>
            <div class="field span-3"><label>Email</label><input class="input" type="email" name="email" required></div>
            <div class="field span-2"><label>Role</label><select class="select" name="role"><option>Employee</option><option>Manager</option><option>Admin</option></select></div>
            <div class="field span-2"><label>Department</label><input class="input" name="department" required></div>
            <div class="field span-2"><label>L1 Manager</label><select class="select" name="managerId"><option value="">None</option>${managers.map((manager) => `<option value="${manager.id}">${escapeHtml(manager.name)}</option>`).join("")}</select></div>
          </div>
          <button class="btn primary" type="submit">Add backend user</button>
        </form>
        <p class="footer-note">Demo users are stored in the app database. In production this maps to Supabase Auth Admin or a Node.js service-role API.</p>
      </div>
      <div class="panel">
        <h3>Hierarchy Management</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Department</th><th>L1 Manager</th></tr></thead>
            <tbody>
              ${state.users.map((item) => `<tr><td>${escapeHtml(item.name)}<br><span class="footer-note">${escapeHtml(item.email || "")}</span></td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.department)}</td><td>${escapeHtml(item.managerId ? userName(item.managerId) : "-")}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <h3>Cycle Management</h3>
        <div class="notice">Current cycle: ${escapeHtml(state.cycles[0].name)} | Status: ${escapeHtml(state.cycles[0].status)}</div>
        <div class="actions">
          <button class="btn primary" data-cycle-status="Open">Open cycle</button>
          <button class="btn warning" data-cycle-status="Locked">Lock cycle</button>
        </div>
      </div>
      <div class="panel">
        <h3>Completion Dashboard</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Weightage</th><th>Approved</th><th>${state.currentQuarter} check-ins</th></tr></thead>
            <tbody>
              ${employees.map((employee) => {
                const goals = goalsForEmployee(employee.id);
                const approved = goals.filter((goal) => goal.status === "Approved").length;
                const checkins = goals.filter((goal) => getCheckin(goal.id)).length;
                return `<tr><td>${escapeHtml(employee.name)}</td><td>${totalWeightage(employee.id)}%</td><td>${approved}/${goals.length}</td><td>${checkins}/${goals.length}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel span-12">
        <h3>Exception Handling</h3>
        ${renderGoalCards(state.goals.filter((goal) => goal.locked), { adminMode: true })}
      </div>
      <div class="panel">
        <h3>Escalation Engine</h3>
        <div class="notice">Daily cron logic is implemented as a reusable checker. Use the manual button for judging demos.</div>
        <div class="actions">
          <button class="btn primary" id="runEscalationCheck">Run Escalation Check Now</button>
          <button class="btn" data-view="escalations">Open Escalation Dashboard</button>
        </div>
      </div>
      <div class="panel">
        <h3>Bonus Integrations</h3>
        <div class="goal-list">
          ${state.integrations.map((item) => `<div class="notice"><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.status)}</div>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderEscalations() {
  const pending = state.escalations.filter((item) => item.status === "Pending");
  const goalSheetCount = pending.filter((item) => item.type.includes("Goal sheet")).length;
  const approvalCount = pending.filter((item) => item.type.includes("approval")).length;
  const checkinCount = pending.filter((item) => item.type.includes("achievement") || item.type.includes("check-in")).length;
  return `
    <section class="stats">
      <div class="stat"><strong>${goalSheetCount}</strong><span>Goal Sheets Overdue</span></div>
      <div class="stat"><strong>${approvalCount}</strong><span>Manager Approvals Pending</span></div>
      <div class="stat"><strong>${checkinCount}</strong><span>Check-ins Pending</span></div>
      <div class="stat"><strong>${pending.length}</strong><span>Active escalations</span></div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <button class="btn primary" id="runEscalationCheck">Run Escalation Check Now</button>
      </div>
      ${pending.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employee / Manager</th><th>Escalation Type</th><th>Days Overdue</th><th>Status</th><th>Resolve Note</th><th>Action</th></tr></thead>
            <tbody>
              ${pending.map((item) => `<tr>
                <td>${escapeHtml(userName(item.userId))}</td>
                <td>${escapeHtml(item.type)}</td>
                <td>${daysBetween(item.triggeredAt)}</td>
                <td>${statusPill(item.status)}</td>
                <td><input class="input" data-resolution-note="${item.id}" placeholder="Resolution note"></td>
                <td><button class="btn secondary" data-resolve-escalation="${item.id}">Resolve</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">No escalations - you are all caught up.</div>`}
    </section>
  `;
}

function renderAnalytics(user) {
  const employees = scopedEmployees(user);
  const goals = scopedGoals(user);
  const employeeIds = employees.map((employee) => employee.id);
  const completion = goals.length ? Math.round((goals.filter((goal) => getCheckin(goal.id, state.currentQuarter)).length / goals.length) * 100) : 0;
  return `
    <section class="stats">
      <div class="stat"><strong>${goals.length}</strong><span>Goals in scope</span></div>
      <div class="stat"><strong>${averageScore(goals)}%</strong><span>Average progress</span></div>
      <div class="stat"><strong>${completion}%</strong><span>${state.currentQuarter} completion</span></div>
      <div class="stat"><strong>${employees.length}</strong><span>${user.role === "Manager" ? "Team members" : "Employees"}</span></div>
    </section>
    <section class="grid two analytics-grid">
      ${chartPanel("goalDistributionChart", "Goal Distribution", "Breakdown of goals by thrust area")}
      ${chartPanel("weightageChart", "Average Weightage", "Average weightage per thrust area")}
      ${chartPanel("qoqTrendChart", "QoQ Progress Trend", "Average progress score from Q1 to Q4")}
      ${chartPanel("completionGaugeChart", "Completion Rate Gauge", "Current quarter check-in completion")}
      <div class="panel span-12">
        <div class="toolbar"><h3>Progress Heatmap</h3><button class="btn" id="downloadHeatmap">Download as PNG</button></div>
        ${renderHeatmap(employees, goals.filter((goal) => employeeIds.includes(goal.employeeId)))}
      </div>
    </section>
  `;
}

function chartPanel(id, title, subtitle) {
  return `
    <div class="panel chart-panel">
      <div class="toolbar"><div><h3>${title}</h3><p class="footer-note">${subtitle}</p></div><button class="btn" data-download-chart="${id}">Download as PNG</button></div>
      <canvas id="${id}" height="220"></canvas>
    </div>
  `;
}

function renderHeatmap(employees, goals) {
  if (!employees.length || !goals.length) return `<div class="empty">No heatmap data yet.</div>`;
  const uniqueGoals = goals.slice(0, 8);
  return `
    <div class="heatmap-grid" id="heatmapGrid" style="--goal-count:${uniqueGoals.length}">
      <div class="heatmap-corner">Employee</div>
      ${uniqueGoals.map((goal) => `<div class="heatmap-head">${escapeHtml(goal.title)}</div>`).join("")}
      ${employees.map((employee) => `
        <div class="heatmap-name">${escapeHtml(employee.name)}</div>
        ${uniqueGoals.map((goal) => {
          const ownsGoal = goal.employeeId === employee.id;
          const checkin = ownsGoal ? getCheckin(goal.id, state.currentQuarter) : null;
          const score = checkin ? progressScore(goal, checkin.actual) : 0;
          const tone = !ownsGoal || !checkin ? "empty" : score >= 80 ? "good" : score >= 50 ? "warn" : "bad";
          const title = `${employee.name} | ${goal.title} | ${ownsGoal && checkin ? `${score}%` : "Not Started"} | ${state.currentQuarter}`;
          return `<div class="heatmap-score ${tone}" title="${escapeHtml(title)}">${ownsGoal && checkin ? `${score}%` : "-"}</div>`;
        }).join("")}
      `).join("")}
    </div>
  `;
}

function renderChartsForActiveView() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];
  if (state.activeView !== "analytics" || !window.Chart) return;

  const user = currentUser();
  const goals = scopedGoals(user);
  const byArea = {};
  goals.forEach((goal) => {
    if (!byArea[goal.thrustArea]) byArea[goal.thrustArea] = { count: 0, weightage: 0 };
    byArea[goal.thrustArea].count += 1;
    byArea[goal.thrustArea].weightage += Number(goal.weightage || 0);
  });
  const labels = Object.keys(byArea);
  const colors = ["#146b63", "#254f8f", "#d97706", "#16794c", "#b42318", "#6b7280"];

  const distributionCanvas = document.getElementById("goalDistributionChart");
  if (distributionCanvas) {
    chartInstances.push(new Chart(distributionCanvas, {
      type: "doughnut",
      data: { labels, datasets: [{ data: labels.map((label) => byArea[label].count), backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    }));
  }

  const weightageCanvas = document.getElementById("weightageChart");
  if (weightageCanvas) {
    chartInstances.push(new Chart(weightageCanvas, {
      type: "bar",
      data: { labels, datasets: [{ label: "Avg weightage", data: labels.map((label) => Math.round(byArea[label].weightage / byArea[label].count)), backgroundColor: "#146b63" }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
    }));
  }

  const qoqCanvas = document.getElementById("qoqTrendChart");
  if (qoqCanvas) {
    chartInstances.push(new Chart(qoqCanvas, {
      type: "line",
      data: {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        datasets: [{
          label: "Average progress",
          data: ["Q1", "Q2", "Q3", "Q4"].map((quarter) => {
            const scored = goals.map((goal) => {
              const checkin = getCheckin(goal.id, quarter);
              return checkin ? progressScore(goal, checkin.actual) : null;
            }).filter((score) => score !== null);
            return scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : 0;
          }),
          borderColor: "#254f8f",
          backgroundColor: "rgba(37, 79, 143, 0.12)",
          fill: true,
          tension: 0.35
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, max: 120 } } }
    }));
  }

  const gaugeCanvas = document.getElementById("completionGaugeChart");
  if (gaugeCanvas) {
    const completion = goals.length ? Math.round((goals.filter((goal) => getCheckin(goal.id, state.currentQuarter)).length / goals.length) * 100) : 0;
    chartInstances.push(new Chart(gaugeCanvas, {
      type: "doughnut",
      data: { labels: ["Complete", "Remaining"], datasets: [{ data: [completion, Math.max(0, 100 - completion)], backgroundColor: ["#16794c", "#dfe5ee"], circumference: 180, rotation: 270 }] },
      options: { responsive: true, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (item) => `${item.label}: ${item.raw}%` } } } }
    }));
  }
}

function renderAudit() {
  return `
    <section class="panel">
      <h3>Audit Trail</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Subject</th><th>Before</th><th>After</th></tr></thead>
          <tbody>
            ${state.auditLogs.map((log) => `<tr><td>${escapeHtml(log.at)}</td><td>${escapeHtml(log.actor)}</td><td>${escapeHtml(log.action)}</td><td>${escapeHtml(log.subject)}</td><td>${escapeHtml(log.before)}</td><td>${escapeHtml(log.after)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function bindBaseEvents() {
  document.getElementById("notificationBell")?.addEventListener("click", () => {
    document.getElementById("notificationMenu")?.classList.toggle("hidden");
  });
  document.querySelectorAll("[data-read-notification]").forEach((button) => button.addEventListener("click", () => {
    const notification = state.notifications.find((item) => item.id === button.dataset.readNotification);
    if (notification) notification.isRead = true;
    saveState();
    render();
  }));
  document.getElementById("darkToggle")?.addEventListener("click", () => {
    state.darkMode = !state.darkMode;
    saveState();
    render();
  });
  document.getElementById("quarterSwitch").addEventListener("change", (event) => {
    state.currentQuarter = event.target.value;
    saveState();
    render();
  });
  document.getElementById("resetDemo").addEventListener("click", () => {
    const authUser = currentUser();
    const users = state.users;
    state = { ...structuredClone(seedState), users, isAuthenticated: true, activeUserId: authUser.id };
    saveState();
    render();
  });
  document.getElementById("logout").addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    state.isAuthenticated = false;
    saveState();
    render();
  });
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  bindDynamicEvents();
}

function bindDynamicEvents() {
  const goalForm = document.getElementById("goalForm");
  if (goalForm) {
    goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(goalForm);
      const user = currentUser();
      const weightage = Number(form.get("weightage"));
      if (goalsForEmployee(user.id).length >= 8) return alert("Maximum 8 goals are allowed.");
      if (weightage < 10) return alert("Minimum goal weightage is 10%.");
      state.goals.push({
        id: uid("goal"),
        employeeId: user.id,
        thrustArea: form.get("thrustArea"),
        title: form.get("title"),
        description: form.get("description"),
        uomType: form.get("uomType"),
        target: form.get("target"),
        weightage,
        status: "Draft",
        progressStatus: "Not Started",
        sharedGroupId: null,
        primaryOwnerId: null,
        locked: false
      });
      logAudit(user.id, "Created goal", user.name, "-", form.get("title"));
      saveState();
      render();
    });
  }

  const submitGoals = document.getElementById("submitGoals");
  if (submitGoals) {
    submitGoals.addEventListener("click", () => {
      const user = currentUser();
      const errors = goalValidation(user.id);
      if (errors.length) return alert(errors.join("\n"));
      state.goals.forEach((goal) => {
        if (goal.employeeId === user.id && ["Draft", "Returned"].includes(goal.status)) goal.status = "Submitted";
      });
      addNotification(user.managerId, "Approval", `${user.name} has submitted their goal sheet for your approval.`);
      logAudit(user.id, "Submitted goals", user.name, "Draft", "Submitted");
      logDemoEmail(state.users.find((item) => item.id === user.managerId)?.email, "Goal sheet submitted", `${user.name} submitted goals for approval.`);
      saveState();
      render();
    });
  }

  document.querySelectorAll("[data-delete-goal]").forEach((button) => button.addEventListener("click", () => {
    const goal = state.goals.find((item) => item.id === button.dataset.deleteGoal);
    state.goals = state.goals.filter((item) => item.id !== button.dataset.deleteGoal);
    logAudit(currentUser().id, "Deleted goal", goal?.title || "Goal", goal?.status || "-", "Deleted");
    saveState();
    render();
  }));

  document.querySelectorAll("[data-save-shared-weight]").forEach((button) => button.addEventListener("click", () => {
    const goal = state.goals.find((item) => item.id === button.dataset.saveSharedWeight);
    const nextWeight = Number(document.querySelector(`[data-shared-weight="${goal.id}"]`).value);
    if (nextWeight < 10) return alert("Minimum goal weightage is 10%.");
    const before = `${goal.weightage}%`;
    goal.weightage = nextWeight;
    logAudit(currentUser().id, "Adjusted shared goal weightage", goal.title, before, `${nextWeight}%`);
    saveState();
    render();
  }));

  document.querySelectorAll("[data-approve-goal]").forEach((button) => button.addEventListener("click", () => {
    const goal = state.goals.find((item) => item.id === button.dataset.approveGoal);
    const targetInput = document.querySelector(`[data-manager-target="${goal.id}"]`);
    const weightInput = document.querySelector(`[data-manager-weight="${goal.id}"]`);
    const before = `Target ${goal.target}, weight ${goal.weightage}`;
    goal.target = targetInput.value;
    goal.weightage = Number(weightInput.value);
    goal.status = "Approved";
    goal.locked = true;
    addNotification(goal.employeeId, "Approval", `Your goal sheet has been approved by ${currentUser().name}.`);
    logAudit(currentUser().id, "Approved goal", `${userName(goal.employeeId)} - ${goal.title}`, before, `Target ${goal.target}, weight ${goal.weightage}, locked`);
    logDemoEmail(state.users.find((item) => item.id === goal.employeeId)?.email, "Goal sheet approved", `Your goal ${goal.title} was approved by ${currentUser().name}.`);
    saveState();
    render();
  }));

  document.querySelectorAll("[data-return-goal]").forEach((button) => button.addEventListener("click", () => {
    const goal = state.goals.find((item) => item.id === button.dataset.returnGoal);
    const comment = document.querySelector(`[data-return-comment="${goal.id}"]`)?.value || "Returned for rework";
    goal.status = "Returned";
    goal.locked = false;
    addNotification(goal.employeeId, "Rework", `${currentUser().name} returned ${goal.title} for rework.`);
    logAudit(currentUser().id, "Returned goal", `${userName(goal.employeeId)} - ${goal.title}`, "Submitted", comment);
    saveState();
    render();
  }));

  document.querySelectorAll("[data-save-checkin]").forEach((button) => button.addEventListener("click", () => {
    const goalId = button.dataset.saveCheckin;
    const goal = state.goals.find((item) => item.id === goalId);
    const actual = document.querySelector(`[data-actual="${goalId}"]`).value;
    const status = document.querySelector(`[data-progress-status="${goalId}"]`).value;
    const managerComment = document.querySelector(`[data-manager-comment="${goalId}"]`).value;
    let checkin = getCheckin(goalId);
    if (!checkin) {
      checkin = { id: uid("checkin"), goalId, employeeId: goal.employeeId, quarter: state.currentQuarter, actual: "", status, managerComment: "", updatedAt: "" };
      state.checkins.push(checkin);
    }
    const before = `Actual ${checkin.actual || "-"}, status ${checkin.status || "-"}`;
    checkin.actual = actual;
    checkin.status = status;
    checkin.managerComment = managerComment;
    checkin.updatedAt = new Date().toISOString().slice(0, 10);
    goal.progressStatus = status;
    syncSharedAchievement(goal, checkin);
    logAudit(currentUser().id, "Updated check-in", `${userName(goal.employeeId)} - ${goal.title}`, before, `Actual ${actual}, status ${status}`);
    saveState();
    render();
  }));

  const sharedGoalForm = document.getElementById("sharedGoalForm");
  if (sharedGoalForm) {
    sharedGoalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(sharedGoalForm);
      const assignees = Array.from(sharedGoalForm.elements.assignees.selectedOptions).map((option) => option.value);
      const sharedGroupId = uid("shared");
      assignees.forEach((employeeId) => {
        state.goals.push({
          id: uid("goal"),
          employeeId,
          thrustArea: form.get("thrustArea"),
          title: form.get("title"),
          description: form.get("description"),
          uomType: form.get("uomType"),
          target: form.get("target"),
          weightage: Number(form.get("weightage")),
          status: "Draft",
          progressStatus: "Not Started",
          sharedGroupId,
          primaryOwnerId: form.get("primaryOwnerId"),
          locked: false
        });
      });
      logAudit(currentUser().id, "Pushed shared goal", form.get("title"), "-", `${assignees.length} employees`);
      saveState();
      render();
    });
  }

  const adminUserForm = document.getElementById("adminUserForm");
  if (adminUserForm) {
    adminUserForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(adminUserForm);
      const email = String(form.get("email")).trim().toLowerCase();
      if (state.users.some((user) => user.email?.toLowerCase() === email)) return alert("A backend user with this email already exists.");
      const newUser = {
        id: uid("user"),
        name: form.get("name"),
        email,
        role: form.get("role"),
        department: form.get("department"),
        managerId: form.get("managerId") || null
      };
      state.users.push(newUser);
      logAudit(currentUser().id, "Added backend user", newUser.name, "-", `${newUser.role} / ${newUser.department}`);
      saveState();
      render();
    });
  }

  document.querySelectorAll("#runEscalationCheck").forEach((button) => button.addEventListener("click", () => {
    const created = runEscalationCheck();
    alert(`${created} new escalation item(s) created.`);
    render();
  }));

  document.querySelectorAll("[data-resolve-escalation]").forEach((button) => button.addEventListener("click", () => {
    const escalation = state.escalations.find((item) => item.id === button.dataset.resolveEscalation);
    if (!escalation) return;
    const note = document.querySelector(`[data-resolution-note="${escalation.id}"]`)?.value.trim();
    if (!note) return alert("Please add a resolution note.");
    escalation.status = "Resolved";
    escalation.resolvedAt = new Date().toLocaleString();
    escalation.resolvedBy = currentUser().id;
    escalation.note = note;
    logAudit(currentUser().id, "Resolved escalation", escalation.type, userName(escalation.userId), note);
    saveState();
    render();
  }));

  document.querySelectorAll("[data-download-chart]").forEach((button) => button.addEventListener("click", () => {
    const canvas = document.getElementById(button.dataset.downloadChart);
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${button.dataset.downloadChart}.png`;
    link.click();
  }));

  document.getElementById("downloadHeatmap")?.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = state.darkMode ? "#111827" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.darkMode ? "#f9fafb" : "#17202a";
    ctx.font = "26px Segoe UI";
    ctx.fillText("AtomQuest Progress Heatmap", 40, 55);
    const rows = Array.from(document.querySelectorAll(".heatmap-grid > div")).map((cell) => cell.textContent.trim());
    ctx.font = "16px Segoe UI";
    rows.slice(0, 80).forEach((text, index) => ctx.fillText(text || "-", 40 + (index % 5) * 220, 100 + Math.floor(index / 5) * 34));
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "progress-heatmap.png";
    link.click();
  });

  document.querySelectorAll("[data-unlock-goal]").forEach((button) => button.addEventListener("click", () => {
    const goal = state.goals.find((item) => item.id === button.dataset.unlockGoal);
    goal.locked = false;
    goal.status = "Returned";
    logAudit(currentUser().id, "Unlocked goal", `${userName(goal.employeeId)} - ${goal.title}`, "Locked", "Returned for admin exception edit");
    saveState();
    render();
  }));

  document.querySelectorAll("[data-cycle-status]").forEach((button) => button.addEventListener("click", () => {
    const before = state.cycles[0].status;
    state.cycles[0].status = button.dataset.cycleStatus;
    logAudit(currentUser().id, "Updated cycle status", state.cycles[0].name, before, state.cycles[0].status);
    saveState();
    render();
  }));

  const exportCsv = document.getElementById("exportCsv");
  if (exportCsv) exportCsv.addEventListener("click", downloadCsv);
}

function syncSharedAchievement(goal, checkin) {
  if (!goal.sharedGroupId || goal.primaryOwnerId !== goal.employeeId) return;
  state.goals
    .filter((item) => item.sharedGroupId === goal.sharedGroupId && item.id !== goal.id)
    .forEach((linkedGoal) => {
      let linkedCheckin = getCheckin(linkedGoal.id);
      if (!linkedCheckin) {
        linkedCheckin = { id: uid("checkin"), goalId: linkedGoal.id, employeeId: linkedGoal.employeeId, quarter: state.currentQuarter, actual: "", status: "", managerComment: "", updatedAt: "" };
        state.checkins.push(linkedCheckin);
      }
      linkedCheckin.actual = checkin.actual;
      linkedCheckin.status = checkin.status;
      linkedCheckin.updatedAt = checkin.updatedAt;
      linkedGoal.progressStatus = checkin.status;
    });
}

function downloadCsv() {
  const rows = [["Employee", "Department", "Goal", "Thrust Area", "Target", "Actual", "Quarter", "Status", "Score"]];
  state.goals.forEach((goal) => {
    const employee = state.users.find((user) => user.id === goal.employeeId);
    const checkin = getCheckin(goal.id);
    rows.push([
      userName(goal.employeeId),
      employee?.department || "",
      goal.title,
      goal.thrustArea,
      goal.target,
      checkin?.actual || "",
      state.currentQuarter,
      checkin?.status || goal.status,
      checkin ? `${progressScore(goal, checkin.actual)}%` : "0%"
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `achievement-report-${state.currentQuarter}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

render();
initSupabase();
