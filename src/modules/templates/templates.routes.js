import { Router } from "express";

import * as templatesController from "./templates.controller.js";
import {
  createTemplateSchema,
  templateIdParamSchema,
  templateKeyParamSchema,
  updateTemplateSchema,
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

// POST /api/v1/templates/save-private/:template_key
router.post(
  "/save-private/:template_key",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(templateKeyParamSchema, "params"),
  templatesController.saveTemplateAsPrivate,
);

// PUT /api/v1/templates/:template_id
router.put(
  "/:template_id",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(templateIdParamSchema, "params"),
  validate(updateTemplateSchema),
  templatesController.updateTemplate,
);

// DELETE /api/v1/templates/:template_id
router.delete(
  "/:template_id",
  guestOrAuthMiddleware,
  loginWallMiddleware,
  validate(templateIdParamSchema, "params"),
  templatesController.deleteTemplate,
);

export default router;
