import { verifyToken } from "../utils/jwt.js";

import * as guestRepo from "../modules/guest/guest.repository.js";

// GUEST OR AUTH MIDDLEWARE

export const guestOrAuthMiddleware = async (req, res, next) => {
  try {
    // PRIORITAS:
    // 1. JWT USER
    // 2. GUEST TOKEN

    // AUTH HEADER

    const authHeader = req.headers.authorization;

    // JIKA ADA JWT TOKEN

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = verifyToken(token);

        req.identity = {
          type: "user",

          user_id: decoded.id,

          guest_session_id: null,
        };

        return next();
      } catch (jwtError) {
        // JWT TIDAK VALID → LANGSUNG TOLAK

        return res.status(401).json({
          success: false,
          message: "Token tidak valid!",
        });
      }
    }

    // CEK GUEST TOKEN

    const guestToken = req.headers["x-guest-session-token"];

    // TOKEN GUEST TIDAK ADA

    if (!guestToken) {
      return res.status(401).json({
        success: false,
        message: "Authorization atau guest session dibutuhkan!",
      });
    }

    // FIND GUEST

    const guest = await guestRepo.findGuestByToken(guestToken);

    // GUEST TIDAK VALID

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Guest session tidak valid!",
      });
    }

    // SET GUEST IDENTITY

    req.identity = {
      type: "guest",

      user_id: null,

      guest_session_id: guest.id,
    };

    next();
  } catch (error) {
    console.error("GUEST OR AUTH MIDDLEWARE ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Unauthorized!",
    });
  }
};
