import * as authRepo from "../modules/auth/auth.repository.js";

export const requireAdminMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authorization header dibutuhkan!",
      });
    }

    const user = await authRepo.findUserById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan atau sudah tidak aktif.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Akses admin dibutuhkan.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("REQUIRE ADMIN MIDDLEWARE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

export default requireAdminMiddleware;
