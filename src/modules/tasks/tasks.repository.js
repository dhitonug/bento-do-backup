import { db } from "../../config/db.js";

// HELPER IDENTIFIER

const getIdentifierFilter = (identifier) => {
  if (identifier.user_id) {
    return {
      field: "user_id",
      value: identifier.user_id,
    };
  }

  return {
    field: "guest_session_id",

    value: identifier.guest_session_id,
  };
};

// CREATE TASK

export const createTask = async (data) => {
  const {
    user_id,
    guest_session_id,
    title,
    energy_weight,
    deadline,
    source_template,
  } = data;

  const { rows } = await db.query(
    `
        INSERT INTO tasks (
          user_id,
          guest_session_id,
          title,
          energy_weight,
          deadline,
          source_template
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )

        RETURNING
          id,
          user_id,
          guest_session_id,
          title,
          energy_weight,
          deadline,
          status,
          source_template,
          created_at
        `,
    [
      user_id,
      guest_session_id,
      title,
      energy_weight,
      deadline,
      source_template || null,
    ],
  );

  return rows[0];
};

// GET TASKS WITH PAGINATION

export const getTasksWithPagination = async (identifier, limit, offset) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await db.query(
    `
        SELECT
          id,
          title,
          energy_weight,
          deadline,
          status,
          source_template,
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

  const countResult = await db.query(
    `
        SELECT COUNT(*)

        FROM tasks

        WHERE ${field} = $1
        AND deleted_at IS NULL
        `,
    [value],
  );

  return {
    data: rows,

    total_items: parseInt(countResult.rows[0].count),
  };
};

// GET TASK BY ID

export const getTaskById = async (id, identifier) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await db.query(
    `
        SELECT
          id,
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

export const updateTask = async (id, identifier, data) => {
  const { title, energy_weight, status, deadline } = data;

  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await db.query(
    `
        UPDATE tasks

        SET
          title = COALESCE($1, title),

          energy_weight =
            COALESCE(
              $2,
              energy_weight
            ),

          status =
            COALESCE(
              $3,
              status
            ),

          deadline =
            COALESCE(
              $4,
              deadline
            ),

          updated_at = NOW()

        WHERE id = $5
        AND ${field} = $6
        AND deleted_at IS NULL

        RETURNING
          id,
          title,
          energy_weight,
          deadline,
          status,
          source_template,
          updated_at
        `,
    [title, energy_weight, status, deadline, id, value],
  );

  return rows[0] || null;
};

// SOFT DELETE TASK

export const deleteTask = async (id, identifier) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await db.query(
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
// Dipakai saat guest register/login (auto sync)

export const migrateGuestTasksToUser = async (guestSessionId, userId) => {
  const { rows } = await db.query(
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
          title,
          energy_weight,
          deadline,
          status,
          source_template,
          updated_at
        `,
    [userId, guestSessionId],
  );

  return rows;
};
