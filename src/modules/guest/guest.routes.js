import { Router } from "express";
import * as guestController from "./guest.controller.js";

const router = Router();

// CREATE GUEST SESSION
// POST /api/v1/guest
router.post("/", guestController.createGuestSession);

export default router;