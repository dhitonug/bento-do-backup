import { Router } from "express";
import * as ctrl from "./focus.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);

router.post("/sessions", ctrl.validateStartBody, ctrl.startSession);
router.get("/sessions/active", ctrl.getActiveSession);
router.get("/sessions", ctrl.validateHistoryQuery, ctrl.getSessionHistory);
router.get("/sessions/:id", ctrl.validateSessionId, ctrl.getSessionDetail);
router.put("/sessions/:id/end", ctrl.validateSessionId, ctrl.validateEndBody, ctrl.endSession);

router.get("/statistics", ctrl.getStatistics);
router.get("/recommended", ctrl.getRecommendedTask);

export default router;
