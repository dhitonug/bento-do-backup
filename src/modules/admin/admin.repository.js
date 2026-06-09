import { db } from "../../config/db.js";
import * as templatesRepo from "../templates/templates.repository.js";

export const getAdminStats = async () => {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM guest_sessions WHERE deleted_at IS NULL) AS guest_users,
      (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL AND role <> 'admin') AS users,
      (SELECT COUNT(*)::int FROM tasks WHERE deleted_at IS NULL) AS tasks,
      (SELECT COUNT(*)::int FROM task_templates WHERE deleted_at IS NULL) AS templates
  `);

  return rows[0];
};

export const getUserActivityLastSevenDays = async () => {
  const { rows } = await db.query(`
    WITH days AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS day
    )
    SELECT
      TO_CHAR(days.day, 'Dy') AS label,
      COUNT(users.id)::int AS value
    FROM days
    LEFT JOIN users
      ON users.created_at::date = days.day
      AND users.deleted_at IS NULL
      AND users.role <> 'admin'
    GROUP BY days.day
    ORDER BY days.day ASC
  `);

  return {
    labels: rows.map((row) => row.label.trim()),
    data: rows.map((row) => row.value),
  };
};

export const listTemplates = async () => {
  return templatesRepo.listAdminTemplates();
};

export const listRecentTemplates = async () => {
  return templatesRepo.listAdminTemplates(3);
};

export const deleteTemplate = async (templateId) => {
  return templatesRepo.softDeleteTemplate(templateId);
};
