import { db } from "../../config/db.js";

// KONSTANTA
const DEFAULT_GUEST_MAX_ENERGY = 240;

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

const getEnergyContextByIdentifier = async (identifier, executor = db) => {
  if (identifier?.user_id) {
    const { rows } = await executor.query(
      `
        SELECT
          current_energy,
          max_energy
        FROM users
        WHERE id = $1
        AND deleted_at IS NULL
      `,
      [identifier.user_id],
    );

    if (rows[0]) {
      return {
        current_energy: rows[0].current_energy,
        max_energy: rows[0].max_energy,
      };
    }
  }

  return {
    current_energy: DEFAULT_GUEST_MAX_ENERGY,
    max_energy: DEFAULT_GUEST_MAX_ENERGY,
  };
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
export const countActiveTasksByIdentifier = async (
  identifier,
  executor = db,
) => {
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

// GET ZEN DASHBOARD TASKS
// Dipakai ulang oleh module dashboard
export const getZenDashboardTasks = async (identifier, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);
  const energyContext = await getEnergyContextByIdentifier(identifier, executor);

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
      AND status IN ('pending', 'in_progress')
      AND deleted_at IS NULL
      ORDER BY
        CASE
          WHEN $2 < 30 AND energy_weight = 'Ringan' THEN 0
          WHEN $2 < 30 AND energy_weight <> 'Ringan' THEN 1
          ELSE 0
        END ASC,
        CASE
          WHEN deadline IS NULL THEN 1
          ELSE 0
        END ASC,
        deadline ASC NULLS LAST,
        CASE energy_weight
          WHEN 'Ringan' THEN 0
          WHEN 'Sedang' THEN 1
          WHEN 'Berat' THEN 2
          ELSE 3
        END ASC,
        CASE status
          WHEN 'in_progress' THEN 0
          WHEN 'pending' THEN 1
          ELSE 2
        END ASC,
        created_at ASC
      LIMIT 3
    `,
    [value, energyContext.current_energy],
  );

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM tasks
      WHERE ${field} = $1
      AND status IN ('pending', 'in_progress')
      AND deleted_at IS NULL
    `,
    [value],
  );

  const totalActiveTasks = countResult.rows[0]?.total_items ?? 0;

  return {
    current_energy: energyContext.current_energy,
    max_energy: energyContext.max_energy,
    data: rows,
    hidden_count: Math.max(0, totalActiveTasks - rows.length),
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