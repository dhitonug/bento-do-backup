import { verifyToken } from "../utils/jwt.js";

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header dibutuhkan!",
      });
    }

    // FORMAT HARUS:
    // Bearer TOKEN
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Format token harus Bearer token!",
      });
    }

    // AMBIL TOKEN

    const token = authHeader.split(" ")[1];

    // TOKEN KOSONG

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan!",
      });
    }

    // VERIFY JWT

    const decoded = verifyToken(token);

    // SIMPAN USER KE REQUEST

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Token tidak valid!",
    });
  }
};
