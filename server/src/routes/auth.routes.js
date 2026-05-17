import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { requireAuth, signAuthToken } from "../auth.js";
import { demoStore } from "../demoStore.js";

export const authRouter = Router();
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "local";
  const now = Date.now();
  const windowStart = now - 60_000;
  const attempts = (loginAttempts.get(key) || []).filter((timestamp) => timestamp > windowStart);
  if (attempts.length >= 10) {
    return res.status(429).json({ message: "Too many login attempts. Please wait a minute and try again." });
  }
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return next();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.managerId
  };
}

authRouter.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Try live Prisma database first
    try {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (isValid) {
          const token = signAuthToken(user);
          return res.json({ token, user: publicUser(user) });
        } else {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      }
    } catch (dbError) {
      console.warn("Database connection issue, trying demoStore fallback...", dbError.message);
    }

    // Fall back to in-memory demoStore if user not in DB or DB connection failed
    const demoUser = await demoStore.findUserByEmail(email || "");
    const isDemoValid = demoUser ? await demoStore.verifyPassword(demoUser, password || "") : false;
    if (isDemoValid) {
      const token = signAuthToken(demoUser);
      return res.json({ token, user: demoStore.publicUser(demoUser), mode: "demo-memory" });
    }

    return res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    const user = await demoStore.findUserByEmail(req.body.email || "");
    const isValid = user ? await demoStore.verifyPassword(user, req.body.password || "") : false;

    if (!isValid) {
      return next(error);
    }

    const token = signAuthToken(user);
    return res.json({ token, user: demoStore.publicUser(user), mode: "demo-memory" });
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    if (!user) {
      const demoUser = await demoStore.findUserById(req.user.sub);
      if (!demoUser) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({ user: demoStore.publicUser(demoUser), mode: "demo-memory" });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    const demoUser = await demoStore.findUserById(req.user.sub);
    if (!demoUser) {
      return next(error);
    }
    return res.json({ user: demoStore.publicUser(demoUser), mode: "demo-memory" });
  }
});
