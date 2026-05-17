import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  LogOut,
  Moon,
  PlayCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Unlock,
  UserCog,
  UsersRound,
  AlertTriangle,
  Info,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const quarterMeta = {
  Q1: { label: "Q1", window: "July", shortWindow: "Jul" },
  Q2: { label: "Q2", window: "October", shortWindow: "Oct" },
  Q3: { label: "Q3", window: "January", shortWindow: "Jan" },
  Q4: { label: "Q4", window: "March-April", shortWindow: "Mar-Apr" }
};
const statuses = ["NotStarted", "OnTrack", "Completed"];

const demoUsers = [
  { role: "Employee", email: "employee@atomquest.test", password: "Password123!" },
  { role: "Manager", email: "manager@atomquest.test", password: "Password123!" },
  { role: "Admin", email: "admin@atomquest.test", password: "Password123!" }
];

const routeByRole = {
  Employee: "/employee/my-goals",
  Manager: "/manager/my-team",
  Admin: "/admin/windows"
};

function token() {
  return localStorage.getItem("aq_token");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

function exportRowsToXlsx(filename, rows, sheetName = "Report") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "E6F4ED" } } };
  }
  for (let row = 1; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell && row % 2 === 0) cell.s = { fill: { fgColor: { rgb: "F7F8F4" } } };
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function formatStatus(status) {
  return status?.replace(/([A-Z])/g, " $1").trim() || "Pending";
}

function chartToPng(containerId, filename) {
  const svg = document.querySelector(`#${containerId} svg`);
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth || 720;
    canvas.height = svg.clientHeight || 320;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(pngUrl);
    });
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

