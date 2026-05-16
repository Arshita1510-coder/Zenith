import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { requireAuth, signAuthToken } from "../auth.js";
import { demoStore } from "../demoStore.js";

export const authRouter = Router();

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.managerId
  };
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAuthToken(user);
    return res.json({ token, user: publicUser(user) });
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
