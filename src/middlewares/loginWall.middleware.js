// ==========================================
// LOGIN WALL MIDDLEWARE
// Memaksa guest untuk login sebelum akses fitur tertentu
// ==========================================
export const loginWallMiddleware = (req, res, next) => {
  try {
    // CEK APAKAH USER SUDAH LOGIN

    if (req.identity?.type === "user" && req.identity?.user_id) {
      return next();
    }

    // GUEST DITOLAK - HARUS LOGIN

    return res.status(403).json({
      success: false,
      message:
        "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
      require_login: true,
    });
  } catch (error) {
    console.error("LOGIN WALL MIDDLEWARE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

export default loginWallMiddleware;
