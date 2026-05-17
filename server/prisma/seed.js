import bcrypt from "bcryptjs";
import { GoalSheetStatus, GoalStatus, PrismaClient, Role, UomType } from "@prisma/client";

const prisma = new PrismaClient();

const demoPassword = "Password123!";

async function upsertUser({ name, email, role, managerId = null, department = null }) {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, managerId, department, passwordHash },
    create: { name, email, role, managerId, department, passwordHash }
  });
}

async function main() {
  const manager = await upsertUser({
    name: "Morgan Manager",
    email: "manager@atomquest.test",
    role: Role.Manager,
    department: "Revenue"
  });

  const employee = await upsertUser({
    name: "Emery Employee",
    email: "employee@atomquest.test",
    role: Role.Employee,
    managerId: manager.id,
    department: "Revenue"
  });

  const employee2 = await upsertUser({
    name: "Rowan Reporter",
    email: "rowan@atomquest.test",
    role: Role.Employee,
    managerId: manager.id,
    department: "Revenue"
  });

  const employee3 = await upsertUser({
    name: "Casey Contributor",
    email: "casey@atomquest.test",
    role: Role.Employee,
    managerId: manager.id,
    department: "Operations"
  });

  const admin = await upsertUser({
    name: "Avery Admin",
    email: "admin@atomquest.test",
    role: Role.Admin,
    department: "People Ops"
  });

  await Promise.all([employee, employee2, employee3].map((seedEmployee) => seedGoalsForEmployee(seedEmployee)));

  await Promise.all(
    ["Q1", "Q2", "Q3", "Q4"].map((quarter) =>
      prisma.quarterWindow.upsert({
        where: { quarter },
        update: { isOpen: quarter === "Q1" || quarter === "Q2", updatedBy: admin.id },
        create: { quarter, isOpen: quarter === "Q1" || quarter === "Q2", updatedBy: admin.id }
      })
    )
  );

  console.info("Seeded demo users:");
  [
    { role: employee.role, email: employee.email, password: demoPassword, manager: manager.email },
    { role: manager.role, email: manager.email, password: demoPassword },
    { role: admin.role, email: admin.email, password: demoPassword }
  ].forEach((user) => console.info(`${user.role}: ${user.email} / ${user.password}`));
}

async function seedGoalsForEmployee(employee) {
  const sheet = await prisma.goalSheet.upsert({
    where: { employeeId_cycleYear: { employeeId: employee.id, cycleYear: 2026 } },
    update: {
      status: GoalSheetStatus.Approved,
      submittedAt: new Date("2026-06-20T10:00:00.000Z"),
      approvedAt: new Date("2026-06-25T10:00:00.000Z")
    },
    create: {
      employeeId: employee.id,
      cycleYear: 2026,
      status: GoalSheetStatus.Approved,
      submittedAt: new Date("2026-06-20T10:00:00.000Z"),
      approvedAt: new Date("2026-06-25T10:00:00.000Z")
    }
  });

  await prisma.goal.deleteMany({ where: { goalSheetId: sheet.id } });
  await prisma.goal.createMany({
    data: [
      {
        goalSheetId: sheet.id,
        thrustArea: "Growth",
        title: "Sales revenue",
        description: "Deliver new-business revenue for the cycle.",
        uomType: UomType.Min,
        target: "100000",
        weightage: 30,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: sheet.id,
        thrustArea: "Operations",
        title: "Customer turnaround time",
        description: "Keep average resolution TAT under the planned ceiling.",
        uomType: UomType.Max,
        target: "48",
        weightage: 20,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: sheet.id,
        thrustArea: "Delivery",
        title: "Enablement launch",
        description: "Complete the enablement rollout by the committed date.",
        uomType: UomType.Timeline,
        target: "2026-07-30",
        weightage: 20,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: sheet.id,
        thrustArea: "Risk",
        title: "Safety incidents",
        description: "Maintain zero reportable incidents.",
        uomType: UomType.Zero,
        target: "0",
        weightage: 15,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: sheet.id,
        thrustArea: "Capability",
        title: "Training completions",
        description: "Complete assigned learning modules for the team charter.",
        uomType: UomType.Min,
        target: "10",
        weightage: 15,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      }
    ]
  });

  const createdGoals = await prisma.goal.findMany({ where: { goalSheetId: sheet.id } });
  
  const checkIn = await prisma.checkIn.create({
    data: {
      goalSheetId: sheet.id,
      managerId: employee.managerId,
      quarter: "Q1",
      comment: "Good progress on all fronts so far this quarter.",
      isCompleted: true
    }
  });

  await prisma.achievement.createMany({
    data: createdGoals.map(goal => {
      let actual, scorePercent, scoreLabel;
      if (goal.title === "Sales revenue") { actual = "85000"; scorePercent = 85; scoreLabel = "On Track"; }
      else if (goal.title === "Customer turnaround time") { actual = "45"; scorePercent = 100; scoreLabel = "Exceeds"; }
      else if (goal.title === "Enablement launch") { actual = "2026-06-15"; scorePercent = 100; scoreLabel = "Completed"; }
      else if (goal.title === "Safety incidents") { actual = "0"; scorePercent = 100; scoreLabel = "On Track"; }
      else { actual = "5"; scorePercent = 50; scoreLabel = "Needs Focus"; }

      return {
        goalId: goal.id,
        quarter: "Q1",
        actual,
        progressStatus: "In Progress",
        scorePercent,
        scoreLabel,
      };
    })
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
