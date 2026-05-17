import { prisma } from "./src/prisma.js";

async function test() {
  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    const usersCount = await prisma.user.count();
    console.log(`Successfully connected! Number of users in database: ${usersCount}`);
    
    const users = await prisma.user.findMany({ select: { name: true, role: true, email: true } });
    console.table(users);
    
    console.log("Database connection is 100% healthy and responsive!");
    process.exit(0);
  } catch (error) {
    console.error("Database connection check failed!", error);
    process.exit(1);
  }
}

test();
