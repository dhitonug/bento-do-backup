const forbiddenLoginWall = (res) => {
  return res.status(403).json({
    success: false,
    message:
      "Fitur ini hanya untuk pengguna terdaftar. Silakan login terlebih dahulu.",
    require_login: true,
  });
};

// LOGIN WALL MIDDLEWARE
// Memaksa guest untuk login sebelum akses fitur tertentu
export const loginWallMiddleware = (req, res, next) => {
  try {
    if (req.identity?.type === "user" && req.identity?.user_id) {
      return next();
    }

    return forbiddenLoginWall(res);
  } catch (error) {
    console.error("LOGIN WALL MIDDLEWARE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

export default loginWallMiddleware;