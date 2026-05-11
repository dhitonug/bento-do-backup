import * as taskService from "./tasks.service.js";

// HELPER IDENTIFIER
const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,
    guest_session_id: req.identity?.guest_session_id ?? null,
  };
};

// HELPER ERROR RESPONSE
const handleTaskError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  const statusCode = error.status || 500;

  const response = {
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  };

  if (error.require_login) {
    response.require_login = true;
  }

  if (error.code) {
    response.code = error.code;
  }

  return res.status(statusCode).json(response);
};

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const taskData = {
      ...req.body,
      ...identifier,
    };

    const task = await taskService.createTask(taskData);

    return res.status(201).json({
      success: true,
      message: "Tugas berhasil ditambahkan.",
      data: task,
    });
  } catch (error) {
    return handleTaskError(res, error, "CREATE TASK ERROR:");
  }
};

// GET ALL TASKS
export const getTasks = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { page, limit } = req.query;

    const result = await taskService.getTasksWithPagination(
      identifier,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleTaskError(res, error, "GET TASKS ERROR:");
  }
};

// GET TASK BY ID
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const identifier = getIdentifier(req);

    const task = await taskService.getTaskById(id, identifier);

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return handleTaskError(res, error, "GET TASK BY ID ERROR:");
  }
};

// UPDATE TASK
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const identifier = getIdentifier(req);

    const task = await taskService.updateTask(id, identifier, req.body);

    return res.status(200).json({
      success: true,
      message: "Tugas berhasil diperbarui.",
      data: task,
    });
  } catch (error) {
    return handleTaskError(res, error, "UPDATE TASK ERROR:");
  }
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const identifier = getIdentifier(req);

    await taskService.deleteTask(id, identifier);

    return res.status(200).json({
      success: true,
      message: "Tugas berhasil dipindahkan ke tempat sampah.",
    });
  } catch (error) {
    return handleTaskError(res, error, "DELETE TASK ERROR:");
  }
};