<div align="center">

# 🚀 ZENITH
### **Next-Gen Enterprise Goal Alignment & Performance Analytics Portal**

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)](https://vite.dev/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**Zenith** is a premium, enterprise-grade Performance Alignment portal that seamlessly bridges the gap between annual corporate OKR setting, quarterly manager-employee check-in reviews, and leadership governance.

[✨ Live Demo Link](https://zenith-mu-khaki.vercel.app/) · [🐞 Report Bug](https://github.com/Arshita1510-coder/Zenith/issues) · [💡 Request Feature](https://github.com/Arshita1510-coder/Zenith/issues)

</div>

---

## 📖 The Problem & The Solution

### **The Problem**
Annual goal setting is typically treated as a static administrative chore. Goals are drafted in spreadsheets, forgotten in email chains, and decoupled from actual weekly operations. When quarterly reviews arrive, managers have no audited metrics, leading to subjective performance scoring, unaligned targets, and operational overhead.

### **The Zenith Solution**
Zenith automates the operational OKR pipeline into a single, cohesive governance engine. It enforces strict **Employee drafting and manager approval workflows**, enables **real-time actual achievement tracking**, auto-calculates scores based on measurable UoMs (Units of Measure), and provides leadership with granular completions, analytics charts, and automated team escalations.

---

## 🏗️ System Architecture

Zenith is constructed using a robust three-tier decoupled architecture designed for high security, low latency, and 100% demo availability.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      🚀 ZENITH PLATFORM ARCHITECTURE                   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 💻 PRESENTATION TIER (Vite + React 19 SPA)                             │
├────────────────────────────────────────────────────────────────────────┤
│  • UI/UX: Tailwind CSS (Dark Mode Toggle), Lucide Icons, Glassmorphism │
│  • Workflows: Goal Sheets, Quarterly Check-ins, Role Switcher (Demo)   │
│  • Analytics & Data: Recharts (Visual Dashboards), XLSX (Exports)      │
│  • Feedback: Dynamic Banners, PreviewDrawer (Adaptive Cards/Emails)    │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │  JSON / HTTPS via REST API
                                   │  (Secured with JWT Headers)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ⚙️ APPLICATION TIER (Node.js + Express Server)                         │
├────────────────────────────────────────────────────────────────────────┤
│  • Security Engine: JWT Session Management & bcryptjs Password Hashing │
│  • RBAC Gateway: Strict routing for Employees, Managers, and Admins    │
│  • Core Logic: Score Calculation Engine (Green/Amber/Red banding)      │
│  • Workflow Engine: Approval/Rework Cycles & Goal Escalation System    │
│  • Services: Notification Dispatcher & Comprehensive Audit Trails      │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │  Prisma ORM Queries
                                   │  (Automated Failover Routing)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 🗄️ PERSISTENCE TIER (Dual-Mode Engine)                                 │
├──────────────────────────────────────┬─────────────────────────────────┤
│        🟢 PRIMARY DATA STORE         │      🔴 FAILOVER LAYER          │
│                                      │                                 │
│     Supabase PostgreSQL Database     │     demoStore.js (Hot-Swap)     │
│   (Relational Data & Audit Logging)  │   (Guarantees 100% Demo Uptime) │
└──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 🌟 Premium Features

### 🔑 Robust Authorization & Security
*   **JWT Protected Sessions**: Security middleware locks route access dynamically. Access headers ensure complete backend protection.
*   **Role-Based Access Control (RBAC)**: Strict gateways map permissions cleanly to `Employee`, `Manager`, or `Admin`.
*   **Password Hashing**: Industry-standard `bcryptjs` hashing prevents clear-text credential exposures.
*   **DDoS Safe**: Express-based rate limiters shield core entrypoints (Max 10 login attempts/min).

### 📈 Employee Lifecycle Dashboard
*   **Interactive Drafting Engine**: Draft, add, edit, and assign goals with target UoMs (`Min`, `Max`, `Zero`, `Timeline`).
*   **100% Weightage Rule Guard**: Dynamic frontend indicators warn employees to balance goal weights exactly to 100% before submitting.
*   **Real-time Achievement Logger**: Seamlessly submit quarterly actual completions. Performance indexes are calculated instantly.

### 👥 Manager Governance Console
*   **Goal Edit & Lock**: Edit and lock planned targets or weightages during active review cycles.
*   **Inline Approvals & Returns**: Approve goal sheets with one click, or send them back for rework with custom check-in notes.
*   **Team Performance Board**: View aggregated check-in records, discussion logs, and completion rates.

### 🛡️ Administrative Control Tower
*   **Cycle Management**: Lock/unlock quarterly performance evaluation windows.
*   **Reassign Managers**: Re-route hierarchy pathways instantly. Changes are recorded in audit logs.
*   **Audit Logger**: Live auditing tracks all critical administrative interventions (such as unlocking a goal or manual target modifications).

### 💡 Hackathon Demo Highlights
*   **Instant Role-Switcher**: A developer-friendly sandbox bar lets judges switch roles (`Employee` ⇄ `Manager` ⇄ `Admin`) instantly without logging out.
*   **Ethereal Mail Previews**: View simulated Microsoft Teams & SMTP adaptive cards and approval email notification payloads inside mock panels.
*   **Interactive Analytics**: Visually inspect team alignments via gorgeous **Recharts** metrics (Goal Distributions, heatmaps, gauge trackers).
*   **Smooth Dark Mode**: Seamlessly transition from professional Light theme to a gorgeous Ink/Slate dark dashboard.
*   **One-Click Excel Exports**: Instantly download compiled worksheets with formatted CSV/XLSX downloads.

---

## ⚙️ Quick Start Installation

Follow these steps to spin up the full production stack on your local workspace:

### **1. Clone the Project**
```bash
git clone https://github.com/Arshita1510-coder/Zenith.git
cd Zenith
```

### **2. Install All Dependencies**
This repository uses a zero-configuration global installer:
```bash
npm run install:all
```

### **3. Configure Environment Variables**
Create your environment configurations by copying templates:
```bash
cp .env.example .env
cp server/.env.example server/.env
```

Ensure your `server/.env` contains the required keys:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.hfngakvgrdgvrjobjkqq.supabase.co:5432/postgres?schema=public"
JWT_SECRET="zenith-hackathon-super-secret-key-2026"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
```

### **4. Run Database Setup**
Apply Prisma DB migrations and seed the core demo environment:
```bash
npm run prisma:migrate
npm run seed
```

### **5. Start Development Servers**
```bash
npm run dev
```

Open your local host at **`http://localhost:5173`** to interact with the platform!

---

## 🧪 Hackathon Demo Sandbox Accounts

Use these pre-loaded seed accounts to immediately evaluate the role-based workflows:

| Role | Seed Email | Secure Password | Features to Review |
|---|---|---|---|
| **Employee** | `employee@atomquest.test` | `Password123!` | Goal drafting, weightage checks, achievement updates |
| **Manager** | `manager@atomquest.test` | `Password123!` | Inline target corrections, check-in comments, cycle returns |
| **Administrator** | `admin@atomquest.test` | `Password123!` | Reassign managers, lock cycle windows, inspect audit trails |

---

## 📸 Screenshots

Here is a visual walkthrough of the Zenith Performance Alignment & Analytics Portal:

### 🔑 Sleek Login Portal
The gateway to Zenith. Users can experience the dynamic role selection with one click.
![Zenith Login Page](docs/screenshots/login.png)

### 📈 Employee Lifecycle Dashboard
Designed for maximum productivity. Employees can draft goals, balance weightages, track milestones, and log achievements in real time.
![Zenith Employee Dashboard](docs/screenshots/employee_dashboard.png)

### 👥 Manager Governance Console
Enables seamless review cycles. Managers can update team targets, check-in, and approve/return goal sheets.
![Zenith Manager Dashboard](docs/screenshots/manager_dashboard.png)

### 🛡️ Administrative Control Tower
Complete cycle control. Admin can toggle quarter windows, reassign organizational pathways, and review live audit trails and Recharts analytics.
![Zenith Admin Dashboard](docs/screenshots/admin_dashboard.png)

---

## 🛠️ Dual-Mode Persistence Fallback
To guarantee **100% demo uptime and smooth judge assessments**, Zenith utilizes a smart fallback connection layer. If the hosted database (Supabase PostgreSQL) encounters network latency, firewall blocks, or latency issues during evaluation, Zenith's server will transparently switch all query routing to **`demoStore.js`** (hot-swapping in-memory simulator). 

This guarantees judges can click through the demo at lightning speed under any network conditions!
