import * as guestService from "./guest.service.js";

// CREATE GUEST SESSION

export const createGuestSession = async (req, res) => {
  try {
    // CREATE SESSION

    const session = await guestService.createGuestSession();

    // SUCCESS RESPONSE

    return res.status(201).json({
      success: true,
      message: "Guest session berhasil dibuat.",

      data: {
        guest_session_id: session.id,

        session_token: session.session_token,

        created_at: session.created_at,
      },
    });
  } catch (error) {
    // INTERNAL ERROR

    console.error("CREATE GUEST SESSION CONTROLLER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server.",
    });
  }
};
