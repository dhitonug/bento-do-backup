import { Router } from "express";

import * as taskController from "./tasks.controller.js";
import {
  createTaskSchema,
  updateTaskSchema,
  paginationSchema,
  taskIdSchema,
} from "./tasks.validation.js";

import { validate } from "../../middlewares/validate.middleware.js";
import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";

const router = Router();

// CREATE TASK
// POST /api/v1/tasks
router.post(
  "/",
  guestOrAuthMiddleware,
  validate(createTaskSchema),
  taskController.createTask,
);

// GET ALL TASKS
// GET /api/v1/tasks?page=1&limit=20
router.get(
  "/",
  guestOrAuthMiddleware,
  validate(paginationSchema, "query"),
  taskController.getTasks,
);

// IMPORTANT:
// Route spesifik HARUS diletakkan di atas "/:id"
// agar tidak dianggap sebagai parameter id.

// GET ZEN DASHBOARD
// GET /api/v1/tasks/zen-dashboard
router.get(
  "/zen-dashboard",
  guestOrAuthMiddleware,
  taskController.getZenDashboard,
);

// GET TASK BY ID
// GET /api/v1/tasks/:id
router.get(
  "/:id",
  guestOrAuthMiddleware,
  validate(taskIdSchema, "params"),
  taskController.getTaskById,
);

// UPDATE TASK
// PUT /api/v1/tasks/:id
router.put(
  "/:id",
  guestOrAuthMiddleware,
  validate(taskIdSchema, "params"),
  validate(updateTaskSchema),
  taskController.updateTask,
);

// DELETE TASK
// DELETE /api/v1/tasks/:id
router.delete(
  "/:id",
  guestOrAuthMiddleware,
  validate(taskIdSchema, "params"),
  taskController.deleteTask,
);

export default router;