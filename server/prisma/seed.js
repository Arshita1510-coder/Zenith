import bcrypt from "bcryptjs";
import { GoalSheetStatus, GoalStatus, PrismaClient, Role, UomType, ProgressStatus, Quarter } from "@prisma/client";

const prisma = new PrismaClient();
const demoPassword = "Password123!";

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.info("Cleaning up existing database tables...");
  // Clear tables in dependency order to prevent foreign key constraint violations
  await prisma.notification.deleteMany({});
  await prisma.escalation.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.goalSheet.deleteMany({});
  await prisma.quarterWindow.deleteMany({});
  await prisma.user.deleteMany({});

  console.info("Generating secure password hash...");
  const passwordHash = await hashPassword(demoPassword);

  // 1. Seed Users (Manager, Employees, Admin)
  console.info("Seeding corporate structure and users...");
  const manager = await prisma.user.create({
    data: {
      name: "Morgan Manager",
      email: "manager@atomquest.com",
      role: Role.Manager,
      department: "Revenue & Sales Operations",
      passwordHash
    }
  });

  const employee = await prisma.user.create({
    data: {
      name: "Emery Employee",
      email: "employee@atomquest.com",
      role: Role.Employee,
      managerId: manager.id,
      department: "Revenue & Sales Operations",
      passwordHash
    }
  });

  const employee2 = await prisma.user.create({
    data: {
      name: "Rowan Reporter",
      email: "rowan@atomquest.com",
      role: Role.Employee,
      managerId: manager.id,
      department: "Revenue & Sales Operations",
      passwordHash
    }
  });

  const employee3 = await prisma.user.create({
    data: {
      name: "Casey Contributor",
      email: "casey@atomquest.com",
      role: Role.Employee,
      managerId: manager.id,
      department: "Corporate Operations",
      passwordHash
    }
  });

  const admin = await prisma.user.create({
    data: {
      name: "Avery Admin",
      email: "admin@atomquest.com",
      role: Role.Admin,
      department: "People Operations & Compliance",
      passwordHash
    }
  });

  // 2. Seed Quarter Windows
  console.info("Seeding performance quarters settings...");
  await prisma.quarterWindow.createMany({
    data: [
      { quarter: Quarter.Q1, isOpen: false, updatedBy: admin.id },
      { quarter: Quarter.Q2, isOpen: true, updatedBy: admin.id }, // Currently in Q2
      { quarter: Quarter.Q3, isOpen: false, updatedBy: admin.id },
      { quarter: Quarter.Q4, isOpen: false, updatedBy: admin.id }
    ]
  });

  // 3. Seed Goal Sheets & Achievements

  // --- USER 1: EMERY EMPLOYEE (Approved Goal Sheet with Q1 achievements) ---
  console.info("Seeding Approved goals & achievements for Emery Employee...");
  const emerySheet = await prisma.goalSheet.create({
    data: {
      employeeId: employee.id,
      cycleYear: 2026,
      status: GoalSheetStatus.Approved,
      submittedAt: new Date("2026-01-05T09:30:00Z"),
      approvedAt: new Date("2026-01-08T14:15:00Z")
    }
  });

  const emeryGoals = await prisma.goal.createMany({
    data: [
      {
        goalSheetId: emerySheet.id,
        thrustArea: "Revenue Growth",
        title: "Enterprise Revenue Pipeline",
        description: "Close $150K in recurring corporate contract revenue.",
        uomType: UomType.Min,
        target: "150000",
        weightage: 35,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: emerySheet.id,
        thrustArea: "Client CSAT",
        title: "Client Satisfaction Metrics",
        description: "Maintain customer feedback score average at or above 4.7/5.",
        uomType: UomType.Min,
        target: "4.7",
        weightage: 20,
        status: GoalStatus.Active,
        isShared: false,
        isLocked: true
      },
      {
        goalSheetId: emerySheet.id,
        thrustArea: "SLA Optimization",
        title: "Support Escalation Resolution TAT",
        description: "Resolve critical support issues within a maximum average ceiling of 24 hours.",
        uomType: UomType.Max,
        target: "24",
        weightage: 15,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: emerySheet.id,
        thrustArea: "Cybersecurity Compliance",
        title: "Zero Security Vulnerability Audits",
        description: "Enforce zero open high-risk regulatory gaps.",
        uomType: UomType.Zero,
        target: "0",
        weightage: 15,
        status: GoalStatus.Active,
        isShared: true,
        isLocked: true
      },
      {
        goalSheetId: emerySheet.id,
        thrustArea: "Talent Development",
        title: "Enterprise Architecture Certification",
        description: "Acquire full AWS Solutions Architect Professional certification by Q2 end.",
        uomType: UomType.Timeline,
        target: "2026-06-30",
        weightage: 15,
        status: GoalStatus.Active,
        isShared: false,
        isLocked: true
      }
    ]
  });

  // Get Emery's seeded goals to bind achievements
  const emeryGoalRecords = await prisma.goal.findMany({ where: { goalSheetId: emerySheet.id } });

  // Add Q1 achievements for Emery Employee (Completed & Evaluated)
  await prisma.achievement.createMany({
    data: emeryGoalRecords.map(goal => {
      let actual, progressStatus, scorePercent, scoreLabel;
      if (goal.title === "Enterprise Revenue Pipeline") {
        actual = "165000"; // Exceeded target ($165k vs $150k target)
        progressStatus = ProgressStatus.Completed;
        scorePercent = 110.0;
        scoreLabel = "Outstanding (110%)";
      } else if (goal.title === "Client Satisfaction Metrics") {
        actual = "4.8"; // Exceeded target (4.8 vs 4.7 target)
        progressStatus = ProgressStatus.OnTrack;
        scorePercent = 102.1;
        scoreLabel = "Exceeds Expectations (102%)";
      } else if (goal.title === "Support Escalation Resolution TAT") {
        actual = "21.5"; // Under the maximum TAT (21.5 hrs vs 24 target)
        progressStatus = ProgressStatus.OnTrack;
        scorePercent = 100.0;
        scoreLabel = "Achieved (100%)";
      } else if (goal.title === "Zero Security Vulnerability Audits") {
        actual = "0"; // Met target perfectly
        progressStatus = ProgressStatus.Completed;
        scorePercent = 100.0;
        scoreLabel = "Achieved (100%)";
      } else {
        actual = "In Progress"; // Timeline goal
        progressStatus = ProgressStatus.OnTrack;
        scorePercent = 80.0;
        scoreLabel = "On Track (80%)";
      }
      return {
        goalId: goal.id,
        quarter: Quarter.Q1,
        actual,
        progressStatus,
        scorePercent,
        scoreLabel,
        isLocked: true
      };
    })
  });

  // Emery's Q1 Check-in completed by Manager
  await prisma.checkIn.create({
    data: {
      goalSheetId: emerySheet.id,
      managerId: manager.id,
      quarter: Quarter.Q1,
      comment: "Emery had a spectacular Q1! Enterprise pipeline revenue closed at $165K, exceeding our expectations. Cyber compliance was perfect, and customer satisfaction remains top-tier. Keep it up!",
      isCompleted: true
    }
  });

  // Emery's Q2 Achievements entered (Still pending review / draft stats)
  await prisma.achievement.createMany({
    data: emeryGoalRecords.map(goal => {
      let actual, progressStatus, scorePercent, scoreLabel;
      if (goal.title === "Enterprise Revenue Pipeline") {
        actual = "110000"; // Mid-way through Q2 target
        progressStatus = ProgressStatus.OnTrack;
        scorePercent = 73.3;
        scoreLabel = "In Progress (73%)";
      } else if (goal.title === "Client Satisfaction Metrics") {
        actual = "4.5"; // Slightly below target (needs focus)
        progressStatus = ProgressStatus.AtRisk;
        scorePercent = 95.7;
        scoreLabel = "At Risk (95.7%)";
      } else if (goal.title === "Support Escalation Resolution TAT") {
        actual = "26.8"; // Exceeds Max allowed resolution TAT (26.8 vs 24 max target)
        progressStatus = ProgressStatus.Behind;
        scorePercent = 88.3;
        scoreLabel = "Behind (88.3%)";
      } else if (goal.title === "Zero Security Vulnerability Audits") {
        actual = "1"; // Critical issue: 1 open gap detected
        progressStatus = ProgressStatus.Behind;
        scorePercent = 0.0;
        scoreLabel = "Needs Action (0%)";
      } else {
        actual = "Completed"; // Completed AWS Architect certification early!
        progressStatus = ProgressStatus.Completed;
        scorePercent = 100.0;
        scoreLabel = "Achieved (100%)";
      }
      return {
        goalId: goal.id,
        quarter: Quarter.Q2,
        actual,
        progressStatus,
        scorePercent,
        scoreLabel,
        isLocked: false
      };
    })
  });

  // --- USER 2: ROWAN REPORTER (Goal Sheet Submitted & Pending Manager Approval) ---
  console.info("Seeding Submitted Goals for Rowan Reporter (Pending approval)...");
  const rowanSheet = await prisma.goalSheet.create({
    data: {
      employeeId: employee2.id,
      cycleYear: 2026,
      status: GoalSheetStatus.Submitted,
      submittedAt: new Date("2026-05-15T11:45:00Z")
    }
  });

  await prisma.goal.createMany({
    data: [
      {
        goalSheetId: rowanSheet.id,
        thrustArea: "Revenue Growth",
        title: "Mid-Market Strategy Sales",
        description: "Scale sales in the mid-market SaaS tier by $80K.",
        uomType: UomType.Min,
        target: "80000",
        weightage: 30,
        status: GoalStatus.Draft,
        isShared: true,
        isLocked: false
      },
      {
        goalSheetId: rowanSheet.id,
        thrustArea: "Operations",
        title: "Reduce Onboarding Duration",
        description: "Reduce customer onboarding process TAT down to 10 days.",
        uomType: UomType.Max,
        target: "10",
        weightage: 25,
        status: GoalStatus.Draft,
        isShared: false,
        isLocked: false
      },
      {
        goalSheetId: rowanSheet.id,
        thrustArea: "Quality & SLA",
        title: "Bug Resolution TAT",
        description: "Maintain SLA for resolving software errors at under 8 hours.",
        uomType: UomType.Max,
        target: "8",
        weightage: 20,
        status: GoalStatus.Draft,
        isShared: true,
        isLocked: false
      },
      {
        goalSheetId: rowanSheet.id,
        thrustArea: "Delivery",
        title: "Launch Sales Playbook 2.0",
        description: "Author and launch the complete enterprise sales script by end of May.",
        uomType: UomType.Timeline,
        target: "2026-05-31",
        weightage: 15,
        status: GoalStatus.Draft,
        isShared: false,
        isLocked: false
      },
      {
        goalSheetId: rowanSheet.id,
        thrustArea: "Risk Management",
        title: "Zero Security Non-Conformances",
        description: "Ensure zero major gaps in ISO audits.",
        uomType: UomType.Zero,
        target: "0",
        weightage: 10,
        status: GoalStatus.Draft,
        isShared: true,
        isLocked: false
      }
    ]
  });

  // --- USER 3: CASEY CONTRIBUTOR (Goal Sheet in Draft / Pending Submission) ---
  console.info("Seeding Draft Goals for Casey Contributor...");
  const caseySheet = await prisma.goalSheet.create({
    data: {
      employeeId: employee3.id,
      cycleYear: 2026,
      status: GoalSheetStatus.Draft
    }
  });

  await prisma.goal.createMany({
    data: [
      {
        goalSheetId: caseySheet.id,
        thrustArea: "Strategic Operations",
        title: "Supply Chain Vendor Rationalization",
        description: "Reduce third-party logistics overhead and optimize key operational cost centers.",
        uomType: UomType.Min,
        target: "15000",
        weightage: 40,
        status: GoalStatus.Draft,
        isShared: false,
        isLocked: false
      },
      {
        goalSheetId: caseySheet.id,
        thrustArea: "Risk Management",
        title: "Compliance Checklist Audit Gaps",
        description: "Limit external compliance complaints to zero.",
        uomType: UomType.Zero,
        target: "0",
        weightage: 30,
        status: GoalStatus.Draft,
        isShared: true,
        isLocked: false
      },
      {
        goalSheetId: caseySheet.id,
        thrustArea: "Service SLA",
        title: "Operational Logistics Resolution TAT",
        description: "Ensure priority support issues are closed inside 12 hours.",
        uomType: UomType.Max,
        target: "12",
        weightage: 30,
        status: GoalStatus.Draft,
        isShared: true,
        isLocked: false
      }
      // Sum = 40 + 30 + 30 = 100% (Balanced draft goals)
    ]
  });

  // 4. Seed Audit Logs (To populate the Admin Audit Trail Dashboard)
  console.info("Seeding highly detailed Audit logs history...");
  await prisma.auditLog.createMany({
    data: [
      {
        entityType: "QuarterWindow",
        entityId: "Q1",
        changedBy: admin.id,
        fieldChanged: "isOpen",
        oldValue: "true",
        newValue: "false",
        changeDescription: "Avery Admin closed the Q1 performance appraisal window.",
        changedAt: new Date("2026-04-01T09:00:00Z")
      },
      {
        entityType: "QuarterWindow",
        entityId: "Q2",
        changedBy: admin.id,
        fieldChanged: "isOpen",
        oldValue: "false",
        newValue: "true",
        changeDescription: "Avery Admin opened the Q2 performance appraisal window.",
        changedAt: new Date("2026-04-01T09:10:00Z")
      },
      {
        entityType: "GoalSheet",
        entityId: emerySheet.id,
        changedBy: employee.id,
        fieldChanged: "status",
        oldValue: "Draft",
        newValue: "Submitted",
        changeDescription: "Emery Employee submitted the 2026 goal sheet for approval.",
        changedAt: new Date("2026-01-05T09:30:00Z")
      },
      {
        entityType: "GoalSheet",
        entityId: emerySheet.id,
        changedBy: manager.id,
        fieldChanged: "status",
        oldValue: "Submitted",
        newValue: "Approved",
        changeDescription: "Morgan Manager approved Emery Employee's 2026 Goal Sheet.",
        changedAt: new Date("2026-01-08T14:15:00Z")
      },
      {
        entityType: "Goal",
        entityId: rowanSheet.id,
        changedBy: employee2.id,
        fieldChanged: "status",
        oldValue: "Draft",
        newValue: "Submitted",
        changeDescription: "Rowan Reporter submitted the 2026 goal sheet with balanced weightages.",
        changedAt: new Date("2026-05-15T11:45:00Z")
      },
      {
        entityType: "CheckIn",
        entityId: emerySheet.id,
        changedBy: manager.id,
        fieldChanged: "comment",
        oldValue: null,
        newValue: "Emery had a spectacular Q1...",
        changeDescription: "Morgan Manager completed Emery Employee's quarterly check-in for Q1.",
        changedAt: new Date("2026-04-10T16:20:00Z")
      }
    ]
  });

  // 5. Seed Escalation Records (To showcase warning flags)
  console.info("Seeding compliance escalations...");
  await prisma.escalation.createMany({
    data: [
      {
        userId: employee3.id, // Casey Contributor (Ops)
        type: "GoalSheetSubmissionPending",
        status: "Escalated",
        triggeredAt: new Date("2026-05-10T08:00:00Z"),
        note: "SYSTEM TRIGGERED: Casey Contributor failed to submit draft goals within the cycle timeline."
      },
      {
        userId: employee2.id, // Rowan Reporter (Revenue)
        type: "QuarterlyCheckInMissing",
        status: "Resolved",
        triggeredAt: new Date("2026-04-05T08:00:00Z"),
        resolvedAt: new Date("2026-04-12T15:30:00Z"),
        resolvedBy: admin.id,
        note: "System escalated Rowan Reporter's missing Q1 Check-In. Resolved manually after review."
      }
    ]
  });

  // 6. Seed Notifications
  console.info("Seeding system notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        message: "Action Required: Rowan Reporter has submitted a Goal Sheet for your review.",
        isRead: false,
        createdAt: new Date("2026-05-15T11:45:00Z")
      },
      {
        userId: employee.id,
        message: "Congratulations! Your Q1 Performance Appraisal review is now finalized and locked.",
        isRead: true,
        createdAt: new Date("2026-04-10T16:21:00Z")
      },
      {
        userId: employee3.id,
        message: "Warning: Escalation Alert. You have an active penalty escalation for missing the Goal Sheet submission deadline.",
        isRead: false,
        createdAt: new Date("2026-05-10T08:01:00Z")
      }
    ]
  });

  console.info("\n==============================================");
  console.info("🎉 SUPABASE DATABASE POPULATION SUCCESSFUL!");
  console.info("==============================================");
  console.info("Seeded live demo roles and logins:");
  console.info(`1. Admin:    admin@atomquest.com    /  ${demoPassword} (Avery Admin)`);
  console.info(`2. Manager:  manager@atomquest.com  /  ${demoPassword} (Morgan Manager)`);
  console.info(`3. Employee: employee@atomquest.com /  ${demoPassword} (Emery Employee) -- Approved Goals & Q1/Q2 Data`);
  console.info(`4. Employee: rowan@atomquest.com    /  ${demoPassword} (Rowan Reporter) -- Submitted & Pending Approval`);
  console.info(`5. Employee: casey@atomquest.com    /  ${demoPassword} (Casey Contributor) -- Active Draft Status & Escalated`);
  console.info("==============================================\n");
}

main()
  .catch((error) => {
    console.error("Error during database seed execution:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
