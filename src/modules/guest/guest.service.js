import { v4 as uuidv4 } from "uuid";

import * as guestRepo from "./guest.repository.js";

// CREATE GUEST SESSION

export const createGuestSession = async () => {
  try {
    // GENERATE SESSION TOKEN

    const session_token = uuidv4();

    // CREATE SESSION

    const session = await guestRepo.createGuestSession(session_token);

    return session;
  } catch (error) {
    console.error("CREATE GUEST SESSION ERROR:", error);

    throw new Error("Gagal membuat guest session!");
  }
};
