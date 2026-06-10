import { Router } from "express";

import * as dashboardController from "./dashboard.controller.js";
import {
  dashboardHistoryQuerySchema,
  dashboardOverviewQuerySchema,
} from "./dashboard.validation.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

// GET /api/v1/dashboard/overview
router.get(
  "/overview",
  guestOrAuthMiddleware,
  validate(dashboardOverviewQuerySchema, "query"),
  dashboardController.getDashboardOverview,
);

// GET /api/v1/dashboard/history
router.get(
  "/history",
  guestOrAuthMiddleware,
  validate(dashboardHistoryQuerySchema, "query"),
  dashboardController.getDashboardHistory,
);

// GET /api/v1/dashboard/zen
router.get("/zen", guestOrAuthMiddleware, dashboardController.getZenDashboard);

export default router;
