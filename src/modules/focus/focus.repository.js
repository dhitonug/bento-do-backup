import { db } from "../../config/db.js";

const MAX_FOCUS_MINUTES = 60;

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

export const findActiveFocusSessionByIdentifier = async (
  identifier,
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      SELECT
        fs.id,
        fs.user_id,
        fs.guest_session_id,
        fs.task_id,
        fs.started_at,
        fs.ended_at,
        fs.duration_minutes,
        fs.end_reason,
        fs.created_at,
        fs.updated_at,
        t.title AS task_title,
        t.energy_weight,
        t.status AS task_status,
        (fs.started_at + INTERVAL '60 minutes') AS auto_end_time,
        GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
        )::int AS raw_elapsed_minutes,
        LEAST(
          GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
          )::int,
          60
        )::int AS elapsed_minutes,
        GREATEST(
          0,
          60 - LEAST(
            GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
            )::int,
            60
          )
        )::int AS remaining_minutes,
        (NOW() >= fs.started_at + INTERVAL '60 minutes') AS zombie_limit_reached
      FROM focus_sessions fs
      JOIN tasks t
        ON t.id = fs.task_id
      WHERE fs.${field} = $1
      AND fs.ended_at IS NULL
      AND fs.deleted_at IS NULL
      AND t.deleted_at IS NULL
      ORDER BY fs.started_at DESC
      LIMIT 1
    `,
    [value],
  );

  return rows[0] || null;
};

export const findActiveFocusSessionById = async (
  id,
  identifier,
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      SELECT
        fs.id,
        fs.user_id,
        fs.guest_session_id,
        fs.task_id,
        fs.started_at,
        fs.ended_at,
        fs.duration_minutes,
        fs.end_reason,
        fs.created_at,
        fs.updated_at,
        t.title AS task_title,
        t.energy_weight,
        t.status AS task_status,
        (fs.started_at + INTERVAL '60 minutes') AS auto_end_time,
        GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
        )::int AS raw_elapsed_minutes,
        LEAST(
          GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
          )::int,
          60
        )::int AS elapsed_minutes,
        GREATEST(
          0,
          60 - LEAST(
            GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (NOW() - fs.started_at)) / 60)
            )::int,
            60
          )
        )::int AS remaining_minutes,
        (NOW() >= fs.started_at + INTERVAL '60 minutes') AS zombie_limit_reached
      FROM focus_sessions fs
      JOIN tasks t
        ON t.id = fs.task_id
      WHERE fs.id = $1
      AND fs.${field} = $2
      AND fs.ended_at IS NULL
      AND fs.deleted_at IS NULL
      AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [id, value],
  );

  return rows[0] || null;
};

export const createFocusSession = async (data, executor = db) => {
  const { user_id, guest_session_id, task_id } = data;

  const { rows } = await executor.query(
    `
      INSERT INTO focus_sessions (
        user_id,
        guest_session_id,
        task_id
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        user_id,
        guest_session_id,
        task_id,
        started_at,
        ended_at,
        duration_minutes,
        end_reason,
        created_at,
        updated_at
    `,
    [user_id ?? null, guest_session_id ?? null, task_id],
  );

  return rows[0];
};

export const markTaskInProgress = async (taskId, identifier, executor = db) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      UPDATE tasks
      SET
        status = CASE
          WHEN status = 'pending' THEN 'in_progress'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $1
      AND ${field} = $2
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
    [taskId, value],
  );

  return rows[0] || null;
};

export const finalizeFocusSession = async (
  id,
  identifier,
  { duration_minutes, end_reason, use_auto_end_time = false },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier);

  const endedAtSql = use_auto_end_time
    ? "(started_at + INTERVAL '60 minutes')"
    : "NOW()";

  const { rows } = await executor.query(
    `
      UPDATE focus_sessions
      SET
        ended_at = ${endedAtSql},
        duration_minutes = $1,
        end_reason = $2,
        updated_at = NOW()
      WHERE id = $3
      AND ${field} = $4
      AND ended_at IS NULL
      AND deleted_at IS NULL
      RETURNING
        id,
        user_id,
        guest_session_id,
        task_id,
        started_at,
        ended_at,
        duration_minutes,
        end_reason,
        created_at,
        updated_at
    `,
    [duration_minutes, end_reason, id, value],
  );

  return rows[0] || null;
};

export const markTaskAfterFocus = async (
  taskId,
  identifier,
  { duration_minutes, completed },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier);

  const { rows } = await executor.query(
    `
      UPDATE tasks
      SET
        used_timer = TRUE,
        timer_duration = $1,
        status = CASE
          WHEN $2 = TRUE THEN 'done'
          ELSE status
        END,
        completed_at = CASE
          WHEN $2 = TRUE THEN NOW()
          ELSE completed_at
        END,
        updated_at = NOW()
      WHERE id = $3
      AND ${field} = $4
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
    [duration_minutes, completed, taskId, value],
  );

  return rows[0] || null;
};

export const getMaxFocusMinutes = () => MAX_FOCUS_MINUTES;