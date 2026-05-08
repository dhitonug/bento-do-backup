import * as repository from "./notifications.repository.js";

export const getUserNotifications = async (userId, page = 1, limit = 10, isRead) => {
  const offset = (page - 1) * limit;
  const result = await repository.findUserNotifications(userId, limit, offset, isRead);
  
  return {
    data: result.data,
    meta: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    }
  };
};

export const readNotification = async (notificationId, userId) => {
  const notification = await repository.markAsRead(notificationId, userId);
  if (!notification) {
    const error = new Error("Notification not found or unauthorized");
    error.status = 404;
    throw error;
  }
  return notification;
};

export const readAllNotifications = async (userId) => {
  const updatedIds = await repository.markAllAsRead(userId);
  return {
    message: "All notifications marked as read",
    updatedCount: updatedIds.length
  };
};

export const removeNotification = async (notificationId, userId) => {
  const notification = await repository.softDeleteNotification(notificationId, userId);
  if (!notification) {
    const error = new Error("Notification not found or unauthorized");
    error.status = 404;
    throw error;
  }
  return { message: "Notification deleted successfully" };
};

export const triggerNotification = async (userId, taskId, message, type) => {
  // Only types allowed by DB constraint: 'deadline_reminder', 'energy_critical', 'dopamine_rescue'
  return await repository.createNotification(userId, taskId, message, type);
};
