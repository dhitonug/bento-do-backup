import { Router } from "express";

import * as adminController from "./admin.controller.js";
import {
  adminDashboardQuerySchema,
  adminTemplatesQuerySchema,
  templateIdParamSchema,
} from "./admin.validation.js";
import { createTemplateSchema } from "../templates/templates.validation.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import requireAdminMiddleware from "../../middlewares/admin.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();

router.use(authMiddleware, requireAdminMiddleware);

// GET /api/v1/admin/dashboard
router.get(
  "/dashboard",
  validate(adminDashboardQuerySchema, "query"),
  adminController.getDashboard,
);

// GET /api/v1/admin/templates
router.get(
  "/templates",
  validate(adminTemplatesQuerySchema, "query"),
  adminController.getTemplates,
);

// POST /api/v1/admin/templates
router.post(
  "/templates",
  validate(createTemplateSchema),
  adminController.createTemplate,
);

// DELETE /api/v1/admin/templates/:template_id
router.delete(
  "/templates/:template_id",
  validate(templateIdParamSchema, "params"),
  adminController.deleteTemplate,
);

export default router;
