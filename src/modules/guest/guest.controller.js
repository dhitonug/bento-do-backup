import * as guestService from "./guest.service.js";

// HELPER
const handleGuestError = (res, error, fallbackLabel) => {
  console.error(fallbackLabel, error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  });
};

// CREATE GUEST SESSION
export const createGuestSession = async (req, res) => {
  try {
    const session = await guestService.createGuestSession();

    return res.status(201).json({
      success: true,
      message: "Guest session berhasil dibuat.",
      data: {
        guest_session_id: session.id,
        session_token: session.session_token,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
    });
  } catch (error) {
    return handleGuestError(res, error, "CREATE GUEST SESSION ERROR:");
  }
};