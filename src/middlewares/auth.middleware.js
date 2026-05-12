import { verifyToken } from "../utils/jwt.js";

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

// AUTH MIDDLEWARE
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = getBearerToken(authHeader);

    if (token === null) {
      return unauthorized(res, "Authorization header dibutuhkan!");
    }

    if (token === false) {
      return unauthorized(res, "Format token harus Bearer token!");
    }

    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return unauthorized(
        res,
        error.name === "TokenExpiredError"
          ? "Token sudah kadaluarsa!"
          : "Token tidak valid!",
      );
    }

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

export default authMiddleware;