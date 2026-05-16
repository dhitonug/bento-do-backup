import * as dashboardService from "./dashboard.service.js";

// HELPER IDENTIFIER
const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,
    guest_session_id: req.identity?.guest_session_id ?? null,
  };
};

// HELPER ERROR RESPONSE
const handleDashboardError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  const statusCode = error.status || 500;

  const response = {
    success: false,
    message: error.message || "Terjadi kesalahan pada server.",
  };

  if (error.require_login) {
    response.require_login = true;
  }

  if (error.code) {
    response.code = error.code;
  }

  return res.status(statusCode).json(response);
};

// GET ZEN DASHBOARD
export const getZenDashboard = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const result = await dashboardService.getZenDashboard(identifier);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleDashboardError(res, error, "GET ZEN DASHBOARD ERROR:");
  }
};