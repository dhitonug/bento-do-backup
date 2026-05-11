import { db } from "../../config/db.js";

// HELPER
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const getIdentifierFilter = (identifier = {}) => {
  if (identifier.user_id) {
    return {
      field: "user_id",
      value: identifier.user_id,
    };
  }

  if (identifier.guest_session_id) {
    return {
      field: "guest_session_id",
      value: identifier.guest_session_id,
    };
  }

  throw new Error("Identifier tidak valid!");
};

// CREATE TASK
export const createTask = async (data, executor = db) => {
  const {
    user_id,
    guest_session_id,
    title,
    energy_weight,
    deadline,
    source_template,
  } = data;

  const { rows } = await executor.query(
    `
      INSERT INTO tasks (
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        source_template
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        status,
        used_timer,
        timer_duration,
        source_template,
        completed_at,
        created_at,
        updated_at
    `,
    [
      user_id ?? null,
      guest_session_id ?? null,
      title,
      energy_weight,
      deadline ?? null,
      source_template ?? null,
    ],
  );

  return rows[0];
};

// COUNT ACTIVE TASKS
export const countActiveTasksByIdentifier = async (identifier, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM tasks
      WHERE ${field} = $1
      AND deleted_at IS NULL
    `,
    [value],
  );

  return rows[0]?.total_items ?? 0;
};

// GET TASKS WITH PAGINATION
export const getTasksWithPagination = async (
  identifier,
  limit,
  offset,
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      SELECT
        id,
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        status,
        used_timer,
        timer_duration,
        source_template,
        completed_at,
        created_at,
        updated_at
      FROM tasks
      WHERE ${field} = $1
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2
      OFFSET $3
    `,
    [value, limit, offset],
  );

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM tasks
      WHERE ${field} = $1
      AND deleted_at IS NULL
    `,
    [value],
  );

  return {
    data: rows,
    total_items: countResult.rows[0]?.total_items ?? 0,
  };
};

// GET TASK BY ID
export const getTaskById = async (id, identifier, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      SELECT
        id,
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        status,
        used_timer,
        timer_duration,
        source_template,
        completed_at,
        created_at,
        updated_at
      FROM tasks
      WHERE id = $1
      AND ${field} = $2
      AND deleted_at IS NULL
    `,
    [id, value],
  );

  return rows[0] || null;
};

// UPDATE TASK
export const updateTask = async (id, identifier, data, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);

  const setClauses = [];
  const values = [];

  if (hasOwn(data, "title")) {
    values.push(data.title);
    setClauses.push(`title = $${values.length}`);
  }

  if (hasOwn(data, "energy_weight")) {
    values.push(data.energy_weight);
    setClauses.push(`energy_weight = $${values.length}`);
  }

  if (hasOwn(data, "deadline")) {
    values.push(data.deadline);
    setClauses.push(`deadline = $${values.length}`);
  }

  if (hasOwn(data, "status")) {
    values.push(data.status);
    setClauses.push(`status = $${values.length}`);

    if (data.status === "done") {
      setClauses.push(`completed_at = NOW()`);
    } else {
      setClauses.push(`completed_at = NULL`);
    }
  }

  if (setClauses.length === 0) {
    return await getTaskById(id, identifier, executor);
  }

  setClauses.push(`updated_at = NOW()`);

  values.push(id);
  const idParam = `$${values.length}`;

  values.push(value);
  const ownerParam = `$${values.length}`;

  const { rows } = await executor.query(
    `
      UPDATE tasks
      SET ${setClauses.join(", ")}
      WHERE id = ${idParam}
      AND ${field} = ${ownerParam}
      AND deleted_at IS NULL
      RETURNING
        id,
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        status,
        used_timer,
        timer_duration,
        source_template,
        completed_at,
        created_at,
        updated_at
    `,
    values,
  );

  return rows[0] || null;
};

// SOFT DELETE TASK
export const deleteTask = async (id, identifier, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      UPDATE tasks
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      AND ${field} = $2
      AND deleted_at IS NULL
      RETURNING id
    `,
    [id, value],
  );

  return rows[0] || null;
};

// MIGRATE GUEST TASKS TO USER
export const migrateGuestTasksToUser = async (
  guestSessionId,
  userId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE tasks
      SET
        user_id = $1,
        guest_session_id = NULL,
        updated_at = NOW()
      WHERE guest_session_id = $2
      AND deleted_at IS NULL
      RETURNING
        id,
        user_id,
        guest_session_id,
        title,
        energy_weight,
        deadline,
        status,
        used_timer,
        timer_duration,
        source_template,
        completed_at,
        created_at,
        updated_at
    `,
    [userId, guestSessionId],
  );

  return rows;
};