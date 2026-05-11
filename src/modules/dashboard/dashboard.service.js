import * as dashboardRepo from "./dashboard.repository.js";
import * as energyService from "../energy/energy.service.js";

// HELPER
const createAppError = (message, status = 400, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const assertIdentifier = (identifier) => {
  if (!identifier?.user_id && !identifier?.guest_session_id) {
    throw createAppError("Identitas pengguna tidak valid!", 401);
  }
};

// GET ZEN DASHBOARD
export const getZenDashboard = async (identifier) => {
  assertIdentifier(identifier);

  if (identifier.user_id) {
    await energyService.ensureDailyResetForUser(identifier.user_id);
  }

  const result = await dashboardRepo.getZenDashboardData(identifier);

  return {
    current_energy: result.current_energy,
    max_energy: result.max_energy,
    is_critical_energy: result.current_energy < 30,
    hidden_count: result.hidden_count,
    hidden_message:
      result.hidden_count > 0
        ? "Sistem menyembunyikan sisa tugas untuk melindungi energi mental Anda."
        : null,
    data: result.data,
  };
};