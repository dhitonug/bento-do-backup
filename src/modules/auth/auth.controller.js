import * as authService from "./auth.service.js";

// REGISTER

export const register = async (req, res) => {
  try {
    // 🔍 DEBUG
    console.log("=== REGISTER DEBUG ===");
    console.log(
      "Guest Token dari Header:",
      req.headers["x-guest-session-token"],
    );

    const guestSessionId = req.headers["x-guest-session-token"];

    const result = await authService.register({
      ...req.body,
      guest_session_id: guestSessionId || null,
    });

    console.log("Hasil migrated_tasks_count:", result.migrated_tasks_count);
    console.log("=== END DEBUG ===");

    const message = guestSessionId
      ? "Register berhasil. Data guest kamu sudah dipindahkan!"
      : "Register berhasil.";

    return res.status(201).json({
      success: true,
      message: message,
      data: result,
    });
  } catch (error) {
    // VALIDATION / BUSINESS ERROR

    if (error.message === "Email sudah digunakan!") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    // INTERNAL SERVER ERROR

    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};

// LOGIN

export const login = async (req, res) => {
  try {
    // AMBIL GUEST SESSION ID DARI HEADER
    const guestSessionId = req.headers["x-guest-session-token"];

    // KIRIM KE SERVICE BERSAMA DATA LOGIN
    const result = await authService.login({
      ...req.body,
      guest_session_id: guestSessionId || null,
    });

    // PESAN SUKSES DISESUAIKAN
    const message = guestSessionId
      ? "Login berhasil. Data guest kamu sudah dipindahkan!"
      : "Login berhasil.";

    return res.json({
      success: true,
      message: message,
      data: result,
    });
  } catch (error) {
    // LOGIN ERROR

    if (
      error.message === "Email atau password salah!" ||
      error.message === "Email tidak ditemukan!"
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    // INTERNAL SERVER ERROR

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};
