import { Router } from "express";

import * as energyController from "./energy.controller.js";
import { energyLogsPaginationSchema } from "./energy.validation.js";

import { validate } from "../../middlewares/validate.middleware.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";
import loginWallMiddleware from "../../middlewares/loginWall.middleware.js";

const router = Router();

// GET /api/v1/energy/logs
router.get(
  "/logs",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(energyLogsPaginationSchema, "query"),
  energyController.getEnergyLogs,
);

// GET /api/v1/energy
router.get(
  "/",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  energyController.getEnergySummary,
);

export default router;