function PreviewDrawer({ preview, onClose }) {
  const [activeTab, setActiveTab] = useState("teams");
  if (!preview) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#247e57]" />
              📢 Notification Preview
            </h3>
            <p className="text-xs text-[#697789]">Visualizer for Microsoft Teams & SMTP Email notifications</p>
          </div>
          <button className="rounded-md border border-[#cfd9cf] px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Tab Selection */}
        <div className="mb-6 flex rounded-lg border border-[#dce4d8] bg-slate-50 p-1 dark:bg-slate-900/40">
          <button
            className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition ${activeTab === "teams" ? "bg-ink text-white" : "text-[#536272] hover:text-ink"}`}
            onClick={() => setActiveTab("teams")}
          >
            💬 Microsoft Teams (Adaptive Card)
          </button>
          <button
            className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition ${activeTab === "email" ? "bg-ink text-white" : "text-[#536272] hover:text-ink"}`}
            onClick={() => setActiveTab("email")}
          >
            📧 Responsive HTML Email
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-[#dce4d8] p-4 bg-slate-50/50 dark:bg-slate-900/10">
          {activeTab === "teams" ? (
            <div className="teams-client p-4 shadow-md text-left">
              {/* MS Teams Shell Header */}
              <div className="mb-4 flex items-center gap-3 border-b border-[#3b3a39] pb-3">
                <div className="size-8 rounded-full bg-[#4f46e5] flex items-center justify-center font-bold text-white text-xs">
                  💬
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Microsoft Teams</p>
                  <p className="text-[10px] text-[#aebaca]">Zenith Integration Bot</p>
                </div>
              </div>

              {/* Adaptive Card Simulation */}
              <div className="adaptive-card rounded-lg p-5">
                <div className="flex items-start justify-between mb-4 border-b border-[#3b3a39] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Zenith Performance Portal</h4>
                    <p className="text-[10px] text-[#aebaca]">{preview.type} Notification</p>
                  </div>
                  <span className="text-[9px] bg-[#4f46e5]/20 text-[#818cf8] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Adaptive Card</span>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between border-b border-[#3b3a39]/30 pb-2">
                    <span className="text-xs text-[#aebaca]">Subject:</span>
                    <span className="text-xs font-semibold text-white">{preview.message}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#3b3a39]/30 pb-2">
                    <span className="text-xs text-[#aebaca]">User Affected:</span>
                    <span className="text-xs font-semibold text-white">{preview.employeeName}</span>
                  </div>
                  {preview.managerName && (
                    <div className="flex justify-between border-b border-[#3b3a39]/30 pb-2">
                      <span className="text-xs text-[#aebaca]">Manager:</span>
                      <span className="text-xs font-semibold text-white">{preview.managerName}</span>
                    </div>
                  )}
                  {preview.comment && (
                    <div className="rounded bg-black/35 p-3 text-xs border-l-2 border-[#ec6b5f]">
                      <p className="font-semibold text-white mb-1">Rework/Feedback Comment:</p>
                      <p className="text-[#aebaca]">{preview.comment}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    className="flex-1 bg-[#4f46e5] text-white rounded py-2 text-xs font-semibold hover:bg-[#4338ca] transition"
                    onClick={() => {
                      alert("Hackathon Demo: In a live environment, this action triggers a Microsoft Teams deep-link to open the Zenith portal!");
                      onClose();
                    }}
                  >
                    View Goal Sheet
                  </button>
                  <button 
                    className="flex-1 border border-[#3b3a39] text-[#aebaca] rounded py-2 text-xs font-semibold hover:bg-white/5 transition"
                    onClick={() => {
                      alert("Hackathon Demo: Acknowledgment securely recorded via Microsoft Teams Bot Framework!");
                      onClose();
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="email-client p-6 shadow-md text-left">
              <div className="email-body p-6 shadow-sm">
                {/* Header */}
                <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="size-10 bg-[#e6f4ed] text-[#247e57] dark:bg-[#143b2b] dark:text-[#9de2bf] rounded-lg flex items-center justify-center font-bold">
                    Z
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">Zenith Performance</h4>
                    <p className="text-[10px] text-gray-400">noreply@zenith-performance.com</p>
                  </div>
                </div>

                {/* Email Body */}
                <div className="space-y-4 text-xs text-gray-600 dark:text-gray-300">
                  <p className="font-semibold text-gray-900 dark:text-white">Hello,</p>
                  <p>
                    Your Zenith transaction has completed successfully. Below are the execution and audit details of the action performed:
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2.5 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-400">Activity Type:</span>
                      <span className="text-[10px] font-semibold text-gray-900 dark:text-white">{preview.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-400">Details:</span>
                      <span className="text-[10px] font-semibold text-gray-900 dark:text-white">{preview.message}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-400">Timestamp:</span>
                      <span className="text-[10px] font-semibold text-gray-900 dark:text-white">{new Date().toLocaleString()}</span>
                    </div>
                  </div>

                  {preview.comment && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-400 p-3.5 rounded">
                      <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 mb-1">Feedback/Comments:</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">{preview.comment}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    This is an automated notification from the Zenith Performance Management system. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const storedUser = useMemo(() => {
    const raw = localStorage.getItem("aq_user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const [form, setForm] = useState({ email: demoUsers[0].email, password: demoUsers[0].password });
  const [user, setUser] = useState(storedUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePreview, setActivePreview] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("zenith_dark") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("zenith_dark", String(darkMode));
  }, [darkMode]);

  async function login(event) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form)
      });

      localStorage.setItem("aq_token", data.token);
      localStorage.setItem("aq_user", JSON.stringify(data.user));
      window.history.pushState({}, "", routeByRole[data.user.role] || "/");
      setUser(data.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  }

  function selectDemoUser(demoUser) {
    setForm({ email: demoUser.email, password: demoUser.password });
    setError("");
  }

  function logout() {
    localStorage.removeItem("aq_token");
    localStorage.removeItem("aq_user");
    window.history.pushState({}, "", "/");
    setUser(null);
  }

  if (user?.role === "Employee") {
    return (
      <>
        <EmployeeDashboard user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} triggerPreview={setActivePreview} />
        {activePreview ? <PreviewDrawer preview={activePreview} onClose={() => setActivePreview(null)} /> : null}
      </>
    );
  }

  if (user?.role === "Manager") {
    return (
      <>
        <ManagerDashboard user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} triggerPreview={setActivePreview} />
        {activePreview ? <PreviewDrawer preview={activePreview} onClose={() => setActivePreview(null)} /> : null}
      </>
    );
  }

  if (user?.role === "Admin") {
    return (
      <>
        <AdminDashboard user={user} onLogout={logout} darkMode={darkMode} setDarkMode={setDarkMode} triggerPreview={setActivePreview} />
        {activePreview ? <PreviewDrawer preview={activePreview} onClose={() => setActivePreview(null)} /> : null}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce4d8] bg-white px-3 py-2 text-sm font-medium text-[#4f614d]">
            <ShieldCheck size={16} />
            JWT role access for quarterly check-ins
          </div>
          <div className="max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">Zenith</h1>
            <p className="max-w-xl text-lg leading-8 text-[#586575]">
              Goal achievement tracking for employees, manager check-ins, and admin-controlled quarter windows.
            </p>
          </div>
          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {demoUsers.map((demoUser) => (
              <button
                className="rounded-lg border border-[#dce4d8] bg-white p-4 text-left shadow-sm transition hover:border-[#3d8b67] hover:shadow-md"
                key={demoUser.email}
                onClick={() => selectDemoUser(demoUser)}
                type="button"
              >
                <span className="block text-sm font-semibold">{demoUser.role}</span>
                <span className="mt-2 block break-all text-xs text-[#697789]">{demoUser.email}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="rounded-lg border border-[#dce4d8] bg-white p-6 shadow-xl shadow-[#dce8df]/60" onSubmit={login}>
          <div className="mb-7 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-[#e6f4ed] text-[#247e57]">
              <LockKeyhole size={22} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Welcome back</h2>
              <p className="text-sm text-[#697789]">Use any seeded demo account.</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-3 outline-none transition focus:border-[#3d8b67] focus:ring-4 focus:ring-[#dff4eb]"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-3 outline-none transition focus:border-[#3d8b67] focus:ring-4 focus:ring-[#dff4eb]"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>

          {error ? <p className="mb-4 rounded-md bg-[#fff1f0] px-3 py-2 text-sm text-[#a13a31]">{error}</p> : null}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-semibold text-white transition hover:bg-[#263349] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Signing in" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}

function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  async function load() {
    if (!user?.id) return;
    const data = await api(`/api/notifications/${user.id}`);
    setNotifications(data.notifications);
  }

  useEffect(() => {
    load().catch(() => {});
    const interval = window.setInterval(() => load().catch(() => {}), 10000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  async function markRead(notification) {
    await api(`/api/notifications/${notification.id}/read`, { method: "PUT", body: JSON.stringify({}) });
    await load();
  }

  const unread = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="relative">
      <button className="relative rounded-md border border-[#cfd9cf] bg-white p-2" onClick={() => setOpen((current) => !current)} type="button" aria-label="Notifications">
        <Bell size={18} />
        {unread ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ec6b5f] text-xs font-bold text-white">{unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-[#dce4d8] bg-white p-3 shadow-xl">
          <p className="mb-2 text-sm font-semibold">Notifications</p>
          <div className="grid max-h-80 gap-2 overflow-y-auto">
            {notifications.length ? (
              notifications.slice(0, 6).map((notification) => (
                <button className={`rounded-md p-3 text-left text-sm ${notification.isRead ? "bg-[#f7f8f4] text-[#697789]" : "bg-[#e6f4ed] text-ink"}`} key={notification.id} onClick={() => markRead(notification)} type="button">
                  {notification.message}
                  <span className="mt-1 block text-xs text-[#697789]">{new Date(notification.createdAt).toLocaleString()}</span>
                </button>
              ))
            ) : (
              <p className="rounded-md bg-[#f7f8f4] p-3 text-sm text-[#697789]">No notifications.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Shell({ user, onLogout, children, icon, title, subtitle, darkMode, setDarkMode }) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-8 text-ink">
      <section className="mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#dce4d8] pb-5">
          <div className="flex items-center gap-3">
            <NotificationBell user={user} />
            <button
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex items-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm font-medium"
              onClick={() => setDarkMode?.(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              type="button"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="grid size-11 place-items-center rounded-lg bg-[#e6f4ed] text-[#247e57]">{icon}</div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">Zenith</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-[#697789]">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#dce4d8] bg-white px-3 py-2 text-sm">
              {user.name} · {user.role}
            </span>
            <button className="inline-flex items-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-medium" onClick={onLogout}>
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </nav>
        {children}
      </section>
    </main>
  );
}

function QuarterPicker({ quarter, setQuarter }) {
  return (
    <div className="inline-flex rounded-lg border border-[#dce4d8] bg-white p-1">
      {quarters.map((item) => (
        <button
          className={`rounded-md px-4 py-2 text-left text-sm font-semibold ${quarter === item ? "bg-ink text-white" : "text-[#536272]"}`}
          key={item}
          onClick={() => setQuarter(item)}
          type="button"
        >
          <span className="block leading-5">{quarterMeta[item].label}</span>
          <span className={`block text-xs leading-4 ${quarter === item ? "text-[#dbe6f5]" : "text-[#7a8795]"}`}>{quarterMeta[item].shortWindow}</span>
        </button>
      ))}
    </div>
  );
}

function SummaryBanner({ quarter, updated, total, window }) {
  return (
    <div className="mb-6 grid gap-4 rounded-lg border border-[#dce4d8] bg-white p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">
          {quarter} Check-in · {quarterMeta[quarter].window}
        </p>
        <h2 className="mt-1 text-2xl font-semibold">
          {updated} of {total} goals updated
        </h2>
        <p className="mt-2 text-sm text-[#697789]">
          {window?.isOpen ? "Check-in window is open" : "Check-in window is not currently open"}
        </p>
      </div>
      <div className={`rounded-md px-4 py-3 text-sm font-semibold ${window?.isOpen ? "bg-[#e6f4ed] text-[#17633f]" : "bg-[#fff5df] text-[#8a5a00]"}`}>
        {window?.isOpen ? "Open for updates" : "Inputs disabled"}
      </div>
    </div>
  );
}

function ScoreBadge({ progress }) {
  const band = progress?.band || bandForScore(progress?.scorePercent);
  const palette = {
    green: "bg-[#e6f4ed] text-[#17633f] border-[#bfe4d0]",
    amber: "bg-[#fff5df] text-[#8a5a00] border-[#f0d48c]",
    red: "bg-[#fff1f0] text-[#a13a31] border-[#efbeb9]",
    neutral: "bg-[#eef2f6] text-[#536272] border-[#d9e0e8]"
  };

  return (
    <span className={`inline-flex min-w-24 justify-center rounded-full border px-3 py-1 text-sm font-bold ${palette[band]}`}>
      {progress?.scoreLabel || "Pending"}
    </span>
  );
}

function bandForScore(score) {
  if (score === null || score === undefined) return "neutral";
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function EmployeeDashboard({ user, onLogout, darkMode, setDarkMode, triggerPreview }) {
  const [quarter, setQuarter] = useState("Q1");
  const [dashboard, setDashboard] = useState(null);
  const [forms, setForms] = useState({});
  const [draftGoals, setDraftGoals] = useState([]);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");

  async function loadDashboard(activeQuarter = quarter) {
    const data = await api(`/api/goal-sheets/my/${activeQuarter}`);
    setDashboard(data);
    setDraftGoals(data.goals.length ? data.goals.map(goalToDraft) : [newDraftGoal()]);
    setForms(
      Object.fromEntries(
        data.goals.map((goal) => [
          goal.id,
          {
            actual: goal.achievement?.actual || "",
            progressStatus: goal.achievement?.progressStatus || "OnTrack"
          }
        ])
      )
    );
  }

  useEffect(() => {
    setMessage("");
    loadDashboard(quarter).catch((error) => setMessage(error.message));
  }, [quarter]);

  async function submitGoal(goal) {
    setMessage("");
    try {
      await api("/api/achievements", {
        method: "POST",
        body: JSON.stringify({
          goalId: goal.id,
          quarter,
          actual: forms[goal.id]?.actual,
          progressStatus: forms[goal.id]?.progressStatus
        })
      });
      await loadDashboard();
      setMessage(`${goal.title} submitted and locked for ${quarter}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const isWindowOpen = dashboard?.window?.isOpen;
  const isApproved = dashboard?.goalSheet?.status === "Approved";
  const draftTotal = draftGoals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);

  function validateDraft() {
    if (draftGoals.length > 8) return "A goal sheet can include at most 8 goals.";
    if (draftGoals.some((goal) => Number(goal.weightage) < 10)) return "Each goal must have at least 10% weightage.";
    if (draftTotal !== 100) return `Total weightage must equal 100%. Current total is ${draftTotal}%.`;
    const invalidGoalIndex = draftGoals.findIndex((goal) => !goal.title || !goal.target);
    if (invalidGoalIndex !== -1) return `Goal #${invalidGoalIndex + 1} is missing a title or target.`;
    return "";
  }

  async function saveDraft() {
    setValidation("");
    try {
      const data = await api("/api/goal-sheets/my", { method: "PUT", body: JSON.stringify({ goals: draftGoals }) });
      setDashboard(data);
      setMessage("Draft goal sheet saved.");
    } catch (error) {
      setValidation(error.message);
    }
  }

  async function submitSheet() {
    const error = validateDraft();
    if (error) {
      setValidation(error);
      return;
    }
    await saveDraft();
    try {
      const data = await api("/api/goal-sheets/my/submit", { method: "POST", body: JSON.stringify({}) });
      setDashboard(data);
      setMessage("Goal sheet submitted for manager approval. It is read-only until returned.");
      if (triggerPreview) {
        triggerPreview({
          type: "Submission",
          message: "Annual Goal Sheet submitted for Approval.",
          employeeName: user.name,
          managerName: "Morgan Manager"
        });
      }
    } catch (error) {
      setValidation(error.message);
    }
  }

  function updateDraft(index, field, value) {
    setDraftGoals((current) => current.map((goal, goalIndex) => (goalIndex === index ? { ...goal, [field]: value } : goal)));
  }

  if (dashboard && !isApproved) {
    const readOnly = dashboard.goalSheet.status === "Submitted";
    return (
      <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<BarChart3 size={22} />} title="My Goal Sheet" subtitle="Create annual goals and submit them for manager approval">
        <PageHeader title="Goal Sheet Builder" subtitle={`Status: ${formatStatus(dashboard.goalSheet.status)} · Total weightage ${draftTotal}%`} />
        {dashboard.goalSheet.managerComment ? <Notice>Manager comment: {dashboard.goalSheet.managerComment}</Notice> : null}
        {message ? <Notice>{message}</Notice> : null}
        {validation ? <p className="mb-5 rounded-md bg-[#fff1f0] px-4 py-3 text-sm font-semibold text-[#a13a31]">{validation}</p> : null}
        <div className="mb-4 flex flex-wrap gap-3">
          <button className="rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={readOnly || draftGoals.length >= 8} onClick={() => setDraftGoals((current) => [...current, newDraftGoal()])} type="button">Add Goal</button>
          <button className="rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={readOnly} onClick={saveDraft} type="button">Save Draft</button>
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={readOnly} onClick={submitSheet} type="button">Submit for Approval</button>
        </div>
        <div className="grid gap-4">
          {draftGoals.map((goal, index) => {
            const isSharedGoal = Boolean(goal.isShared);
            const isFieldDisabled = readOnly || isSharedGoal;
            return (
              <article className={`rounded-lg border p-4 transition ${isSharedGoal ? "border-amber-300 bg-amber-50/20" : "border-[#dce4d8] bg-white"}`} key={goal.id || index}>
                {isSharedGoal && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                    <ShieldCheck size={12} />
                    Shared Corporate KPI (Locked)
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-6">
                  <Input label="Title" value={goal.title} onChange={(value) => updateDraft(index, "title", value)} disabled={isFieldDisabled} />
                  <Input label="Thrust Area" value={goal.thrustArea} onChange={(value) => updateDraft(index, "thrustArea", value)} disabled={isFieldDisabled} />
                  <Select label="UoM" value={goal.uomType} onChange={(value) => updateDraft(index, "uomType", value)} options={[["Min", "Min"], ["Max", "Max"], ["Timeline", "Timeline"], ["Zero", "Zero"]]} disabled={isFieldDisabled} />
                  <Input label="Target" type={goal.uomType === "Timeline" ? "date" : "text"} value={goal.target} onChange={(value) => updateDraft(index, "target", value)} disabled={isFieldDisabled} />
                  <Input label="Weightage" type="number" value={goal.weightage} onChange={(value) => updateDraft(index, "weightage", value)} disabled={isFieldDisabled} />
                  <div className="flex items-end">
                    <button className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm font-semibold disabled:opacity-50" disabled={isFieldDisabled || draftGoals.length === 1} onClick={() => setDraftGoals((current) => current.filter((_, goalIndex) => goalIndex !== index))} type="button">Remove</button>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-medium">Description</span>
                  <textarea className="min-h-20 w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none disabled:bg-[#fbfcf8]" disabled={isFieldDisabled} value={goal.description} onChange={(event) => updateDraft(index, "description", event.target.value)} />
                </label>
              </article>
            );
          })}
        </div>
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<BarChart3 size={22} />} title="My Goals" subtitle="Locked approved goals and quarterly achievement updates">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <QuarterPicker quarter={quarter} setQuarter={setQuarter} />
      </div>

      {dashboard ? <SummaryBanner quarter={quarter} updated={dashboard.summary.updatedGoals} total={dashboard.summary.totalGoals} window={dashboard.window} /> : null}
      {message ? <p className="mb-5 rounded-md border border-[#dce4d8] bg-white px-4 py-3 text-sm font-medium text-[#536272]">{message}</p> : null}

      <div className="grid gap-4">
        {dashboard?.goals.map((goal) => {
          const locked = Boolean(goal.achievement?.isLocked);
          const disabled = !isWindowOpen || locked;
          return (
            <article className="rounded-lg border border-[#dce4d8] bg-white p-5 shadow-sm" key={goal.id}>
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {goal.isShared && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">Shared Corporate KPI</span>
                    )}
                    <span className="rounded-full bg-[#eef2f6] px-3 py-1 text-xs font-semibold text-[#536272]">{goal.thrustArea}</span>
                    <span className="rounded-full bg-[#e6f4ed] px-3 py-1 text-xs font-semibold text-[#17633f]">{goal.uomType} UoM</span>
                    <span className="rounded-full bg-[#f5eee6] px-3 py-1 text-xs font-semibold text-[#7b5131]">{goal.weightage}% weightage</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{goal.title}</h3>
                  <p className="mt-2 leading-7 text-[#586575]">{goal.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Metric label="Planned target" value={goal.target} />
                    <Metric label="Actual achievement" value={goal.achievement?.actual || "Pending"} />
                    <Metric label="Progress score" value={<ScoreBadge progress={goal.progress} />} />
                  </div>
                </div>

                <div className="rounded-lg border border-[#edf1eb] bg-[#fbfcf8] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="font-semibold">{quarter} achievement update</h4>
                    {locked ? <span className="rounded-full bg-[#eef2f6] px-3 py-1 text-xs font-semibold text-[#536272]">Locked</span> : null}
                  </div>
                  {!isWindowOpen ? <p className="mb-3 rounded-md bg-[#fff5df] px-3 py-2 text-sm text-[#8a5a00]">Check-in window is not currently open</p> : null}
                  <label className="mb-3 block">
                    <span className="mb-2 block text-sm font-medium">{goal.uomType === "Timeline" ? "Completion date" : "Actual achievement"}</span>
                    <input
                      className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none disabled:bg-[#eef2f6]"
                      disabled={disabled}
                      onChange={(event) =>
                        setForms((current) => ({ ...current, [goal.id]: { ...current[goal.id], actual: event.target.value } }))
                      }
                      type={goal.uomType === "Timeline" ? "date" : "number"}
                      value={forms[goal.id]?.actual || ""}
                    />
                  </label>
                  <label className="mb-4 block">
                    <span className="mb-2 block text-sm font-medium">Status</span>
                    <select
                      className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none disabled:bg-[#eef2f6]"
                      disabled={disabled}
                      onChange={(event) =>
                        setForms((current) => ({ ...current, [goal.id]: { ...current[goal.id], progressStatus: event.target.value } }))
                      }
                      value={forms[goal.id]?.progressStatus || "OnTrack"}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/([A-Z])/g, " $1").trim()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled || !forms[goal.id]?.actual}
                    onClick={() => submitGoal(goal)}
                    type="button"
                  >
                    <CheckCircle2 size={17} />
                    Submit update
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Shell>
  );
}

function newDraftGoal() {
  return { id: "", title: "", thrustArea: "Growth", description: "", uomType: "Min", target: "", weightage: 20, isShared: false };
}

function goalToDraft(goal) {
  return {
    id: goal.id,
    title: goal.title,
    thrustArea: goal.thrustArea,
    description: goal.description,
    uomType: goal.uomType,
    target: goal.target,
    weightage: goal.weightage,
    isShared: goal.isShared
  };
}

function ManagerWorkflowGuide() {
  return (
    <details className="mb-5 rounded-lg border border-[#3b3a39] bg-[#1a1919] text-[#aebaca] shadow-sm [&_svg.chevron]:open:rotate-180" open>
      <summary className="flex cursor-pointer items-center justify-between p-4 outline-none">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Info size={16} />
          Manager Workflow Guide
        </div>
        <ChevronDown size={18} className="chevron transition-transform" />
      </summary>
      <div className="grid gap-4 border-t border-[#3b3a39] p-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#3b3a39] text-[10px]">1</span>
            Review Submissions
          </div>
          <p className="text-xs">View goal sheets submitted by your direct reports.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#3b3a39] text-[10px]">2</span>
            Approve or Reject
          </div>
          <p className="text-xs">Approve to permanently lock goals, or reject them back for mandatory rework.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#3b3a39] text-[10px]">3</span>
            Quarterly Feedback
          </div>
          <p className="text-xs">Review Planned vs. Actual progress and add structured check-in comments.</p>
        </div>
      </div>
    </details>
  );
}

function ManagerDashboard({ user, onLogout, darkMode, setDarkMode, triggerPreview }) {
  const [view, setView] = useState("team");
  const [quarter, setQuarter] = useState("Q1");
  const [team, setTeam] = useState(null);
  const [comments, setComments] = useState({});
  const [targetEdits, setTargetEdits] = useState({});
  const [returnComments, setReturnComments] = useState({});
  const [message, setMessage] = useState("");

  async function loadTeam(activeQuarter = quarter) {
    const data = await api(`/api/checkins/team/${user.id}/${activeQuarter}`);
    setTeam(data);
    setComments(
      Object.fromEntries(
        data.reportees.map((report) => [
          report.goalSheet?.id,
          {
            comment: report.checkIn?.comment || "",
            isCompleted: Boolean(report.checkIn?.isCompleted)
          }
        ])
      )
    );
    setTargetEdits(Object.fromEntries(data.reportees.flatMap((report) => report.goals.map((goal) => [goal.id, goal.target]))));
  }

  useEffect(() => {
    setMessage("");
    loadTeam(quarter).catch((error) => setMessage(error.message));
  }, [quarter]);

  async function submitCheckIn(report) {
    setMessage("");
    try {
      await api("/api/checkins", {
        method: "POST",
        body: JSON.stringify({
          goalSheetId: report.goalSheet.id,
          quarter,
          comment: comments[report.goalSheet.id]?.comment,
          isCompleted: comments[report.goalSheet.id]?.isCompleted
        })
      });
      await loadTeam();
      setMessage(`Check-in saved for ${report.employee.name}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function approveGoalSheet(report) {
    setMessage("");
    try {
      await api("/api/checkins/approve-goal-sheet", {
        method: "POST",
        body: JSON.stringify({ goalSheetId: report.goalSheet.id })
      });
      await loadTeam();
      setMessage(`Goal sheet approved for ${report.employee.name}.`);
      if (triggerPreview) {
        triggerPreview({
          type: "Approval",
          message: "Goal sheet approved successfully.",
          employeeName: report.employee.name,
          managerName: user.name
        });
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function returnGoalSheet(report) {
    setMessage("");
    try {
      const comment = returnComments[report.goalSheet.id] || "Please revise and resubmit.";
      await api("/api/checkins/return-goal-sheet", {
        method: "POST",
        body: JSON.stringify({ goalSheetId: report.goalSheet.id, comment })
      });
      await loadTeam();
      setMessage(`Goal sheet returned to ${report.employee.name}.`);
      if (triggerPreview) {
        triggerPreview({
          type: "Return",
          message: "Goal sheet returned with rework instructions.",
          employeeName: report.employee.name,
          managerName: user.name,
          comment
        });
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveTarget(goal) {
    await api(`/api/admin/goal/${goal.id}`, { method: "PUT", body: JSON.stringify({ target: targetEdits[goal.id] }) });
    await loadTeam();
    setMessage(`${goal.title} target updated for approval review.`);
  }

  const total = team?.reportees.reduce((count, report) => count + report.summary.totalGoals, 0) || 0;
  const updated = team?.reportees.reduce((count, report) => count + report.summary.updatedGoals, 0) || 0;

  if (view === "reports") {
    return (
      <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<FileSpreadsheet size={22} />} title="Reports" subtitle="Achievement reporting for your direct team">
        <ManagerNav view={view} setView={setView} />
        <AchievementReport currentUser={user} managerOnly />
      </Shell>
    );
  }

  if (view === "completion") {
    return (
      <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<ClipboardCheck size={22} />} title="Completion Dashboard" subtitle="Team check-in completion status">
        <ManagerNav view={view} setView={setView} />
        <CompletionDashboard currentUser={user} managerOnly />
      </Shell>
    );
  }

  if (view === "analytics") {
    return (
      <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<BarChart3 size={22} />} title="Analytics" subtitle="Team goal analytics and progress trends">
        <ManagerNav view={view} setView={setView} />
        <AnalyticsPage currentUser={user} managerOnly />
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} icon={<UsersRound size={22} />} title="My Team" subtitle="Direct reportee progress and structured quarterly check-ins">
      <ManagerNav view={view} setView={setView} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <QuarterPicker quarter={quarter} setQuarter={setQuarter} />
      </div>

      <ManagerWorkflowGuide />
      {team ? <SummaryBanner quarter={quarter} updated={updated} total={total} window={team.window} /> : null}
      {message ? <p className="mb-5 rounded-md border border-[#dce4d8] bg-white px-4 py-3 text-sm font-medium text-[#536272]">{message}</p> : null}

      <div className="grid gap-5">
        {team?.reportees.map((report) => (
          <article className="rounded-lg border border-[#dce4d8] bg-white p-5 shadow-sm" key={report.employee.id}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">Direct reportee</p>
                <h3 className="text-2xl font-semibold">{report.employee.name}</h3>
                <p className="text-sm text-[#697789]">{report.employee.email}</p>
              </div>
              <ScoreBadge progress={{ scoreLabel: `${report.summary.updatedGoals}/${report.summary.totalGoals} updated`, band: "neutral" }} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#edf1eb]">
              <table className="min-w-full divide-y divide-[#edf1eb] text-left text-sm">
                <thead className="bg-[#fbfcf8] text-[#536272]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Goal</th>
                    <th className="px-4 py-3 font-semibold">Weightage</th>
                    <th className="px-4 py-3 font-semibold">Planned Target</th>
                    <th className="px-4 py-3 font-semibold">Actual Achievement</th>
                    <th className="px-4 py-3 font-semibold">Progress Score</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1eb]">
                  {report.goals.map((goal) => (
                    <tr key={goal.id}>
                      <td className="px-4 py-3">
                        <span className="block font-semibold flex items-center gap-1">
                          {goal.isShared && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">Shared</span>}
                          {goal.title}
                        </span>
                        <span className="text-xs text-[#697789]">{goal.uomType} UoM</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{goal.weightage}%</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-44 gap-2">
                          <input className="w-24 rounded-md border border-[#cfd9cf] px-2 py-1" value={targetEdits[goal.id] ?? goal.target} onChange={(event) => setTargetEdits((current) => ({ ...current, [goal.id]: event.target.value }))} />
                          <button className="rounded-md border border-[#cfd9cf] px-2 py-1 text-xs font-semibold" onClick={() => saveTarget(goal)} type="button">Save</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{goal.achievement?.actual || "Pending"}</td>
                      <td className="px-4 py-3">
                        <ScoreBadge
                          progress={{
                            scorePercent: goal.achievement?.scorePercent,
                            scoreLabel: goal.achievement?.scoreLabel || "Pending",
                            band: bandForScore(goal.achievement?.scorePercent)
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">{goal.achievement?.progressStatus || "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {report.goalSheet ? (() => {
              const totalWeightage = report.goals.reduce((sum, g) => sum + g.weightage, 0);
              const isValidWeightage = totalWeightage === 100;
              const isSheetSubmitted = report.goalSheet.status === "Submitted";
              return (
                <div className="mt-5 rounded-lg border border-[#edf1eb] bg-[#fbfcf8] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <ClipboardCheck size={18} />
                    <h4 className="font-semibold">Structured check-in record · Weightage: {totalWeightage}%</h4>
                  </div>
                  
                  {isSheetSubmitted && !isValidWeightage && (
                    <div className="mb-4 rounded-md bg-[#fff1f0] border border-[#efbeb9] p-3 text-xs font-semibold text-[#a13a31] flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>Cannot approve: Direct reportee's weightages sum to {totalWeightage}%, but must be exactly 100%. Please instruct the employee to adjust weightages.</span>
                    </div>
                  )}

                  <div className="mb-4 flex flex-wrap gap-2">
                    <button 
                      className="inline-flex items-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" 
                      disabled={isSheetSubmitted && !isValidWeightage}
                      onClick={() => approveGoalSheet(report)} 
                      type="button"
                    >
                      <CheckCircle2 size={16} />
                      Approve goal sheet
                    </button>
                    <input className="min-w-64 rounded-md border border-[#cfd9cf] px-3 py-2 text-sm" placeholder="Return comment" value={returnComments[report.goalSheet.id] || ""} onChange={(event) => setReturnComments((current) => ({ ...current, [report.goalSheet.id]: event.target.value }))} />
                    <button className="rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-semibold" onClick={() => returnGoalSheet(report)} type="button">Return with Comment</button>
                  </div>
                <label className="mb-3 block">
                  <span className="mb-2 block text-sm font-medium">Discussion notes</span>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none"
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [report.goalSheet.id]: { ...current[report.goalSheet.id], comment: event.target.value }
                      }))
                    }
                    placeholder="Capture blockers, coaching actions, support needed, and next commitments."
                    value={comments[report.goalSheet.id]?.comment || ""}
                  />
                </label>
                <label className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={Boolean(comments[report.goalSheet.id]?.isCompleted)}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [report.goalSheet.id]: { ...current[report.goalSheet.id], isCompleted: event.target.checked }
                      }))
                    }
                    type="checkbox"
                  />
                  Mark check-in as completed for {quarter}
                </label>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!comments[report.goalSheet.id]?.comment}
                  onClick={() => submitCheckIn(report)}
                  type="button"
                >
                  <CheckCircle2 size={17} />
                  Save check-in
                </button>
              </div>
            );
          })() : null}
          </article>
        ))}
      </div>
    </Shell>
  );
}

function ManagerNav({ view, setView }) {
  const items = [
    ["team", "My Team"],
    ["reports", "Reports"],
    ["completion", "Completion"],
    ["analytics", "Analytics"]
  ];
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {items.map(([id, label]) => (
        <button className={`rounded-md px-4 py-2 text-sm font-semibold ${view === id ? "bg-ink text-white" : "border border-[#dce4d8] bg-white text-[#536272]"}`} key={id} onClick={() => setView(id)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}

function SharedGoalsCenter({ currentUser, triggerPreview }) {
  const [form, setForm] = useState({
    thrustArea: "Revenue Growth",
    title: "Accelerate Q3 Revenue Target",
    description: "Achieve the quarterly sales milestone to ensure healthy SaaS enterprise ARR trajectory.",
    uomType: "Max",
    target: "150000",
    weightage: 20,
    targetDepartment: "Sales"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const res = await api("/api/admin/shared-goals", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          weightage: Number(form.weightage)
        })
      });
      setMessage(res.message || "Shared corporate goals propagated successfully!");
      if (triggerPreview) {
        triggerPreview({
          type: "Corporate Propagation",
          message: `Shared KPI "${form.title}" propagated to department ${form.targetDepartment}.`,
          employeeName: `All members in ${form.targetDepartment}`,
          managerName: "System Administrator"
        });
      }
    } catch (err) {
      setError(err.message || "Failed to propagate shared goals.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="glass-card max-w-2xl rounded-xl border border-[#dce4d8] bg-white p-6 shadow-md transition-all hover:shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[#247e57]">
          <ShieldCheck size={22} />
          Shared Corporate Goals Propagation Center
        </h3>
        <p className="text-xs text-[#536272] mt-1">
          Draft and push locked KPI objectives directly into your department's goal sheets.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-md bg-[#e6f4ed] border border-[#a3e2c1] p-3.5 text-xs font-semibold text-[#185e3d] flex items-center gap-2">
          <ShieldCheck size={14} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-md bg-[#fff1f0] border border-[#efbeb9] p-3.5 text-xs font-semibold text-[#a13a31] flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Thrust Area</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
              required
              value={form.thrustArea}
              onChange={(e) => setForm({ ...form, thrustArea: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Goal Title</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-medium">Goal Description</span>
          <textarea
            className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none min-h-20"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-medium">UoM Type</span>
            <select
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
              value={form.uomType}
              onChange={(e) => setForm({ ...form, uomType: e.target.value })}
            >
              <option value="Min">Min</option>
              <option value="Max">Max</option>
              <option value="Timeline">Timeline</option>
              <option value="Zero">Zero</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Planned Target</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
              required
              type={form.uomType === "Timeline" ? "date" : "text"}
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Weightage (%)</span>
            <input
              className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
              required
              type="number"
              min="1"
              max="100"
              value={form.weightage}
              onChange={(e) => setForm({ ...form, weightage: e.target.value })}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-medium">Target Department / Group</span>
          <select
            className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 text-sm outline-none"
            value={form.targetDepartment}
            onChange={(e) => setForm({ ...form, targetDepartment: e.target.value })}
          >
            <option value="Sales">Sales & Business Development</option>
            <option value="Engineering">Engineering & Operations</option>
            <option value="Product">Product Management</option>
            <option value="Marketing">Growth Marketing</option>
          </select>
        </label>

        <button
          className="w-full rounded-md bg-ink hover:opacity-90 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          <ShieldCheck size={16} />
          {isSubmitting ? "Propagating Goals..." : "Propagate Locked Goals to Department"}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({ user, onLogout, darkMode, setDarkMode, triggerPreview }) {
  const [view, setView] = useState("overview");
  const nav = [
    ["overview", "Overview", ClipboardCheck],
    ["reports", "Reports", FileSpreadsheet],
    ["escalations", "Escalations", PlayCircle],
    ["analytics", "Analytics", BarChart3],
    ["shared-goals", "Shared Goals Center", ShieldCheck],
    ["audit", "Audit Log", ShieldCheck],
    ["cycle", "Cycle Management", SlidersHorizontal],
    ["users", "User Management", UserCog]
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[#dce4d8] bg-white p-5">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">Zenith</p>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="text-sm text-[#697789]">{user.name}</p>
          </div>
          <div className="mb-4 flex items-center gap-2">
            <NotificationBell user={user} />
            <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm font-medium" onClick={() => setDarkMode(!darkMode)} type="button">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
          <div className="grid gap-2">
            {nav.map(([id, label, Icon]) => (
              <button className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold ${view === id ? "bg-ink text-white" : "text-[#536272] hover:bg-[#f1f4ef]"}`} key={id} onClick={() => setView(id)} type="button">
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
          <button className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-4 py-2 text-sm font-medium" onClick={onLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </aside>
        <section className="p-6 lg:p-8">
          {view === "overview" ? <CompletionDashboard currentUser={user} /> : null}
          {view === "reports" ? <AchievementReport currentUser={user} /> : null}
          {view === "escalations" ? <EscalationDashboard /> : null}
          {view === "analytics" ? <AnalyticsPage currentUser={user} /> : null}
          {view === "shared-goals" ? <SharedGoalsCenter currentUser={user} triggerPreview={triggerPreview} /> : null}
          {view === "audit" ? <AuditLogPage /> : null}
          {view === "cycle" ? <CycleManagement /> : null}
          {view === "users" ? <UserManagement /> : null}
        </section>
      </div>
    </main>
  );
}

function EscalationDashboard() {
  const [data, setData] = useState({ escalations: [], summary: {} });
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState("");

  async function load() {
    setData(await api("/api/escalations"));
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  async function runCheck() {
    setMessage("Running escalation check...");
    setData(await api("/api/escalations/run", { method: "POST", body: JSON.stringify({}) }));
    setMessage("Escalation check completed.");
  }

  async function resolve(id) {
    await api(`/api/escalations/${id}/resolve`, { method: "PUT", body: JSON.stringify({ note: notes[id] || "Resolved by Admin" }) });
    await load();
    setMessage("Escalation resolved.");
  }

  const cards = ["Goal Sheets Overdue", "Manager Approvals Pending", "Quarterly Achievements Pending", "Manager Check-ins Pending"];

  return (
    <div>
      <PageHeader title="Escalation Dashboard" subtitle="Daily overdue detection and admin resolution workflow" />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={runCheck} type="button">
          <PlayCircle size={17} />
          Run Escalation Check Now
        </button>
        {message ? <span className="text-sm font-medium text-[#536272]">{message}</span> : null}
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <article className="rounded-lg border border-[#dce4d8] bg-white p-4" key={card}>
            <p className="text-sm font-semibold text-[#247e57]">{card}</p>
            <h3 className="mt-2 text-3xl font-semibold">{data.summary?.[card] || 0}</h3>
          </article>
        ))}
      </div>
      <div className="grid gap-3">
        {data.escalations.length ? (
          data.escalations.map((item) => (
            <article className="grid gap-3 rounded-lg border border-[#dce4d8] bg-white p-4 md:grid-cols-[1fr_auto]" key={item.id}>
              <div>
                <p className="font-semibold">{item.userName} - {item.userRole}</p>
                <p className="text-sm text-[#697789]">{item.type} - {item.daysOverdue} days overdue</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Resolved" ? "bg-[#e6f4ed] text-[#17633f]" : "bg-[#fff5df] text-[#8a5a00]"}`}>{item.status}</span>
              </div>
              {item.status === "Pending" ? (
                <div className="flex flex-col gap-2 md:w-80">
                  <input className="rounded-md border border-[#cfd9cf] px-3 py-2 text-sm" placeholder="Resolution note" value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} />
                  <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={() => resolve(item.id)} type="button">Mark Resolved</button>
                </div>
              ) : (
                <p className="text-sm text-[#697789]">{item.note}</p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-[#dce4d8] bg-white p-8 text-center">
            <p className="text-lg font-semibold">No escalations - you are all caught up.</p>
            <p className="mt-2 text-sm text-[#697789]">Run the check any time to refresh overdue status.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsPage({ currentUser, managerOnly = false }) {
  const [quarter, setQuarter] = useState("Q1");
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const colors = ["#247e57", "#ec6b5f", "#e3a72f", "#5470c6", "#8a63d2"];

  async function load() {
    const params = new URLSearchParams({ quarter, ...(managerOnly ? { managerId: currentUser.id } : {}) });
    setData(await api(`/api/analytics?${params.toString()}`));
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [quarter]);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Goal distribution, progress heatmap, QoQ trend, and completion rate" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <QuarterPicker quarter={quarter} setQuarter={setQuarter} />
      </div>
      {message ? <Notice>{message}</Notice> : null}
      {!data ? <SkeletonGrid /> : (
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard id="goal-distribution" title="Goal Distribution" onDownload={() => chartToPng("goal-distribution", "goal-distribution.png")}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.distribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
                    {data.distribution.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard id="weightage-chart" title="Average Weightage by Thrust Area" onDownload={() => chartToPng("weightage-chart", "weightage-chart.png")}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="averageWeightage" fill="#247e57" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard id="trend-chart" title="Quarter-on-Quarter Progress Trend" onDownload={() => chartToPng("trend-chart", "qoq-trend.png")}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis domain={[0, 120]} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#ec6b5f" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-lg border border-[#dce4d8] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Progress Heatmap</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      {data.heatmap[0]?.goals.map((goal) => <th className="px-3 py-2" key={goal.goalId}>{goal.goalTitle}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.heatmap.map((row) => (
                      <tr key={row.employeeId}>
                        <td className="px-3 py-2 font-semibold">{row.employeeName}</td>
                        {row.goals.map((goal) => <td className="px-3 py-2" key={goal.goalId}><HeatCell employee={row.employeeName} goal={goal} /></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <ChartCard id="completion-gauge" title={`${data.activeQuarter} Completion Rate`} onDownload={() => chartToPng("completion-gauge", "completion-rate.png")}>
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: "Completion", value: data.completionRate, fill: "#247e57" }]} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={8} />
                  <Tooltip />
                  <text x="50%" y="58%" textAnchor="middle" className="fill-[#18212f] text-3xl font-bold">{data.completionRate}%</text>
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-[#697789]">Target line: 100%</p>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ id, title, onDownload, children }) {
  return (
    <section className="rounded-lg border border-[#dce4d8] bg-white p-5 shadow-sm" id={id}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button className="inline-flex items-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm font-semibold" onClick={onDownload} type="button">
          <Download size={16} />
          PNG
        </button>
      </div>
      {children}
    </section>
  );
}

function HeatCell({ employee, goal }) {
  const band = bandForScore(goal.score);
  const colors = {
    green: "bg-[#2f9e69] text-white",
    amber: "bg-[#e3a72f] text-[#2f2612]",
    red: "bg-[#ec6b5f] text-white",
    neutral: "bg-[#d9e0e8] text-[#536272]"
  };

  return (
    <div
      className={`grid min-h-12 min-w-24 place-items-center rounded-md px-3 py-2 text-xs font-bold ${colors[band]}`}
      title={`${employee} | ${goal.goalTitle} | ${goal.label} | ${goal.quarter}`}
    >
      {goal.score === null || goal.score === undefined ? "NS" : `${Math.round(goal.score)}%`}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => <SkeletonCard key={item} />)}
      </div>
      <SkeletonCard wide />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <SkeletonCard wide />
        <SkeletonCard />
      </div>
    </div>
  );
}

function SkeletonCard({ wide = false }) {
  return (
    <div className={`rounded-lg border border-[#dce4d8] bg-white p-5 ${wide ? "min-h-72" : "min-h-80"}`}>
      <div className="mb-5 h-5 w-48 animate-pulse rounded bg-[#edf1eb]" />
      <div className="h-56 animate-pulse rounded-md bg-[#f1f4ef]" />
    </div>
  );
}

function AchievementReport({ currentUser, managerOnly = false }) {
  const [filters, setFilters] = useState({ quarter: "Q1", managerId: managerOnly ? currentUser.id : "", status: "" });
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 10 });
  const [exporting, setExporting] = useState("");
  const [message, setMessage] = useState("");

  async function load(page = data.page) {
    const params = new URLSearchParams({ ...filters, page, pageSize: data.pageSize });
    const report = await api(`/api/reports/achievement?${params.toString()}`);
    setData(report);
  }

  useEffect(() => {
    load(1).catch((error) => setMessage(error.message));
  }, [filters.quarter, filters.managerId, filters.status]);

  function mapReportRows(rows) {
    return rows.map((row) => ({
    "Employee Name": row.employeeName,
    "Goal Title": row.goalTitle,
    "Thrust Area": row.thrustArea,
    "UoM Type": row.uomType,
    "Planned Target": row.plannedTarget,
    "Actual Achievement": row.actualAchievement || "Pending",
    "Progress Score": row.progressScore,
    Status: formatStatus(row.status),
    Quarter: row.quarter
    }));
  }

  const exportRows = mapReportRows(data.rows);

  async function getAllFilteredRows() {
    const params = new URLSearchParams({ ...filters, page: 1, pageSize: 100 });
    const report = await api(`/api/reports/achievement?${params.toString()}`);
    return mapReportRows(report.rows);
  }

  async function exportCsv() {
    setExporting("csv");
    downloadBlob(`zenith-achievement-${filters.quarter}.csv`, rowsToCsv(await getAllFilteredRows()), "text/csv;charset=utf-8");
    setExporting("");
  }

  async function exportExcel() {
    setExporting("xlsx");
    exportRowsToXlsx(`zenith-achievement-${filters.quarter}.xlsx`, await getAllFilteredRows(), "Achievement Report");
    setExporting("");
  }

  return (
    <div>
      <PageHeader title="Achievement Report" subtitle="Filterable achievement data with CSV and Excel exports" />
      <div className="mb-5 grid gap-3 rounded-lg border border-[#dce4d8] bg-white p-4 md:grid-cols-4">
        <Select label="Quarter" value={filters.quarter} onChange={(value) => setFilters((current) => ({ ...current, quarter: value }))} options={quarters.map((quarter) => [quarter, `${quarter} · ${quarterMeta[quarter].window}`])} />
        <Select label="Team" value={filters.managerId} onChange={(value) => setFilters((current) => ({ ...current, managerId: value }))} options={managerOnly ? [[currentUser.id, "My Team"]] : [["", "All Teams"], ["demo-manager", "Morgan Manager"]]} />
        <Select label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={[["", "All Statuses"], ...statuses.map((status) => [status, formatStatus(status)])]} />
        <div className="flex items-end gap-2">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#cfd9cf] bg-white px-3 py-2 text-sm font-semibold" onClick={exportCsv} type="button">
            <Download size={16} />
            {exporting === "csv" ? "Exporting" : "CSV"}
          </button>
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" onClick={exportExcel} type="button">
            <FileSpreadsheet size={16} />
            {exporting === "xlsx" ? "Exporting" : "Excel"}
          </button>
        </div>
      </div>
      {message ? <Notice>{message}</Notice> : null}
      <DataTable
        columns={["Employee Name", "Goal Title", "Thrust Area", "UoM Type", "Planned Target", "Actual Achievement", "Progress Score", "Status", "Quarter"]}
        rows={exportRows}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPage={(page) => load(page)}
      />
    </div>
  );
}

function CompletionDashboard({ currentUser, managerOnly = false }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setData(await api("/api/reports/completion"));
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const employees = (data?.employeeRows || []).filter((row) => row.employeeName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Completion Dashboard" subtitle={managerOnly ? "Direct team check-in completion" : "Real-time completion status across Zenith"} />
      {message ? <Notice>{message}</Notice> : null}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {data?.summaryCards.map((card) => (
          <article className="rounded-lg border border-[#dce4d8] bg-white p-5 shadow-sm" key={card.quarter}>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">{card.quarter} · {quarterMeta[card.quarter].window}</p>
            <h3 className="mt-2 text-2xl font-semibold">{card.completed} of {card.total}</h3>
            <p className="mt-1 text-sm text-[#697789]">employees have completed check-ins</p>
          </article>
        ))}
      </div>
      <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border border-[#dce4d8] bg-white px-3 py-2">
        <Search size={16} />
        <input className="w-full bg-transparent outline-none" placeholder="Search employees" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <div className="mb-6 rounded-lg border border-[#dce4d8] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Employees</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[#536272]">
              <tr>{["Employee Name", "Goals Submitted", "Goals Approved", "Q1 Done", "Q2 Done", "Q3 Done", "Q4 Done"].map((header) => <th className="border-b border-[#edf1eb] px-3 py-2" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {employees.map((row) => (
                <tr key={row.employeeId}>
                  <td className="border-b border-[#edf1eb] px-3 py-2 font-semibold">{row.employeeName}</td>
                  <td className="border-b border-[#edf1eb] px-3 py-2">{row.goalsSubmitted}</td>
                  <td className="border-b border-[#edf1eb] px-3 py-2">{row.goalsApproved}</td>
                  {quarters.map((quarter) => <td className="border-b border-[#edf1eb] px-3 py-2" key={quarter}><StatusDot done={row.quarters[quarter]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-lg border border-[#dce4d8] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Managers</h3>
        <DataTable columns={["Manager Name", "Team Size", "Check-ins Completed", "Check-ins Pending"]} rows={(data?.managerRows || []).map((row) => ({ "Manager Name": row.managerName, "Team Size": row.teamSize, "Check-ins Completed": row.checkInsCompleted, "Check-ins Pending": row.checkInsPending }))} />
      </div>
    </div>
  );
}

function AuditLogPage() {
  const [filters, setFilters] = useState({ from: "", to: "", employeeName: "" });
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 10 });
  const [message, setMessage] = useState("");

  async function load(page = data.page) {
    const params = new URLSearchParams({ ...filters, page, pageSize: data.pageSize });
    setData(await api(`/api/audit-logs?${params.toString()}`));
  }

  useEffect(() => {
    load(1).catch((error) => setMessage(error.message));
  }, [filters.from, filters.to, filters.employeeId]);

  const rows = data.rows.map((row) => ({
    Timestamp: new Date(row.timestamp).toLocaleString(),
    User: row.user,
    Role: row.role,
    "Goal Title": row.goalTitle,
    "Field Changed": row.fieldChanged,
    "Old Value": row.oldValue,
    "New Value": row.newValue
  }));

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Admin-only governance trail for locked-goal changes" />
      <div className="mb-5 grid gap-3 rounded-lg border border-[#dce4d8] bg-white p-4 md:grid-cols-4">
        <Input label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
        <Input label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        <Input label="Employee name" value={filters.employeeName} onChange={(value) => setFilters((current) => ({ ...current, employeeName: value }))} />
        <div className="flex items-end">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={() => downloadBlob("zenith-audit-log.csv", rowsToCsv(rows), "text/csv;charset=utf-8")} type="button">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
      {message ? <Notice>{message}</Notice> : null}
      <DataTable columns={["Timestamp", "User", "Role", "Goal Title", "Field Changed", "Old Value", "New Value"]} rows={rows} page={data.page} pageSize={data.pageSize} total={data.total} onPage={(page) => load(page)} />
    </div>
  );
}

function CycleManagement() {
  const [cycle, setCycle] = useState({ activeCycleYear: 2026, windows: [] });
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null);

  async function load() {
    setCycle(await api("/api/admin/cycle"));
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  async function save(nextCycle = cycle) {
    const saved = await api("/api/admin/cycle", { method: "PUT", body: JSON.stringify(nextCycle) });
    setCycle(saved);
    setMessage("Cycle settings saved.");
  }

  function toggleQuarter(quarter) {
    const windows = quarters.map((item) => {
      const current = cycle.windows.find((window) => window.quarter === item);
      return item === quarter ? { quarter: item, isOpen: !current?.isOpen } : { quarter: item, isOpen: Boolean(current?.isOpen) };
    });
    setConfirm({ title: `Change ${quarter} window?`, body: "This admin action changes whether employees can submit achievements.", action: () => save({ ...cycle, windows }) });
  }

  return (
    <div>
      <PageHeader title="Cycle Management" subtitle="Set active goal cycle and quarter window controls" />
      {message ? <Notice>{message}</Notice> : null}
      <div className="mb-5 rounded-lg border border-[#dce4d8] bg-white p-5">
        <Input label="Active goal cycle year" type="number" value={cycle.activeCycleYear} onChange={(value) => setCycle((current) => ({ ...current, activeCycleYear: value }))} />
        <button className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={() => setConfirm({ title: "Save cycle year?", body: "This will update the active goal cycle year.", action: () => save() })} type="button">Save cycle</button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {quarters.map((quarter) => {
          const window = cycle.windows.find((item) => item.quarter === quarter);
          return (
            <article className="rounded-lg border border-[#dce4d8] bg-white p-5" key={quarter}>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">{quarter}</p>
              <p className="text-sm text-[#697789]">{quarterMeta[quarter].window}</p>
              <h3 className="mt-2 text-2xl font-semibold">{window?.isOpen ? "Open" : "Closed"}</h3>
              <button className={`mt-4 w-full rounded-md px-4 py-2 text-sm font-semibold ${window?.isOpen ? "border border-[#cfd9cf] bg-white" : "bg-ink text-white"}`} onClick={() => toggleQuarter(quarter)} type="button">
                {window?.isOpen ? `Close ${quarter}` : `Open ${quarter}`}
              </button>
            </article>
          );
        })}
      </div>
      {confirm ? <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} /> : null}
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [org, setOrg] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null);

  async function load() {
    const [userData, goalData, orgData] = await Promise.all([api("/api/admin/users"), api(`/api/admin/goals?search=${encodeURIComponent(search)}`), api("/api/admin/org")]);
    setUsers(userData.users);
    setGoals(goalData.goals);
    setOrg(orgData.org);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [search]);

  async function unlockGoal(goal) {
    await api(`/api/admin/unlock-goal/${goal.id}`, { method: "POST", body: JSON.stringify({}) });
    setMessage(`${goal.title} unlocked and audit logged.`);
    await load();
  }

  async function reassign(userId, managerId) {
    await api(`/api/admin/user/${userId}/manager`, { method: "PUT", body: JSON.stringify({ managerId }) });
    setMessage("Manager assignment updated.");
    await load();
  }

  const managers = users.filter((user) => user.role === "Manager");

  return (
    <div>
      <PageHeader title="User Management" subtitle="Goal unlocks, reporting managers, and org hierarchy" />
      {message ? <Notice>{message}</Notice> : null}
      <div className="mb-6 rounded-lg border border-[#dce4d8] bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold">Goal Unlock</h3>
        <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border border-[#dce4d8] px-3 py-2">
          <Search size={16} />
          <input className="w-full outline-none" placeholder="Search employee or goal" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="grid gap-3">
          {goals.slice(0, 5).map((goal) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#edf1eb] p-3 hover:bg-slate-50 transition" key={goal.id}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{goal.employee.name}</span>
                    <span className="text-[#a1b0c0] font-light">·</span>
                    <span className="text-slate-600 font-medium">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#697789]">{goal.thrustArea}</span>
                    <span className="text-[#a1b0c0] font-light">·</span>
                    <span className="text-xs text-[#697789]">{goal.uomType} UoM</span>
                    <span className="text-[#a1b0c0] font-light">·</span>
                    {goal.isLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <LockKeyhole size={10} /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <Unlock size={10} /> Unlocked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  goal.isLocked 
                    ? "bg-ink hover:bg-ink/90 text-white" 
                    : "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed"
                }`} 
                onClick={() => {
                  if (!goal.isLocked) return;
                  setConfirm({ 
                    title: "Are you sure you want to unlock this goal?", 
                    body: "This will unlock all quarterly achievements for this goal and record it in the audit trail.", 
                    action: () => unlockGoal(goal) 
                  });
                }} 
                disabled={!goal.isLocked}
                type="button"
              >
                {goal.isLocked ? (
                  <>
                    <Unlock size={14} /> Unlock
                  </>
                ) : (
                  <>
                    <Unlock size={14} /> Unlocked
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6 rounded-lg border border-[#dce4d8] bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold">Users</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr>{["Name", "Role", "Manager"].map((header) => <th className="border-b border-[#edf1eb] px-3 py-2" key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="border-b border-[#edf1eb] px-3 py-2 font-semibold">{user.name}</td>
                  <td className="border-b border-[#edf1eb] px-3 py-2">{user.role}</td>
                  <td className="border-b border-[#edf1eb] px-3 py-2">
                    {user.role === "Employee" ? (
                      <select className="rounded-md border border-[#cfd9cf] px-2 py-1" value={user.managerId || ""} onChange={(event) => setConfirm({ title: "Change reporting manager?", body: "This admin action updates the org hierarchy and is audit logged.", action: () => reassign(user.id, event.target.value) })}>
                        <option value="">Unassigned</option>
                        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                      </select>
                    ) : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-lg border border-[#dce4d8] bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold">Org Hierarchy</h3>
        {org.map((leader) => (
          <div className="mb-4" key={leader.id}>
            <p className="font-semibold">{leader.name} · {leader.role}</p>
            <div className="mt-2 grid gap-2 pl-4">
              {leader.reports.map((report) => <p className="rounded-md bg-[#f7f8f4] px-3 py-2 text-sm" key={report.id}>{report.name} · {report.role}</p>)}
            </div>
          </div>
        ))}
      </div>
      {confirm ? <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} /> : null}
    </div>
  );
}

function DataTable({ columns, rows, page = 1, pageSize = rows.length || 10, total = rows.length, onPage }) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  return (
    <div className="rounded-lg border border-[#dce4d8] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#fbfcf8] text-[#536272]">
            <tr>{columns.map((column) => <th className="border-b border-[#edf1eb] px-4 py-3 font-semibold" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className={index % 2 ? "bg-[#fbfcf8]" : "bg-white"} key={`${index}-${columns[0]}`}>
                {columns.map((column) => <td className="border-b border-[#edf1eb] px-4 py-3" key={column}>{row[column]}</td>)}
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-4 py-6 text-center text-[#697789]" colSpan={columns.length}>No rows found</td></tr> : null}
          </tbody>
        </table>
      </div>
      {onPage ? (
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span>Page {page} of {pageCount} · {total} rows</span>
          <div className="flex gap-2">
            <button className="rounded-md border border-[#cfd9cf] px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => onPage(page - 1)} type="button">Previous</button>
            <button className="rounded-md border border-[#cfd9cf] px-3 py-1 disabled:opacity-50" disabled={page >= pageCount} onClick={() => onPage(page + 1)} type="button">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#247e57]">Zenith</p>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="mt-1 text-[#697789]">{subtitle}</p>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="w-full rounded-md border border-[#cfd9cf] px-3 py-2 outline-none" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Notice({ children }) {
  return <p className="mb-5 rounded-md border border-[#dce4d8] bg-white px-4 py-3 text-sm font-medium text-[#536272]">{children}</p>;
}

function StatusDot({ done }) {
  return <span className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-[#e6f4ed] text-[#17633f]" : "bg-[#fff1f0] text-[#a13a31]"}`}>{done ? "✓" : "×"}</span>;
}

function ConfirmModal({ confirm, onClose }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    if (loading) return;
    setLoading(true);
    try {
      await confirm.action();
    } catch (err) {
      console.error("Action failed:", err);
      alert(err.message || "An error occurred.");
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-xl font-semibold text-slate-900">{confirm.title}</h3>
        <p className="mt-3 leading-7 text-[#586575]">{confirm.body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button 
            className="rounded-md border border-[#cfd9cf] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition" 
            onClick={onClose} 
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button 
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-75 transition min-w-[90px] justify-center" 
            onClick={run} 
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-[#edf1eb] bg-[#fbfcf8] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#697789]">{label}</p>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
