import { Router } from "express";

import * as focusController from "./focus.controller.js";
import {
  startFocusSchema,
  stopFocusSchema,
  focusSessionIdParamSchema,
} from "./focus.validation.js";

import { validate } from "../../middlewares/validate.middleware.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";

const router = Router();

// GET /api/v1/focus/active
router.get("/active", guestOrAuthMiddleware, focusController.getActiveFocusSession);

// POST /api/v1/focus/start
router.post(
  "/start",
  guestOrAuthMiddleware,
  validate(startFocusSchema),
  focusController.startFocusSession,
);

// POST /api/v1/focus/:id/stop
router.post(
  "/:id/stop",
  guestOrAuthMiddleware,
  validate(focusSessionIdParamSchema, "params"),
  validate(stopFocusSchema),
  focusController.stopFocusSession,
);

export default router;