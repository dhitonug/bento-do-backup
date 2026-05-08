import * as repository from "./notifications.repository.js";
import { getPagination, buildMeta } from "../../utils/pagination.js";

export const getUserNotifications = async (userId, query) => {
  const { page, limit, offset } = getPagination(query);
  const isRead =
    query.is_read === "true" ? true : query.is_read === "false" ? false : undefined;

  const result = await repository.findUserNotifications(userId, limit, offset, isRead);

  return {
    data: result.data,
    meta: buildMeta(result.total, page, limit),
  };
};

export const readNotification = async (notificationId, userId) => {
  const notification = await repository.markAsRead(notificationId, userId);
  if (!notification) {
    const error = new Error("Notifikasi tidak ditemukan atau bukan milik kamu.");
    error.status = 404;
    throw error;
  }
  return notification;
};

export const readAllNotifications = async (userId) => {
  const updatedIds = await repository.markAllAsRead(userId);
  return {
    message: "Semua notifikasi telah ditandai sudah dibaca.",
    updatedCount: updatedIds.length,
  };
};

export const removeNotification = async (notificationId, userId) => {
  const notification = await repository.softDeleteNotification(notificationId, userId);
  if (!notification) {
    const error = new Error("Notifikasi tidak ditemukan atau bukan milik kamu.");
    error.status = 404;
    throw error;
  }
  return { message: "Notifikasi berhasil dihapus." };
};

/**
 * Digunakan oleh modul lain (focus, tasks, energy) untuk membuat notifikasi secara internal.
 * Tipe yang valid: 'deadline_reminder', 'energy_critical', 'dopamine_rescue'
 */
export const triggerNotification = async (userId, taskId, message, type) => {
  return await repository.createNotification(userId, taskId, message, type);
};
