import * as taskService from "./tasks.service.js";

// HELPER IDENTIFIER

const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,

    guest_session_id: req.identity?.guest_session_id ?? null,
  };
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
    console.error("CREATE TASK ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
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

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("GET TASKS ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET TASK BY ID

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const identifier = getIdentifier(req);

    const task = await taskService.getTaskById(id, identifier);

    return res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("GET TASK BY ID ERROR:", error);

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE TASK

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    const identifier = getIdentifier(req);

    const task = await taskService.updateTask(id, identifier, req.body);

    return res.json({
      success: true,

      message: "Tugas berhasil diperbarui.",

      data: task,
    });
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE TASK

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const identifier = getIdentifier(req);

    await taskService.deleteTask(id, identifier);

    return res.json({
      success: true,

      message: "Tugas berhasil dipindahkan ke tempat sampah.",
    });
  } catch (error) {
    console.error("DELETE TASK ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
