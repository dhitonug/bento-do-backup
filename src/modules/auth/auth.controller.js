import * as authService from "./auth.service.js";

// HELPER
const getGuestSessionToken = (req) => {
  return req.headers["x-guest-session-token"] || null;
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split(" ")[1]?.trim();

  return token || false;
};

const handleAuthError = (res, error, fallbackLabel) => {
  console.error(fallbackLabel, error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  });
};

// REGISTER
export const register = async (req, res) => {
  try {
    const guestSessionId = getGuestSessionToken(req);

    const result = await authService.register({
      ...req.body,
      guest_session_id: guestSessionId,
    });

    const message =
      result.migrated_tasks_count > 0
        ? "Register berhasil. Data guest kamu sudah dipindahkan!"
        : "Register berhasil.";

    return res.status(201).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    return handleAuthError(res, error, "REGISTER ERROR:");
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const guestSessionId = getGuestSessionToken(req);

    const result = await authService.login({
      ...req.body,
      guest_session_id: guestSessionId,
    });

    const message =
      result.migrated_tasks_count > 0
        ? "Login berhasil. Data guest kamu sudah dipindahkan!"
        : "Login berhasil.";

    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    return handleAuthError(res, error, "LOGIN ERROR:");
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    await authService.requestPasswordReset(req.body.email);

    return res.status(200).json({
      success: true,
      message: "Jika email terdaftar, link reset password sudah dikirim.",
    });
  } catch (error) {
    return handleAuthError(res, error, "FORGOT PASSWORD ERROR:");
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const resetToken = getBearerToken(req);

    if (resetToken === null) {
      return res.status(401).json({
        success: false,
        message: "Authorization header dibutuhkan!",
      });
    }

    if (resetToken === false) {
      return res.status(401).json({
        success: false,
        message: "Format token harus Bearer token!",
      });
    }

    await authService.resetPassword({
      reset_token: resetToken,
      new_password: req.body.new_password,
    });

    return res.status(200).json({
      success: true,
      message: "Password berhasil direset. Silakan login kembali.",
    });
  } catch (error) {
    return handleAuthError(res, error, "RESET PASSWORD ERROR:");
  }
};
