import * as service from "./notifications.service.js";
import { getNotificationsQuerySchema, notificationIdParamSchema } from "./notifications.validation.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const queryParams = getNotificationsQuerySchema.parse(req.query);
    
    const result = await service.getUserNotifications(
      userId, 
      queryParams.page, 
      queryParams.limit, 
      queryParams.is_read
    );
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const params = notificationIdParamSchema.parse(req.params);
    
    const notification = await service.readNotification(params.id, userId);
    
    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await service.readAllNotifications(userId);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const params = notificationIdParamSchema.parse(req.params);
    
    const result = await service.removeNotification(params.id, userId);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
