import * as energyService from "./energy.service.js";

const getIdentifier = (req) => {
  return {
    user_id: req.identity?.user_id ?? null,
    guest_session_id: req.identity?.guest_session_id ?? null,
  };
};

const handleEnergyError = (res, error, fallbackMessage) => {
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

export const getEnergySummary = async (req, res) => {
  try {
    const identifier = getIdentifier(req);

    const result = await energyService.getEnergySummary(identifier);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleEnergyError(res, error, "GET ENERGY SUMMARY ERROR:");
  }
};

export const getEnergyLogs = async (req, res) => {
  try {
    const identifier = getIdentifier(req);
    const { page, limit } = req.query;

    const result = await energyService.getEnergyLogs(
      identifier,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleEnergyError(res, error, "GET ENERGY LOGS ERROR:");
  }
};