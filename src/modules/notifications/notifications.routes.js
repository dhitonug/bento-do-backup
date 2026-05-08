import { Router } from "express";
import * as controller from "./notifications.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware to all notification routes
router.use(requireAuth);

router.get("/", controller.getNotifications);
router.put("/read-all", controller.markAllAsRead);
router.put("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

export default router;
