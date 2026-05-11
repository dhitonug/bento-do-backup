import { db } from "../../config/db.js";

export const getUserEnergyState = async (
  userId,
  { forUpdate = false } = {},
  executor = db,
) => {
  const forUpdateClause = forUpdate ? "FOR UPDATE" : "";

  const { rows } = await executor.query(
    `
      SELECT
        id,
        current_energy,
        max_energy,
        energy_reset_at,
        created_at,
        updated_at,
        (CURRENT_DATE > DATE(energy_reset_at)) AS needs_reset
      FROM users
      WHERE id = $1
      AND deleted_at IS NULL
      ${forUpdateClause}
    `,
    [userId],
  );

  return rows[0] || null;
};

export const updateUserEnergyState = async (
  userId,
  { current_energy, set_reset_at = false },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE users
      SET
        current_energy = $1,
        energy_reset_at = CASE
          WHEN $2 = TRUE THEN NOW()
          ELSE energy_reset_at
        END,
        updated_at = NOW()
      WHERE id = $3
      AND deleted_at IS NULL
      RETURNING
        id,
        current_energy,
        max_energy,
        energy_reset_at,
        created_at,
        updated_at
    `,
    [current_energy, set_reset_at, userId],
  );

  return rows[0] || null;
};

export const createEnergyLog = async (data, executor = db) => {
  const {
    user_id,
    change_amount,
    reason,
    energy_before,
    energy_after,
    task_id = null,
    focus_session_id = null,
  } = data;

  const { rows } = await executor.query(
    `
      INSERT INTO energy_logs (
        user_id,
        change_amount,
        reason,
        energy_before,
        energy_after,
        task_id,
        focus_session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        change_amount,
        reason,
        energy_before,
        energy_after,
        task_id,
        focus_session_id,
        created_at
    `,
    [
      user_id,
      change_amount,
      reason,
      energy_before,
      energy_after,
      task_id,
      focus_session_id,
    ],
  );

  return rows[0];
};

export const getEnergyLogsWithPagination = async (
  userId,
  limit,
  offset,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      SELECT
        id,
        user_id,
        change_amount,
        reason,
        energy_before,
        energy_after,
        task_id,
        focus_session_id,
        created_at
      FROM energy_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      OFFSET $3
    `,
    [userId, limit, offset],
  );

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM energy_logs
      WHERE user_id = $1
    `,
    [userId],
  );

  return {
    data: rows,
    total_items: countResult.rows[0]?.total_items ?? 0,
  };
};