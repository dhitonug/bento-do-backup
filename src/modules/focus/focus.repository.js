import { db } from "../../config/db.js";

export const createSession = async (userId, taskId, timerDuration) => {
  const result = await db.query(
    `INSERT INTO focus_sessions (user_id, task_id, started_at, duration_minutes)
     VALUES ($1, $2, NOW(), $3)
     RETURNING *;`,
    [userId, taskId, timerDuration]
  );
  return result.rows[0];
};

export const findActiveSession = async (userId) => {
  const result = await db.query(
    `SELECT fs.*, t.title AS task_title, t.energy_weight, t.deadline
     FROM focus_sessions fs
     JOIN tasks t ON fs.task_id = t.id
     WHERE fs.user_id = $1
       AND fs.ended_at IS NULL
       AND fs.deleted_at IS NULL
     ORDER BY fs.started_at DESC
     LIMIT 1;`,
    [userId]
  );
  return result.rows[0] ?? null;
};

export const findSessionById = async (sessionId, userId) => {
  const result = await db.query(
    `SELECT fs.*, t.title AS task_title, t.energy_weight, t.deadline, t.status AS task_status
     FROM focus_sessions fs
     JOIN tasks t ON fs.task_id = t.id
     WHERE fs.id = $1
       AND fs.user_id = $2
       AND fs.deleted_at IS NULL;`,
    [sessionId, userId]
  );
  return result.rows[0] ?? null;
};

export const endSession = async (sessionId, userId, endReason) => {
  const result = await db.query(
    `UPDATE focus_sessions
     SET ended_at         = NOW(),
         duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
         end_reason       = $3,
         updated_at       = NOW()
     WHERE id = $1
       AND user_id = $2
       AND ended_at IS NULL
       AND deleted_at IS NULL
     RETURNING *;`,
    [sessionId, userId, endReason]
  );
  return result.rows[0] ?? null;
};

export const findSessionHistory = async (userId, limit, offset, filters = {}) => {
  const params = [userId];
  let where = `fs.user_id = $1 AND fs.deleted_at IS NULL AND fs.ended_at IS NOT NULL`;

  if (filters.task_id) { params.push(filters.task_id); where += ` AND fs.task_id = $${params.length}`; }
  if (filters.end_reason) { params.push(filters.end_reason); where += ` AND fs.end_reason = $${params.length}`; }
  if (filters.from) { params.push(filters.from); where += ` AND fs.started_at >= $${params.length}`; }
  if (filters.to) { params.push(filters.to); where += ` AND fs.started_at <= $${params.length}`; }

  const baseParams = [...params];
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT fs.id, fs.task_id, t.title AS task_title, t.energy_weight,
              fs.started_at, fs.ended_at,
              ROUND(fs.duration_minutes::numeric, 1) AS duration_minutes,
              fs.end_reason, fs.created_at
       FROM focus_sessions fs
       JOIN tasks t ON fs.task_id = t.id
       WHERE ${where}
       ORDER BY fs.started_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length};`,
      params
    ),
    db.query(`SELECT COUNT(*) FROM focus_sessions fs WHERE ${where};`, baseParams),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

export const getStatistics = async (userId) => {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE DATE(fs.started_at) = CURRENT_DATE AND fs.end_reason = 'completed')::int AS sessions_today,
       COALESCE(SUM(fs.duration_minutes) FILTER (WHERE DATE(fs.started_at) = CURRENT_DATE AND fs.end_reason = 'completed'), 0)::float AS minutes_today,
       COUNT(*) FILTER (WHERE DATE_TRUNC('week', fs.started_at) = DATE_TRUNC('week', CURRENT_DATE) AND fs.end_reason = 'completed')::int AS sessions_this_week,
       COALESCE(SUM(fs.duration_minutes) FILTER (WHERE DATE_TRUNC('week', fs.started_at) = DATE_TRUNC('week', CURRENT_DATE) AND fs.end_reason = 'completed'), 0)::float AS minutes_this_week,
       COUNT(*) FILTER (WHERE fs.end_reason = 'completed')::int AS sessions_all_time,
       COALESCE(SUM(fs.duration_minutes) FILTER (WHERE fs.end_reason = 'completed'), 0)::float AS minutes_all_time,
       COUNT(DISTINCT DATE(fs.started_at)) FILTER (WHERE fs.end_reason = 'completed' AND fs.started_at >= CURRENT_DATE - INTERVAL '30 days')::int AS active_days_last_30
     FROM focus_sessions fs
     WHERE fs.user_id = $1 AND fs.deleted_at IS NULL AND fs.ended_at IS NOT NULL;`,
    [userId]
  );
  return result.rows[0];
};

/**
 * Mengambil daftar tanggal distinct sesi selesai, terurut DESC.
 * Penghitungan streak dilakukan di service layer.
 */
export const getStreakDays = async (userId) => {
  const result = await db.query(
    `SELECT DISTINCT DATE(started_at) AS focus_date
     FROM focus_sessions
     WHERE user_id = $1 AND end_reason = 'completed' AND deleted_at IS NULL
     ORDER BY focus_date DESC;`,
    [userId]
  );
  return result.rows.map((r) => r.focus_date);
};

export const findRecommendedTask = async (userId) => {
  const result = await db.query(
    `SELECT
       t.id, t.title, t.energy_weight, t.deadline, t.status,
       COALESCE(SUM(fs.duration_minutes) FILTER (WHERE fs.end_reason = 'completed'), 0)::float AS total_focus_minutes
     FROM tasks t
     LEFT JOIN focus_sessions fs ON fs.task_id = t.id AND fs.deleted_at IS NULL AND fs.ended_at IS NOT NULL
     WHERE t.user_id = $1
       AND t.status IN ('pending', 'in_progress')
       AND t.deleted_at IS NULL
     GROUP BY t.id
     ORDER BY
       t.deadline ASC NULLS LAST,
       CASE t.energy_weight WHEN 'Berat' THEN 1 WHEN 'Sedang' THEN 2 ELSE 3 END ASC
     LIMIT 1;`,
    [userId]
  );
  return result.rows[0] ?? null;
};
