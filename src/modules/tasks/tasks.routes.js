import { Router } from "express";

import * as taskController from "./tasks.controller.js";

import {
  createTaskSchema,
  updateTaskSchema,
  paginationSchema,
  taskIdSchema, // ✅ TAMBAHKAN INI
} from "./tasks.validation.js";

import { validate } from "../../middlewares/validate.middleware.js";

import { guestOrAuthMiddleware } from "../../middlewares/guestOrAuth.middleware.js";

// ROUTER

const router = Router();

// CREATE TASK

router.post(
  "/",

  guestOrAuthMiddleware,

  validate(createTaskSchema),

  taskController.createTask,
);

// GET ALL TASKS

router.get(
  "/",

  guestOrAuthMiddleware,

  validate(paginationSchema, "query"),

  taskController.getTasks,
);

// GET TASK BY ID

router.get(
  "/:id",

  guestOrAuthMiddleware,

  validate(taskIdSchema, "params"), // ✅ TAMBAHKAN INI

  taskController.getTaskById,
);

// UPDATE TASK

router.put(
  "/:id",

  guestOrAuthMiddleware,

  validate(taskIdSchema, "params"), // ✅ TAMBAHKAN INI

  validate(updateTaskSchema),

  taskController.updateTask,
);

// DELETE TASK

router.delete(
  "/:id",

  guestOrAuthMiddleware,

  validate(taskIdSchema, "params"), // ✅ TAMBAHKAN INI

  taskController.deleteTask,
);

export default router;
