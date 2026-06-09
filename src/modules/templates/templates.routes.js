import { Router } from "express";

import * as templatesController from "./templates.controller.js";
import {
  createTemplateSchema,
  templateKeyParamSchema,
} from "./templates.validation.js";

import { validate } from "../../middlewares/validate.middleware.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";
import loginWallMiddleware from "../../middlewares/loginWall.middleware.js";

const router = Router();

// GET /api/v1/templates
router.get(
  "/",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  templatesController.getTemplates,
);

// POST /api/v1/templates
router.post(
  "/",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(createTemplateSchema),
  templatesController.createTemplate,
);

// POST /api/v1/templates/apply/:template_key
router.post(
  "/apply/:template_key",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(templateKeyParamSchema, "params"),
  templatesController.applyTemplate,
);

export default router;
