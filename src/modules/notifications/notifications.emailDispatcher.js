import * as notificationsService from "./notifications.service.js";
import { sendNotificationEmail } from "../../utils/email.js";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_LIMIT = 50;

let intervalId = null;
let isDispatching = false;

const getNumberEnv = (key, fallback) => {
  const value = Number(process.env[key]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const isDispatcherEnabled = () => {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
};

export const dispatchDueNotificationEmails = async () => {
  if (isDispatching) {
    return {
      skipped: true,
      reason: "DISPATCH_ALREADY_RUNNING",
    };
  }

  isDispatching = true;

  try {
    const limit = getNumberEnv("NOTIFICATION_EMAIL_BATCH_LIMIT", DEFAULT_LIMIT);
    const notifications =
      await notificationsService.getDueUnsentNotifications(limit);

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of notifications) {
      try {
        await sendNotificationEmail({
          to: notification.user_email,
          displayName: notification.user_display_name,
          notification,
        });

        await notificationsService.markNotificationAsSent(notification.id);
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error("SEND NOTIFICATION EMAIL ERROR:", {
          notification_id: notification.id,
          user_id: notification.user_id,
          message: error.message,
        });
      }
    }

    return {
      processed_count: notifications.length,
      sent_count: sentCount,
      failed_count: failedCount,
    };
  } finally {
    isDispatching = false;
  }
};

export const startNotificationEmailDispatcher = () => {
  if (!isDispatcherEnabled()) {
    console.log("Notification email dispatcher disabled.");
    return null;
  }

  if (intervalId) {
    return intervalId;
  }

  const intervalMs = getNumberEnv(
    "NOTIFICATION_EMAIL_INTERVAL_MS",
    DEFAULT_INTERVAL_MS,
  );

  const runDispatcher = async () => {
    try {
      await dispatchDueNotificationEmails();
    } catch (error) {
      console.error("NOTIFICATION EMAIL DISPATCHER ERROR:", error);
    }
  };

  runDispatcher();
  intervalId = setInterval(runDispatcher, intervalMs);

  console.log(`Notification email dispatcher running every ${intervalMs} ms.`);

  return intervalId;
};

export const stopNotificationEmailDispatcher = () => {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
};
