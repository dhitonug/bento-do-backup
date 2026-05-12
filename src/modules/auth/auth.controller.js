import * as authService from "./auth.service.js";

// HELPER
const getGuestSessionToken = (req) => {
  return req.headers["x-guest-session-token"] || null;
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