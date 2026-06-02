import bcrypt from "bcrypt";
import crypto from "crypto";

import { db } from "../../config/db.js";
import * as authRepo from "./auth.repository.js";
import * as taskRepo from "../tasks/tasks.repository.js";
import * as guestRepo from "../guest/guest.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";

import { generateToken } from "../../utils/jwt.js";
import { sendPasswordResetEmail } from "../../utils/email.js";

const PASSWORD_RESET_EXPIRES_MINUTES =
  Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 15;

// HELPER
const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildResetPasswordUrl = (token) => {
  const clientOrigin = (
    process.env.CLIENT_ORIGINS || "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)[0];

  const resetUrlBase =
    process.env.PASSWORD_RESET_URL ||
    `${process.env.FRONTEND_URL || clientOrigin}/reset-password`;

  const resetUrl = new URL(resetUrlBase);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
};

const buildAuthResponse = (user, token, migratedTasksCount = 0) => {
  return {
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      current_energy: user.current_energy,
      max_energy: user.max_energy,
      created_at: user.created_at,
    },
    token,
    migrated_tasks_count: migratedTasksCount,
  };
};

const syncDeadlineRemindersForMigratedTasks = async (tasks) => {
  for (const task of tasks) {
    try {
      await notificationsService.syncDeadlineReminderForTask(task);
    } catch (error) {
      console.error(
        "SYNC DEADLINE REMINDER FOR MIGRATED TASK ERROR:",
        error,
      );
    }
  }
};

const migrateGuestTasksIfNeeded = async (guestSessionToken, userId) => {
  if (!guestSessionToken) {
    return 0;
  }

  const guest = await guestRepo.findGuestByToken(guestSessionToken);

  if (!guest) {
    return 0;
  }

  const migratedTasks = await taskRepo.migrateGuestTasksToUser(guest.id, userId);

  await syncDeadlineRemindersForMigratedTasks(migratedTasks);

  return migratedTasks.length;
};

// REGISTER
export const register = async (data) => {
  const normalizedEmail = normalizeEmail(data.email);

  const existingUser = await authRepo.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw createAppError("Email sudah digunakan!", 409);
  }

  const password_hash = await bcrypt.hash(data.password, 10);

  try {
    const user = await authRepo.createUser({
      email: normalizedEmail,
      password_hash,
      display_name: data.display_name.trim(),
    });

    const migratedCount = await migrateGuestTasksIfNeeded(
      data.guest_session_id,
      user.id,
    );

    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return buildAuthResponse(user, token, migratedCount);
  } catch (error) {
    if (error.code === "23505") {
      throw createAppError("Email sudah digunakan!", 409);
    }

    throw error;
  }
};

// LOGIN
export const login = async ({ email, password, guest_session_id }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    throw createAppError("Email atau password salah!", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw createAppError("Email atau password salah!", 401);
  }

  const migratedCount = await migrateGuestTasksIfNeeded(
    guest_session_id,
    user.id,
  );

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return buildAuthResponse(user, token, migratedCount);
};

// FORGOT PASSWORD
export const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      email_sent: false,
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);

  await authRepo.revokeUnusedPasswordResetTokensForUser(user.id);
  await authRepo.createPasswordResetToken({
    user_id: user.id,
    token_hash: tokenHash,
    expires_minutes: PASSWORD_RESET_EXPIRES_MINUTES,
  });

  const resetUrl = buildResetPasswordUrl(rawToken);

  await sendPasswordResetEmail({
    to: user.email,
    displayName: user.display_name,
    resetUrl,
    expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
  });

  return {
    email_sent: true,
  };
};

// RESET PASSWORD
export const resetPassword = async ({ reset_token, new_password }) => {
  const tokenHash = hashResetToken(reset_token);
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const resetToken = await authRepo.findValidPasswordResetToken(
      tokenHash,
      client,
    );

    if (!resetToken) {
      throw createAppError(
        "Token reset password tidak valid atau sudah kadaluarsa!",
        400,
        {
          code: "INVALID_RESET_TOKEN",
        },
      );
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    const user = await authRepo.updateUserPassword(
      resetToken.user_id,
      password_hash,
      client,
    );

    if (!user) {
      throw createAppError("User tidak ditemukan!", 404);
    }

    await authRepo.markPasswordResetTokenAsUsed(resetToken.id, client);
    await authRepo.revokeUnusedPasswordResetTokensForUser(user.id, client);

    await client.query("COMMIT");

    return {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
