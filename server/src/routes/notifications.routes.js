import { Router } from "express";
import { requireAuth } from "../auth.js";
import { demoStore } from "../demoStore.js";
import { prisma } from "../prisma.js";

export const notificationsRouter = Router();

notificationsRouter.get("/:userId", requireAuth, async (req, res) => {
  if (req.user.role !== "Admin" && req.user.sub !== req.params.userId) {
    return res.status(403).json({ message: "You can only view your own notifications" });
  }
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ notifications });
  } catch {
    return res.json({ notifications: demoStore.getNotifications(req.params.userId) });
  }
});

notificationsRouter.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Notification not found" });
    if (req.user.role !== "Admin" && existing.userId !== req.user.sub) {
      return res.status(403).json({ message: "You can only update your own notifications" });
    }
    const notification = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    return res.json({ notification });
  } catch {
    const canAccess = req.user.role === "Admin" || demoStore.getNotifications(req.user.sub).some((item) => item.id === req.params.id);
    if (!canAccess) {
      return res.status(403).json({ message: "You can only update your own notifications" });
    }
    const notification = demoStore.markNotificationRead(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.json({ notification });
  }
});
