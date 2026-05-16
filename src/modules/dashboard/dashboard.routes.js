import { Router } from "express";

import * as dashboardController from "./dashboard.controller.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";

const router = Router();

// GET /api/v1/dashboard/zen
router.get("/zen", guestOrAuthMiddleware, dashboardController.getZenDashboard);

export default router;