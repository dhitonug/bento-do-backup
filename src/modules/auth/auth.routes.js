import { Router } from "express";

import * as authController from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

// REGISTER
// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), authController.register);

// LOGIN
// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), authController.login);

// FORGOT PASSWORD
// POST /api/v1/auth/forgot-password
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

// RESET PASSWORD
// POST /api/v1/auth/reset-password
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
