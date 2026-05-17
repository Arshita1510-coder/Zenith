# Zenith

## Structure

- `client`: React + Vite + Tailwind CSS frontend on port `5173`
- `server`: Express + Prisma backend on port `3001`
- `server/prisma/schema.prisma`: PostgreSQL schema and relationships
- `server/prisma/seed.js`: demo users for Employee, Manager, and Admin

## Demo Credentials

All seeded users use password `Password123!`.

- Employee: `employee@atomquest.test`
- Manager: `manager@atomquest.test`
- Admin: `admin@atomquest.test`

The employee is assigned to the manager through `User.managerId`.

## Local Setup

1. Start PostgreSQL and create a database named `goal_tracking_portal`.
2. Confirm `server/.env` points at the database:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/goal_tracking_portal?schema=public"
JWT_SECRET="use-a-long-random-secret"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
```

3. Install dependencies:

```bash
npm run install:all
```

4. Generate Prisma Client, migrate, and seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5. Run both apps:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.
