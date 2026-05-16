import { v4 as uuidv4 } from "uuid";
import * as guestRepo from "./guest.repository.js";

// HELPER
const createAppError = (message, status = 500, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

// CREATE GUEST SESSION
export const createGuestSession = async () => {
  try {
    const session_token = uuidv4();

    const session = await guestRepo.createGuestSession(session_token);

    return session;
  } catch (error) {
    console.error("CREATE GUEST SESSION SERVICE ERROR:", error);

    if (error.code === "23505") {
      throw createAppError("Gagal membuat guest session. Silakan coba lagi.", 409);
    }

    throw createAppError("Gagal membuat guest session!", 500);
  }
};