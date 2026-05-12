import * as repository from "./notifications.repository.js";

const ALLOWED_NOTIFICATION_TYPES = [
  "deadline_reminder",
  "energy_critical",
  "dopamine_rescue",
];

const DEADLINE_REMINDER_TYPE = "deadline_reminder";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const normalizePaginationNumber = (
  value,
  fallback,
  { min = 1, max = 50 } = {},
) => {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < min) {
    return fallback;
  }

  return Math.min(numberValue, max);
};

const normalizeScheduledAt = (scheduledAt) => {
  const parsedDate =
    scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createAppError("Format scheduled_at tidak valid!", 400);
  }

  return parsedDate;
};

const normalizeDeadlineDate = (deadline) => {
  const parsedDate = deadline instanceof Date ? deadline : new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createAppError("Format deadline tidak valid!", 400);
  }

  return parsedDate;
};

const assertUserId = (userId) => {
  if (!userId) {
    throw createAppError("User ID tidak valid!", 400);
  }
};

const assertNotificationId = (notificationId) => {
  if (!notificationId) {
    throw createAppError("Notification ID tidak valid!", 400);
  }
};

const assertNotificationType = (type) => {
  if (!ALLOWED_NOTIFICATION_TYPES.includes(type)) {
    throw createAppError("Tipe notifikasi tidak valid!", 400, {
      code: "INVALID_NOTIFICATION_TYPE",
    });
  }
};

const assertMessage = (message) => {
  if (typeof message !== "string" || message.trim().length === 0) {
    throw createAppError("Message notifikasi wajib diisi!", 400);
  }
};

const buildDeadlineReminderSchedule = (deadlineDate) => {
  const now = new Date();
  const hMinusOne = new Date(deadlineDate.getTime() - ONE_DAY_IN_MS);

  return hMinusOne.getTime() > now.getTime() ? hMinusOne : now;
};

const buildDeadlineReminderMessage = (task, deadlineDate) => {
  if (deadlineDate.getTime() <= Date.now()) {
    return `Pengingat deadline: "${task.title}" sudah melewati tenggat waktu.`;
  }

  return `Pengingat deadline: "${task.title}" akan jatuh tempo dalam 24 jam atau kurang.`;
};

export const getUserNotifications = async (userId, query = {}) => {
  assertUserId(userId);

  const page = normalizePaginationNumber(query.page, 1, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });

  const limit = normalizePaginationNumber(query.limit, 20, {
    min: 1,
    max: 50,
  });

  const offset = (page - 1) * limit;

  const result = await repository.findUserNotifications(userId, {
    limit,
    offset,
    isRead: query.is_read,
    type: query.type,
  });

  const unreadCount = await repository.countUnreadVisibleNotifications(userId);

  const totalPages =
    result.total_items === 0 ? 0 : Math.ceil(result.total_items / limit);

  return {
    page,
    limit,
    total_items: result.total_items,
    total_pages: totalPages,
    unread_count: unreadCount,
    data: result.data,
  };
};

export const readNotification = async (notificationId, userId) => {
  assertNotificationId(notificationId);
  assertUserId(userId);

  const notification = await repository.markAsRead(notificationId, userId);

  if (!notification) {
    throw createAppError(
      "Notifikasi tidak ditemukan atau bukan milik kamu.",
      404,
    );
  }

  return notification;
};

export const readAllNotifications = async (userId) => {
  assertUserId(userId);

  const updatedRows = await repository.markAllAsRead(userId);

  return {
    updated_count: updatedRows.length,
    message: "Semua notifikasi yang tersedia berhasil ditandai sudah dibaca.",
  };
};

export const removeNotification = async (notificationId, userId) => {
  assertNotificationId(notificationId);
  assertUserId(userId);

  const notification = await repository.softDeleteNotification(
    notificationId,
    userId,
  );

  if (!notification) {
    throw createAppError(
      "Notifikasi tidak ditemukan atau bukan milik kamu.",
      404,
    );
  }

  return {
    message: "Notifikasi berhasil dihapus.",
  };
};

export const triggerNotification = async (
  userId,
  taskId,
  message,
  type,
  scheduledAt = new Date(),
) => {
  assertUserId(userId);

  if (!taskId) {
    throw createAppError("Task ID wajib diisi untuk membuat notifikasi!", 400);
  }

  assertMessage(message);
  assertNotificationType(type);

  const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);
  const isImmediate = normalizedScheduledAt.getTime() <= Date.now();

  return await repository.createNotification({
    user_id: userId,
    task_id: taskId,
    message: message.trim(),
    type,
    scheduled_at: normalizedScheduledAt,
    sent_at: isImmediate ? normalizedScheduledAt : null,
  });
};

export const getDueUnsentNotifications = async (limit = 50) => {
  const normalizedLimit = normalizePaginationNumber(limit, 50, {
    min: 1,
    max: 100,
  });

  return await repository.findDueUnsentNotifications(normalizedLimit);
};

export const markNotificationAsSent = async (notificationId) => {
  assertNotificationId(notificationId);

  const notification = await repository.markNotificationAsSent(notificationId);

  if (!notification) {
    throw createAppError("Notifikasi tidak ditemukan!", 404);
  }

  return notification;
};

export const syncDeadlineReminderForTask = async (task, executor) => {
  if (!task?.user_id) {
    return {
      action: "skipped_guest",
      notification: null,
    };
  }

  const existing = await repository.findActiveNotificationByTaskAndType(
    task.id,
    task.user_id,
    DEADLINE_REMINDER_TYPE,
    executor,
  );

  const isEligible =
    !!task.deadline &&
    task.status !== "done";

  if (!isEligible) {
    if (existing) {
      await repository.softDeleteNotificationsByTaskAndType(
        task.id,
        task.user_id,
        DEADLINE_REMINDER_TYPE,
        executor,
      );
    }

    return {
      action: existing ? "deleted" : "noop",
      notification: null,
    };
  }

  const deadlineDate = normalizeDeadlineDate(task.deadline);
  const scheduledAt = buildDeadlineReminderSchedule(deadlineDate);
  const message = buildDeadlineReminderMessage(task, deadlineDate);

  if (existing) {
    const updated = await repository.updateNotification(
      existing.id,
      {
        message,
        scheduled_at: scheduledAt,
        sent_at: null,
        is_read: false,
      },
      executor,
    );

    return {
      action: "updated",
      notification: updated,
    };
  }

  const created = await repository.createNotification(
    {
      user_id: task.user_id,
      task_id: task.id,
      message,
      type: DEADLINE_REMINDER_TYPE,
      scheduled_at: scheduledAt,
      sent_at: null,
    },
    executor,
  );

  return {
    action: "created",
    notification: created,
  };
};

export const removeDeadlineReminderByTask = async (
  taskId,
  userId,
  executor,
) => {
  if (!taskId || !userId) {
    return {
      deleted_count: 0,
    };
  }

  const deletedRows = await repository.softDeleteNotificationsByTaskAndType(
    taskId,
    userId,
    DEADLINE_REMINDER_TYPE,
    executor,
  );

  return {
    deleted_count: deletedRows.length,
  };
};