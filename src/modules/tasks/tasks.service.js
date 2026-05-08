import * as taskRepo from "./tasks.repository.js";

// CREATE TASK

export const createTask = async (data) => {
  return await taskRepo.createTask(data);
};

// GET TASK BY ID

export const getTaskById = async (id, identifier) => {
  const task = await taskRepo.getTaskById(id, identifier);

  if (!task) {
    throw new Error("Tugas tidak ditemukan!");
  }

  return task;
};

// GET TASKS WITH PAGINATION

export const getTasksWithPagination = async (
  identifier,
  page = 1,
  limit = 20,
) => {
  const offset = (page - 1) * limit;

  const result = await taskRepo.getTasksWithPagination(
    identifier,
    limit,
    offset,
  );

  const total_pages = Math.ceil(result.total_items / limit);

  return {
    page: Number(page),
    limit: Number(limit),
    total_items: result.total_items,
    total_pages,
    data: result.data,
  };
};

// UPDATE TASK

export const updateTask = async (id, identifier, data) => {
  const existing = await taskRepo.getTaskById(id, identifier);

  if (!existing) {
    throw new Error("Tugas tidak ditemukan!");
  }

  return await taskRepo.updateTask(id, identifier, data);
};

// DELETE TASK

export const deleteTask = async (id, identifier) => {
  const existing = await taskRepo.getTaskById(id, identifier);

  if (!existing) {
    throw new Error("Tugas tidak ditemukan!");
  }

  await taskRepo.deleteTask(id, identifier);
};
