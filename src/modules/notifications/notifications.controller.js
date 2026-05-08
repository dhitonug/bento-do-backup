import * as service from "./notifications.service.js";
import * as resp from "../../utils/response.js";
import { uuidParamSchema } from "./notifications.validation.js";

export const getNotifications = async (req, res, next) => {
  try {
    const result = await service.getUserNotifications(req.user.id, req.query);
    return resp.paginated(res, result.data, result.meta, "Notifikasi berhasil diambil.");
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const notification = await service.readNotification(id, req.user.id);
    return resp.success(res, notification, "Notifikasi ditandai sudah dibaca.");
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await service.readAllNotifications(req.user.id);
    return resp.success(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const result = await service.removeNotification(id, req.user.id);
    return resp.success(res, null, result.message);
  } catch (err) {
    next(err);
  }
};
