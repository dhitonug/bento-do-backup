import bcrypt from "bcrypt";

import * as authRepo from "./auth.repository.js";

import * as taskRepo from "../tasks/tasks.repository.js";

import * as guestRepo from "../guest/guest.repository.js";

import { generateToken } from "../../utils/jwt.js";

// REGISTER

export const register = async (data) => {
  // CEK EMAIL SUDAH ADA?

  const existingUser = await authRepo.findUserByEmail(data.email);

  if (existingUser) {
    throw new Error("Email sudah digunakan!");
  }

  // HASH PASSWORD

  const password_hash = await bcrypt.hash(data.password, 10);

  // CREATE USER

  const user = await authRepo.createUser({
    email: data.email,
    password_hash,
    display_name: data.display_name,
  });

  // AUTO SYNC: PINDAHKAN TASKS GUEST KE USER

  let migrated_count = 0;

  if (data.guest_session_id) {
    // ✅ CARI GUEST ID DARI SESSION TOKEN
    const guest = await guestRepo.findGuestByToken(data.guest_session_id);

    if (guest) {
      const migratedTasks = await taskRepo.migrateGuestTasksToUser(
        guest.id, // ✅ PAKAI guest.id, BUKAN session_token
        user.id,
      );
      migrated_count = migratedTasks.length;
    }
  }

  // GENERATE JWT

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  // RETURN RESPONSE

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

    migrated_tasks_count: migrated_count,
  };
};

// LOGIN

export const login = async ({ email, password, guest_session_id }) => {
  // FIND USER

  const user = await authRepo.findUserByEmail(email);

  if (!user) {
    throw new Error("Email atau password salah!");
  }

  // CHECK PASSWORD

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new Error("Email atau password salah!");
  }

  // AUTO SYNC: PINDAHKAN TASKS GUEST KE USER

  let migrated_count = 0;

  if (guest_session_id) {
    // ✅ CARI GUEST ID DARI SESSION TOKEN
    const guest = await guestRepo.findGuestByToken(guest_session_id);

    if (guest) {
      const migratedTasks = await taskRepo.migrateGuestTasksToUser(
        guest.id, // ✅ PAKAI guest.id, BUKAN session_token
        user.id,
      );
      migrated_count = migratedTasks.length;
    }
  }

  // GENERATE JWT

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  // RETURN RESPONSE

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

    migrated_tasks_count: migrated_count,
  };
};
