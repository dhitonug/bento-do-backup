import * as service from "./notifications.service.js";

const handleNotificationError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
    ...(error.code ? { code: error.code } : {}),
  });
};

export const getNotifications = async (req, res) => {
  try {
    const result = await service.getUserNotifications(req.user.id, req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleNotificationError(
      res,
      error,
      "GET NOTIFICATIONS ERROR:",
    );
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await service.readNotification(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Notifikasi berhasil ditandai sudah dibaca.",
      data: notification,
    });
  } catch (error) {
    return handleNotificationError(
      res,
      error,
      "MARK NOTIFICATION AS READ ERROR:",
    );
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await service.readAllNotifications(req.user.id);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        updated_count: result.updated_count,
      },
    });
  } catch (error) {
    return handleNotificationError(
      res,
      error,
      "MARK ALL NOTIFICATIONS AS READ ERROR:",
    );
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const result = await service.removeNotification(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleNotificationError(
      res,
      error,
      "DELETE NOTIFICATION ERROR:",
    );
  }
};