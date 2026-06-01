import { db } from "../../config/db.js";
import { toPostgresTimestamp } from "../../utils/date.js";

const notificationColumns = `
  id,
  user_id,
  task_id,
  message,
  type,
  scheduled_at,
  sent_at,
  is_read,
  created_at,
  updated_at
`;

const buildVisibleNotificationsWhere = ({ isRead, type }) => {
  const whereClauses = [
    "user_id = $1",
    "deleted_at IS NULL",
    "scheduled_at <= NOW()",
  ];

  const extraParams = [];

  if (typeof isRead === "boolean") {
    extraParams.push(isRead);
    whereClauses.push(`is_read = $${extraParams.length + 1}`);
  }

  if (type) {
    extraParams.push(type);
    whereClauses.push(`type = $${extraParams.length + 1}`);
  }

  return {
    whereClauses,
    extraParams,
  };
};

export const findUserNotifications = async (
  userId,
  { limit, offset, isRead, type },
  executor = db,
) => {
  const { whereClauses, extraParams } = buildVisibleNotificationsWhere({
    isRead,
    type,
  });

  const baseParams = [userId, ...extraParams];

  const listParams = [...baseParams, limit, offset];
  const limitParam = `$${listParams.length - 1}`;
  const offsetParam = `$${listParams.length}`;

  const { rows } = await executor.query(
    `
      SELECT
        ${notificationColumns}
      FROM notifications
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY
        COALESCE(sent_at, scheduled_at) DESC,
        created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    listParams,
  );

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total_items
      FROM notifications
      WHERE ${whereClauses.join(" AND ")}
    `,
    baseParams,
  );

  return {
    data: rows,
    total_items: countResult.rows[0]?.total_items ?? 0,
  };
};

export const countUnreadVisibleNotifications = async (
  userId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
      AND deleted_at IS NULL
      AND scheduled_at <= NOW()
      AND is_read = FALSE
    `,
    [userId],
  );

  return rows[0]?.unread_count ?? 0;
};

export const markAsRead = async (notificationId, userId, executor = db) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        is_read = TRUE,
        updated_at = NOW()
      WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NULL
      RETURNING
        ${notificationColumns}
    `,
    [notificationId, userId],
  );

  return rows[0] || null;
};

export const markAllAsRead = async (userId, executor = db) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        is_read = TRUE,
        updated_at = NOW()
      WHERE user_id = $1
      AND deleted_at IS NULL
      AND scheduled_at <= NOW()
      AND is_read = FALSE
      RETURNING id
    `,
    [userId],
  );

  return rows;
};

export const softDeleteNotification = async (
  notificationId,
  userId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NULL
      RETURNING
        ${notificationColumns}
    `,
    [notificationId, userId],
  );

  return rows[0] || null;
};

export const createNotification = async (
  {
    user_id,
    task_id,
    message,
    type,
    scheduled_at,
    sent_at = null,
  },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      INSERT INTO notifications (
        user_id,
        task_id,
        message,
        type,
        scheduled_at,
        sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        ${notificationColumns}
    `,
    [
      user_id,
      task_id,
      message,
      type,
      toPostgresTimestamp(scheduled_at),
      toPostgresTimestamp(sent_at),
    ],
  );

  return rows[0];
};

export const findDueUnsentNotifications = async (
  limit = 50,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      SELECT
        n.id,
        n.user_id,
        n.task_id,
        n.message,
        n.type,
        n.scheduled_at,
        n.sent_at,
        n.is_read,
        n.created_at,
        n.updated_at,
        u.email AS user_email,
        u.display_name AS user_display_name,
        t.title AS task_title,
        t.deadline AS task_deadline
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      LEFT JOIN tasks t ON t.id = n.task_id
      WHERE n.deleted_at IS NULL
      AND n.sent_at IS NULL
      AND n.scheduled_at <= NOW()
      AND u.deleted_at IS NULL
      ORDER BY n.scheduled_at ASC, n.created_at ASC
      LIMIT $1
    `,
    [limit],
  );

  return rows;
};

export const markNotificationAsSent = async (
  notificationId,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        sent_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      AND deleted_at IS NULL
      RETURNING
        ${notificationColumns}
    `,
    [notificationId],
  );

  return rows[0] || null;
};

export const findActiveNotificationByTaskAndType = async (
  taskId,
  userId,
  type,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      SELECT
        ${notificationColumns}
      FROM notifications
      WHERE task_id = $1
      AND user_id = $2
      AND type = $3
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [taskId, userId, type],
  );

  return rows[0] || null;
};

export const updateNotification = async (
  notificationId,
  {
    message,
    scheduled_at,
    sent_at = null,
    is_read = false,
  },
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        message = $2,
        scheduled_at = $3,
        sent_at = $4,
        is_read = $5,
        updated_at = NOW()
      WHERE id = $1
      AND deleted_at IS NULL
      RETURNING
        ${notificationColumns}
    `,
    [
      notificationId,
      message,
      toPostgresTimestamp(scheduled_at),
      toPostgresTimestamp(sent_at),
      is_read,
    ],
  );

  return rows[0] || null;
};

export const softDeleteNotificationsByTaskAndType = async (
  taskId,
  userId,
  type,
  executor = db,
) => {
  const { rows } = await executor.query(
    `
      UPDATE notifications
      SET
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE task_id = $1
      AND user_id = $2
      AND type = $3
      AND deleted_at IS NULL
      RETURNING id
    `,
    [taskId, userId, type],
  );

  return rows;
};
