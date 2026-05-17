# Zenith

Goal achievement tracking for employees, managers, and admins.

## Problem Statement

Zenith solves the messy handoff between annual goal setting, quarterly achievement tracking, and manager check-ins. Employees can submit structured goal sheets with measurable targets, managers can approve and review progress, and admins can govern the full cycle. The portal also gives leadership visibility into completion, overdue actions, audit logs, and analytics.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Lucide icons, Recharts, XLSX
- Backend: Node.js, Express, JWT auth, bcrypt password hashing
- Database: PostgreSQL with Prisma ORM
- Auth: Email/password login with role-based JWT middleware
- Reporting: CSV/XLSX exports, Recharts visual analytics

## Architecture Diagram

```mermaid
flowchart LR
  Browser["Browser"] --> React["React Frontend"]
  React --> API["Express API"]
  API --> Auth["JWT Auth + Role Middleware"]
  Auth --> DB["PostgreSQL DB via Prisma"]
```

## Features List

- Employee goal sheet creation, draft saving, validation, and submission
- Manager review workflow with target edits, approval, and return comments
- Quarterly achievement updates for Min, Max, Timeline, and Zero UoM goals
- Automatic progress scoring with green, amber, red, and neutral bands
- Admin-controlled quarterly check-in windows
- Structured manager check-ins with completion tracking
- Achievement report with filters, pagination, CSV export, and Excel export
- Completion dashboard by employee, manager, and quarter
- Audit log for admin unlocks and manager target edits
- User hierarchy management and manager reassignment
- JWT-protected role access for Employee, Manager, and Admin

## Bonus Features

- Escalation engine with manual demo trigger and daily-overdue rules
- Admin escalation dashboard with resolution notes
- Analytics module with goal distribution, weightage, QoQ trend, progress heatmap, and completion gauge
- In-app notification bell with unread count and read state
- Demo Ethereal preview URL logging for approval/escalation emails
- Dark mode toggle persisted in localStorage
- Responsive layouts for desktop, tablet, and mobile
- Skeleton loading states and empty states
- Login rate limiting at 10 attempts per minute per IP

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/Arshita1510-coder/Zenith.git
   cd Zenith
   ```

2. Install dependencies:

   ```bash
   npm run install:all
   ```

3. Create environment files:

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

4. Fill in `server/.env`:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
   JWT_SECRET="use-a-long-random-secret"
   PORT=3001
   CLIENT_ORIGIN="http://localhost:5173"
   ```

5. Run Prisma migrations and seed data:

   ```bash
   npm run prisma:migrate
   npm run seed
   ```

6. Start the dev servers:

   ```bash
   npm run dev
   ```

7. Open the frontend:

   ```text
   http://localhost:5173
   ```

If PostgreSQL is not configured, the API falls back to the seeded in-memory demo store so judges can still test the main flows.

## Demo Credentials

| Email | Password | Role |
| --- | --- | --- |
| employee@atomquest.test | Password123! | Employee |
| manager@atomquest.test | Password123! | Manager |
| admin@atomquest.test | Password123! | Admin |

## Known Limitations

- Google SSO is not implemented; email/password login remains the supported flow.
- Email sending is demo-mode only: the app logs Ethereal-style preview URLs rather than sending real SMTP mail.
- The in-memory demo store resets when the server restarts.
- Shared goal propagation is represented through shared goal flags and common reporting, not a full many-employee shared-goal table.
