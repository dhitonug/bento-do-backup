import bcrypt from "bcrypt";

import * as authRepo from "./auth.repository.js";
import * as taskRepo from "../tasks/tasks.repository.js";
import * as guestRepo from "../guest/guest.repository.js";

import { generateToken } from "../../utils/jwt.js";

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

const migrateGuestTasksIfNeeded = async (guestSessionToken, userId) => {
  if (!guestSessionToken) {
    return 0;
  }

  const guest = await guestRepo.findGuestByToken(guestSessionToken);

  if (!guest) {
    return 0;
  }

  const migratedTasks = await taskRepo.migrateGuestTasksToUser(guest.id, userId);

  return migratedTasks.length;
};

// REGISTER
export const register = async (data) => {
  const normalizedEmail = normalizeEmail(data.email);

  // CEK EMAIL SUDAH DIGUNAKAN
  const existingUser = await authRepo.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw createAppError("Email sudah digunakan!", 409);
  }

  // HASH PASSWORD
  const password_hash = await bcrypt.hash(data.password, 10);

  try {
    // CREATE USER
    const user = await authRepo.createUser({
      email: normalizedEmail,
      password_hash,
      display_name: data.display_name.trim(),
    });

    // MIGRASI TASK GUEST JIKA ADA
    const migratedCount = await migrateGuestTasksIfNeeded(
      data.guest_session_id,
      user.id,
    );

    // GENERATE JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return buildAuthResponse(user, token, migratedCount);
  } catch (error) {
    // JAGA-JAGA JIKA KENA UNIQUE CONSTRAINT SAAT RACE CONDITION
    if (error.code === "23505") {
      throw createAppError("Email sudah digunakan!", 409);
    }

    throw error;
  }
};

// LOGIN
export const login = async ({ email, password, guest_session_id }) => {
  const normalizedEmail = normalizeEmail(email);

  // CARI USER
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    throw createAppError("Email atau password salah!", 401);
  }

  // CEK PASSWORD
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw createAppError("Email atau password salah!", 401);
  }

  // MIGRASI TASK GUEST JIKA ADA
  const migratedCount = await migrateGuestTasksIfNeeded(
    guest_session_id,
    user.id,
  );

  // GENERATE JWT
  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return buildAuthResponse(user, token, migratedCount);
};