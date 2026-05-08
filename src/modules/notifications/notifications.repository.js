import { db } from "../../config/db.js";

export const findUserNotifications = async (userId, limit, offset, isRead) => {
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = $1 AND deleted_at IS NULL
  `;
  const params = [userId];

  if (isRead !== undefined) {
    params.push(isRead);
    query += ` AND is_read = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND deleted_at IS NULL`;
  const countParams = [userId];
  if (isRead !== undefined) {
    countParams.push(isRead);
    countQuery += ` AND is_read = $${countParams.length}`;
  }
  const countResult = await db.query(countQuery, countParams);

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

export const markAsRead = async (notificationId, userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE, updated_at = NOW() 
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    RETURNING *;
  `;
  const result = await db.query(query, [notificationId, userId]);
  return result.rows[0];
};

export const markAllAsRead = async (userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE, updated_at = NOW() 
    WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL
    RETURNING id;
  `;
  const result = await db.query(query, [userId]);
  return result.rows;
};

export const softDeleteNotification = async (notificationId, userId) => {
  const query = `
    UPDATE notifications 
    SET deleted_at = NOW(), updated_at = NOW() 
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    RETURNING *;
  `;
  const result = await db.query(query, [notificationId, userId]);
  return result.rows[0];
};

export const createNotification = async (
  userId,
  taskId,
  message,
  type,
  scheduledAt = new Date()
) => {
  const query = `
    INSERT INTO notifications (user_id, task_id, message, type, scheduled_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await db.query(query, [userId, taskId, message, type, scheduledAt]);
  return result.rows[0];
};
