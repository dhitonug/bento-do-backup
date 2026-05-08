import { Router } from "express";

// ==========================================
// CONTROLLERS
// ==========================================
import * as guestController from "./guest.controller.js";

// ROUTER

const router = Router();

// CREATE GUEST SESSION
// POST /api/v1/guest

router.post(
  "/",

  guestController.createGuestSession,
);

export default router;
