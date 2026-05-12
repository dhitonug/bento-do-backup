import { Router } from "express";

import * as controller from "./notifications.controller.js";
import {
  notificationIdParamSchema,
  getNotificationsQuerySchema,
} from "./notifications.validation.js";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

router.use(authMiddleware);

// GET /api/v1/notifications
router.get(
  "/",
  validate(getNotificationsQuerySchema, "query"),
  controller.getNotifications,
);

// PUT /api/v1/notifications/read-all
router.put("/read-all", controller.markAllAsRead);

// PUT /api/v1/notifications/:id/read
router.put(
  "/:id/read",
  validate(notificationIdParamSchema, "params"),
  controller.markAsRead,
);

// DELETE /api/v1/notifications/:id
router.delete(
  "/:id",
  validate(notificationIdParamSchema, "params"),
  controller.deleteNotification,
);

export default router;