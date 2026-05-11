import * as taskRepo from "./tasks.repository.js";

// KONSTANTA
const GUEST_MAX_ACTIVE_TASKS = 3;

// HELPER
const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const assertIdentifier = (identifier) => {
  if (!identifier?.user_id && !identifier?.guest_session_id) {
    throw createAppError("Identitas pengguna tidak valid!", 401);
  }
};

const normalizePaginationNumber = (value, fallback) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return fallback;
  }

  return numberValue;
};

// CREATE TASK
export const createTask = async (data) => {
  const identifier = {
    user_id: data?.user_id ?? null,
    guest_session_id: data?.guest_session_id ?? null,
  };

  assertIdentifier(identifier);

  // LOGIN WALL RULE:
  // Guest hanya boleh sampai 3 task aktif.
  if (identifier.guest_session_id && !identifier.user_id) {
    const activeTaskCount =
      await taskRepo.countActiveTasksByIdentifier(identifier);

    if (activeTaskCount >= GUEST_MAX_ACTIVE_TASKS) {
      throw createAppError(
        "Batas guest telah tercapai. Silakan login atau register untuk menambah tugas lagi.",
        403,
        {
          require_login: true,
          code: "GUEST_TASK_LIMIT_REACHED",
        },
      );
    }
  }

  return await taskRepo.createTask(data);
};

// GET ALL TASKS WITH PAGINATION
export const getTasksWithPagination = async (
  identifier,
  page = 1,
  limit = 20,
) => {
  assertIdentifier(identifier);

  const normalizedPage = normalizePaginationNumber(page, 1);
  const normalizedLimit = normalizePaginationNumber(limit, 20);

  const offset = (normalizedPage - 1) * normalizedLimit;

  const result = await taskRepo.getTasksWithPagination(
    identifier,
    normalizedLimit,
    offset,
  );

  const totalPages =
    result.total_items === 0
      ? 0
      : Math.ceil(result.total_items / normalizedLimit);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total_items: result.total_items,
    total_pages: totalPages,
    data: result.data,
  };
};

// GET TASK BY ID
export const getTaskById = async (id, identifier) => {
  assertIdentifier(identifier);

  const task = await taskRepo.getTaskById(id, identifier);

  if (!task) {
    throw createAppError("Tugas tidak ditemukan!", 404);
  }

  return task;
};

// UPDATE TASK
export const updateTask = async (id, identifier, data) => {
  assertIdentifier(identifier);

  const existing = await taskRepo.getTaskById(id, identifier);

  if (!existing) {
    throw createAppError("Tugas tidak ditemukan!", 404);
  }

  const updatedTask = await taskRepo.updateTask(id, identifier, data);

  if (!updatedTask) {
    throw createAppError("Gagal memperbarui tugas!", 400);
  }

  return updatedTask;
};

// DELETE TASK
export const deleteTask = async (id, identifier) => {
  assertIdentifier(identifier);

  const existing = await taskRepo.getTaskById(id, identifier);

  if (!existing) {
    throw createAppError("Tugas tidak ditemukan!", 404);
  }

  const deletedTask = await taskRepo.deleteTask(id, identifier);

  if (!deletedTask) {
    throw createAppError("Gagal menghapus tugas!", 400);
  }

  return deletedTask;
};