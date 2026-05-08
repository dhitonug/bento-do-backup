import { Router } from "express";

// CONTROLLERS

import * as authController from "./auth.controller.js";

// VALIDATIONS

import { loginSchema, registerSchema } from "./auth.validation.js";

// MIDDLEWARES

import { validate } from "../../middlewares/validate.middleware.js";

// ROUTER

const router = Router();

// REGISTER
// POST /api/v1/auth/register

router.post(
  "/register",

  validate(registerSchema),

  authController.register,
);

// LOGIN
// POST /api/v1/auth/login

router.post(
  "/login",

  validate(loginSchema),

  authController.login,
);

export default router;
