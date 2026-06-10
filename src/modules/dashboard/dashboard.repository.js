import * as taskRepo from "../tasks/tasks.repository.js";
import { db } from "../../config/db.js";

const taskSelectColumns = `
  t.id,
  t.user_id,
  t.guest_session_id,
  t.title,
  t.description,
  t.energy_weight,
  t.deadline,
  t.status,
  t.used_timer,
  t.timer_duration,
  t.source_template,
  t.completed_at,
  t.created_at,
  t.updated_at
`;

const getIdentifierFilter = (identifier = {}, alias = "") => {
  const prefix = alias ? `${alias}.` : "";

  if (identifier.user_id) {
    return {
      field: `${prefix}user_id`,
      value: identifier.user_id,
    };
  }

  if (identifier.guest_session_id) {
    return {
      field: `${prefix}guest_session_id`,
      value: identifier.guest_session_id,
    };
  }

  throw new Error("Identifier tidak valid!");
};

export const getZenDashboardData = async (identifier) => {
  return await taskRepo.getZenDashboardTasks(identifier);
};

export const getTaskStats = async (
  identifier,
  { currentStart, currentEnd, previousStart, previousEnd },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier, "t");

  const { rows } = await executor.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE t.status = 'done'
          AND t.completed_at >= $2
          AND t.completed_at < $3
        )::int AS completed_current,

        COUNT(*) FILTER (
          WHERE t.status = 'done'
          AND t.completed_at >= $4
          AND t.completed_at < $5
        )::int AS completed_previous,

        COUNT(*) FILTER (
          WHERE t.status <> 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline >= NOW()
          AND t.deadline < $3
        )::int AS upcoming_current,

        COUNT(*) FILTER (
          WHERE t.status <> 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline >= $4
          AND t.deadline < $5
        )::int AS upcoming_previous,

        COUNT(*) FILTER (
          WHERE t.status <> 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline < NOW()
        )::int AS overdue_current,

        COUNT(*) FILTER (
          WHERE t.status <> 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline >= $4
          AND t.deadline < $5
        )::int AS overdue_previous
      FROM tasks t
      WHERE ${field} = $1
      AND t.deleted_at IS NULL
    `,
    [value, currentStart, currentEnd, previousStart, previousEnd],
  );

  return rows[0] || {};
};

export const getTaskEventsForRange = async (
  identifier,
  { start, end },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier, "t");

  const { rows } = await executor.query(
    `
      SELECT
        t.id,
        t.status,
        t.deadline,
        t.completed_at,
        t.created_at,
        t.updated_at
      FROM tasks t
      WHERE ${field} = $1
      AND t.deleted_at IS NULL
      AND (
        (t.completed_at IS NOT NULL AND t.completed_at >= $2 AND t.completed_at < $3)
        OR (t.deadline IS NOT NULL AND t.deadline >= $2 AND t.deadline < $3)
        OR (t.created_at >= $2 AND t.created_at < $3)
      )
    `,
    [value, start, end],
  );

  return rows;
};

export const getRecentTasks = async (
  identifier,
  { limit = 5, calendarDate = null },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier, "t");
  const params = [value];
  const whereClauses = [`${field} = $1`, "t.deleted_at IS NULL"];

  if (calendarDate) {
    params.push(calendarDate);
    whereClauses.push(
      `DATE(COALESCE(t.deadline, t.created_at)) = $${params.length}::date`,
    );
  }

  params.push(limit);
  const limitParam = `$${params.length}`;

  const { rows } = await executor.query(
    `
      SELECT
        ${taskSelectColumns}
      FROM tasks t
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY
        CASE WHEN t.status = 'done' THEN 1 ELSE 0 END ASC,
        CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END ASC,
        t.deadline ASC NULLS LAST,
        t.updated_at DESC
      LIMIT ${limitParam}
    `,
    params,
  );

  return rows;
};

export const getCalendarTaskCounts = async (
  identifier,
  { start, end },
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier, "t");

  const { rows } = await executor.query(
    `
      SELECT
        DATE(COALESCE(t.deadline, t.created_at))::text AS date,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status = 'done')::int AS completed,
        COUNT(*) FILTER (
          WHERE t.status <> 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline < NOW()
        )::int AS overdue
      FROM tasks t
      WHERE ${field} = $1
      AND t.deleted_at IS NULL
      AND COALESCE(t.deadline, t.created_at) >= $2
      AND COALESCE(t.deadline, t.created_at) < $3
      GROUP BY DATE(COALESCE(t.deadline, t.created_at))
      ORDER BY DATE(COALESCE(t.deadline, t.created_at)) ASC
    `,
    [value, start, end],
  );

  return rows;
};

export const getFocusSummary = async (
  identifier,
  { start = null, end = null } = {},
  executor = db,
) => {
  const { field, value } = getIdentifierFilter(identifier, "fs");
  const params = [value];
  const whereClauses = [`${field} = $1`, "fs.deleted_at IS NULL"];

  if (start) {
    params.push(start);
    whereClauses.push(`fs.started_at >= $${params.length}`);
  }

  if (end) {
    params.push(end);
    whereClauses.push(`fs.started_at < $${params.length}`);
  }

  const { rows } = await executor.query(
    `
      SELECT
        COUNT(*)::int AS total_sessions,
        COALESCE(SUM(
          GREATEST(
            0,
            COALESCE(
              fs.duration_minutes,
              FLOOR(EXTRACT(EPOCH FROM (COALESCE(fs.ended_at, NOW()) - fs.started_at)) / 60)::int
            )
          )
        ), 0)::int AS total_focus_minutes,
        COALESCE(MAX(
          GREATEST(
            0,
            COALESCE(
              fs.duration_minutes,
              FLOOR(EXTRACT(EPOCH FROM (COALESCE(fs.ended_at, NOW()) - fs.started_at)) / 60)::int
            )
          )
        ), 0)::int AS longest_session_minutes,
        COUNT(*) FILTER (WHERE fs.end_reason = 'completed')::int AS completed_sessions
      FROM focus_sessions fs
      WHERE ${whereClauses.join(" AND ")}
    `,
    params,
  );

  return rows[0] || {};
};

export const getHistoryItems = async (
  identifier,
  { type = "all", from = null, to = null, limit = 20, offset = 0 },
  executor = db,
) => {
  const taskOwner = getIdentifierFilter(identifier, "t");
  const focusOwner = getIdentifierFilter(identifier, "fs");
  const params = [taskOwner.value];
  const taskWhere = [`${taskOwner.field} = $1`, "t.deleted_at IS NULL"];
  const focusWhere = [`${focusOwner.field} = $1`, "fs.deleted_at IS NULL"];

  if (from) {
    params.push(from);
    const param = `$${params.length}`;
    taskWhere.push(
      `COALESCE(t.completed_at, t.updated_at, t.created_at) >= ${param}`,
    );
    focusWhere.push(`COALESCE(fs.ended_at, fs.started_at) >= ${param}`);
  }

  if (to) {
    params.push(to);
    const param = `$${params.length}`;
    taskWhere.push(
      `COALESCE(t.completed_at, t.updated_at, t.created_at) < ${param}`,
    );
    focusWhere.push(`COALESCE(fs.ended_at, fs.started_at) < ${param}`);
  }

  const taskSql = `
    SELECT
      'task'::text AS item_type,
      t.id,
      t.id AS task_id,
      t.title,
      t.description,
      t.energy_weight,
      t.deadline,
      t.status AS task_status,
      t.completed_at,
      NULL::uuid AS focus_session_id,
      NULL::timestamp AS started_at,
      NULL::timestamp AS ended_at,
      NULL::int AS duration_minutes,
      NULL::varchar AS end_reason,
      NULL::int AS focus_score,
      COALESCE(t.completed_at, t.updated_at, t.created_at) AS event_at
    FROM tasks t
    WHERE ${taskWhere.join(" AND ")}
  `;

  const focusSql = `
    SELECT
      'focus'::text AS item_type,
      fs.id,
      fs.task_id,
      t.title,
      t.description,
      t.energy_weight,
      t.deadline,
      t.status AS task_status,
      t.completed_at,
      fs.id AS focus_session_id,
      fs.started_at,
      fs.ended_at,
      fs.duration_minutes,
      fs.end_reason,
      NULL::int AS focus_score,
      COALESCE(fs.ended_at, fs.started_at) AS event_at
    FROM focus_sessions fs
    JOIN tasks t
      ON t.id = fs.task_id
    WHERE ${focusWhere.join(" AND ")}
    AND t.deleted_at IS NULL
  `;

  const unionSql =
    type === "task"
      ? taskSql
      : type === "focus"
        ? focusSql
        : `${taskSql} UNION ALL ${focusSql}`;

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM (${unionSql}) history
    `,
    params,
  );

  const listParams = [...params, limit, offset];
  const limitParam = `$${listParams.length - 1}`;
  const offsetParam = `$${listParams.length}`;

  const { rows } = await executor.query(
    `
      SELECT *
      FROM (${unionSql}) history
      ORDER BY event_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    listParams,
  );

  return {
    data: rows,
    total_items: countResult.rows[0]?.total_items ?? 0,
  };
};
