import { verifyToken } from "../utils/jwt.js";
import * as guestRepo from "../modules/guest/guest.repository.js";

// HELPERS
const unauthorized = (res, message) => {
  return res.status(401).json({
    success: false,
    message,
  });
};

const getBearerToken = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1]?.trim();

  return token || false;
};

const getGuestToken = (req) => {
  const rawToken = req.headers["x-guest-session-token"];

  if (!rawToken || typeof rawToken !== "string") {
    return null;
  }

  const guestToken = rawToken.trim();

  return guestToken || null;
};

// GUEST OR AUTH MIDDLEWARE
export const guestOrAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = getBearerToken(authHeader);

    // PRIORITAS 1: JWT USER
    if (bearerToken === false) {
      return unauthorized(res, "Format token harus Bearer token!");
    }

    if (bearerToken) {
      try {
        const decoded = verifyToken(bearerToken);

        req.identity = {
          type: "user",
          user_id: decoded.id,
          guest_session_id: null,
        };

        return next();
      } catch (error) {
        return unauthorized(res, "Token tidak valid!");
      }
    }

    // PRIORITAS 2: GUEST TOKEN
    const guestToken = getGuestToken(req);

    if (!guestToken) {
      return unauthorized(res, "Authorization atau guest session dibutuhkan!");
    }

    const guest = await guestRepo.findGuestByToken(guestToken);

    if (!guest) {
      return unauthorized(res, "Guest session tidak valid!");
    }

    req.identity = {
      type: "guest",
      user_id: null,
      guest_session_id: guest.id,
    };

    return next();
  } catch (error) {
    console.error("GUEST OR AUTH MIDDLEWARE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

export default guestOrAuthMiddleware;